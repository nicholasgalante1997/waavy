#!/bin/bash

set -e

chmod +x ./out/executables/waavy-linux-x64

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Minimal.tsx
echo "##### <render/linux/sh -- Minimal Typescript> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Minimal.tsx --name=Minimal2
echo "##### <render/linux/sh -- Minimal Typescript Named Export> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Minimal.tsx --bootstrap index.js --bootstrap analytics/web-vitals.js --bootstrap https://example.com/script.js
echo "##### <render/linux/sh -- Minimal Typescript Bootstraps Client Side Scripts> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/MinimalJsx.jsx
echo "##### <render/linux/sh -- Minimal Javascript> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}"
echo "##### <render/linux/sh -- Extended Typescript> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/WithLoader.tsx --props "{}"
echo "##### <render/linux/sh -- WithLoader Typescript> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}" --cache --cache-type bunsqlite3 --cache-key password
echo "##### <render/linux/sh -- WithLoader Typescript Cache Bun SQLite3> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}" --cache --cache-type bunfs --cache-key password
echo "##### <render/linux/sh -- WithLoader Typescript Cache BunFs> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}" --cache --cache-type bunsqlite3 --cache-key password
echo "##### <render/linux/sh -- WithLoader Typescript Cache Bun SQLite3> #####"

time ./out/executables/waavy-linux-x64 render ./lib/__tests__/components/Extended.tsx --props "{\"items\": [\"One\", \"Two\", \"Three\"]}" --cache --cache-type bunfs --cache-key password
echo "##### <render/linux/sh -- WithLoader Typescript Cache BunFs> #####"

echo "All tests completed successfully!"