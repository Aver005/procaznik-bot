import OpenAI from 'openai';
import { getConfig } from './config';
import { getActiveModel } from './db';
import fs from 'fs';
import path from 'path';

const config = getConfig();

const getSystemPrompt = (userName: string) =>
{
    let prompt = '';
    try
    {
        const promptPath = path.resolve(process.cwd(), 'public', 'system.md');
        if (fs.existsSync(promptPath))
        {
            prompt = fs.readFileSync(promptPath, 'utf-8');
        }
    } catch (error)
    {
        console.error('Error reading system prompt:', error);
    }
    return prompt.replace(/{{userName}}/g, userName);
};

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openRouterApiKey,
});

export const generateResponses = async (messages: { sender: string; text: string }[], userName: string): Promise<string[]> =>
{
    const contextString = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
    const activeModel = getActiveModel();
    const modelName = activeModel ? activeModel.name : config.model;

    try
    {
        const completion = await openai.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: getSystemPrompt(userName) },
                { role: 'user', content: `Контекст сообщений:\n${contextString}` }
            ],
            response_format: { type: "json_object" }
        });


        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Ошибка генерации: пустой ответ");

        try
        {
            let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            cleanContent = cleanContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

            const jsonMatch = cleanContent.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : cleanContent;

            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed))
            {
                return parsed.slice(0, 3).map(String);
            }
            if (typeof parsed === 'object' && parsed !== null)
            {
                const values = Object.values(parsed).find(val => Array.isArray(val));
                if (values) return (values as any[]).slice(0, 3).map(String);
            }
            return [content];
        }
        catch (e)
        {
            console.error("JSON parse error:", e, "Content:", content);
            throw new Error("Ошибка парсинга ответа модели");
        }

    }
    catch (error)
    {
        console.error("OpenRouter API error:", error);
        throw error instanceof Error ? error : new Error("Ошибка при обращении к нейросети");
    }
};
