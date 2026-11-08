# opencode-context-limit

The plugin sets one shared context-window limit for all OpenCode models.

Pick a limit once and it applies to every model immediately, in the TUI and in
OpenCode Desktop. The value persists across restarts and is synced between open
projects/locations.

## Installation

### Option 1: global plugins folder (recommended)

```sh
./install.sh
```

The script builds the desktop GUI part and creates a symlink:

```text
~/.config/opencode/plugins/context-limit -> /path/to/opencode-context-limit
```

OpenCode picks up plugins from this folder automatically, in both the TUI and
OpenCode Desktop. Restart OpenCode after installing.

### Option 2: via `opencode.json` (alternative)

If the checkout lives elsewhere, add the plugin path to the global
`~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-context-limit"]
}
```

This option requires all exports from `package.json`: the server one
(`src/index.ts`), the TUI one (`src/tui.ts`), and the prebuilt desktop one
(`dist/gui-experimental.cjs`). They are already configured.

This is optional: OpenCode Desktop also loads plugins from the global
`plugins/` folder, so listing the path there is only needed when the plugin is
not installed with `install.sh`.

After changing `src/gui.tsx`, rebuild the desktop bundle:

```sh
bun run build   # or: npm run build
```

## Usage

### TUI

1. Press `Ctrl+P`.
2. Type `context` and choose **Context window**.
3. Select a limit and press `Enter`.

A slash command is also available: `/context-limit` (alias `/limit`).

### OpenCode Desktop

1. Type `/context-limit` (or `/limit`) in the composer and press `Enter`.
2. Or open the command palette and choose **Context window**.
3. Select a limit in the searchable dialog and press `Enter`.

The dialog lists the same presets as the TUI, shows the current value, and
applies the choice to every model right away.

Presets: `8K`, `16K`, `32K`, `64K`, `128K`, `200K`, `256K`, `512K`, `1M`, as
well as **Model default** — resets each model to its native limit.

## What exactly changes

The chosen number is applied to every model as-is — even when it is larger than
the model's native context window. There is no clamp to the "native maximum".

Through `ctx.model.transform`, the plugin changes the following for each model:

- `limit.context` — exactly the chosen value;
- `limit.input` — if the field exists, no greater than the chosen value;
- `limit.output` — no greater than the chosen value.

This affects context and token-budget calculations in OpenCode. The plugin does
not change the provider's actual capabilities.

Changes live in server memory and are applied on the fly. The plugin does not
edit `opencode.json`/`cli.json`.

## Development

```sh
npm install
npm test          # bun test: limit logic, TUI and GUI commands
npm run typecheck # tsc --noEmit
npm run build     # bundle the desktop GUI part into dist/
```

Structure:

```text
src/
  index.ts    server plugin: model transform, RPC, storage, synchronization
  tui.ts      TUI plugin: palette command and context-limit picker dialog
  gui.tsx     desktop plugin: palette and slash commands, native select dialog
  rpc.ts      shared RPC definition for the server, TUI and desktop parts
  presets.ts  presets and pure limit-application logic
test/         tests
dist/         built desktop bundle (gui-experimental.cjs)
```

The server and client parts communicate over RPC:

- `context-limit.get` — current value;
- `context-limit.set` — set `{ context: number }`, where `0` clears the limit;
- `changed` event — notifies all running locations about the new value.

The desktop GUI is the `./gui-experimental` export. It is built by Vite with the
`@opencode/plugin/gui/vite` preset and loaded by OpenCode Desktop from the
plugin's own background server.
