#!/bin/sh
# Wrap web/index.html (page body) into a full HTML file for testing in a desktop browser.
cd "$(dirname "$0")/../web"
{ printf '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'; cat index.html; printf '</body></html>'; } > _test.html
echo "open web/_test.html"
