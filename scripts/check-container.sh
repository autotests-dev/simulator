#!/usr/bin/env bash
set -euo pipefail

# Use SIMULATOR_CONTAINER_RUNTIME=podman for a local rootless check.
runtime="${SIMULATOR_CONTAINER_RUNTIME:-docker}"
image="${SIMULATOR_IMAGE:-simulator:check}"
"$runtime" build --tag "$image" .

container=$("$runtime" run --detach --publish 127.0.0.1::80 "$image")
scratch=$(mktemp -d)
trap '"$runtime" rm --force "$container" >/dev/null; rm -rf "$scratch"' EXIT
port=$("$runtime" port "$container" 80/tcp | sed 's/.*://')
base_url="http://127.0.0.1:$port"

curl --fail --silent --show-error --retry 10 --retry-all-errors --retry-delay 1 \
  --connect-timeout 2 --max-time 5 \
  "$base_url/" --output "$scratch/index.html"
curl --fail --silent --show-error "$base_url/store/p/nest-storage-basket" \
  --output "$scratch/deep-link.html"
cmp "$scratch/index.html" "$scratch/deep-link.html"
curl --fail --silent --show-error "$base_url/mockServiceWorker.js" \
  --output "$scratch/mockServiceWorker.js"
cmp apps/site/public/mockServiceWorker.js "$scratch/mockServiceWorker.js"

echo 'Container serves the app, SPA deep links, and the current MSW worker.'
