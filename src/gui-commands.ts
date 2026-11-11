import { Command, Plugin, type Context } from "@opencode/plugin/gui"
import { runLimit } from "./limit"
import { ContextLimitRpc } from "./rpc"

interface State {
  readonly context: number
}

export interface GuiPluginOptions {
  /** Opens the picker and resolves the chosen context, or undefined when dismissed. */
  readonly pick: (ctx: Context, current: number) => Promise<number | undefined>
}

/**
 * The desktop plugin, kept apart from the Solid picker so it can be tested
 * without a browser.
 */
export function defineGuiPlugin(options: GuiPluginOptions) {
  return Plugin.define({
    i18n: {
      en: {
        "command.title": "Context window",
        "command.description": "Set one context-window limit for all models",
        "command.group": "Context limit",
        "dialog.title": "Context limit for all models",
        "dialog.placeholder": "Type to filter limits",
        "toast.title": "Context limit",
        "toast.unavailable": "Server plugin is unavailable",
        "toast.failed": "Could not apply the limit",
        "toast.applied": "Every model now uses a {{context}} context window.",
        "toast.reset": "Every model uses its native context window again.",
      },
    },
    setup(ctx) {
      // The desktop app reads and refreshes models from the server it runs the
      // plugin on. In the web client that server has no `sidecar` id, and its
      // data store refreshes models from server events on its own.
      const data = () => ctx.servers.get("sidecar")?.data
      const location = () => data()?.location.default()

      async function refreshModels(target: ReturnType<typeof location>) {
        if (!target) return
        const store = data()
        if (!store) return

        store.location.model.invalidate(target)
        await store.location.model.sync(target)
      }

      async function openPicker() {
        const rpc = ctx.client.rpc(ContextLimitRpc)
        const target = location()
        const call = target ? { location: target } : undefined

        await runLimit({
          read: () => rpc.get({}, call) as Promise<State>,
          choose: (current) => options.pick(ctx, current),
          apply: async (context) => {
            await rpc.set({ context }, call)
          },
          refresh: () => refreshModels(target),
          notify: (toast) => ctx.toast.show(toast),
          translate: (key, params) => ctx.t(key, params),
        })
      }

      ctx.add(Command, () => ({
        id: "set",
        title: ctx.t("command.title"),
        description: ctx.t("command.description"),
        group: ctx.t("command.group"),
        keywords: "context window limit tokens",
        suggested: true,
        slash: { name: "context-limit" },
        run: openPicker,
      }))

      // The TUI exposes `/limit` as an alias. GUI slash commands have no alias
      // field, so a hidden second command provides the same name.
      ctx.add(
        Command,
        (): Command => ({
          id: "set-alias",
          title: ctx.t("command.title"),
          description: ctx.t("command.description"),
          hidden: true,
          slash: { name: "limit" },
          run: openPicker,
        }),
      )
    },
  })
}
