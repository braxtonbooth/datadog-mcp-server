import { client, v2 } from "@datadog/datadog-api-client";

type SearchSpansParams = {
  filter?: {
    query?: string;
    from?: string;
    to?: string;
  };
  sort?: string;
  page?: {
    limit?: number;
    cursor?: string;
  };
  limit?: number;
};

let configuration: client.Configuration;

export const searchSpans = {
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

  execute: async (params: SearchSpansParams) => {
    try {
      const {
        filter,
        sort,
        page,
        limit
      } = params;

      if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) {
        throw new Error("API Key and App Key are required");
      }

      const apiInstance = new v2.SpansApi(configuration);

      // Build the request body for POST /api/v2/spans/events/search
      const body: v2.SpansListRequest = {
        data: {
          attributes: {
            filter: filter ? {
              query: filter.query,
              from: filter.from,
              to: filter.to
            } : undefined,
            sort: sort as v2.SpansSort | undefined,
            page: page
          },
          type: "search_request" as v2.SpansListRequestType
        }
      };

      const requestParams: v2.SpansApiListSpansRequest = {
        body: body
      };

      const response = await apiInstance.listSpans(requestParams);

      // Apply client-side limit if specified
      if (limit && response.data && response.data.length > limit) {
        return {
          ...response,
          data: response.data.slice(0, limit)
        };
      }

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
        console.error("Error searching spans:", error);
        throw error;
      }
    }
  }
};
