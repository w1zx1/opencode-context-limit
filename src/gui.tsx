import type { Context } from "@opencode/plugin/gui"
import { defineGuiPlugin } from "./gui-commands"
import { PRESETS } from "./presets"

async function pickLimit(ctx: Context, current: number): Promise<number | undefined> {
  const selected = await ctx.dialogs.select<string>({
    title: ctx.t("dialog.title"),
    placeholder: ctx.t("dialog.placeholder"),
    current: String(current),
    options: PRESETS.map((preset) => ({
      title: preset.title,
      value: String(preset.context),
      description: preset.description,
    })),
  })

  return selected === undefined ? undefined : Number(selected)
}

export default defineGuiPlugin({ pick: pickLimit })
