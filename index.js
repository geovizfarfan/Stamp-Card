// index.js
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const Database = require("better-sqlite3");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// =====================
// ENV
// =====================
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const REWARD_ROLE_ID = process.env.REWARD_ROLE_ID;

const MOD_ROLE_ID = process.env.MOD_ROLE_ID || "";
const STAMP_MANAGER_ROLE_IDS = (process.env.STAMP_MANAGER_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const STAMP_LOG_CHANNEL_ID = process.env.STAMP_LOG_CHANNEL_ID || "";
const STAMP_COMPLETED_CHANNEL_ID = process.env.STAMP_COMPLETED_CHANNEL_ID || "";

const STAMP_GOAL = Number(process.env.STAMP_GOAL || 10);

if (!TOKEN || !GUILD_ID || !REWARD_ROLE_ID) {
  console.error(
    "Missing required env vars. Check .env (DISCORD_TOKEN, GUILD_ID, REWARD_ROLE_ID)"
  );
  process.exit(1);
}

if (!STAMP_LOG_CHANNEL_ID) {
  console.warn("⚠️ STAMP_LOG_CHANNEL_ID not set — stamp logs will be disabled.");
}
if (!STAMP_COMPLETED_CHANNEL_ID) {
  console.warn(
    "⚠️ STAMP_COMPLETED_CHANNEL_ID not set — completed posts will be disabled."
  );
}

// =====================
// CARDS
// =====================
const STAMP_CARDS = {
  og: { name: "TBP OG", template: "TBP OG Stamp Card.png" },
  pink: { name: "TBP Pink", template: "TBP Pink Stamp Card.png" },
  black: { name: "TBP Black", template: "TBP Black Stamp Card.png" },
  beige: { name: "TBP Beige", template: "TBP Beige Stamp Card.png" },
  marbled: { name: "TBP Marbled", template: "TBP Marbled Stamp Card.png" },
  tbp: { name: "TBP Stamp Card", template: "TBP Stamp Card.png" },
};

const CARD_CHOICES = Object.entries(STAMP_CARDS).map(([value, c]) => ({
  name: c.name,
  value,
}));

// =====================
// POSITIONS PER CARD
// =====================
const POSITIONS_BY_CARD = {
  og: [
    { cx: 240, cy: 210 },
    { cx: 345, cy: 210 },
    { cx: 450, cy: 210 },
    { cx: 555, cy: 210 },
    { cx: 660, cy: 210 },
    { cx: 240, cy: 314 },
    { cx: 345, cy: 314 },
    { cx: 450, cy: 314 },
    { cx: 555, cy: 314 },
    { cx: 660, cy: 314 },
  ],
  pink: [
    { cx: 128, cy: 220 },
    { cx: 273, cy: 220 },
    { cx: 438, cy: 220 },
    { cx: 603, cy: 220 },
    { cx: 765, cy: 220 },
    { cx: 128, cy: 355 },
    { cx: 273, cy: 355 },
    { cx: 438, cy: 355 },
    { cx: 603, cy: 355 },
    { cx: 765, cy: 355 },
  ],
  black: [
    { cx: 125, cy: 220 },
    { cx: 285, cy: 220 },
    { cx: 447, cy: 220 },
    { cx: 608, cy: 220 },
    { cx: 770, cy: 220 },
    { cx: 125, cy: 355 },
    { cx: 285, cy: 355 },
    { cx: 447, cy: 355 },
    { cx: 608, cy: 355 },
    { cx: 770, cy: 355 },
  ],
  beige: [
    { cx: 124, cy: 230 },
    { cx: 273, cy: 230 },
    { cx: 443, cy: 230 },
    { cx: 613, cy: 230 },
    { cx: 777, cy: 230 },
    { cx: 124, cy: 372 },
    { cx: 273, cy: 372 },
    { cx: 443, cy: 372 },
    { cx: 613, cy: 372 },
    { cx: 777, cy: 372 },
  ],
  marbled: [
    { cx: 131, cy: 226 },
    { cx: 286, cy: 226 },
    { cx: 447, cy: 226 },
    { cx: 607, cy: 226 },
    { cx: 767, cy: 226 },
    { cx: 132, cy: 365 },
    { cx: 288, cy: 365 },
    { cx: 447, cy: 365 },
    { cx: 607, cy: 365 },
    { cx: 767, cy: 365 },
  ],
  tbp: [
    { cx: 165, cy: 214 },
    { cx: 305, cy: 214 },
    { cx: 447, cy: 214 },
    { cx: 587, cy: 214 },
    { cx: 729, cy: 214 },
    { cx: 165, cy: 363 },
    { cx: 305, cy: 363 },
    { cx: 447, cy: 363 },
    { cx: 587, cy: 363 },
    { cx: 729, cy: 363 },
  ],
};

// =====================
// STAMP STYLE PER CARD (size + nudge)
// =====================
const STAMP_STYLE_BY_CARD = {
  og: { w: 90, h: 90, dx: 0, dy: 0 },
  pink: { w: 128, h: 128, dx: 0, dy: 0 },
  black: { w: 130, h: 130, dx: 0, dy: 0 },
  beige: { w: 130, h: 130, dx: 0, dy: 0 },
  marbled: { w: 130, h: 130, dx: 0, dy: 0 },
  tbp: { w: 135, h: 135, dx: 0, dy: 0 },
};

// =====================
// DB
// =====================
const db = new Database("stamps.sqlite");

// progress per user PER card
db.prepare(`
  CREATE TABLE IF NOT EXISTS stamps (
    guild_id TEXT,
    user_id TEXT,
    card_id TEXT,
    count INTEGER,
    updated_at INTEGER,
    PRIMARY KEY (guild_id, user_id, card_id)
  )
`).run();

// chosen card per user
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_cards (
    guild_id TEXT,
    user_id TEXT,
    card_id TEXT,
    PRIMARY KEY (guild_id, user_id)
  )
`).run();

const getCountStmt = db.prepare(
  "SELECT count FROM stamps WHERE guild_id=? AND user_id=? AND card_id=?"
);

const upsertStmt = db.prepare(`
  INSERT INTO stamps (guild_id, user_id, card_id, count, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, user_id, card_id)
  DO UPDATE SET count=excluded.count, updated_at=excluded.updated_at
`);

const deleteStmt = db.prepare(
  "DELETE FROM stamps WHERE guild_id=? AND user_id=? AND card_id=?"
);

const leaderboardStmt = db.prepare(`
  SELECT user_id, card_id, count
  FROM stamps
  WHERE guild_id = ?
  ORDER BY count DESC, updated_at ASC
  LIMIT ?
`);

const resetGuildStmt = db.prepare("DELETE FROM stamps WHERE guild_id=?");

const getCardStmt = db.prepare(
  "SELECT card_id FROM user_cards WHERE guild_id=? AND user_id=?"
);

const setCardStmt = db.prepare(`
  INSERT INTO user_cards (guild_id, user_id, card_id)
  VALUES (?, ?, ?)
  ON CONFLICT(guild_id, user_id)
  DO UPDATE SET card_id=excluded.card_id
`);

// =====================
// DISCORD CLIENT (Guilds only)
// =====================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// =====================
// COMMANDS
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("stamp")
    .setDescription("Stamp card system")

    .addSubcommand((s) =>
      s
        .setName("view")
        .setDescription("View stamp progress")
        .addUserOption((o) => o.setName("user").setDescription("User (optional)"))
    )

.addSubcommand((s) =>
  s
    .setName("leaderboard")
    .setDescription("View the top stamp holders")
)

    .addSubcommand((s) =>
      s
        .setName("setcard")
        .setDescription("Choose which stamp card design you use")
        .addStringOption((o) =>
          o
            .setName("card")
            .setDescription("Which card design?")
            .setRequired(true)
            .addChoices(...CARD_CHOICES)
        )
    )

    .addSubcommand((s) =>
      s
        .setName("add")
        .setDescription("Add stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Amount").setMinValue(1)
        )
    )

    .addSubcommand((s) =>
      s
        .setName("remove")
        .setDescription("Remove stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Amount").setMinValue(1)
        )
    )

    .addSubcommand((s) =>
      s
        .setName("reset")
        .setDescription("Reset a user’s stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
    )

    .addSubcommand((s) =>
      s
        .setName("resetall")
        .setDescription("Reset ALL stamp cards in this server (admin/owner only)")
    ),
].map((c) => c.toJSON());

// =====================
// REGISTER COMMANDS
// =====================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
    body: commands,
  });

  console.log("Slash commands registered");
});

// =====================
// RENDER
// =====================
async function renderStampCard(cardId, stampCount) {
  const card = STAMP_CARDS[cardId];
  if (!card) throw new Error("Unknown cardId: " + cardId);

  const template = await loadImage(path.join(__dirname, card.template));
  const stamp = await loadImage(path.join(__dirname, "stamp.png"));

  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(template, 0, 0);

  const positions = POSITIONS_BY_CARD[cardId] || POSITIONS_BY_CARD.og;
  const style = STAMP_STYLE_BY_CARD[cardId] || { w: 90, h: 90, dx: 0, dy: 0 };

  const filled = Math.min(stampCount, positions.length);

  for (let i = 0; i < filled; i++) {
    const { cx, cy } = positions[i];
    ctx.drawImage(
      stamp,
      cx - style.w / 2 + style.dx,
      cy - style.h / 2 + style.dy,
      style.w,
      style.h
    );
  }

  return canvas.toBuffer("image/png");
}

// =====================
// LOGGING HELPERS (WITH IMAGE)
// =====================
async function sendToChannel(channelId, payload) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  await channel.send(payload);
}

async function logStampWithImage({ interaction, targetUser, cardId, action, count }) {
  if (!STAMP_LOG_CHANNEL_ID) return;

  const buffer = await renderStampCard(cardId, count);

  await sendToChannel(STAMP_LOG_CHANNEL_ID, {
    content:
      `🧾 **Stamp Transcript**\n` +
      `• **Member:** ${targetUser} \n` +
      `• **Action:** ${action}\n` +
      `• **Card:** **${STAMP_CARDS[cardId].name}**\n` +
      `• **Total:** **${count}/${STAMP_GOAL}**\n` +
      `• **By:** ${interaction.user} \n` +
      `• **When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    files: [{ attachment: buffer, name: "stamp-card.png" }],
    allowedMentions: { users: [], roles: [] },
  });
}

