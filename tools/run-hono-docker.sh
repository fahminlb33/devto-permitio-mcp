#!/usr/bin/env bash
set -euxo pipefail

docker run \
    -it \
    --rm \
    -p 3000:3000 \
    --env-file D:\devto-permitio-mcp\docker.env \
    -v D:\devto-permitio-mcp:/data \
    --name devto-permitio-mcp \
    devto-permitio-todo:latest \
    node dist/app.hono.js
