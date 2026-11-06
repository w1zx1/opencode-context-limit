/**
 * Shared presets and limit math used by both the server plugin and the TUI.
 */

export interface Preset {
  /** 0 means "use the model default" and clears the override. */
  readonly context: number
  readonly title: string
  readonly description: string
}

export const PRESETS: readonly Preset[] = [
  {
    context: 0,
    title: "Model default",
    description: "Use each model's native context window",
  },
  {
    context: 8_192,
    title: "8K",
    description: "Very small context window",
  },
  {
    context: 16_384,
    title: "16K",
    description: "Small context window",
  },
  {
    context: 32_768,
    title: "32K",
    description: "Compact context window",
  },
  {
    context: 65_536,
    title: "64K",
    description: "Medium context window",
  },
  {
    context: 131_072,
    title: "128K",
    description: "Large context window",
  },
  {
    context: 200_000,
    title: "200K",
    description: "Very large context window",
  },
  {
    context: 262_144,
    title: "256K",
    description: "Very large context window",
  },
  {
    context: 524_288,
    title: "512K",
    description: "Huge context window",
  },
  {
    context: 1_000_000,
    title: "1M",
    description: "One million tokens",
  },
]

export function formatContext(context: number): string {
  if (context <= 0) return "model default"
  if (context >= 1_000_000) return `${context / 1_000_000}M`
  if (context % 1024 === 0) return `${context / 1024}K`
  if (context % 1000 === 0) return `${context / 1000}K`
  return context.toLocaleString("en-US")
}

export function normalizeContext(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0
}

interface LimitTarget {
  limit: {
    context: number
    output: number
    input?: number
  }
}

/**
 * Forces the chosen context limit on one model, even when it is larger than
 * the model's native window.
 *
 * Input and output limits are lowered when needed so they never exceed the
 * chosen context window. Setting context to 0 is a no-op; callers clear the
 * transform instead.
 */
export function applyContextLimit(model: LimitTarget, context: number): void {
  if (!Number.isInteger(context) || context <= 0) return

  model.limit.context = context

  if (Number.isFinite(model.limit.output)) {
    model.limit.output = Math.min(model.limit.output, context)
  }

  if (typeof model.limit.input === "number" && Number.isFinite(model.limit.input)) {
    model.limit.input = Math.min(model.limit.input, context)
  }
}
