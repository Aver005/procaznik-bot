import { Bot } from "grammy";
import { bot } from "./bot";
import { registerCommands } from "./handlers/commands";
import { registerMessageHandlers } from "./handlers/messages";
import { registerCallbacks } from "./handlers/callbacks";
import { initModels } from "./db";
import { getConfig } from "./config";

const config = getConfig();

// Initialize models from config if DB is empty
initModels(config.model);

registerCommands(bot);
registerMessageHandlers(bot);
registerCallbacks(bot);

bot.catch((err) => console.error("Bot error:", err));

console.log("Bot started...");
bot.start();
