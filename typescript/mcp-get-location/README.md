# MCP Location Server

A location acquisition server based on MCP (Model Context Protocol) that obtains
precise user location information through browser authorization.

## Features

- 🌍 Get precise user location through browser (network positioning)
- 🔄 Automatic polling for location information, up to 60 seconds
- 🌐 Cross-platform support (Windows, macOS, Linux)
- 📱 Automatically opens browser for location authorization
- 📍 Returns latitude and longitude coordinates

## Use Case Examples

- **Where am I?**
- **How's the weather? (combined with weather mcp)**
- **How to get to xxx by car/subway/bus? (combined with map mcp)**

## Direct Use in MCP Client

For stdio installation, configure as follows:

```json
{
  "mcpServers": {
    "get-location": {
      "command": "npx",
      "args": ["-y", "@mcpcn/mcp-get-location"],
      "env": {}
    }
  }
}
```

## Available Tools

### get_location

Get user location information through browser authorization.

**Parameters**: None

**Return Value**:

```json
{
  "latitude": 39.78463536888209,
  "longitude": 116.50960396229777
}
```

**Usage Example**: After calling this tool, the system will:

1. Automatically open the browser
2. Guide user to authorize location permissions
3. Poll for location information
4. Return latitude and longitude coordinates

## Technical Implementation

- Based on MCP SDK 1.12.0
- Developed using TypeScript
- Communication via stdio
- Cross-platform browser call support

## Notes

- Requires user to manually authorize location permissions in browser
- Returns timeout error if location is not obtained within 60 seconds
- Ensure network connection is normal and can access external APIs

## Development and Debugging

```bash
# Install dependencies
npm install

# Build
npm run build

# Start development mode
npm start
```
