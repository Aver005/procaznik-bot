import { Bot } from "grammy";
import { clearSession, getModels, addModel, deleteModel, setActiveModel } from "../db";
import { handleGenerate } from "../services/generation";
import { getConfig } from "../config";

const config = getConfig();
const isAdmin = (id?: number) => id !== undefined && config.adminIds.includes(id);

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

    bot.command("myid", async (ctx) =>
    {
        if (!ctx.from?.id) return ctx.reply("Не могу получить твой ID.");
        await ctx.reply(`Твой ID: <code>${ctx.from.id}</code>`, { parse_mode: "HTML" });
    });

    // Admin commands
    bot.command("models", async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return;
        const models = getModels();
        let text = "<b>Список моделей:</b>\n\n";
        models.forEach(m =>
        {
            text += `${m.is_active ? "✅" : "❌"} <code>${m.name}</code>\n`;
        });
        text += "\n<b>Команды:</b>\n/add_model &lt;name&gt;\n/del_model &lt;name&gt;\n/set_model &lt;name&gt;";
        await ctx.reply(text, { parse_mode: "HTML" });
    });

    bot.command("add_model", async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return;
        const name = ctx.match;
        if (!name) return ctx.reply("Укажи имя модели: /add_model <name>");
        
        if (addModel(name))
        {
            await ctx.reply(`Модель <code>${name}</code> добавлена.`, { parse_mode: "HTML" });
        } else
        {
            await ctx.reply("Ошибка добавления (возможно, модель уже существует).");
        }
    });

    bot.command("del_model", async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return;
        const name = ctx.match;
        if (!name) return ctx.reply("Укажи имя модели: /del_model <name>");
        
        if (deleteModel(name))
        {
            await ctx.reply(`Модель <code>${name}</code> удалена.`, { parse_mode: "HTML" });
        } else
        {
            await ctx.reply("Ошибка удаления (нельзя удалить активную модель или её нет).");
        }
    });

    bot.command("set_model", async (ctx) =>
    {
        if (!isAdmin(ctx.from?.id)) return;
        const name = ctx.match;
        if (!name) return ctx.reply("Укажи имя модели: /set_model <name>");
        
        setActiveModel(name);
        await ctx.reply(`Активная модель переключена на <code>${name}</code>`, { parse_mode: "HTML" });
    });
}

