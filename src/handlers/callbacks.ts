import { Bot, InlineKeyboard } from "grammy";
import { getSession, clearSession, getModels, setActiveModel, deleteModel } from "../db";
import { handleGenerate } from "../services/generation";
import { isAdmin } from "../config";

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

    // Model management callbacks
    bot.callbackQuery("refresh_models", async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery("Нет прав");
        await updateModelsMessage(ctx);
    });

    bot.callbackQuery("noop", async (ctx) =>
    {
        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery(/^set_model_(.+)$/, async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery("Нет прав");
        const match = ctx.match;
        const name = match[1];
        if (!name) return ctx.answerCallbackQuery("Ошибка: имя модели не найдено");

        setActiveModel(name);
        await ctx.answerCallbackQuery(`Модель ${name} выбрана`);
        await updateModelsMessage(ctx);
    });

    bot.callbackQuery(/^del_model_(.+)$/, async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery("Нет прав");
        const match = ctx.match;
        const name = match[1];
        if (!name) return ctx.answerCallbackQuery("Ошибка: имя модели не найдено");

        if (deleteModel(name)) await ctx.answerCallbackQuery(`Модель ${name} удалена`);
        else await ctx.answerCallbackQuery("Ошибка удаления (нельзя удалить активную модель)");
        await updateModelsMessage(ctx);
    });

}

async function updateModelsMessage(ctx: any)
{
    const models = getModels();
    const keyboard = new InlineKeyboard();

    models.forEach(m =>
    {
        if (m.is_active)
        {
            keyboard.text(`✅ ${m.name}`, "noop").row();
        } else
        {
            keyboard.text(`${m.name}`, `set_model_${m.name}`);
            keyboard.text(`🗑️`, `del_model_${m.name}`).row();
        }
    });

    keyboard.text("🔄 Обновить", "refresh_models");

    try
    {
        await ctx.editMessageText("<b>Управление моделями:</b>\nНажми на имя, чтобы выбрать. На корзину, чтобы удалить.", {
            parse_mode: "HTML",
            reply_markup: keyboard
        });
    } catch (e)
    {
        // Ignore "message is not modified"
        await ctx.answerCallbackQuery("Список обновлен");
    }
}

