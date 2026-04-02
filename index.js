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
const { Pool } = require("pg");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// =====================
// ENV
// =====================
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const REWARD_ROLE_ID = process.env.REWARD_ROLE_ID;
const MOD_ROLE_ID = process.env.MOD_ROLE_ID || "";
const STAMP_MANAGER_ROLE_IDS = (process.env.STAMP_MANAGER_ROLE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const STAMP_LOG_CHANNEL_ID = process.env.STAMP_LOG_CHANNEL_ID || "";
const STAMP_COMPLETED_CHANNEL_ID = process.env.STAMP_COMPLETED_CHANNEL_ID || "";
const STAMP_GOAL = Number(process.env.STAMP_GOAL || 10);

if (!TOKEN || !GUILD_ID || !REWARD_ROLE_ID) {
  console.error("Missing required env vars.");
  process.exit(1);
}

// =====================
// CARDS
// =====================
const STAMP_CARDS = {
  og:      { name: "TBP OG",         template: "TBP OG Stamp Card.png" },
  pink:    { name: "TBP Pink",       template: "TBP Pink Stamp Card.png" },
  black:   { name: "TBP Black",      template: "TBP Black Stamp Card.png" },
  beige:   { name: "TBP Beige",      template: "TBP Beige Stamp Card.png" },
  marbled: { name: "TBP Marbled",    template: "TBP Marbled Stamp Card.png" },
  tbpcard: { name: "TBP Stamp Card", template: "TBP Stamp Card.png" },
  spring:  { name: "TBP Spring",     template: "TBP Spring.png" },
  vibe:    { name: "TBP Vibe",       template: "TBP Vibe.png" },
  dice:    { name: "TBP Dice",       template: "TBP Dice Themed.png" },
  neon:    { name: "TBP Neon",       template: "TBP Neon Royal Night Mode.png" },
};

const CARD_CHOICES = Object.entries(STAMP_CARDS).map(([value, c]) => ({ name: c.name, value }));

// =====================
// STAMPS
// =====================
const STAMPS = {
  crown:         { name: "Crown",                file: "Crown Stamp.png" },
  tbp:           { name: "TBP",                  file: "TBP Stamp.png" },
  ever_after:    { name: "Ever After Approved",  file: "Ever After Stamp.png" },
  staff:         { name: "Staff Approved",       file: "Staff Approved.png" },
  staff_default: { name: "Staff Approved (Default)", file: "Staff Approved Default.png" },
  villain:       { name: "Ever After Villain",   file: "Ever After Villain Stamp.png" },
};

const STAMP_CHOICES = Object.entries(STAMPS).map(([value, s]) => ({ name: s.name, value }));

// =====================
// POSITIONS PER CARD
// =====================
const POSITIONS_BY_CARD = {
  og: [
    { cx: 240, cy: 210 }, { cx: 345, cy: 210 }, { cx: 450, cy: 210 }, { cx: 555, cy: 210 }, { cx: 660, cy: 210 },
    { cx: 240, cy: 314 }, { cx: 345, cy: 314 }, { cx: 450, cy: 314 }, { cx: 555, cy: 314 }, { cx: 660, cy: 314 },
  ],
  pink: [
    { cx: 128, cy: 220 }, { cx: 273, cy: 220 }, { cx: 438, cy: 220 }, { cx: 603, cy: 220 }, { cx: 765, cy: 220 },
    { cx: 128, cy: 355 }, { cx: 273, cy: 355 }, { cx: 438, cy: 355 }, { cx: 603, cy: 355 }, { cx: 765, cy: 355 },
  ],
  black: [
    { cx: 125, cy: 220 }, { cx: 285, cy: 220 }, { cx: 447, cy: 220 }, { cx: 608, cy: 220 }, { cx: 770, cy: 220 },
    { cx: 125, cy: 355 }, { cx: 285, cy: 355 }, { cx: 447, cy: 355 }, { cx: 608, cy: 355 }, { cx: 770, cy: 355 },
  ],
  beige: [
    { cx: 124, cy: 230 }, { cx: 273, cy: 230 }, { cx: 443, cy: 230 }, { cx: 613, cy: 230 }, { cx: 777, cy: 230 },
    { cx: 124, cy: 372 }, { cx: 273, cy: 372 }, { cx: 443, cy: 372 }, { cx: 613, cy: 372 }, { cx: 777, cy: 372 },
  ],
  marbled: [
    { cx: 131, cy: 226 }, { cx: 286, cy: 226 }, { cx: 447, cy: 226 }, { cx: 607, cy: 226 }, { cx: 767, cy: 226 },
    { cx: 132, cy: 365 }, { cx: 288, cy: 365 }, { cx: 447, cy: 365 }, { cx: 607, cy: 365 }, { cx: 767, cy: 365 },
  ],
  tbpcard: [
    { cx: 165, cy: 214 }, { cx: 305, cy: 214 }, { cx: 447, cy: 214 }, { cx: 587, cy: 214 }, { cx: 729, cy: 214 },
    { cx: 165, cy: 363 }, { cx: 305, cy: 363 }, { cx: 447, cy: 363 }, { cx: 587, cy: 363 }, { cx: 729, cy: 363 },
  ],
  spring: [
    { cx: 332, cy: 408 }, { cx: 538, cy: 408 }, { cx: 754, cy: 408 }, { cx: 968, cy: 408 }, { cx: 1178, cy: 408 },
    { cx: 332, cy: 672 }, { cx: 538, cy: 672 }, { cx: 754, cy: 672 }, { cx: 968, cy: 672 }, { cx: 1178, cy: 672 },
  ],
  vibe: [
    { cx: 308, cy: 536 }, { cx: 518, cy: 536 }, { cx: 750, cy: 536 }, { cx: 976, cy: 536 }, { cx: 1200, cy: 536 },
    { cx: 308, cy: 728 }, { cx: 518, cy: 728 }, { cx: 750, cy: 728 }, { cx: 976, cy: 728 }, { cx: 1200, cy: 728 },
  ],
  dice: [
    { cx: 280, cy: 464 }, { cx: 526, cy: 464 }, { cx: 760, cy: 484 }, { cx: 1004, cy: 464 }, { cx: 1246, cy: 464 },
    { cx: 280, cy: 708 }, { cx: 526, cy: 708 }, { cx: 760, cy: 708 }, { cx: 1004, cy: 708 }, { cx: 1246, cy: 708 },
  ],
  neon: [
    { cx: 260, cy: 478 }, { cx: 508, cy: 478 }, { cx: 752, cy: 478 }, { cx: 1018, cy: 478 }, { cx: 1276, cy: 478 },
    { cx: 258, cy: 706 }, { cx: 508, cy: 706 }, { cx: 754, cy: 706 }, { cx: 1010, cy: 706 }, { cx: 1266, cy: 706 },
  ],
};

const STAMP_SIZE_BY_CARD = {
  og:      90,
  pink:    128,
  black:   130,
  beige:   130,
  marbled: 130,
  tbpcard: 135,
  spring:  150,
  vibe:    140,
  dice:    190,
  neon:    160,
};

// =====================
// DB (Postgres)
// =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stamps (
      guild_id TEXT, user_id TEXT, card_id TEXT,
      count INTEGER, updated_at BIGINT,
      PRIMARY KEY (guild_id, user_id, card_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_cards (
      guild_id TEXT, user_id TEXT, card_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS completed_cards (
      id SERIAL PRIMARY KEY,
      guild_id TEXT, user_id TEXT, card_id TEXT,
      card_number INTEGER, completed_at BIGINT
    )
  `);
  console.log("✅ Database tables ready.");
}

// =====================
// DB HELPERS
// =====================
async function getCount(guildId, userId, cardId) {
  const res = await pool.query("SELECT count FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3", [guildId, userId, cardId]);
  return res.rows[0]?.count || 0;
}
async function upsertCount(guildId, userId, cardId, count) {
  await pool.query(
    `INSERT INTO stamps (guild_id, user_id, card_id, count, updated_at) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (guild_id, user_id, card_id) DO UPDATE SET count=EXCLUDED.count, updated_at=EXCLUDED.updated_at`,
    [guildId, userId, cardId, count, Date.now()]
  );
}
async function deleteCount(guildId, userId, cardId) {
  await pool.query("DELETE FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3", [guildId, userId, cardId]);
}
async function getCard(guildId, userId) {
  const res = await pool.query("SELECT card_id FROM user_cards WHERE guild_id=$1 AND user_id=$2", [guildId, userId]);
  return res.rows[0]?.card_id || null;
}
async function setCard(guildId, userId, cardId) {
  await pool.query(
    `INSERT INTO user_cards (guild_id, user_id, card_id) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET card_id=EXCLUDED.card_id`,
    [guildId, userId, cardId]
  );
}
async function countCompleted(guildId, userId) {
  const res = await pool.query("SELECT COUNT(*) as total FROM completed_cards WHERE guild_id=$1 AND user_id=$2", [guildId, userId]);
  return parseInt(res.rows[0].total, 10);
}
async function insertCompleted(guildId, userId, cardId, cardNumber) {
  await pool.query(
    `INSERT INTO completed_cards (guild_id, user_id, card_id, card_number, completed_at) VALUES ($1,$2,$3,$4,$5)`,
    [guildId, userId, cardId, cardNumber, Date.now()]
  );
}
async function getHistory(guildId, userId) {
  const res = await pool.query(
    `SELECT card_id, card_number, completed_at FROM completed_cards WHERE guild_id=$1 AND user_id=$2 ORDER BY completed_at DESC`,
    [guildId, userId]
  );
  return res.rows;
}
async function resetUser(guildId, userId, cardId) {
  await pool.query("DELETE FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3", [guildId, userId, cardId]);
  await pool.query("DELETE FROM completed_cards WHERE guild_id=$1 AND user_id=$2", [guildId, userId]);
}
async function resetAll(guildId) {
  await pool.query("DELETE FROM stamps WHERE guild_id=$1", [guildId]);
  await pool.query("DELETE FROM completed_cards WHERE guild_id=$1", [guildId]);
}
async function getLeaderboard(guildId) {
  const res = await pool.query(
    `SELECT user_id,
      COALESCE((SELECT SUM(count) FROM stamps WHERE guild_id=s.guild_id AND user_id=s.user_id),0) as current_stamps,
      COALESCE((SELECT COUNT(*) FROM completed_cards WHERE guild_id=s.guild_id AND user_id=s.user_id),0) as cards_completed
     FROM (
       SELECT DISTINCT guild_id, user_id FROM stamps WHERE guild_id=$1
       UNION
       SELECT DISTINCT guild_id, user_id FROM completed_cards WHERE guild_id=$1
     ) s WHERE guild_id=$1
     ORDER BY cards_completed DESC, current_stamps DESC LIMIT 10`,
    [guildId]
  );
  return res.rows;
}

// =====================
// DISCORD CLIENT
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
      s.setName("view").setDescription("View stamp progress")
        .addUserOption((o) => o.setName("user").setDescription("User (optional)"))
    )
    .addSubcommand((s) =>
      s.setName("leaderboard").setDescription("View the top stamp holders")
    )
    .addSubcommand((s) =>
      s.setName("history").setDescription("View completed stamp card history")
        .addUserOption((o) => o.setName("user").setDescription("User (optional)"))
    )
    .addSubcommand((s) =>
      s.setName("setcard").setDescription("Choose a stamp card design (managers can set for other users too)")
        .addStringOption((o) =>
          o.setName("card").setDescription("Which card design?").setRequired(true).addChoices(...CARD_CHOICES)
        )
        .addUserOption((o) => o.setName("user").setDescription("Set card for this user (managers only)"))
    )
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) =>
          o.setName("stamp").setDescription("Which stamp to use?").setRequired(true).addChoices(...STAMP_CHOICES)
        )
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setMinValue(1))
    )
    .addSubcommand((s) =>
      s.setName("remove").setDescription("Remove stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setMinValue(1))
    )
    .addSubcommand((s) =>
      s.setName("reset").setDescription("Reset a user's stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) =>
          o.setName("card").setDescription("Switch to a new card design after reset (optional)").addChoices(...CARD_CHOICES)
        )
    )
    .addSubcommand((s) =>
      s.setName("resetall").setDescription("Reset ALL stamp cards in this server (admin/owner only)")
    ),
].map((c) => c.toJSON());

// =====================
// REGISTER COMMANDS
// =====================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
  console.log("Slash commands registered");
});

// =====================
// RENDER
// =====================
async function renderStampCard(cardId, stampCount, stampId = "crown") {
  const card = STAMP_CARDS[cardId];
  if (!card) throw new Error("Unknown cardId: " + cardId);

  const stamp = STAMPS[stampId] || STAMPS.crown;

  const template = await loadImage(path.join(__dirname, card.template));
  const stampImg = await loadImage(path.join(__dirname, stamp.file));

  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(template, 0, 0);

  const positions = POSITIONS_BY_CARD[cardId] || POSITIONS_BY_CARD.spring;
  const size = STAMP_SIZE_BY_CARD[cardId] || 150;
  const filled = Math.min(stampCount, positions.length);

  for (let i = 0; i < filled; i++) {
    const { cx, cy } = positions[i];
    ctx.drawImage(stampImg, cx - size / 2, cy - size / 2, size, size);
  }

  return canvas.toBuffer("image/png");
}

// =====================
// LOGGING HELPERS
// =====================
async function sendToChannel(channelId, payload) {
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;
  await channel.send(payload);
}

async function logStampWithImage({ interaction, targetUser, cardId, stampId, action, count }) {
  if (!STAMP_LOG_CHANNEL_ID) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  await sendToChannel(STAMP_LOG_CHANNEL_ID, {
    content:
      `## <:receipts:1488760952924143616> Stamp Transcript\n` +
      `<:BULLET:1488760457073524947> **Member:** ${targetUser}\n` +
      `<:BULLET:1488760457073524947> **Action:** ${action}\n` +
      `<:BULLET:1488760457073524947> **Card:** **${STAMP_CARDS[cardId].name}**\n` +
      `<:BULLET:1488760457073524947> **Total:** **${count}/${STAMP_GOAL}**\n` +
      `<:BULLET:1488760457073524947> **By:** ${interaction.user}\n` +
      `<:BULLET:1488760457073524947> **When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    files: [{ attachment: buffer, name: "stamp-card.png" }],
    allowedMentions: { users: [], roles: [] },
  });
}

async function postCompletedWithImage({ interaction, targetUser, cardId, stampId, count, cardNumber }) {
  if (!STAMP_COMPLETED_CHANNEL_ID) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  await sendToChannel(STAMP_COMPLETED_CHANNEL_ID, {
    content:
      `## <a:8720rainbowconfetti:1488749313130762383> STAMP CARD COMPLETED! <a:8720rainbowconfetti:1488749313130762383>\n` +
      `<a:2313purplecrown:1488749776571863091> **Member:** ${targetUser}\n` +
      `<a:5707lightpurplecheck:1488750465804926976> **Total:** **${count}/${STAMP_GOAL}**\n` +
      `<:518169rolemodpurple:1488750784785940663> **Verified By:** ${interaction.user}\n` +
      `<:18953bulletpoint:1488751383027912797> <t:${Math.floor(Date.now() / 1000)}:F>`,
    files: [{ attachment: buffer, name: "completed-stamp-card.png" }],
    allowedMentions: { users: [], roles: [] },
  });
}

