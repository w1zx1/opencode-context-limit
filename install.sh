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

if [ ! -f "$src/dist/gui-experimental.cjs" ]; then
  echo "error: $src/dist/gui-experimental.cjs is missing; build the plugin first" >&2
  exit 1
fi

mkdir -p "$config/plugins"

if [ -L "$dest" ]; then
  # Replace a symlink left by an older install.
  rm -f "$dest"
elif [ -e "$dest" ]; then
  if [ ! -f "$dest/package.json" ] || ! grep -q '"name"[[:space:]]*:[[:space:]]*"opencode-context-limit"' "$dest/package.json"; then
    echo "error: $dest exists and does not look like this plugin" >&2
    echo "remove it first if you really want to replace it" >&2
    exit 1
  fi
  rm -rf "$dest"
fi

mkdir -p "$dest"
cp -R "$src/src" "$dest/src"
cp -R "$src/dist" "$dest/dist"
cp "$src/package.json" "$src/README.md" "$dest/"

echo "Installed: $dest (copy of $src)"
echo "Restart OpenCode."
echo "TUI: Ctrl+P -> Context window, or /context-limit."
echo "Desktop: use /context-limit (or /limit), or the command palette."
