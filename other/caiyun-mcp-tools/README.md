# Caiyun Weather MCP Server

This is a Model Context Protocol (MCP) server for the Caiyun Weather API. It provides tools to access weather data including real-time conditions, forecasts, and weather alerts.

## Features

- Real-time weather conditions
- Hourly weather forecasts (up to 72 hours)
- Daily weather forecasts (up to 7 days)
- Weather alerts
- Support for multiple languages (Chinese, English, Japanese)
- Token-efficient compact response format

## Prerequisites

- Node.js (v16 or above)
- A Caiyun Weather API token (obtain one from [Caiyun Weather API docs](https://docs.caiyunapp.com/weather-api/))

## Configuration

```json
{
  "mcpServers": {
    "caiyun-mcp-tools": {
      "command": "npx",
      "args": [
        "caiyun-mcp-tools"
      ],
      "env": {
        "CAIYUN_API_KEY": "your-caiyun-api-key"
      }
    }
  }
}
```

### Available Tools

The server provides the following tools which can be accessed through Cursor:

1. **realtime-weather** - Get current weather conditions
   - Parameters:
     - `longitude` (number): Longitude coordinate
     - `latitude` (number): Latitude coordinate
     - `lang` (optional string): Language for response ("zh_CN", "en_US", or "ja"), defaults to "zh_CN"

2. **hourly-forecast** - Get hourly weather forecast
   - Parameters:
     - `longitude` (number): Longitude coordinate
     - `latitude` (number): Latitude coordinate
     - `hourlysteps` (optional number): Number of hourly forecasts to return (max: 72)
     - `lang` (optional string): Language for response ("zh_CN", "en_US", or "ja"), defaults to "zh_CN"

3. **daily-forecast** - Get daily weather forecast
   - Parameters:
     - `longitude` (number): Longitude coordinate
     - `latitude` (number): Latitude coordinate
     - `dailysteps` (optional number): Number of daily forecasts to return (max: 7)
     - `lang` (optional string): Language for response ("zh_CN", "en_US", or "ja"), defaults to "zh_CN"

4. **weather-alerts** - Get active weather alerts
   - Parameters:
     - `longitude` (number): Longitude coordinate
     - `latitude` (number): Latitude coordinate
     - `lang` (optional string): Language for response ("zh_CN", "en_US", or "ja"), defaults to "zh_CN"

## API Limitations

Per the official Caiyun Weather API documentation: "The API interface only supports returning historical data for the past day." Due to this limitation, the historical weather tool has been removed from this package.
     
## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 