import { describe, expect, mock, test } from "bun:test"

// The real package pulls in the desktop host. The command wiring only needs
// the plugin and registry tokens at runtime.
mock.module("@opencode/plugin/gui", () => ({
  Plugin: { define: (plugin: unknown) => plugin },
  Command: { kind: "registry", id: "command" },
}))

const { default: plugin } = await import("../src/gui")

interface Toast {
  title: string
  description?: string
  variant?: string
}

const location = { directory: "/tmp/project" }

function createContext(
  selected: string | undefined,
  options: { failGet?: boolean; failSet?: boolean; failRefresh?: boolean } = {},
) {
  const calls = {
    get: 0,
    set: [] as number[],
    locations: [] as unknown[],
    invalidated: 0,
    synced: 0,
    toasts: [] as Toast[],
    commands: [] as any[],
  }

  const rpc = {
    get: async (_input: unknown, callOptions?: { location?: unknown }) => {
      calls.get++
      calls.locations.push(callOptions?.location)
      if (options.failGet) throw new Error("rpc unavailable")
      return { context: 0 }
    },
    set: async (input: { context: number }, callOptions?: { location?: unknown }) => {
      calls.set.push(input.context)
      calls.locations.push(callOptions?.location)
      if (options.failSet) throw new Error("write failed")
      return { context: input.context }
    },
  }

  const context = {
    id: "context-limit",
    client: { rpc: () => rpc },
    servers: {
      get: (id: string) =>
        id === "sidecar"
          ? {
              data: {
                location: {
                  default: () => location,
                  model: {
                    invalidate: () => calls.invalidated++,
                    sync: async () => {
                      calls.synced++
                      if (options.failRefresh) throw new Error("refresh failed")
                    },
                  },
                },
              },
            }
          : undefined,
    },
    dialogs: {
      select: async (input: {
        current?: string
        options: { value: string; description?: string }[]
      }) => {
        expect(input.current).toBe("0")
        expect(input.options.some((option) => option.value === "131072")).toBe(true)
        return selected
      },
    },
    toast: {
      show: (toast: Toast) => calls.toasts.push(toast),
    },
    add: (_registry: unknown, item: any) => {
      calls.commands.push(typeof item === "function" ? item() : item)
    },
    t: (key: string, params?: Record<string, string | number | boolean>) => {
      let text = ((plugin as any).i18n?.en?.[key] as string | undefined) ?? key
      for (const [name, value] of Object.entries(params ?? {})) {
        text = text.replaceAll(`{${name}}`, String(value))
      }
      return text
    },
  }

  return { context, calls }
}

describe("gui plugin", () => {
  test("registers palette and slash commands", () => {
    const { context, calls } = createContext("131072")

    ;(plugin.setup as any)(context)

    expect(calls.commands).toHaveLength(2)

    const primary = calls.commands.find((item) => item.id === "set")
    expect(primary).toBeDefined()
    expect(primary.slash.name).toBe("context-limit")
    expect(primary.group).toBe("Context limit")
    expect(primary.suggested).toBe(true)
    expect(primary.description).toBe("Set one context-window limit for all models")

    const alias = calls.commands.find((item) => item.id === "set-alias")
    expect(alias).toBeDefined()
    expect(alias.hidden).toBe(true)
    expect(alias.slash.name).toBe("limit")
    expect(alias.description).toBe(primary.description)
  })

  test("applies the chosen preset and refreshes models", async () => {
    const { context, calls } = createContext("131072")

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.get).toBe(1)
    expect(calls.set).toEqual([131_072])
    expect(calls.locations).toEqual([location, location])
    expect(calls.invalidated).toBe(1)
    expect(calls.synced).toBe(1)
    expect(calls.toasts.at(-1)).toMatchObject({ variant: "success" })
    expect(calls.toasts.at(-1)?.description).toContain("128K")
  })

  test("clears the limit", async () => {
    const { context, calls } = createContext("0")

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.set).toEqual([0])
    expect(calls.toasts.at(-1)?.description).toContain("native context window")
  })

  test("does nothing when the dialog is dismissed", async () => {
    const { context, calls } = createContext(undefined)

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.set).toEqual([])
    expect(calls.toasts).toEqual([])
  })

  test("reports a missing server plugin", async () => {
    const { context, calls } = createContext("131072", { failGet: true })

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.set).toEqual([])
    expect(calls.toasts).toHaveLength(1)
    expect(calls.toasts[0]).toMatchObject({ variant: "error" })
    expect(calls.toasts[0]?.description).toContain("rpc unavailable")
  })

  test("reports a failed write", async () => {
    const { context, calls } = createContext("131072", { failSet: true })

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.toasts).toHaveLength(1)
    expect(calls.toasts[0]).toMatchObject({ variant: "error" })
    expect(calls.toasts[0]?.description).toContain("write failed")
  })

  test("keeps the success toast when refreshing models fails", async () => {
    const { context, calls } = createContext("131072", { failRefresh: true })

    ;(plugin.setup as any)(context)
    await calls.commands[0].run()

    expect(calls.set).toEqual([131_072])
    expect(calls.toasts).toHaveLength(1)
    expect(calls.toasts[0]).toMatchObject({ variant: "success" })
  })
})
