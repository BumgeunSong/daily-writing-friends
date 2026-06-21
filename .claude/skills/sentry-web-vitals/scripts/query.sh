#!/usr/bin/env bash
# Fetch per-route Web Vitals from Sentry Discover for a single time window.
# Usage: query.sh <start_iso> <end_iso> [extra_query]
# Outputs raw Sentry Discover JSON to stdout.
# Requires SENTRY_AUTH_TOKEN env var.
set -euo pipefail

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "ERROR: SENTRY_AUTH_TOKEN env var is not set" >&2
  exit 1
fi
if [ $# -lt 2 ]; then
  echo "Usage: $0 <start_iso> <end_iso> [extra_query]" >&2
  echo "Example: $0 2026-06-13T00:00:00 2026-06-21T00:00:00" >&2
  exit 1
fi

ORG="${SENTRY_ORG:-bumgeun-song}"
PROJECT="${SENTRY_PROJECT_ID:-4508460981747712}"
START="$1"
END="$2"
EXTRA="${3:-event.type:transaction}"

curl -sG "https://sentry.io/api/0/organizations/${ORG}/events/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  --data-urlencode "field=transaction" \
  --data-urlencode "field=count()" \
  --data-urlencode "field=p75(measurements.lcp)" \
  --data-urlencode "field=p75(measurements.fcp)" \
  --data-urlencode "field=p75(measurements.cls)" \
  --data-urlencode "field=count_web_vitals(measurements.lcp,any)" \
  --data-urlencode "query=${EXTRA} environment:production" \
  --data-urlencode "dataset=transactions" \
  --data-urlencode "project=${PROJECT}" \
  --data-urlencode "start=${START}" \
  --data-urlencode "end=${END}" \
  --data-urlencode "sort=-count()" \
  --data-urlencode "per_page=30"
