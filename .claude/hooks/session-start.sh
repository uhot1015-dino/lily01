#!/usr/bin/env bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PLUGIN_ROOT="$(cd "$(dirname "$0")/../plugins/superpowers" && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT"

exec bash "${PLUGIN_ROOT}/hooks/session-start"
