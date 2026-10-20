#!/usr/bin/env bash
# Build upload-ready portal zips: dist/crazygames/bonsai-lab.zip (CrazyGames Basic Launch, SDK v3) and dist/itchio/bonsai-lab.zip.
# Optional: --portals crazygames   (see tools/portal-build.py). Test with: node tools/portal-test.js
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/portal-build.py bonsai-lab style.css js fonts icons "$@"
