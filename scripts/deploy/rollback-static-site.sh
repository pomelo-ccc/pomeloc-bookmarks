#!/usr/bin/env bash

set -euo pipefail

deploy_host="${POMELOC_DEPLOY_HOST:?POMELOC_DEPLOY_HOST is required}"
deploy_user="${POMELOC_DEPLOY_USER:-root}"
deploy_port="${POMELOC_DEPLOY_PORT:-22}"
deploy_remote_dir="${POMELOC_DEPLOY_REMOTE_DIR:?POMELOC_DEPLOY_REMOTE_DIR is required}"
deploy_backup_dir="${POMELOC_DEPLOY_BACKUP_DIR:-/root/pomeloc-backups}"
deploy_identity_file="${POMELOC_DEPLOY_SSH_IDENTITY_FILE:-}"
deploy_known_hosts_file="${POMELOC_DEPLOY_KNOWN_HOSTS_FILE:-}"

rollback_target="${1:-}"

ssh_opts=(
  -p "${deploy_port}"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=20
)

if [[ -n "${deploy_identity_file}" ]]; then
  ssh_opts+=(-i "${deploy_identity_file}")
fi

if [[ -n "${deploy_known_hosts_file}" ]]; then
  ssh_opts+=(-o "UserKnownHostsFile=${deploy_known_hosts_file}")
fi

if [[ -z "${rollback_target}" ]]; then
  rollback_target="$(
    ssh "${ssh_opts[@]}" "${deploy_user}@${deploy_host}" "find '${deploy_backup_dir}' -maxdepth 1 -type f -name 'pomeloc.before_*.tar.gz' | sort | tail -n 1"
  )"
fi

rollback_target="$(printf '%s' "${rollback_target}" | tr -d '\r\n')"

if [[ -z "${rollback_target}" ]]; then
  printf 'No rollback target found.\n' >&2
  exit 1
fi

printf 'Rolling back to %s on %s...\n' "${rollback_target}" "${deploy_host}"
ssh "${ssh_opts[@]}" "${deploy_user}@${deploy_host}" bash -s -- \
  "${deploy_remote_dir}" \
  "${rollback_target}" <<'REMOTE'
set -euo pipefail

remote_dir="$1"
backup_path="$2"

if [[ ! -f "${backup_path}" ]]; then
  printf 'Backup %s does not exist.\n' "${backup_path}" >&2
  exit 1
fi

mkdir -p "${remote_dir}"
find "${remote_dir}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "${backup_path}" -C "${remote_dir}"
REMOTE

"$(dirname "$0")/healthcheck.sh"

printf 'Rollback completed successfully.\n'
