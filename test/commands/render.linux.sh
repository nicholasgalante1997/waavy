#!/bin/bash

set -e;

chmod 755 ./out/waavy-linux-x64-modern;

time ./out/waavy-linux-x64-modern render ./lib/__tests__/components/Minimal.tsx && \
echo "\n\n\n\t<render/linux/sh -- Minimal Typescript>\n\n\n" && \
time ./out/waavy-linux-x64-modern render ./lib/__tests__/components/Minimal.tsx --name=Minimal2 && \
echo "\n\n\n\t<render/linux/sh -- Minimal Typescript Named Export>\n\n\n" && \
time ./out/waavy-linux-x64-modern render ./lib/__tests__/components/Minimal.tsx --bootstrap index.js --bootstrap analytics/web-vitals.js --bootstrap https://example.com/script.js && \
echo "\n\n\n\t<render/linux/sh -- Minimal Typescript Bootstraps Client Side Scripts>\n\n\n" && \
time ./out/waavy-linux-x64-modern render ./lib/__tests__/components/MinimalJsx.jsx && \
echo "\n\n\n\t<render/linux/sh -- Minimal Javascript>\n\n\n" && \
time ./out/waavy-linux-x64-modern render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}" && \
echo "\n\n\n\t<render/linux/sh -- Extended Typescript>\n\n\n" && \
exit 0;
