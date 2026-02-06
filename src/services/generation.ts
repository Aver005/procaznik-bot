import { Context, InlineKeyboard } from "grammy";
import { getSession, updateLastResponses } from "../db";
import { generateResponses } from "../openrouter";
import { getConfig } from "../config";

const config = getConfig();

export async function handleGenerate(ctx: Context)
{
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const session = getSession(chatId);
    if (session.messages.length === 0)
        return ctx.reply("Контекст пуст. Перешли сообщения.");

    const msg = await ctx.reply("Думаю...");
    const userName = ctx.from?.first_name || "User";

    try
    {
        const responses = await generateResponses(session.messages, userName);

        updateLastResponses(chatId, responses);

        let responseText = `Варианты ответа:\n\n`;
        const keyboard = new InlineKeyboard();

        responses.forEach((resp, i) =>
        {
            responseText += `${i + 1}. ${resp}\n\n`;
            keyboard.text(`Вариант ${i + 1}`, `select_variant_${i}`);
        });

        responseText += `\nИспользуется модель:\n<b>${config.model}</b>`;

        keyboard.row();
        keyboard.text("Перегенерировать", "btn_regenerate");
        keyboard.text("Дополнить контекст", "btn_add_context");
        keyboard.text("Новый диалог", "btn_new_dialog");

        await ctx.api.editMessageText(chatId, msg.message_id, responseText, {
            reply_markup: keyboard,
            parse_mode: 'HTML',
        });
    }
    catch (error)
    {
        console.error("Generation error:", error);
        let errorMessage = error instanceof Error ? error.message : `Произошла ошибка при генерации.`;
        errorMessage += `\n\nИспользуется модель:\n<b>${config.model}</b>`;

        const errorKeyboard = new InlineKeyboard()
            .text("Попробовать снова", "btn_regenerate")
            .text("Новый диалог", "btn_new_dialog");

        await ctx.api.editMessageText(chatId, msg.message_id, `Ошибка: ${errorMessage}`, {
            reply_markup: errorKeyboard,
            parse_mode: 'HTML',
        });
    }
}
