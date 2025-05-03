#!/usr/bin/env bash
set -euxo pipefail

docker run -d -it \
  -p 7766:7000 \
  --env-file .env \
  --name devto-permitio-mcp \
  permitio/pdp-v2:latest
