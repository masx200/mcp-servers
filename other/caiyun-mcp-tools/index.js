#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Base URL for Caiyun API
const BASE_URL = "https://api.caiyunapp.com/v2.6";

// Get API token from environment variable
const CAIYUN_API_KEY = process.env.CAIYUN_API_KEY;
if (!CAIYUN_API_KEY) {
  console.error("Error: CAIYUN_API_KEY environment variable is not set");
  process.exit(1);
}

// Helper function to convert JSON to a compact format
function toCompactFormat(obj, indent = 0) {
  if (!obj || typeof obj !== 'object') return String(obj);
  
  const spaces = ' '.repeat(indent);
  const isArray = Array.isArray(obj);
  
  const lines = [];
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (typeof value === 'object' && Object.keys(value).length > 0) {
      lines.push(`${spaces}${isArray ? '-' : key + ':'}`);
      lines.push(toCompactFormat(value, indent + 2));
    } else {
      const formattedValue = typeof value === 'string' ? `"${value}"` : value;
      lines.push(`${spaces}${isArray ? '-' : key + ':'} ${formattedValue}`);
    }
  }
  
  return lines.join('\n');
}

// Helper function to make API requests to Caiyun
async function callCaiyunApi(endpoint, longitude, latitude, params = {}) {
  // Set default language to zh_CN if not provided
  if (!params.lang) {
    params.lang = "zh_CN";
  }
  
  const queryParams = new URLSearchParams(params);
  const url = `${BASE_URL}/${CAIYUN_API_KEY}/${longitude},${latitude}/${endpoint}?${queryParams}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error calling Caiyun API: ${error.message}`);
    throw error;
  }
}

// Create MCP server
const server = new McpServer({
  name: "caiyun-mcp-tools",
  version: "1.1.0",
  description: "Get weather information from Caiyun Weather API"
});

// Define Realtime Weather tool
server.tool(
  "realtime-weather",
  "Get real-time weather information",
  {
    longitude: z.number().describe("Longitude coordinate"),
    latitude: z.number().describe("Latitude coordinate"),
    lang: z.enum(["zh_CN", "en_US", "ja"]).optional().describe("Language for response (defaults to zh_CN)")
  },
  async ({ longitude, latitude, lang }) => {
    try {
      const params = {};
      if (lang) params.lang = lang;
      
      const data = await callCaiyunApi("realtime", longitude, latitude, params);
      
      // Filter to only include the relevant result data
      const filteredData = {
        status: data.status,
        result: data.result.realtime
      };
      
      return {
        content: [{
          type: "text",
          text: toCompactFormat(filteredData)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Define Hourly Forecast tool
server.tool(
  "hourly-forecast",
  "Get hourly weather forecast",
  {
    longitude: z.number().describe("Longitude coordinate"),
    latitude: z.number().describe("Latitude coordinate"),
    hourlysteps: z.number().min(1).max(72).optional().describe("Number of hourly forecasts to return (max: 72)"),
    lang: z.enum(["zh_CN", "en_US", "ja"]).optional().describe("Language for response (defaults to zh_CN)")
  },
  async ({ longitude, latitude, hourlysteps, lang }) => {
    try {
      const params = {};
      if (lang) params.lang = lang;
      if (hourlysteps) params.hourlysteps = hourlysteps.toString();
      
      const data = await callCaiyunApi("hourly", longitude, latitude, params);
      
      // Filter to only include the relevant result data
      const filteredData = {
        status: data.status,
        forecast_keypoint: data.result.forecast_keypoint,
        hourly: data.result.hourly
      };
      
      return {
        content: [{
          type: "text",
          text: toCompactFormat(filteredData)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Define Daily Forecast tool
server.tool(
  "daily-forecast",
  "Get daily weather forecast",
  {
    longitude: z.number().describe("Longitude coordinate"),
    latitude: z.number().describe("Latitude coordinate"),
    dailysteps: z.number().min(1).max(7).optional().describe("Number of daily forecasts to return (max: 7)"),
    lang: z.enum(["zh_CN", "en_US", "ja"]).optional().describe("Language for response (defaults to zh_CN)")
  },
  async ({ longitude, latitude, dailysteps, lang }) => {
    try {
      const params = {};
      if (lang) params.lang = lang;
      if (dailysteps) params.dailysteps = dailysteps.toString();
      
      const data = await callCaiyunApi("daily", longitude, latitude, params);
      
      // Filter to only include the relevant result data
      const filteredData = {
        status: data.status,
        daily: data.result.daily
      };
      
      return {
        content: [{
          type: "text",
          text: toCompactFormat(filteredData)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Define Weather Alerts tool
server.tool(
  "weather-alerts",
  "Get weather alerts and warnings",
  {
    longitude: z.number().describe("Longitude coordinate"),
    latitude: z.number().describe("Latitude coordinate"),
    lang: z.enum(["zh_CN", "en_US", "ja"]).optional().describe("Language for response (defaults to zh_CN)")
  },
  async ({ longitude, latitude, lang }) => {
    try {
      const params = {
        alert: "true"
      };
      if (lang) params.lang = lang;
      
      const data = await callCaiyunApi("weather", longitude, latitude, params);
      
      // Filter to only include alert data if it exists
      const filteredData = {
        status: data.status
      };
      
      if (data.result.alert && data.result.alert.content) {
        filteredData.alerts = data.result.alert.content;
      } else {
        filteredData.alerts = [];
      }
      
      return {
        content: [{
          type: "text",
          text: toCompactFormat(filteredData)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Main function to start the server
async function main() {
  try {
    // Connect the server to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Server error:", error);
    process.exit(1);
  }
}

// Execute the main function
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 