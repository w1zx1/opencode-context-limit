/**
 * The command flow shared by the desktop GUI, kept apart from its Solid UI so
 * it can be tested without a browser.
 */

import { formatContext } from "./presets"

export interface LimitToast {
  readonly title: string
  readonly description: string
  readonly variant: "success" | "error"
  readonly duration: number
}

export interface LimitFlow {
  /** Reads the current override, or throws when the server plugin is unavailable. */
  read(): Promise<{ readonly context: number }>
  /** The context the user chose, or undefined when they dismissed the picker. */
  choose(current: number): Promise<number | undefined>
  apply(context: number): Promise<void>
  refresh(): Promise<void>
  notify(toast: LimitToast): void
  translate(key: string, params?: Record<string, string | number | boolean>): string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function runLimit(flow: LimitFlow): Promise<void> {
  let state: { readonly context: number }

  try {
    state = await flow.read()
  } catch (error) {
    flow.notify({
      title: flow.translate("toast.title"),
      description: `${flow.translate("toast.unavailable")}: ${errorMessage(error)}`,
      variant: "error",
      duration: 5000,
    })
    return
  }

  const next = await flow.choose(state.context)
  if (next === undefined) return

  try {
    await flow.apply(next)
  } catch (error) {
    flow.notify({
      title: flow.translate("toast.title"),
      description: `${flow.translate("toast.failed")}: ${errorMessage(error)}`,
      variant: "error",
      duration: 5000,
    })
    return
  }

  // The server emits `model.updated`, so this only shortens the wait for the
  // open session's context and model picker.
  await flow.refresh().catch(() => {})

  flow.notify({
    title: flow.translate("toast.title"),
    description:
      next > 0
        ? flow.translate("toast.applied", { context: formatContext(next) })
        : flow.translate("toast.reset"),
    variant: "success",
    duration: 4000,
  })
}
