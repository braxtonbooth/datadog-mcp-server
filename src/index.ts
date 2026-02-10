#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import minimist from "minimist";
import { z } from "zod";

// Import tools
import { aggregateLogs } from "./tools/aggregateLogs.js";
import { getDashboard } from "./tools/getDashboard.js";
import { getDashboards } from "./tools/getDashboards.js";
import { getEvents } from "./tools/getEvents.js";
import { getIncidents } from "./tools/getIncidents.js";
import { getMetricMetadata } from "./tools/getMetricMetadata.js";
import { getMetrics } from "./tools/getMetrics.js";
import { getMonitor } from "./tools/getMonitor.js";
import { getMonitors } from "./tools/getMonitors.js";
import { searchLogs } from "./tools/searchLogs.js";
import { searchSpans } from "./tools/searchSpans.js";
import { aggregateSpans } from "./tools/aggregateSpans.js";
import { getTrace } from "./tools/getTrace.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Load environment variables from .env file (if it exists)
dotenv.config();

// Define environment variables - from command line or .env file
const DD_API_KEY = argv.apiKey || process.env.DD_API_KEY;
const DD_APP_KEY = argv.appKey || process.env.DD_APP_KEY;

// Get site configuration - defines the base domain for Datadog APIs
const DD_SITE = argv.site || process.env.DD_SITE || "datadoghq.com";

// Define service-specific endpoints for different Datadog services
// This follows Datadog's recommended approach for configuring regional endpoints
const DD_LOGS_SITE = argv.logsSite || process.env.DD_LOGS_SITE || DD_SITE;
const DD_METRICS_SITE =
  argv.metricsSite || process.env.DD_METRICS_SITE || DD_SITE;

// Remove https:// prefix if it exists to prevent double prefix issues
const cleanupUrl = (url: string) =>
  url.startsWith("https://") ? url.substring(8) : url;

// Store clean values in process.env for backwards compatibility
process.env.DD_API_KEY = DD_API_KEY;
process.env.DD_APP_KEY = DD_APP_KEY;
process.env.DD_SITE = cleanupUrl(DD_SITE);
process.env.DD_LOGS_SITE = cleanupUrl(DD_LOGS_SITE);
process.env.DD_METRICS_SITE = cleanupUrl(DD_METRICS_SITE);

