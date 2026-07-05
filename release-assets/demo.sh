#!/usr/bin/env bash
set -euo pipefail

echo "=== WebDataLane v0.1 Demo ==="
echo ""

BUILD_DIR="/workspace/projects/webdatalane"

echo "Building..."
cd "$BUILD_DIR"
npm run build 2>&1 || true

echo ""
echo "Starting server in background..."
WEBDATALANE_ALLOW_LOCAL_UNAUTH=true PORT=3020 node dist/server.js &
SERVER_PID=$!
sleep 1

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "1. Health check"
curl -s http://localhost:3020/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3020/health

echo ""
echo "2. Markdown conversion"
curl -s -X POST http://localhost:3020/v1/webdatalane/markdown \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1><p>This is a <strong>test</strong> page.</p><a href=\"https://example.com/about\">About</a>"}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "3. Extract metadata"
curl -s -X POST http://localhost:3020/v1/webdatalane/metadata \
  -H "Content-Type: application/json" \
  -d '{"html": "<title>Test Page</title><meta name=\"description\" content=\"A test page\"><meta property=\"og:title\" content=\"OG Test\">"}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "4. Extract links"
curl -s -X POST http://localhost:3020/v1/webdatalane/links \
  -H "Content-Type: application/json" \
  -d '{"html": "<a href=\"/page1\">Page 1</a><a href=\"https://external.com\">External</a>", "url": "https://example.com"}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "5. Crawl plan"
curl -s -X POST http://localhost:3020/v1/webdatalane/crawl/plan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "html": "<a href=\"/page1\">P1</a><a href=\"/page2\">P2</a><a href=\"https://other.com\">Other</a>", "maxPages": 5}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "6. Headings extraction"
curl -s -X POST http://localhost:3020/v1/webdatalane/extract \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>", "include": ["headings"]}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "7. Structured extraction"
curl -s -X POST http://localhost:3020/v1/webdatalane/structured \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Product X</h1><p>Price: $29.99</p>", "schema": {"title": "string", "price": "string"}, "hints": {"title": ["h1"], "price": ["Price"]}}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "8. Screenshot (unsupported)"
curl -s -X POST http://localhost:3020/v1/webdatalane/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' | python3 -m json.tool 2>/dev/null || true

echo ""
echo "=== Demo Complete ==="
