
import { Bot } from "grammy";
import { registerCommands } from "./src/commands.js";

// ==========================================
// GOLD TRADE ACCESS
// Telegram bot — Polling mode
// Pocket Option Postback server: DISABLED
// ==========================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN is not configured.");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

let isStopping = false;

// ==========================================
// ERROR HANDLING
// ==========================================

bot.catch((err) => {
  console.error("Telegram bot error:", err);
});

// ==========================================
// START BOT
// ==========================================

async function startBot() {
  try {
    console.log("GOLD TRADE ACCESS: starting...");

    // Verify Telegram connection
    const me = await bot.api.getMe();

    console.log(`Telegram connected: @${me.username}`);

    // Remove any previously configured webhook.
    // The bot uses Polling on FadeHost.
    await bot.api.deleteWebhook({
      drop_pending_updates: false,
    });

    // Initialize commands and persistent storage
    await registerCommands(bot);

    console.log("Commands registered successfully.");

    // Start Telegram long polling
    console.log("Starting Telegram Polling...");

    await bot.start({
      onStart: (botInfo) => {
        console.log(
          `GOLD TRADE ACCESS is running as @${botInfo.username}`
        );
      },
    });

  } catch (error) {
    console.error("BOT START ERROR:", error);
    process.exitCode = 1;
  }
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

async function shutdown(signal) {
  if (isStopping) return;

  isStopping = true;

  console.log(`${signal} received. Stopping bot...`);

  try {
    bot.stop();
    console.log("Telegram bot stopped.");
  } catch (error) {
    console.error("Shutdown error:", error);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// ==========================================
// RUN
// ==========================================

startBot();

