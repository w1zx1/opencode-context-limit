#!/usr/bin/env bash
set -euo pipefail

src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
config="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
dest="$config/plugins/context-limit"

mkdir -p "$config/plugins"

if [ -e "$dest" ] && [ ! -L "$dest" ]; then
  echo "error: $dest already exists and is not a symlink" >&2
  echo "remove it first if you really want to replace it" >&2
  exit 1
fi

ln -sfn "$src" "$dest"

echo "Installed: $dest -> $src"
echo "Restart OpenCode, then use Ctrl+P -> Set context limit."