// Validate required environment variables
if (!DD_API_KEY) {
  console.error("Error: DD_API_KEY is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error(" Command line: --apiKey=your_api_key");
  process.exit(1);
}

if (!DD_APP_KEY) {
  console.error("Error: DD_APP_KEY is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error(" Command line: --appKey=your_app_key");
  process.exit(1);
}

// Initialize Datadog client tools
// We initialize each tool which will use the appropriate site configuration
getMonitors.initialize();
getMonitor.initialize();
getDashboards.initialize();
getDashboard.initialize();
getMetrics.initialize();
getMetricMetadata.initialize();
getEvents.initialize();
getIncidents.initialize();
searchLogs.initialize();
aggregateLogs.initialize();
searchSpans.initialize();
aggregateSpans.initialize();
getTrace.initialize();

// Set up MCP server
const server = new McpServer({
  name: "datadog",
  version: "1.0.0",
  description:
    "MCP Server for Datadog API, enabling interaction with Datadog resources"
});

// Add tools individually, using their schemas directly
server.tool(
  "get-monitors",
  "Fetch monitors from Datadog with optional filtering. Use groupStates to filter by monitor status (e.g., 'alert', 'warn', 'no data'), tags or monitorTags to filter by tag criteria, and limit to control result size.",
  {
    groupStates: z.array(z.string()).optional(),
    tags: z.string().optional(),
    monitorTags: z.string().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getMonitors.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-monitor",
  "Get detailed information about a specific Datadog monitor by its ID. Use this to retrieve the complete configuration, status, and other details of a single monitor.",
  {
    monitorId: z.number()
  },
  async (args) => {
    const result = await getMonitor.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-dashboards",
  "Retrieve a list of all dashboards from Datadog. Useful for discovering available dashboards and their IDs for further exploration.",
  {
    filterConfigured: z.boolean().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getDashboards.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-dashboard",
  "Get the complete definition of a specific Datadog dashboard by its ID. Returns all widgets, layout, and configuration details.",
  {
    dashboardId: z.string()
  },
  async (args) => {
    const result = await getDashboard.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-metrics",
  "List available metrics from Datadog. Optionally use the q parameter to search for specific metrics matching a pattern. Helpful for discovering metrics to use in monitors or dashboards.",
  {
    q: z.string().optional()
  },
  async (args) => {
    const result = await getMetrics.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-metric-metadata",
  "Retrieve detailed metadata about a specific metric, including its type, description, unit, and other attributes. Use this to understand a metric's meaning and proper usage.",
  {
    metricName: z.string()
  },
  async (args) => {
    const result = await getMetricMetadata.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-events",
  "Search for events in Datadog within a specified time range. Events include deployments, alerts, comments, and other activities. Useful for correlating system behaviors with specific events.",
  {
    start: z.number(),
    end: z.number(),
    priority: z.enum(["normal", "low"]).optional(),
    sources: z.string().optional(),
    tags: z.string().optional(),
    unaggregated: z.boolean().optional(),
    excludeAggregation: z.boolean().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getEvents.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-incidents",
  "List incidents from Datadog's incident management system. Can filter by active/archived status and use query strings to find specific incidents. Helpful for reviewing current or past incidents.",
  {
    includeArchived: z.boolean().optional(),
    pageSize: z.number().optional(),
    pageOffset: z.number().optional(),
    query: z.string().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getIncidents.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "search-logs",
  "Search logs in Datadog with advanced filtering options. Use filter.query for search terms (e.g., 'service:web-app status:error'), from/to for time ranges (e.g., 'now-15m', 'now'), and sort to order results. Essential for investigating application issues.",
  {
    filter: z
      .object({
        query: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        indexes: z.array(z.string()).optional()
      })
      .optional(),
    sort: z.string().optional(),
    page: z
      .object({
        limit: z.number().optional(),
        cursor: z.string().optional()
      })
      .optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await searchLogs.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "aggregate-logs",
  "Perform analytical queries and aggregations on log data. Essential for calculating metrics (count, avg, sum, etc.), grouping data by fields, and creating statistical summaries from logs. Use this when you need to analyze patterns or extract metrics from log data.",
  {
    filter: z
      .object({
        query: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        indexes: z.array(z.string()).optional()
      })
      .optional(),
    compute: z
      .array(
        z.object({
          aggregation: z.string(),
          metric: z.string().optional(),
          type: z.string().optional()
        })
      )
      .optional(),
    groupBy: z
      .array(
        z.object({
          facet: z.string(),
          limit: z.number().optional(),
          sort: z
            .object({
              aggregation: z.string(),
              order: z.string()
            })
            .optional()
        })
      )
      .optional(),
    options: z
      .object({
        timezone: z.string().optional()
      })
      .optional()
  },
  async (args) => {
    const result = await aggregateLogs.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "search-spans",
  "Search APM spans in Datadog with filtering options. Use filter.query for search terms (e.g., 'service:web-app operation_name:http.request'), from/to for time ranges (e.g., 'now-1h', 'now'), and sort to order results. Essential for investigating application performance and tracing issues. Rate limited to 300 requests/hour.",
  {
    filter: z
      .object({
        query: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional()
      })
      .optional(),
    sort: z.string().optional(),
    page: z
      .object({
        limit: z.number().optional(),
        cursor: z.string().optional()
      })
      .optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await searchSpans.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "aggregate-spans",
  "Perform analytical queries and aggregations on APM span data. Calculate metrics (count, avg, p50, p99, etc.), group by dimensions (service, resource, etc.), and create statistical summaries from traces. Use this for performance analysis, latency percentiles, and error rate calculations. Rate limited to 300 requests/hour.",
  {
    filter: z
      .object({
        query: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional()
      })
      .optional(),
    compute: z
      .array(
        z.object({
          aggregation: z.string(),
          metric: z.string().optional(),
          type: z.string().optional()
        })
      )
      .optional(),
    groupBy: z
      .array(
        z.object({
          facet: z.string(),
          limit: z.number().optional(),
          sort: z
            .object({
              aggregation: z.string().optional(),
              order: z.string().optional(),
              metric: z.string().optional(),
              type: z.string().optional()
            })
            .optional()
        })
      )
      .optional(),
    options: z
      .object({
        timezone: z.string().optional()
      })
      .optional()
  },
  async (args) => {
    const result = await aggregateSpans.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-trace",
  "Retrieve all spans for a specific trace ID. A trace represents the complete journey of a request through your distributed system. This tool fetches all spans (operations) that belong to the trace, sorted chronologically. Useful for debugging specific requests or understanding the full execution path. Rate limited to 300 requests/hour.",
  {
    traceId: z.string(),
    limit: z.number().default(1000)
  },
  async (args) => {
    const result = await getTrace.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Datadog MCP Server:", error);
  });
