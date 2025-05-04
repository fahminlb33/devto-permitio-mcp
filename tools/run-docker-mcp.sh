#!/usr/bin/env bash
set -euxo pipefail

npx @modelcontextprotocol/inspector \
    docker run \
    -i \
    --rm \
    --env-file docker.env \
    -v local.db:/app/local.db \
    --net devto-permitio-mcp \
    --name devto-permitio-mcp \
    devto-permitio-mcp:latest \
    node app.mcp.js
