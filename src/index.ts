import { bot } from "./bot";
import { registerCommands } from "./handlers/commands";
import { registerMessageHandlers } from "./handlers/messages";
import { registerCallbacks } from "./handlers/callbacks";

registerCommands(bot);
registerMessageHandlers(bot);
registerCallbacks(bot);

bot.catch((err) => console.error("Bot error:", err));

console.log("Bot started...");
bot.start();
