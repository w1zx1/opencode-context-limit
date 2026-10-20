import { describe, expect, mock, test } from "bun:test"

// The real package pulls in OpenTUI/Solid peers, which the picker logic does
// not need. `Plugin.define` only adds type information at runtime.
mock.module("@opencode/plugin/tui", () => ({
  Plugin: { define: (plugin: unknown) => plugin },
}))

const { default: plugin } = await import("../tui")

interface Toast {
  message: string
  variant?: string
}

function createContext(selected: string | undefined, options: { failGet?: boolean } = {}) {
  const calls = {
    get: 0,
    set: [] as number[],
    invalidated: 0,
    synced: 0,
    toasts: [] as Toast[],
    layers: [] as any[],
  }

  const rpc = {
    get: async () => {
      calls.get++
      if (options.failGet) throw new Error("rpc unavailable")
      return { context: 0 }
    },
    set: async (input: { context: number }) => {
      calls.set.push(input.context)
      return { context: input.context }
    },
    events: { on: () => () => {} },
  }

  const context = {
    location: { directory: "/tmp/project" },
    client: { rpc: () => rpc },
    data: {
      location: {
        default: () => ({ directory: "/tmp/project" }),
        model: {
          invalidate: () => calls.invalidated++,
          sync: async () => {
            calls.synced++
          },
        },
      },
    },
    ui: {
      dialog: {
        select: async (input: { current?: string; options: { value: string; description?: string; footer?: string }[] }) => {
          expect(input.current).toBe("0")
          expect(input.options.some((option) => option.value === "131072")).toBe(true)
          const medium = input.options.find((option) => option.value === "131072")
          expect(medium?.description).toBeUndefined()
          expect(medium?.footer).toBeUndefined()
          const fallback = input.options.find((option) => option.value === "0")
          expect(fallback?.footer).toBe("Use each model's native context window")
          return selected
        },
      },
      toast: {
        show: (toast: Toast) => calls.toasts.push(toast),
      },
    },
    keymap: {
      layer: (factory: () => any) => calls.layers.push(factory()),
    },
  }

  return { context, calls }
}

describe("tui plugin", () => {
  test("registers a palette command", async () => {
    const { context, calls } = createContext("131072")

    await (plugin.setup as any)(context)

    expect(calls.layers).toHaveLength(1)
    const layer = calls.layers[0]
    expect(layer.mode).toBe("global")

    const entry = layer.commands.find((item: any) => item.id === "context-limit.set")
    expect(entry).toBeDefined()
    expect(entry.palette).toBe(true)
    expect(entry.description).toBeUndefined()
    expect(entry.group).toBe("Context limit")
    expect(entry.slash.name).toBe("context-limit")
  })

  test("applies the chosen preset and refreshes models", async () => {
    const { context, calls } = createContext("131072")

    await (plugin.setup as any)(context)
    const entry = calls.layers[0].commands[0]
    await entry.run()

    expect(calls.get).toBe(1)
    expect(calls.set).toEqual([131_072])
    expect(calls.invalidated).toBe(1)
    expect(calls.synced).toBe(1)
    expect(calls.toasts.at(-1)).toMatchObject({ variant: "success" })
    expect(calls.toasts.at(-1)?.message).toContain("128K")
  })

  test("does nothing when the dialog is dismissed", async () => {
    const { context, calls } = createContext(undefined)

    await (plugin.setup as any)(context)
    await calls.layers[0].commands[0].run()

    expect(calls.set).toEqual([])
    expect(calls.toasts).toEqual([])
  })

  test("reports a missing server plugin", async () => {
    const { context, calls } = createContext("131072", { failGet: true })

    await (plugin.setup as any)(context)
    await calls.layers[0].commands[0].run()

    expect(calls.set).toEqual([])
    expect(calls.toasts).toHaveLength(1)
    expect(calls.toasts[0]).toMatchObject({ variant: "error" })
    expect(calls.toasts[0]?.message).toContain("rpc unavailable")
  })
})