async function logResetAll({ interaction }) {
  if (!STAMP_LOG_CHANNEL_ID) return;
  await sendToChannel(STAMP_LOG_CHANNEL_ID, {
    content:
      `## <:receipts:1488760952924143616> Stamp System Reset (ALL)\n` +
      `<:BULLET:1488760457073524947> **Action:** RESET ALL\n` +
      `<:BULLET:1488760457073524947> **By:** ${interaction.user}\n` +
      `<:BULLET:1488760457073524947> **Server:** ${interaction.guild.name}\n` +
      `<:BULLET:1488760457073524947> **When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    allowedMentions: { users: [], roles: [] },
  });
}

// =====================
// PERMISSIONS
// =====================
function canManage(interaction) {
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  const member = interaction.member;
  const roleIds = member?.roles?.cache ? [...member.roles.cache.keys()] : Array.isArray(member?.roles) ? member.roles : [];
  const hasManagerRole = (MOD_ROLE_ID && roleIds.includes(MOD_ROLE_ID)) || STAMP_MANAGER_ROLE_IDS.some((id) => roleIds.includes(id));
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
      const rows = await getLeaderboard(guildId);
      if (!rows.length) return interaction.reply({ content: "📊 No stamps have been issued yet.", ephemeral: true });
      let rank = 1;
      const lines = [];
      for (const row of rows) {
        const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
        if (!member) continue;
        const completedText = row.cards_completed > 0 ? `\n<:70038namedaltop:1489043799307980893> **${row.cards_completed}** card(s) completed` : "";
        lines.push(`**${rank}.** ${member.user.username} — **${row.current_stamps}/${STAMP_GOAL}**${completedText}`);
        rank++;
      }
      return interaction.reply({
        content: `## <a:962876purplehangingstars:1488748253489926287> STAMP LEADER BOARD <a:962876purplehangingstars:1488748253489926287>\n\n` + lines.join("\n\n"),
        allowedMentions: { users: [] },
      });
    }

    // ===== HISTORY =====
    if (sub === "history") {
      const user = interaction.options.getUser("user") || interaction.user;
      const rows = await getHistory(guildId, user.id);
      const total = await countCompleted(guildId, user.id);
      if (!rows.length) return interaction.reply({ content: `📭 **${user.username}** hasn't completed any stamp cards yet.`, ephemeral: true });
      const lines = rows.map((r) => {
        const cardName = STAMP_CARDS[r.card_id]?.name || r.card_id;
        const date = `<t:${Math.floor(r.completed_at / 1000)}:D>`;
        return `🏅 **Card #${r.card_number}** — ${cardName} — completed ${date}`;
      });
      return interaction.reply({
        content: `## 📜 Stamp Card History for ${user.username}\n🃏 Total cards completed: **${total}**\n\n` + lines.join("\n"),
        ephemeral: false,
        allowedMentions: { users: [] },
      });
    }

    // ===== SETCARD =====
    if (sub === "setcard") {
      const cardId = interaction.options.getString("card", true);
      const targetUser = interaction.options.getUser("user");
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ Unknown card choice.", ephemeral: true });
      if (targetUser && targetUser.id !== interaction.user.id) {
        if (!canManage(interaction)) return interaction.reply({ content: "❌ You don't have permission to set another member's card.", ephemeral: true });
        await setCard(guildId, targetUser.id, cardId);
        return interaction.reply({ content: `✅ **${targetUser.username}'s** stamp card has been set to **${STAMP_CARDS[cardId].name}**.` });
      }
      await setCard(guildId, interaction.user.id, cardId);
      return interaction.reply({ content: `✅ Saved! Your stamp card is now **${STAMP_CARDS[cardId].name}**.`, ephemeral: true });
    }

    // ===== VIEW =====
    if (sub === "view") {
      const user = interaction.options.getUser("user") || interaction.user;
      const savedCard = await getCard(guildId, user.id);
      const cardId = savedCard || "og";
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ Your saved card is invalid. Run `/stamp setcard` again.", ephemeral: true });
      const count = await getCount(guildId, user.id, cardId);
      const buffer = await renderStampCard(cardId, count);
      return interaction.reply({
        content: `👑 ${user.username} — **${STAMP_CARDS[cardId].name}** — **${count}/${STAMP_GOAL}**`,
        files: [{ attachment: buffer, name: "stamp-card.png" }],
      });
    }

    // ===== RESETALL =====
    if (sub === "resetall") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can reset the entire server.", ephemeral: true });
      await resetAll(guildId);
      await logResetAll({ interaction });
      return interaction.reply("♻️ **Server reset complete.** All stamp cards are back to **0**.");
    }

    // ===== ADD / REMOVE / RESET =====
    if (sub === "add" || sub === "remove" || sub === "reset") {
      if (!canManage(interaction)) return interaction.reply({ content: "❌ You don't have permission to manage stamps.", ephemeral: true });

      const targetUser = interaction.options.getUser("user", true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.reply({ content: "❌ I can't find that member in this server.", ephemeral: true });

      const savedCard = await getCard(guildId, targetUser.id);
      const cardId = savedCard || "og";
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ That user has an invalid saved card. Ask them to run `/stamp setcard`.", ephemeral: true });

      // RESET
      if (sub === "reset") {
        const current = await getCount(guildId, targetUser.id, cardId);
        await resetUser(guildId, targetUser.id, cardId);
        const newCardId = interaction.options.getString("card");
        if (newCardId && STAMP_CARDS[newCardId]) await setCard(guildId, targetUser.id, newCardId);
        const activeCardId = newCardId && STAMP_CARDS[newCardId] ? newCardId : cardId;
        const cardSwitchNote = newCardId && STAMP_CARDS[newCardId] ? ` Their card has been switched to **${STAMP_CARDS[newCardId].name}**.` : "";
        if (targetMember.roles.cache.has(REWARD_ROLE_ID)) await targetMember.roles.remove(REWARD_ROLE_ID).catch(() => {});
        await logStampWithImage({
          interaction, targetUser, cardId: activeCardId, stampId: "crown",
          action: `♻️ Reset (was ${current})${newCardId && STAMP_CARDS[newCardId] ? ` → switched to ${STAMP_CARDS[newCardId].name}` : ""}`,
          count: 0,
        });
        return interaction.reply(`♻️ Reset complete. ${targetUser.username} is now **0/${STAMP_GOAL}** on **${STAMP_CARDS[activeCardId].name}**.${cardSwitchNote}`);
      }

      // ADD / REMOVE
      const current = await getCount(guildId, targetUser.id, cardId);
      const amount = interaction.options.getInteger("amount") || 1;
      const next = sub === "add" ? current + amount : Math.max(0, current - amount);
      const stampId = interaction.options.getString("stamp") || "staff_default";

      await upsertCount(guildId, targetUser.id, cardId, next);

      // Completion
      if (sub === "add" && current < STAMP_GOAL && next >= STAMP_GOAL) {
        const prevTotal = await countCompleted(guildId, targetUser.id);
        const cardNumber = prevTotal + 1;
        await insertCompleted(guildId, targetUser.id, cardId, cardNumber);
        await postCompletedWithImage({ interaction, targetUser, cardId, stampId, count: next, cardNumber });
        await deleteCount(guildId, targetUser.id, cardId);
        if (!targetMember.roles.cache.has(REWARD_ROLE_ID)) await targetMember.roles.add(REWARD_ROLE_ID).catch(() => {});
        await logStampWithImage({ interaction, targetUser, cardId, stampId, action: `🏅 Card #${cardNumber} COMPLETED & reset for next card`, count: next });
        return interaction.reply(
          `🎉 **${targetUser.username}** has completed **${STAMP_CARDS[cardId].name}** (Card #${cardNumber})! 🏅\n` +
          `Their card has been reset — they can start collecting again, or use \`/stamp setcard\` to switch to a different card design!`
        );
      }

      if (next >= STAMP_GOAL && !targetMember.roles.cache.has(REWARD_ROLE_ID)) await targetMember.roles.add(REWARD_ROLE_ID).catch(() => {});
      if (next < STAMP_GOAL && targetMember.roles.cache.has(REWARD_ROLE_ID)) await targetMember.roles.remove(REWARD_ROLE_ID).catch(() => {});

      await logStampWithImage({
        interaction, targetUser, cardId, stampId,
        action: sub === "add" ? `➕ Added ${amount} (${current} → ${next})` : `➖ Removed ${amount} (${current} → ${next})`,
        count: next,
      });
      return interaction.reply(`✅ ${targetUser.username} now has **${next}/${STAMP_GOAL}** on **${STAMP_CARDS[cardId].name}**.`);
    }

    return interaction.reply({ content: "❌ Unknown subcommand.", ephemeral: true });

  } catch (err) {
    console.error("Interaction error:", err);
    const msg = "❌ Something went wrong while running that command.";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      else await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

// =====================
// START
// =====================
initDB().then(() => client.login(TOKEN));
