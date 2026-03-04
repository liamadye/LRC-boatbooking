#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

check_headers() {
  local path="$1"
  local expect_status="$2"
  local expect_location="${3:-}"
  local headers
  local cleaned_headers
  local actual_location
  headers="$(curl -sSI "$BASE_URL$path")"
  cleaned_headers="$(printf "%s" "$headers" | tr -d '\r')"

  if ! grep -qE "^HTTP/[0-9.]+ $expect_status" <<<"$cleaned_headers"; then
    echo "FAIL: $path expected status $expect_status"
    echo "$cleaned_headers"
    exit 1
  fi

  if [[ -n "$expect_location" ]]; then
    actual_location="$(
      awk 'BEGIN{IGNORECASE=1} /^location:/{print $2; exit}' <<<"$cleaned_headers"
    )"
    if [[ "$actual_location" != "$expect_location" ]]; then
      echo "FAIL: $path expected location $expect_location (got $actual_location)"
      echo "$cleaned_headers"
      exit 1
    fi
  fi

  echo "PASS: $path -> $expect_status"
}

check_body_contains() {
  local path="$1"
  local needle="$2"
  local body
  body="$(curl -sS "$BASE_URL$path")"

  if ! grep -q "$needle" <<<"$body"; then
    echo "FAIL: $path did not contain expected text: $needle"
    exit 1
  fi

  echo "PASS: $path contains \"$needle\""
}

echo "Running smoke tests against $BASE_URL"
check_headers "/" "307" "/login"
check_headers "/bookings" "307" "/login"
check_headers "/api/bookings" "307" "/login"
check_headers "/login" "200"
check_body_contains "/login" "Leichhardt Rowing Club"

echo "Smoke tests completed"
