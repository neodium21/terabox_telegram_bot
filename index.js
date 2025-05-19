const { Telegraf, Markup } = require("telegraf");
const { getDetails } = require("./api");
const { sendFile } = require("./utils");
const express = require("express");
const fs = require("fs");

const TOKEN_FILE = "token_store.json";
const TOKEN_VALID_HOURS = 24;
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not defined in environment variables.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Token Management
function loadTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return {};
  return JSON.parse(fs.readFileSync(TOKEN_FILE));
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

function grantToken(userId) {
  const tokens = loadTokens();
  tokens[userId] = {
    expires_at: new Date(Date.now() + TOKEN_VALID_HOURS * 3600000).toISOString(),
  };
  saveTokens(tokens);
}

function isTokenValid(userId) {
  const tokens = loadTokens();
  const userData = tokens[userId];
  if (!userData) return false;
  return new Date() < new Date(userData.expires_at);
}

// /start command
bot.start((ctx) => {
  const userId = ctx.from.id;
  if (isTokenValid(userId)) {
    ctx.reply("✅ You already have access! Send your Terabox link.");
  } else {
    ctx.reply(
      `Hi ${ctx.message.from.first_name},\n\nAccess token required to use this bot.\n\nGet access for 24 hours by clicking Verify.`,
      Markup.inlineKeyboard([
        [Markup.button.url("🔗 Get Token", "https://shrinkme.ink/d4LXST")],
        [Markup.button.url("📘 How to Use", "https://example.com/how-to-use")],
      ])
    );
  }
});

// Verify button handler
bot.action("verify", async (ctx) => {
  const userId = ctx.from.id;
  grantToken(userId);
  await ctx.editMessageText("✅ Verified! You now have access for 24 hours. Send a Terabox link to download.");
});

// Message handler
bot.on("message", async (ctx) => {
  const userId = ctx.from.id;

  if (!isTokenValid(userId)) {
    return ctx.reply(
      "⚠️ Your access token is missing or expired.\nPlease click Verify below to get 24-hour access.",
      Markup.inlineKeyboard([
        [Markup.button.url("🔗 Get Token", "https://shrinkme.ink/d4LXST")],
      ])
    );
  }

  const messageText = ctx.message?.text || "";
  if (messageText.includes("terabox.com") || messageText.includes("teraboxapp.com")) {
    try {
      const details = await getDetails(messageText);
      if (details?.direct_link) {
        ctx.reply("📥 Sending files. Please wait...");
        await sendFile(details.direct_link, ctx);
      } else {
        ctx.reply("❌ Something went wrong. Couldn't fetch the link.");
      }
    } catch (error) {
      console.error("Error in getDetails/sendFile:", error);
      ctx.reply("❌ An unexpected error occurred. Please try again later.");
    }
  } else {
    ctx.reply("❗ Please send a valid Terabox link.");
  }
});

// Webhook/Express server
const app = express();
app.use(bot.webhookCallback("/bot"));

if (WEBHOOK_URL) {
  bot.telegram
    .setWebhook(`${WEBHOOK_URL}/bot`)
    .then(() => {
      console.log(`🚀 Webhook set to: ${WEBHOOK_URL}/bot`);
      app.listen(PORT, () => console.log(`🌐 Bot server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error("❌ Failed to set webhook:", err);
      process.exit(1);
    });
} else {
  console.warn("⚠️ WEBHOOK_URL not provided. Falling back to long polling.");
  bot.launch().then(() => {
    console.log("🤖 Bot started using long polling");
  });
}
