import { Database } from "bun:sqlite";

const db = new Database("bot_data.sqlite", { create: true });

// Инициализация таблицы
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    chat_id INTEGER PRIMARY KEY,
    messages TEXT DEFAULT '[]',
    state TEXT DEFAULT 'idle',
    last_responses TEXT DEFAULT '[]'
  )
`);

export interface MessageData
{
    sender: string;
    text: string;
}

export interface Session
{
    chat_id: number;
    messages: MessageData[];
    state: 'idle' | 'collecting';
    last_responses: string[];
}

export const getSession = (chatId: number): Session =>
{
    const row = db.query("SELECT * FROM sessions WHERE chat_id = ?").get(chatId) as any;
    if (!row)
    {
        const newSession: Session = {
            chat_id: chatId,
            messages: [],
            state: 'idle',
            last_responses: []
        };
        db.run(
            "INSERT INTO sessions (chat_id, messages, state, last_responses) VALUES (?, ?, ?, ?)",
            [chatId, JSON.stringify([]), 'idle', JSON.stringify([])]
        );
        return newSession;
    }
    return {
        chat_id: row.chat_id,
        messages: JSON.parse(row.messages),
        state: row.state as 'idle' | 'collecting',
        last_responses: JSON.parse(row.last_responses || '[]')
    };
};

export const updateSession = (chatId: number, messages: MessageData[]) =>
{
    db.run("UPDATE sessions SET messages = ? WHERE chat_id = ?", [JSON.stringify(messages), chatId]);
};

export const updateLastResponses = (chatId: number, responses: string[]) =>
{
    db.run("UPDATE sessions SET last_responses = ? WHERE chat_id = ?", [JSON.stringify(responses), chatId]);
};

export const updateState = (chatId: number, state: 'idle' | 'collecting') =>
{
    db.run("UPDATE sessions SET state = ? WHERE chat_id = ?", [state, chatId]);
};

export const clearSession = (chatId: number) =>
{
    db.run("UPDATE sessions SET messages = '[]', state = 'idle', last_responses = '[]' WHERE chat_id = ?", [chatId]);
};

export const addMessage = (chatId: number, message: MessageData) =>
{
    const session = getSession(chatId);
    session.messages.push(message);
    updateSession(chatId, session.messages);
};