async function postCompletedWithImage({ interaction, targetUser, cardId, count }) {
  if (!STAMP_COMPLETED_CHANNEL_ID) return;

  const buffer = await renderStampCard(cardId, count);

  await sendToChannel(STAMP_COMPLETED_CHANNEL_ID, {
    content:
      `🎉 **STAMP CARD COMPLETED!** 🎉\n` +
      `👑 **Member:** ${targetUser} \n` +
      `🪪 **Card:** **${STAMP_CARDS[cardId].name}**\n` +
      `✅ **Total:** **${count}/${STAMP_GOAL}**\n` +
      `🛡️ **Verified by:** ${interaction.user}\n` +
      `⏰ <t:${Math.floor(Date.now() / 1000)}:F>`,
    files: [{ attachment: buffer, name: "completed-stamp-card.png" }],
    allowedMentions: { users: [], roles: [] },
  });
}
async function logResetAll({ interaction }) {
  if (!STAMP_LOG_CHANNEL_ID) return;

  await sendToChannel(STAMP_LOG_CHANNEL_ID, {
    content:
      `🧾 **Stamp System Reset (ALL)**\n` +
      `• **Action:** RESET ALL\n` +
      `• **By:** ${interaction.user}\n` +
      `• **Server:** ${interaction.guild.name}\n` +
      `• **When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    allowedMentions: { users: [], roles: [] },
  });
}

// =====================
// PERMISSIONS (works without member intent)
// =====================
function canManage(interaction) {
  const isOwner = interaction.guild.ownerId === interaction.user.id;

  const isAdmin = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );

  const member = interaction.member;

  const roleIds = member?.roles?.cache
    ? [...member.roles.cache.keys()]
    : Array.isArray(member?.roles)
    ? member.roles
    : [];

  const hasManagerRole =
    (MOD_ROLE_ID && roleIds.includes(MOD_ROLE_ID)) ||
    STAMP_MANAGER_ROLE_IDS.some((id) => roleIds.includes(id));

  return Boolean(isOwner || isAdmin || hasManagerRole);
}


// =====================
// HANDLER
// =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "stamp") return;

  try {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ===== LEADERBOARD =====
if (sub === "leaderboard") {
  const rows = leaderboardStmt.all(guildId, 10);

  if (!rows.length) {
    return interaction.reply({
      content: "📊 No stamps have been issued yet.",
      ephemeral: true,
    });
  }

  let rank = 1;
  const lines = [];

  for (const row of rows) {
    const member = await interaction.guild.members
      .fetch(row.user_id)
      .catch(() => null);

    if (!member) continue;

    const cardName = STAMP_CARDS[row.card_id]?.name || "Unknown Card";

    lines.push(
      `**${rank}.** 👑 ${member.user.username} — **${row.count}/${STAMP_GOAL}** (${cardName})`
    );

    rank++;
  }

  return interaction.reply({
    content:
      `🏆 **STAMP LEADERBOARD** 🏆\n\n` +
      lines.join("\n"),
    allowedMentions: { users: [] },
  });
}

// ===== SETCARD =====
    if (sub === "setcard") {
      const cardId = interaction.options.getString("card", true);

      if (!STAMP_CARDS[cardId]) {
        return interaction.reply({ content: "❌ Unknown card choice.", ephemeral: true });
      }

      setCardStmt.run(guildId, interaction.user.id, cardId);

      return interaction.reply({
        content: `✅ Saved! Your stamp card is now **${STAMP_CARDS[cardId].name}**.`,
        ephemeral: true,
      });
    }

    // ===== VIEW =====
    if (sub === "view") {
      const user = interaction.options.getUser("user") || interaction.user;

      const saved = getCardStmt.get(guildId, user.id);
      const cardId = saved?.card_id || "og";

      if (!STAMP_CARDS[cardId]) {
        return interaction.reply({
          content: "❌ Your saved card is invalid. Run `/stamp setcard` again.",
          ephemeral: true,
        });
      }

      const row = getCountStmt.get(guildId, user.id, cardId);
      const count = row?.count || 0;

      const buffer = await renderStampCard(cardId, count);

      return interaction.reply({
        content: `👑 ${user.username} — **${STAMP_CARDS[cardId].name}** — **${count}/${STAMP_GOAL}**`,
        files: [{ attachment: buffer, name: "stamp-card.png" }],
      });
    }

    // ===== RESETALL =====
if (sub === "resetall") {
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );

  if (!isOwner && !isAdmin) {
    return interaction.reply({
      content: "❌ Only the server owner or admins can reset the entire server.",
      ephemeral: true,
    });
  }

  resetGuildStmt.run(guildId);

  // 🔹 LOG IT
  await logResetAll({ interaction });

  return interaction.reply(
    "♻️ **Server reset complete.** All stamp cards are back to **0**."
  );
}


    // ===== ADD / REMOVE / RESET =====
    if (sub === "add" || sub === "remove" || sub === "reset") {
      if (!canManage(interaction)) {
        return interaction.reply({
          content: "❌ You don’t have permission to manage stamps.",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user", true);

      // fetch member for reward role add/remove
      const targetMember = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);

      if (!targetMember) {
        return interaction.reply({
          content: "❌ I can’t find that member in this server.",
          ephemeral: true,
        });
      }

      // Use TARGET user's saved card (or default og)
      const saved = getCardStmt.get(guildId, targetUser.id);
      const cardId = saved?.card_id || "og";

      if (!STAMP_CARDS[cardId]) {
        return interaction.reply({
          content: "❌ That user has an invalid saved card. Ask them to run `/stamp setcard`.",
          ephemeral: true,
        });
      }

      // RESET
      if (sub === "reset") {
        // read current for nicer logging
        const row = getCountStmt.get(guildId, targetUser.id, cardId);
        const current = row?.count || 0;

        deleteStmt.run(guildId, targetUser.id, cardId);

        // remove reward role if present
        if (targetMember.roles.cache.has(REWARD_ROLE_ID)) {
          await targetMember.roles.remove(REWARD_ROLE_ID).catch(() => {});
        }

        // log with image (count is now 0)
        await logStampWithImage({
          interaction,
          targetUser,
          cardId,
          action: `♻️ Reset (was ${current})`,
          count: 0,
        });

        return interaction.reply(
          `♻️ Reset complete. ${targetUser.username} is now **0/${STAMP_GOAL}** on **${STAMP_CARDS[cardId].name}**.`
        );
      }

      // ADD / REMOVE
      const row = getCountStmt.get(guildId, targetUser.id, cardId);
      const current = row?.count || 0;
      const amount = interaction.options.getInteger("amount") || 1;

      const next =
        sub === "add" ? current + amount : Math.max(0, current - amount);

      upsertStmt.run(guildId, targetUser.id, cardId, next, Date.now());

      // completed post ONLY when crossing goal upward
      if (sub === "add" && current < STAMP_GOAL && next >= STAMP_GOAL) {
        await postCompletedWithImage({
          interaction,
          targetUser,
          cardId,
          count: next,
        });
      }

      // reward role logic
      if (next >= STAMP_GOAL && !targetMember.roles.cache.has(REWARD_ROLE_ID)) {
        await targetMember.roles.add(REWARD_ROLE_ID).catch(() => {});
      }
      if (next < STAMP_GOAL && targetMember.roles.cache.has(REWARD_ROLE_ID)) {
        await targetMember.roles.remove(REWARD_ROLE_ID).catch(() => {});
      }

      // transcript log with image
      await logStampWithImage({
        interaction,
        targetUser,
        cardId,
        action:
          sub === "add" ? `➕ Added ${amount} (${current} → ${next})` : `➖ Removed ${amount} (${current} → ${next})`,
        count: next,
      });

      return interaction.reply(
        `✅ ${targetUser.username} now has **${next}/${STAMP_GOAL}** on **${STAMP_CARDS[cardId].name}**.`
      );
    }

    return interaction.reply({ content: "❌ Unknown subcommand.", ephemeral: true });
  } catch (err) {
    console.error("Interaction error:", err);

    const msg = "❌ Something went wrong while running that command.";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
});

client.login(TOKEN);
