import fs from 'fs';
import path from 'path';

export interface Config
{
    telegramToken: string;
    openRouterApiKey: string;
    model: string;
    adminIds: number[];
}

const configPath = path.resolve(process.cwd(), 'config.json');

export const getConfig = (): Config =>
{
    if (!fs.existsSync(configPath))
        throw new Error(`Config file not found at ${configPath}`);
    const rawData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(rawData);
};

export const isAdmin = (userId?: number): boolean =>
{
    if (!userId) return false;
    const config = getConfig();
    return config.adminIds.includes(userId);
};

