#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { exec } from "child_process";
import { randomUUID } from "crypto";

// Location API response interface
interface LocationResponse {
  code: number;
  data?: {
    latitude: number;
    longitude: number;
  };
  msg?: string;
}

// Tool definition
const GET_LOCATION_TOOL: Tool = {
  name: "get_location",
  description:
    "Get user location information, this tool can obtain the latitude and longitude of the user's location",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const LOCATION_TOOLS = [GET_LOCATION_TOOL] as const;

// Open browser function
function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let command: string;

    // Choose command based on operating system
    switch (process.platform) {
      case "darwin": // macOS
        command = `open "${url}"`;
        break;
      case "win32": // Windows
        command = `start "${url}"`;
        break;
      default: // Linux
        command = `xdg-open "${url}"`;
        break;
    }

    exec(command, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Poll for location information
async function pollLocation(uuid: string): Promise<LocationResponse> {
  const maxAttempts = 60; // 60 seconds
  const interval = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = `https://mcpcn.cc/api/map/getCoordinates?key=${uuid}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "user-agent": "mcp-get-location",
        },
      });

      // Try to read response body even if status code is not 200
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (readError) {
        console.error(`Failed to read response:`, readError);
      }

      if (!response.ok) {
        // Special handling for 404, which may mean location hasn't been submitted yet
        if (response.status === 404) {
          // Location not submitted yet, continue polling
        } else {
          console.error(
            `Request failed (${attempt}/${maxAttempts}): ${response.status} ${response.statusText}`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
        continue;
      }

      // Try to parse JSON
      let result: LocationResponse;
      try {
        result = JSON.parse(responseText) as LocationResponse;
      } catch (parseError) {
        console.error(
          `JSON parsing failed:`,
          parseError,
          `Raw response:`,
          responseText,
        );
        await new Promise((resolve) => setTimeout(resolve, interval));
        continue;
      }

      if (result.code === 0) { // If result.data is not empty, return result
        return result;
      } else if (result.msg) {
        console.error(`API returned error:`, result.msg);
      }
    } catch (error) {
      console.error(`Request error (${attempt}/${maxAttempts}):`, error);
    }

    // Wait before next attempt, add random delay to make requests look more natural
    if (attempt < maxAttempts) {
      const randomDelay = Math.random() * 500; // 0-500ms random delay
      await new Promise((resolve) =>
        setTimeout(resolve, interval + randomDelay)
      );
    }
  }

  // Still no location information after 60 seconds
  console.error(
    `Polling timeout, failed to get location information within ${maxAttempts} seconds`,
  );
  return { code: -1, msg: "Timeout waiting for location information" };
}

// Handle get location request
async function handleGetLocation() {
  try {
    // Generate random UUID
    const uuid = randomUUID();

    // Build browser URL
    const browserUrl = `https://location.mcpcn.ai?key=${uuid}`;

    // Open browser
    try {
      openBrowser(browserUrl);
    } catch (error) {
      console.error("Failed to open browser:", error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to open browser: ${
          error instanceof Error ? error.message : String(error)
        }, please visit manually: ${browserUrl}`,
      );
    }

    // Start polling for location information
    const locationResult = await pollLocation(uuid);
    if (locationResult.code === 0 && locationResult.data) {
      const { latitude, longitude } = locationResult.data;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            latitude,
            longitude,
          }),
        }],
        isError: false,
      };
    } else {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get location`,
      );
    }
  } catch (error) {
    const errorMessage = `Error: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(errorMessage);
    throw new McpError(
      ErrorCode.InternalError,
      errorMessage,
    );
  }
}

// Server setup
const server = new Server(
  {
    name: "mcp-get-location",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: LOCATION_TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name } = request.params;

    try {
      switch (name) {
        case "get_location":
          return await handleGetLocation();

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`,
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
);

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Get Location MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
