import { describe, expect, test } from "bun:test"
import { applyContextLimit, formatContext, normalizeContext, PRESETS } from "../presets"

function model(context: number, output: number, input?: number) {
  return { limit: { context, output, ...(input === undefined ? {} : { input }) } }
}

describe("applyContextLimit", () => {
  test("sets the configured limit on a large model", () => {
    const item = model(200_000, 64_000)

    applyContextLimit(item, 131_072)

    expect(item.limit.context).toBe(131_072)
    expect(item.limit.output).toBe(64_000)
  })

  test("raises the limit above the native window", () => {
    const item = model(16_384, 8_192)

    applyContextLimit(item, 131_072)

    expect(item.limit.context).toBe(131_072)
    expect(item.limit.output).toBe(8_192)
  })

  test("caps the output limit when it exceeds the chosen context", () => {
    const item = model(200_000, 128_000)

    applyContextLimit(item, 32_768)

    expect(item.limit.context).toBe(32_768)
    expect(item.limit.output).toBe(32_768)
  })

  test("caps the input limit when it exceeds the chosen context", () => {
    const item = model(200_000, 32_000, 160_000)

    applyContextLimit(item, 65_536)

    expect(item.limit.context).toBe(65_536)
    expect(item.limit.input).toBe(65_536)
    expect(item.limit.output).toBe(32_000)
  })

  test("does not raise input and output above the chosen context", () => {
    const item = model(16_384, 8_192, 12_000)

    applyContextLimit(item, 131_072)

    expect(item.limit.context).toBe(131_072)
    expect(item.limit.input).toBe(12_000)
    expect(item.limit.output).toBe(8_192)
  })

  test("does nothing when the override is cleared", () => {
    const item = model(200_000, 64_000)

    applyContextLimit(item, 0)

    expect(item.limit).toEqual({ context: 200_000, output: 64_000 })
  })
})

describe("helpers", () => {
  test("normalizes stored values", () => {
    expect(normalizeContext(131_072)).toBe(131_072)
    expect(normalizeContext("131072")).toBe(0)
    expect(normalizeContext(-1)).toBe(0)
    expect(normalizeContext(1.5)).toBe(0)
    expect(normalizeContext(undefined)).toBe(0)
  })

  test("formats context sizes", () => {
    expect(formatContext(0)).toBe("model default")
    expect(formatContext(131_072)).toBe("128K")
    expect(formatContext(200_000)).toBe("200K")
    expect(formatContext(1_000_000)).toBe("1M")
    expect(formatContext(123_456)).toBe("123,456")
  })

  test("presets are unique and ordered", () => {
    const values = PRESETS.map((preset) => preset.context)

    expect(new Set(values).size).toBe(values.length)
    expect(values[0]).toBe(0)
    expect(values).toEqual(values.toSorted((left, right) => left - right))
  })
})
