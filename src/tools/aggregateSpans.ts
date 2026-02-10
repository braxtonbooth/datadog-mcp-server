import { client, v2 } from "@datadog/datadog-api-client";

type AggregateSpansParams = {
  filter?: {
    query?: string;
    from?: string;
    to?: string;
  };
  compute?: Array<{
    aggregation: string;
    metric?: string;
    type?: string;
  }>;
  groupBy?: Array<{
    facet: string;
    limit?: number;
    sort?: {
      aggregation?: string;
      order?: string;
      metric?: string;
      type?: string;
    };
  }>;
  options?: {
    timezone?: string;
  };
};

let configuration: client.Configuration;

export const aggregateSpans = {
  initialize: () => {
    const configOpts = {
      authMethods: {
        apiKeyAuth: process.env.DD_API_KEY,
        appKeyAuth: process.env.DD_APP_KEY
      }
    };

    configuration = client.createConfiguration(configOpts);

    if (process.env.DD_SITE) {
      configuration.setServerVariables({
        site: process.env.DD_SITE
      });
    }
  },

  execute: async (params: AggregateSpansParams) => {
    try {
      const {
        filter,
        compute,
        groupBy,
        options
      } = params;

      if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) {
        throw new Error("API Key and App Key are required");
      }

      const apiInstance = new v2.SpansApi(configuration);

      // Build compute specifications
      const computeSpecs = compute?.map(c => ({
        aggregation: c.aggregation as v2.SpansAggregationFunction,
        metric: c.metric,
        type: c.type as v2.SpansComputeType | undefined
      }));

      // Build group-by specifications
      const groupBySpecs = groupBy?.map(g => {
        const groupBy: v2.SpansGroupBy = {
          facet: g.facet,
          limit: g.limit
        };

        if (g.sort) {
          const sortObj: v2.SpansAggregateSort = {};
          if (g.sort.aggregation) sortObj.aggregation = g.sort.aggregation as v2.SpansAggregationFunction;
          if (g.sort.order) sortObj.order = g.sort.order as v2.SpansSortOrder;
          if (g.sort.metric) sortObj.metric = g.sort.metric;
          if (g.sort.type) sortObj.type = g.sort.type as v2.SpansAggregateSortType;
          groupBy.sort = sortObj;
        }

        return groupBy;
      });

      // Build the request body for POST /api/v2/spans/analytics/aggregate
      const body: v2.SpansAggregateRequest = {
        data: {
          attributes: {
            filter: filter ? {
              query: filter.query,
              from: filter.from,
              to: filter.to
            } : undefined,
            compute: computeSpecs,
            groupBy: groupBySpecs,
            options: options
          },
          type: "aggregate_request" as v2.SpansAggregateRequestType
        }
      };

      const requestParams: v2.SpansApiAggregateSpansRequest = {
        body: body
      };

      const response = await apiInstance.aggregateSpans(requestParams);

      return response;
    } catch (error: any) {
      if (error.status === 403) {
        console.error(
          "Authorization failed (403 Forbidden): Check that your API key and Application key are valid and have sufficient permissions to access APM data. Required scope: apm_read"
        );
        throw new Error(
          "Datadog API authorization failed. Please verify your API and Application keys have the 'apm_read' scope."
        );
      } else if (error.status === 429) {
        console.error(
          "Rate limit exceeded (429): Spans API is limited to 300 requests per hour."
        );
        throw new Error(
          "Rate limit exceeded. Spans API allows 300 requests per hour."
        );
      } else {
        console.error("Error aggregating spans:", error);
        throw error;
      }
    }
  }
};
