const { Telegraf, Markup } = require("telegraf");
const { getDetails } = require("./api");
const { sendFile } = require("./utils");
const express = require("express");
const fs = require("fs");

const TOKEN_FILE = "token_store.json";
const TOKEN_VALID_HOURS = 24;

const bot = new Telegraf(process.env.BOT_TOKEN);

// Load or initialize token store
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
  const expiry = new Date(userData.expires_at);
  return new Date() < expiry;
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
        [Markup.button.callback("✅ I Have Token - Verify", "verify")],
        [Markup.button.url("🔗 Get Token", "https://shrtlk.biz/81Rv1")],
        [Markup.button.url("📘 How to Use", "https://example.com/how-to-use")],
      ]),
    );
  }
});

// Verify button handler
bot.action("verify", (ctx) => {
  const userId = ctx.from.id;
  grantToken(userId);
  ctx.editMessageText("✅ Verified! You now have access for 24 hours. Send a Terabox link to download.");
});

// Message handler
bot.on("message", async (ctx) => {
  const userId = ctx.from.id;

  if (!isTokenValid(userId)) {
    return ctx.reply(
      "⚠️ Your access token is missing or expired.\nPlease click Verify below to get 24-hour access.",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ I Have Token - Verify", "verify")],
        [Markup.button.url("🔗 Get Token", "https://shrtlk.biz/81Rv1")],
      ]),
    );
  }

  const messageText = ctx.message?.text || "";
  if (messageText.includes("terabox.com") || messageText.includes("teraboxapp.com")) {
    const details = await getDetails(messageText);
    if (details?.direct_link) {
      ctx.reply(`Sending Files. Please wait...`);
      sendFile(details.direct_link, ctx);
    } else {
      ctx.reply("Something went wrong 🙃");
    }
  } else {
    ctx.reply("Please send a valid Terabox link.");
  }
});

// Express server for webhook (optional)
const app = express();
app.use(bot.webhookCallback("/bot"));
bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/bot`);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));
