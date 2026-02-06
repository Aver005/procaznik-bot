import { Bot } from "grammy";
import { clearSession } from "../db";
import { handleGenerate } from "../services/generation";

export function registerCommands(bot: Bot)
{
    bot.command("start", async (ctx) =>
    {
        clearSession(ctx.chat.id);
        await ctx.reply("Привет! Пересылай мне сообщения, и я придумаю смешной ответ. Используй /generate для получения вариантов.");
    });

    bot.command("generate", async (ctx) =>
    {
        await handleGenerate(ctx);
    });
}
