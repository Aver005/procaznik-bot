import { Bot, InlineKeyboard } from "grammy";
import { getSession, clearSession } from "../db";
import { handleGenerate } from "../services/generation";

export function registerCallbacks(bot: Bot)
{
    bot.callbackQuery("btn_generate", async (ctx) =>
    {
        await ctx.answerCallbackQuery();
        await handleGenerate(ctx);
    });

    bot.callbackQuery(/^select_(\d+)$/, async (ctx) =>
    {
        await ctx.answerCallbackQuery("Выбрано!");
    });

    bot.callbackQuery(/^select_variant_(\d+)$/, async (ctx) =>
    {
        const match = ctx.match;
        if (!match || typeof match[1] !== 'string') return;
        const index = parseInt(match[1]);
        const chatId = ctx.chat?.id;
        if (!chatId) return;

        const session = getSession(chatId);
        const responses = session.last_responses;

        if (!responses || !responses[index])
            return ctx.answerCallbackQuery("Вариант устарел или не найден.");

        await ctx.answerCallbackQuery();
        await ctx.reply(`\`${responses[index]}\``, {
            parse_mode: "MarkdownV2",
            reply_markup: new InlineKeyboard()
                .text("Дополнить контекст", "btn_add_context")
                .text("Новый диалог", "btn_new_dialog")
        });
    });

    bot.callbackQuery("btn_regenerate", async (ctx) =>
    {
        await ctx.answerCallbackQuery();
        await handleGenerate(ctx);
    });

    bot.callbackQuery("btn_add_context", async (ctx) =>
    {
        await ctx.answerCallbackQuery("Жду новых сообщений...");
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
        await ctx.reply("Режим дополнения контекста. Пересылай сообщения.");
    });

    bot.callbackQuery("btn_new_dialog", async (ctx) =>
    {
        const chatId = ctx.chat?.id;
        if (chatId) clearSession(chatId);
        await ctx.answerCallbackQuery("Контекст очищен");
        await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
        await ctx.reply("Новый диалог. Контекст очищен.");
    });
}
