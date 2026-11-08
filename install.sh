#!/usr/bin/env bash
set -euo pipefail

src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
config="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
dest="$config/plugins/context-limit"

# OpenCode Desktop loads the GUI part from dist/gui-experimental.cjs, which has
# to be built from src/gui.tsx.
if command -v bun >/dev/null 2>&1; then
  (cd "$src" && bun install && bun run build)
elif command -v npm >/dev/null 2>&1; then
  (cd "$src" && npm install && npm run build)
else
  echo "warning: bun or npm is required to build the desktop GUI part" >&2
fi

mkdir -p "$config/plugins"

if [ -e "$dest" ] && [ ! -L "$dest" ]; then
  echo "error: $dest already exists and is not a symlink" >&2
  echo "remove it first if you really want to replace it" >&2
  exit 1
fi

ln -sfn "$src" "$dest"

echo "Installed: $dest -> $src"
echo "Restart OpenCode."
echo "TUI: Ctrl+P -> Context window, or /context-limit."
echo "Desktop: use /context-limit (or /limit), or the command palette."
