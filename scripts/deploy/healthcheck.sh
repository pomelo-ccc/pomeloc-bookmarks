#!/usr/bin/env bash

set -euo pipefail

root_url="${POMELOC_ROOT_URL:-http://124.221.109.50/}"
bookmarks_url="${POMELOC_BOOKMARKS_URL:-http://124.221.109.50/bookmarks/}"

check_url() {
  local label="$1"
  local url="$2"
  local required_text="$3"
  local body_file
  local status_code

  body_file="$(mktemp)"
  status_code="$(curl -sS --max-time 20 -o "${body_file}" -w '%{http_code}' "${url}" || true)"

  if [[ "${status_code}" != "200" ]]; then
    printf '%s health check failed: %s returned %s\n' "${label}" "${url}" "${status_code}" >&2
    sed -n '1,40p' "${body_file}" >&2
    rm -f "${body_file}"
    return 1
  fi

  if [[ -n "${required_text}" ]] && ! grep -Fq "${required_text}" "${body_file}"; then
    printf '%s health check failed: %s body is missing "%s"\n' "${label}" "${url}" "${required_text}" >&2
    sed -n '1,40p' "${body_file}" >&2
    rm -f "${body_file}"
    return 1
  fi

  rm -f "${body_file}"
}

printf 'Checking %s...\n' "${root_url}"
check_url "root" "${root_url}" "Pomeloc"

printf 'Checking %s...\n' "${bookmarks_url}"
check_url "bookmarks" "${bookmarks_url}" "id=\"app\""

printf 'Health checks passed.\n'
