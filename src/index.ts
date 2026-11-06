import { Plugin } from "@opencode/plugin"
import { applyContextLimit, normalizeContext } from "./presets"
import { ContextLimitRpc } from "./rpc"

const STORAGE_KEY = "state"

interface StoredState {
  readonly context?: unknown
}

interface LimitEditor {
  list(): readonly {
    limit: {
      context: number
      output: number
      input?: number
    }
  }[]
}

export default Plugin.define({
  id: "context-limit",
  async setup(ctx) {
    const stored = (await ctx.storage.get(STORAGE_KEY)) as StoredState | undefined
    let context = normalizeContext(stored?.context)

    const apply = (editor: LimitEditor) => {
      if (context <= 0) return
      for (const model of editor.list()) {
        applyContextLimit(model, context)
      }
    }

    await ctx.model.transform(apply)

    let emitChanged: ((next: number) => Promise<void>) | undefined

    const registration = await ctx.rpc.register(ContextLimitRpc, {
      get: async () => ({ context }),
      set: async (input) => {
        const next = normalizeContext((input as { context?: unknown }).context)

        await ctx.storage.set(STORAGE_KEY, { context: next })
        context = next
        await ctx.model.reload()
        await emitChanged?.(next)

        return { context }
      },
    })

    emitChanged = (next) => registration.events.emit("changed", { context: next })

    // Plugin instances are created per location, so a change made in one
    // location must reach the others that are already running.
    const controller = new AbortController()
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (event.type !== "rpc.context-limit.changed") continue

        const next = normalizeContext((event.data as { context?: unknown }).context)
        if (next === context) continue

        context = next
        await ctx.model.reload()
      }
    })().catch(() => {})

    return async () => {
      controller.abort()
      await registration.dispose()
    }
  },
})
