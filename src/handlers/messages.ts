import { Bot, InlineKeyboard } from "grammy";
import { addMessage, getSession } from "../db";

type DebounceState = {
    timer: ReturnType<typeof setTimeout> | null;
    count: number;
};

const forwardDebouncers = new Map<number, DebounceState>();

export function registerMessageHandlers(bot: Bot)
{
    bot.on(["message:text", "message:caption"], async (ctx) =>
    {
        const chatId = ctx.chat.id;
        const text = ctx.message.text || ctx.message.caption || "";
        const msg = ctx.message;

        let sender = "User";

        if (msg.forward_origin)
        {
            const origin = msg.forward_origin;
            if (origin.type === "user")
            {
                sender = origin.sender_user.first_name;
            } else if (origin.type === "chat")
            {
                sender = origin.sender_chat.title || "Chat";
            } else if (origin.type === "channel")
            {
                sender = origin.chat.title || "Channel";
            } else if (origin.type === "hidden_user")
            {
                sender = origin.sender_user_name;
            }
        } else if (msg.from?.id === ctx.me.id)
        {
            return;
        } else
        {
            sender = "Me";
        }

        addMessage(chatId, { sender, text });
        const session = getSession(chatId);

        if (msg.forward_origin)
        {
            const state = forwardDebouncers.get(chatId) || { timer: null, count: 0 };
            if (state.timer) clearTimeout(state.timer);

            state.count++;
            state.timer = setTimeout(async () =>
            {
                forwardDebouncers.delete(chatId);
                const currentSession = getSession(chatId);
                await ctx.reply(`Контекст был расширен на ${state.count} сообщений. Всего: ${currentSession.messages.length}. \nЖми /generate или кнопку ниже.`, {
                    reply_markup: new InlineKeyboard().text("Сгенерировать", "btn_generate")
                });
            }, 100);

            forwardDebouncers.set(chatId, state);
        } else
        {
            await ctx.reply(`Сообщение добавлено. В контексте: ${session.messages.length}. \nЖми /generate или кнопку ниже.`, {
                reply_markup: new InlineKeyboard().text("Сгенерировать", "btn_generate")
            });
        }
    });
}
