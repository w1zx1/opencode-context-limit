import { Plugin } from "@opencode/plugin/tui"
import { formatContext, PRESETS } from "./presets"
import { ContextLimitRpc } from "./rpc"

interface State {
  readonly context: number
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default Plugin.define({
  id: "context-limit.tui",
  setup(context) {
    const rpc = context.client.rpc(ContextLimitRpc)
    const location = () => context.location ?? context.data.location.default()

    async function refreshModels() {
      const loc = location()
      context.data.location.model.invalidate(loc)
      await context.data.location.model.sync(loc)
    }

    async function openPicker() {
      let state: State

      try {
        state = (await rpc.get({}, { location: location() })) as State
      } catch (error) {
        context.ui.toast.show({
          title: "Context limit",
          message: `Server plugin is unavailable: ${errorMessage(error)}`,
          variant: "error",
          duration: 5000,
        })
        return
      }

      const selected = await context.ui.dialog.select<string>({
        title: "Context limit for all models",
        placeholder: "Type to filter limits",
        current: String(state.context),
        options: PRESETS.map((preset) => ({
          title: preset.title,
          value: String(preset.context),
          footer: preset.context === 0 ? preset.description : undefined,
        })),
      })

      if (selected === undefined) return

      const next = Number(selected)

      try {
        await rpc.set({ context: next }, { location: location() })
        await refreshModels()
      } catch (error) {
        context.ui.toast.show({
          title: "Context limit",
          message: `Could not apply the limit: ${errorMessage(error)}`,
          variant: "error",
          duration: 5000,
        })
        return
      }

      context.ui.toast.show({
        title: "Context limit",
        message:
          next > 0
            ? `Every model now uses a ${formatContext(next)} context window.`
            : "Every model uses its native context window again.",
        variant: "success",
        duration: 4000,
      })
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "context-limit.set",
          title: "Context window",
          group: "Context limit",
          palette: true,
          suggested: true,
          slash: { name: "context-limit", aliases: ["limit"] },
          run: openPicker,
        },
      ],
    }))

    const stop = rpc.events.on("changed", () => {
      void refreshModels().catch(() => {})
    })

    return () => stop()
  },
})
