import { client, v2 } from "@datadog/datadog-api-client";

type GetTraceParams = {
  traceId: string;
  limit?: number;
};

let configuration: client.Configuration;

export const getTrace = {
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

  execute: async (params: GetTraceParams) => {
    try {
      const { traceId, limit } = params;

      if (!process.env.DD_API_KEY || !process.env.DD_APP_KEY) {
        throw new Error("API Key and App Key are required");
      }

      if (!traceId) {
        throw new Error("traceId is required");
      }

      const apiInstance = new v2.SpansApi(configuration);

      // Search for all spans with the specified trace_id
      // A trace is composed of all spans that share the same trace_id
      const body: v2.SpansListRequest = {
        data: {
          attributes: {
            filter: {
              query: `trace_id:${traceId}`,
              // Default to last 15 minutes if not specified
              from: "now-15m",
              to: "now"
            },
            sort: "timestamp" as v2.SpansSort,
            page: {
              limit: limit || 1000
            }
          },
          type: "search_request" as v2.SpansListRequestType
        }
      };

      const requestParams: v2.SpansApiListSpansRequest = {
        body: body
      };

      const response = await apiInstance.listSpans(requestParams);

      // Return the trace data with all its spans
      return {
        traceId: traceId,
        spans: response.data || [],
        meta: response.meta,
        // Provide summary information
        spanCount: response.data?.length || 0
      };
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
      } else if (error.status === 404) {
        throw new Error(
          `Trace with ID ${params.traceId} not found. Make sure the trace exists and is within the time window (last 15 minutes by default).`
        );
      } else {
        console.error("Error fetching trace:", error);
        throw error;
      }
    }
  }
};
