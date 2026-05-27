#!/usr/bin/env bash

set -euo pipefail

dist_dir="${1:-dist}"

deploy_host="${POMELOC_DEPLOY_HOST:?POMELOC_DEPLOY_HOST is required}"
deploy_user="${POMELOC_DEPLOY_USER:-root}"
deploy_port="${POMELOC_DEPLOY_PORT:-22}"
deploy_remote_dir="${POMELOC_DEPLOY_REMOTE_DIR:?POMELOC_DEPLOY_REMOTE_DIR is required}"
deploy_backup_dir="${POMELOC_DEPLOY_BACKUP_DIR:-/root/pomeloc-backups}"
deploy_identity_file="${POMELOC_DEPLOY_SSH_IDENTITY_FILE:-}"
deploy_known_hosts_file="${POMELOC_DEPLOY_KNOWN_HOSTS_FILE:-}"

if [[ ! -d "${dist_dir}" ]]; then
  printf 'Dist directory %s does not exist.\n' "${dist_dir}" >&2
  exit 1
fi

deployment_id="$(date -u +%Y%m%d%H%M%S)"
if [[ -n "${GITHUB_SHA:-}" ]]; then
  deployment_id="${deployment_id}-${GITHUB_SHA::12}"
fi

remote_backup_path=""

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

rollback_on_failure() {
  local exit_code="$1"

  if [[ "${exit_code}" -ne 0 ]] && [[ -n "${remote_backup_path}" ]]; then
    printf 'Deployment failed, attempting rollback to %s\n' "${remote_backup_path}" >&2
    "$(dirname "$0")/rollback-static-site.sh" "${remote_backup_path}" || true
  fi
}

trap 'rollback_on_failure $?' EXIT

printf 'Preparing remote backup on %s...\n' "${deploy_host}"
remote_backup_path="$(
  ssh "${ssh_opts[@]}" "${deploy_user}@${deploy_host}" bash -s -- \
    "${deploy_remote_dir}" \
    "${deploy_backup_dir}" \
    "${deployment_id}" <<'REMOTE'
set -euo pipefail

remote_dir="$1"
backup_dir="$2"
deployment_id="$3"

mkdir -p "${remote_dir}" "${backup_dir}"

backup_path="${backup_dir%/}/pomeloc.before_${deployment_id}.tar.gz"
tar -czf "${backup_path}" -C "${remote_dir}" .

printf '%s\n' "${backup_path}"
REMOTE
)"

remote_backup_path="$(printf '%s' "${remote_backup_path}" | tr -d '\r\n')"
printf 'Backup created at %s\n' "${remote_backup_path}"

rsync_ssh_cmd="ssh -p ${deploy_port} -o BatchMode=yes -o StrictHostKeyChecking=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=20"
if [[ -n "${deploy_identity_file}" ]]; then
  rsync_ssh_cmd="${rsync_ssh_cmd} -i ${deploy_identity_file}"
fi
if [[ -n "${deploy_known_hosts_file}" ]]; then
  rsync_ssh_cmd="${rsync_ssh_cmd} -o UserKnownHostsFile=${deploy_known_hosts_file}"
fi

printf 'Syncing %s to %s:%s...\n' "${dist_dir}" "${deploy_host}" "${deploy_remote_dir}"
rsync -az --delete -e "${rsync_ssh_cmd}" "${dist_dir}/" "${deploy_user}@${deploy_host}:${deploy_remote_dir}/"

"$(dirname "$0")/healthcheck.sh"

trap - EXIT
printf 'Deployment completed successfully.\n'
