import { Bot } from "grammy";
import { getConfig } from "./config";

const config = getConfig();

if (!config.telegramToken || config.telegramToken === "YOUR_TELEGRAM_BOT_TOKEN")
{
    console.error("Please set telegramToken in config.json");
    process.exit(1);
}

export const bot = new Bot(config.telegramToken);
