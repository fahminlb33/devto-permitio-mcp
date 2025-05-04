#!/usr/bin/env bash
set -euxo pipefail

docker run \
    -it \
    --rm \
    -p 3000:3000 \
    --env-file D:/devto-permitio-mcp/docker.env \
    --net devto-permitio-mcp \
    -v D:/devto-permitio-mcp/local.db:/app/local.db:rw \
    --name devto-permitio-mcp \
    devto-permitio-mcp:latest \
    node app.hono.js
