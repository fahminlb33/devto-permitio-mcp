#!/usr/bin/env bash
set -euxo pipefail

docker run -d -it \
  -p 7766:7000 \
  --env-file ../.env \
  --net devto-permitio-mcp \
  --name devto-permitio-mcp-pdp \
  permitio/pdp-v2:latest
