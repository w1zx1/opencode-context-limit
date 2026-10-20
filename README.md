# Context Limit for OpenCode V2

The plugin sets one shared context-window limit for all OpenCode models.

Press `Ctrl+P`, choose **Context window**, select a preset and press `Enter` —
the limit is applied to every model immediately. The value persists across
restarts and is synced between open projects/locations.

## Installation

### Option 1: global plugins folder (recommended)

```sh
./install.sh
```

The script creates a symlink:

```text
~/.config/opencode/plugins/context-limit -> /path/to/opencode-context-limit
```

OpenCode picks up plugins from this folder automatically. Restart the TUI after
installing.

### Option 2: via `opencode.json`

Add the plugin path to the global `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-context-limit"]
}
```

This option requires both exports from `package.json`: the server one
(`index.ts`) and the TUI one (`tui.ts`). They are already configured.

## Usage

1. Press `Ctrl+P`.
2. Type `context` and choose **Context window**.
3. Select a limit and press `Enter`.

A slash command is also available: `/context-limit` (alias `/limit`).

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
npm test          # bun test: limit logic and TUI command
npm run typecheck # tsc --noEmit
```

Structure:

```text
index.ts    server plugin: model transform, RPC, storage, synchronization
tui.ts      TUI plugin: palette command and context-limit picker dialog
rpc.ts      shared RPC definition for the server and TUI parts
presets.ts  presets and pure limit-application logic
test/       tests
```

The server and TUI parts communicate over RPC:

- `context-limit.get` — current value;
- `context-limit.set` — set `{ context: number }`, where `0` clears the limit;
- `changed` event — notifies all running locations about the new value.
