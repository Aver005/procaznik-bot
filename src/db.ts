import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DB_PATH || "data/bot_data.sqlite";

// Ensure directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { create: true });

// Инициализация таблицы
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    chat_id INTEGER PRIMARY KEY,
    messages TEXT DEFAULT '[]',
    state TEXT DEFAULT 'idle',
    last_responses TEXT DEFAULT '[]'
  )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS models (
      name TEXT PRIMARY KEY,
      is_active INTEGER DEFAULT 0
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

export interface AIModel
{
    name: string;
    is_active: boolean;
}

export const initModels = (defaultModelName: string) =>
{
    const count = db.query("SELECT COUNT(*) as count FROM models").get() as { count: number };
    if (count.count === 0)
    {
        db.run("INSERT INTO models (name, is_active) VALUES (?, 1)", [defaultModelName]);
        console.log(`Initialized default model: ${defaultModelName}`);
    }
};

export const getModels = (): AIModel[] =>
{
    const rows = db.query("SELECT * FROM models").all() as { name: string, is_active: number }[];
    return rows.map(row => ({
        name: row.name,
        is_active: !!row.is_active
    }));
};

export const getActiveModel = (): AIModel | undefined =>
{
    const row = db.query("SELECT * FROM models WHERE is_active = 1").get() as { name: string, is_active: number };
    if (!row) return undefined;
    return {
        name: row.name,
        is_active: !!row.is_active
    };
};

export const addModel = (name: string) =>
{
    try
    {
        db.run("INSERT INTO models (name, is_active) VALUES (?, 0)", [name]);
        return true;
    } catch (e)
    {
        return false;
    }
};

export const deleteModel = (name: string) =>
{
    // Prevent deleting the active model
    const model = db.query("SELECT * FROM models WHERE name = ?").get(name) as { is_active: number };
    if (model && model.is_active) return false;

    db.run("DELETE FROM models WHERE name = ?", [name]);
    return true;
};

export const setActiveModel = (name: string) =>
{
    db.transaction(() =>
    {
        db.run("UPDATE models SET is_active = 0");
        db.run("UPDATE models SET is_active = 1 WHERE name = ?", [name]);
    })();
};


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
