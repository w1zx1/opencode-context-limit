import { Rpc } from "@opencode/plugin/rpc"

const stateOutput = {
  type: "object",
  properties: {
    /** 0 means no override. */
    context: { type: "integer", minimum: 0 },
  },
  required: ["context"],
  additionalProperties: false,
} as const

export const ContextLimitRpc = Rpc.define({
  id: "context-limit",
  methods: {
    get: {
      input: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      output: stateOutput,
    },
    set: {
      input: {
        type: "object",
        properties: {
          /** 0 clears the override and restores every native limit. */
          context: { type: "integer", minimum: 0, maximum: 10_000_000 },
        },
        required: ["context"],
        additionalProperties: false,
      },
      output: stateOutput,
    },
  },
  events: {
    changed: {
      schema: {
        type: "object",
        properties: {
          context: { type: "integer", minimum: 0 },
        },
        required: ["context"],
        additionalProperties: false,
      },
    },
  },
})
