#!/bin/bash

set -e;

bun run out/cli.js render ./lib/__tests__/components/Minimal.tsx --name=Minimal2 --bootstrap hydrate.js --bootstrap webvitals.js
