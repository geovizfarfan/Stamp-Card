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

if (!TOKEN || !REWARD_ROLE_ID) {
  console.error("Missing required env vars.");
  process.exit(1);
}

// =====================
// CARDS
// =====================
const STAMP_CARDS = {
  black_design:     { name: "Black Design",      template: "Black_Design.png" },
  bubble:           { name: "Bubble",            template: "Bubble.png" },
  fall:             { name: "Fall",              template: "Fall.png" },
  flower:           { name: "Flower",            template: "Flower.png" },
  furry_friend:     { name: "Furry Friend",      template: "Furry_Friend.png" },
  galaxy:           { name: "Galaxy",            template: "Galaxy.png" },
  inso_by_daisys:   { name: "Inspo by Daisys",   template: "Inso_By_Daisys.png" },
  inspo_by_bi:      { name: "Inspo by Bi",       template: "Inspo_by_Bi.png" },
  inspo_by_les:     { name: "Inspo by Les",      template: "Inspo_By_Les.png" },
  inspo_by_meows:   { name: "Inspo by Meows",    template: "Inspo_By_Meows.png" },
  inspo_by_nonbi:   { name: "Inspo by Non-Bi",   template: "Inspo_By_Non-Bi.png" },
  inspo_by_pets:    { name: "Inspo by Pets",     template: "Inspo_By_Pets.png" },
  inspo_by_pride:   { name: "Inspo by Pride",    template: "Inspo_By_Pride.png" },
  inspo_by_pups:    { name: "Inspo by Pups",     template: "Inspo_By_Pups.png" },
  inspo_by_reptiles:{ name: "Inspo by Reptiles", template: "Inspo_By_Reptiles.png" },
  inspo_by_trans:   { name: "Inspo by Trans",    template: "Inspo_By_Trans.png" },
  nebula:           { name: "Nebula",            template: "Nebula.png" },
  neon_purple:      { name: "Neon Purple",       template: "Neon_Purple.png" },
  og_tbp:           { name: "OG TBP",            template: "OG_TBP_.png" },
  pink_card:        { name: "Pink",              template: "Pink.png" },
  kirby:            { name: "Kirby",             template: "Kirby.png" },
  kirby_meadow:     { name: "Kirby Meadow",      template: "Kirby_2.png" },
  kirby_rainbow:    { name: "Kirby Rainbow",     template: "Kirby_3.png" },
  kirby_neon:       { name: "Kirby Neon",        template: "Kirby_4.png" },
  purple_thunder:   { name: "Purple Thunder",    template: "Purple_Thunder.png" },
  silver_card:      { name: "Silver",            template: "Silver.png" },
  spring_new:       { name: "Spring",            template: "Spring.png" },
  summer:           { name: "Summer",            template: "Summer.png" },
  white_marble:     { name: "White Marble",      template: "White_Marble.png" },
  winter:           { name: "Winter",            template: "Winter.png" },
};

const CARD_CHOICES = Object.entries(STAMP_CARDS).map(([value, c]) => ({ name: c.name, value }));
const CARD_CHOICES_A = CARD_CHOICES.slice(0, 14);  // Black Design → Inspo by Non-Bi
const CARD_CHOICES_B = CARD_CHOICES.slice(14);      // Inspo by Pets → Winter

// =====================
// STAMPS
// =====================
const STAMPS = {
  black_stamp:      { name: "Black",                    file: "Black_Stamp.png" },
  board_princess:   { name: "Board Princess",           file: "Board_Princess_Stamp.png" },
  gold_stamp:       { name: "Gold",                     file: "Gold_Stamp.png" },
  pink_stamp:       { name: "Pink",                     file: "Pink_Stamp.png" },
  purple_stamp:     { name: "Purple",                   file: "Purple_Stamp.png" },
  silver_stamp:     { name: "Silver",                   file: "Silver_Stamp.png" },
  verified_gold:    { name: "Verified Gold",            file: "Verified_Gold.png" },
  verified_black:   { name: "Verified Black",           file: "Verified_Black.png" },
};

const STAMP_CHOICES = Object.entries(STAMPS).map(([value, s]) => ({ name: s.name, value }));

// =====================
// POSITIONS PER CARD
// =====================
const POSITIONS_BY_CARD = {
  black_design: [
    { cx: 257, cy: 404 }, { cx: 498, cy: 404 }, { cx: 757, cy: 404 }, { cx: 994, cy: 404 }, { cx: 1244, cy: 404 },
    { cx: 257, cy: 634 }, { cx: 498, cy: 634 }, { cx: 757, cy: 634 }, { cx: 994, cy: 634 }, { cx: 1242, cy: 634 },
  ],
  bubble: [
    { cx: 274, cy: 419 }, { cx: 500, cy: 419 }, { cx: 736, cy: 419 }, { cx: 966, cy: 419 }, { cx: 1200, cy: 419 },
    { cx: 274, cy: 644 }, { cx: 496, cy: 644 }, { cx: 734, cy: 644 }, { cx: 968, cy: 644 }, { cx: 1198, cy: 644 },
  ],
  fall: [
    { cx: 242, cy: 422 }, { cx: 472, cy: 422 }, { cx: 696, cy: 422 }, { cx: 924, cy: 422 }, { cx: 1150, cy: 422 },
    { cx: 252, cy: 640 }, { cx: 466, cy: 640 }, { cx: 700, cy: 640 }, { cx: 930, cy: 640 }, { cx: 1138, cy: 640 },
  ],
  flower: [
    { cx: 246, cy: 419 }, { cx: 488, cy: 419 }, { cx: 740, cy: 419 }, { cx: 978, cy: 419 }, { cx: 1228, cy: 419 },
    { cx: 242, cy: 625 }, { cx: 492, cy: 625 }, { cx: 742, cy: 625 }, { cx: 986, cy: 625 }, { cx: 1228, cy: 625 },
  ],
  furry_friend: [
    { cx: 252, cy: 425 }, { cx: 504, cy: 425 }, { cx: 744, cy: 425 }, { cx: 986, cy: 425 }, { cx: 1230, cy: 425 },
    { cx: 260, cy: 659 }, { cx: 502, cy: 659 }, { cx: 746, cy: 659 }, { cx: 990, cy: 659 }, { cx: 1226, cy: 659 },
  ],
  galaxy: [
    { cx: 250, cy: 456 }, { cx: 484, cy: 456 }, { cx: 752, cy: 456 }, { cx: 1012, cy: 456 }, { cx: 1262, cy: 456 },
    { cx: 250, cy: 680 }, { cx: 482, cy: 680 }, { cx: 752, cy: 680 }, { cx: 1012, cy: 680 }, { cx: 1268, cy: 680 },
  ],
  inso_by_daisys: [
    { cx: 312, cy: 432 }, { cx: 522, cy: 432 }, { cx: 746, cy: 432 }, { cx: 968, cy: 432 }, { cx: 1186, cy: 432 },
    { cx: 312, cy: 653 }, { cx: 522, cy: 653 }, { cx: 748, cy: 653 }, { cx: 966, cy: 653 }, { cx: 1184, cy: 653 },
  ],
  inspo_by_bi: [
    { cx: 238, cy: 427 }, { cx: 482, cy: 427 }, { cx: 736, cy: 427 }, { cx: 981, cy: 427 }, { cx: 1236, cy: 427 },
    { cx: 238, cy: 656 }, { cx: 486, cy: 656 }, { cx: 736, cy: 656 }, { cx: 981, cy: 656 }, { cx: 1236, cy: 656 },
  ],
  inspo_by_les: [
    { cx: 250, cy: 406 }, { cx: 502, cy: 406 }, { cx: 740, cy: 406 }, { cx: 996, cy: 406 }, { cx: 1230, cy: 406 },
    { cx: 256, cy: 655 }, { cx: 494, cy: 655 }, { cx: 754, cy: 655 }, { cx: 986, cy: 655 }, { cx: 1246, cy: 655 },
  ],
  inspo_by_meows: [
    { cx: 302, cy: 392 }, { cx: 528, cy: 392 }, { cx: 764, cy: 392 }, { cx: 983, cy: 392 }, { cx: 1207, cy: 392 },
    { cx: 304, cy: 611 }, { cx: 528, cy: 611 }, { cx: 764, cy: 611 }, { cx: 983, cy: 611 }, { cx: 1207, cy: 611 },
  ],
  inspo_by_nonbi: [
    { cx: 276, cy: 414 }, { cx: 510, cy: 414 }, { cx: 752, cy: 414 }, { cx: 998, cy: 414 }, { cx: 1254, cy: 414 },
    { cx: 276, cy: 640 }, { cx: 512, cy: 640 }, { cx: 760, cy: 640 }, { cx: 1006, cy: 640 }, { cx: 1254, cy: 640 },
  ],
  inspo_by_pets: [
    { cx: 304, cy: 423 }, { cx: 540, cy: 423 }, { cx: 764, cy: 423 }, { cx: 986, cy: 423 }, { cx: 1222, cy: 423 },
    { cx: 312, cy: 647 }, { cx: 540, cy: 647 }, { cx: 766, cy: 647 }, { cx: 990, cy: 647 }, { cx: 1218, cy: 647 },
  ],
  inspo_by_pride: [
    { cx: 274, cy: 410 }, { cx: 504, cy: 410 }, { cx: 738, cy: 410 }, { cx: 991, cy: 410 }, { cx: 1231, cy: 410 },
    { cx: 274, cy: 634 }, { cx: 510, cy: 634 }, { cx: 744, cy: 634 }, { cx: 991, cy: 634 }, { cx: 1231, cy: 634 },
  ],
  inspo_by_pups: [
    { cx: 284, cy: 443 }, { cx: 528, cy: 443 }, { cx: 762, cy: 443 }, { cx: 1006, cy: 443 }, { cx: 1260, cy: 443 },
    { cx: 286, cy: 685 }, { cx: 526, cy: 685 }, { cx: 760, cy: 685 }, { cx: 1002, cy: 685 }, { cx: 1252, cy: 685 },
  ],
  inspo_by_reptiles: [
    { cx: 286, cy: 372 }, { cx: 516, cy: 372 }, { cx: 736, cy: 372 }, { cx: 972, cy: 372 }, { cx: 1212, cy: 372 },
    { cx: 292, cy: 606 }, { cx: 518, cy: 606 }, { cx: 740, cy: 606 }, { cx: 978, cy: 606 }, { cx: 1210, cy: 606 },
  ],
  inspo_by_trans: [
    { cx: 238, cy: 447 }, { cx: 484, cy: 447 }, { cx: 742, cy: 447 }, { cx: 1004, cy: 447 }, { cx: 1258, cy: 447 },
    { cx: 250, cy: 677 }, { cx: 492, cy: 677 }, { cx: 740, cy: 677 }, { cx: 1000, cy: 677 }, { cx: 1256, cy: 677 },
  ],
  nebula: [
    { cx: 276, cy: 418 }, { cx: 508, cy: 418 }, { cx: 740, cy: 418 }, { cx: 970, cy: 418 }, { cx: 1220, cy: 418 },
    { cx: 284, cy: 638 }, { cx: 512, cy: 638 }, { cx: 746, cy: 638 }, { cx: 972, cy: 638 }, { cx: 1218, cy: 638 },
  ],
  neon_purple: [
    { cx: 256, cy: 447 }, { cx: 516, cy: 447 }, { cx: 768, cy: 447 }, { cx: 1024, cy: 447 }, { cx: 1272, cy: 447 },
    { cx: 258, cy: 670 }, { cx: 508, cy: 670 }, { cx: 760, cy: 670 }, { cx: 1026, cy: 670 }, { cx: 1270, cy: 670 },
  ],
  og_tbp: [
    { cx: 288, cy: 378 }, { cx: 526, cy: 378 }, { cx: 766, cy: 378 }, { cx: 1004, cy: 378 }, { cx: 1242, cy: 378 },
    { cx: 290, cy: 618 }, { cx: 526, cy: 618 }, { cx: 764, cy: 618 }, { cx: 1004, cy: 618 }, { cx: 1244, cy: 618 },
  ],
  pink_card: [
    { cx: 310, cy: 448 }, { cx: 516, cy: 448 }, { cx: 744, cy: 448 }, { cx: 952, cy: 448 }, { cx: 1171, cy: 448 },
    { cx: 310, cy: 649 }, { cx: 516, cy: 649 }, { cx: 744, cy: 649 }, { cx: 952, cy: 649 }, { cx: 1171, cy: 649 },
  ],
  kirby: [
    { cx: 276, cy: 413 }, { cx: 514, cy: 413 }, { cx: 762, cy: 413 }, { cx: 1008, cy: 413 }, { cx: 1246, cy: 413 },
    { cx: 272, cy: 657 }, { cx: 516, cy: 657 }, { cx: 762, cy: 657 }, { cx: 1002, cy: 657 }, { cx: 1248, cy: 657 },
  ],
  kirby_meadow: [
    { cx: 281, cy: 371 }, { cx: 539, cy: 371 }, { cx: 768, cy: 371 }, { cx: 1008, cy: 371 }, { cx: 1256, cy: 371 },
    { cx: 281, cy: 608 }, { cx: 539, cy: 608 }, { cx: 768, cy: 608 }, { cx: 1008, cy: 608 }, { cx: 1256, cy: 608 },
  ],
  kirby_rainbow: [
    { cx: 306, cy: 378 }, { cx: 546, cy: 378 }, { cx: 768, cy: 378 }, { cx: 998, cy: 378 }, { cx: 1214, cy: 378 },
    { cx: 308, cy: 605 }, { cx: 542, cy: 605 }, { cx: 770, cy: 605 }, { cx: 996, cy: 605 }, { cx: 1218, cy: 605 },
  ],
  kirby_neon: [
    { cx: 238, cy: 400 }, { cx: 488, cy: 400 }, { cx: 750, cy: 400 }, { cx: 1016, cy: 400 }, { cx: 1288, cy: 400 },
    { cx: 238, cy: 647 }, { cx: 490, cy: 647 }, { cx: 750, cy: 647 }, { cx: 1016, cy: 647 }, { cx: 1288, cy: 647 },
  ],
  purple_thunder: [
    { cx: 296, cy: 426 }, { cx: 520, cy: 426 }, { cx: 744, cy: 426 }, { cx: 976, cy: 426 }, { cx: 1196, cy: 426 },
    { cx: 300, cy: 643 }, { cx: 522, cy: 643 }, { cx: 750, cy: 643 }, { cx: 982, cy: 643 }, { cx: 1200, cy: 643 },
  ],
  silver_card: [
    { cx: 222, cy: 406 }, { cx: 490, cy: 406 }, { cx: 738, cy: 406 }, { cx: 1002, cy: 406 }, { cx: 1262, cy: 406 },
    { cx: 242, cy: 642 }, { cx: 484, cy: 642 }, { cx: 742, cy: 642 }, { cx: 1000, cy: 642 }, { cx: 1264, cy: 642 },
  ],
  spring_new: [
    { cx: 314, cy: 411 }, { cx: 546, cy: 411 }, { cx: 754, cy: 411 }, { cx: 968, cy: 411 }, { cx: 1192, cy: 411 },
    { cx: 316, cy: 627 }, { cx: 542, cy: 627 }, { cx: 758, cy: 627 }, { cx: 966, cy: 627 }, { cx: 1186, cy: 627 },
  ],
  summer: [
    { cx: 218, cy: 422 }, { cx: 474, cy: 422 }, { cx: 726, cy: 422 }, { cx: 990, cy: 422 }, { cx: 1244, cy: 422 },
    { cx: 230, cy: 644 }, { cx: 470, cy: 644 }, { cx: 730, cy: 644 }, { cx: 984, cy: 644 }, { cx: 1242, cy: 644 },
  ],
  white_marble: [
    { cx: 296, cy: 466 }, { cx: 528, cy: 466 }, { cx: 760, cy: 466 }, { cx: 996, cy: 466 }, { cx: 1230, cy: 466 },
    { cx: 298, cy: 656 }, { cx: 528, cy: 656 }, { cx: 764, cy: 656 }, { cx: 998, cy: 656 }, { cx: 1228, cy: 656 },
  ],
  winter: [
    { cx: 266, cy: 417 }, { cx: 500, cy: 417 }, { cx: 750, cy: 417 }, { cx: 980, cy: 417 }, { cx: 1226, cy: 417 },
    { cx: 262, cy: 640 }, { cx: 506, cy: 640 }, { cx: 750, cy: 640 }, { cx: 982, cy: 640 }, { cx: 1220, cy: 640 },
  ],
};

const STAMP_SIZE_BY_CARD = {
  black_design:      174,
  bubble:            169,
  fall:              167,
  flower:            171,
  furry_friend:      176,
  galaxy:            174,
  inso_by_daisys:    160,
  inspo_by_bi:       182,
  inspo_by_les:      195,
  inspo_by_meows:    176,
  inspo_by_nonbi:    172,
  inspo_by_pets:     171,
  inspo_by_pride:    167,
  inspo_by_pups:     189,
  inspo_by_reptiles: 176,
  inspo_by_trans:    176,
  nebula:            171,
  neon_purple:       163,
  og_tbp:            191,
  pink_card:         163,
  kirby:             193,
  kirby_meadow:      180,
  kirby_rainbow:     198,
  kirby_neon:        198,
  purple_thunder:    154,
  silver_card:       174,
  spring_new:        163,
  summer:            171,
  white_marble:      180,
  winter:            161,
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
      guild_id TEXT, user_id TEXT, card_id TEXT, stamp_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `);
  // Add stamp_id column if it doesn't exist yet
  await pool.query(`
    ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS stamp_id TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS completed_cards (
      id SERIAL PRIMARY KEY,
      guild_id TEXT, user_id TEXT, card_id TEXT,
      card_number INTEGER, completed_at BIGINT,
      claimed BOOLEAN DEFAULT FALSE
    )
  `);
  try {
    try { await pool.query(`ALTER TABLE completed_cards ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT FALSE`); await pool.query(`UPDATE completed_cards SET claimed = FALSE WHERE claimed IS NULL`); console.log("claimed column fixed"); } catch(e) { console.log("claimed error:", e.message); }
    // Set all existing NULL claimed values to false
    await pool.query(`UPDATE completed_cards SET claimed = FALSE WHERE claimed IS NULL`);
    console.log('✅ claimed column ensured');
  } catch(e) {
    console.log('claimed column note:', e.message);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_stamps (
      guild_id TEXT, user_id TEXT, stamp_id TEXT,
      PRIMARY KEY (guild_id, user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      completed_channel_id TEXT,
      manager_role_id TEXT,
      reward_role_id TEXT
    )
  `);
  await pool.query(`ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS manager_role_id TEXT`);
  await pool.query(`ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS reward_role_id TEXT`);
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
  const res = await pool.query("SELECT card_id, stamp_id FROM user_cards WHERE guild_id=$1 AND user_id=$2", [guildId, userId]);
  return res.rows[0] || null;
}
async function setCard(guildId, userId, cardId) {
  await pool.query(
    `INSERT INTO user_cards (guild_id, user_id, card_id) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET card_id=EXCLUDED.card_id`,
    [guildId, userId, cardId]
  );
}
async function setStamp(guildId, userId, stampId) {
  await pool.query(
    `INSERT INTO user_cards (guild_id, user_id, card_id, stamp_id) VALUES ($1,$2,'og',$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET stamp_id=EXCLUDED.stamp_id`,
    [guildId, userId, stampId]
  );
}

async function getStaffStamp(guildId, userId) {
  const res = await pool.query(
    'SELECT stamp_id FROM staff_stamps WHERE guild_id=$1 AND user_id=$2',
    [guildId, userId]
  );
  return res.rows[0]?.stamp_id || 'black_stamp';
}

async function setStaffStamp(guildId, userId, stampId) {
  await pool.query(
    `INSERT INTO staff_stamps (guild_id, user_id, stamp_id) VALUES ($1,$2,$3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET stamp_id=EXCLUDED.stamp_id`,
    [guildId, userId, stampId]
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
async function setClaimedStatus(id, claimed) {
  await pool.query('UPDATE completed_cards SET claimed=$1 WHERE id=$2', [claimed, id]);
}

async function getCompletedCardById(id) {
  const res = await pool.query('SELECT * FROM completed_cards WHERE id=$1', [id]);
  return res.rows[0] || null;
}

async function getHistory(guildId, userId) {
  const res = await pool.query(
    `SELECT id, card_id, card_number, completed_at, claimed FROM completed_cards WHERE guild_id=$1 AND user_id=$2 ORDER BY completed_at DESC`,
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
// GUILD SETTINGS
// =====================
async function getGuildSettings(guildId) {
  const res = await pool.query("SELECT * FROM guild_settings WHERE guild_id=$1", [guildId]);
  return res.rows[0] || null;
}
async function setGuildChannel(guildId, type, channelId) {
  const col = type === "log" ? "log_channel_id" : "completed_channel_id";
  await pool.query(
    `INSERT INTO guild_settings (guild_id, ${col}) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET ${col}=EXCLUDED.${col}`,
    [guildId, channelId]
  );
}
async function setGuildRole(guildId, type, roleId) {
  const col = type === "manager" ? "manager_role_id" : "reward_role_id";
  await pool.query(
    `INSERT INTO guild_settings (guild_id, ${col}) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET ${col}=EXCLUDED.${col}`,
    [guildId, roleId]
  );
}
async function resolveChannel(guildId, type) {
  const settings = await getGuildSettings(guildId);
  if (type === "log") return settings?.log_channel_id || STAMP_LOG_CHANNEL_ID || "";
  return settings?.completed_channel_id || STAMP_COMPLETED_CHANNEL_ID || "";
}
async function resolveRewardRole(guildId) {
  const settings = await getGuildSettings(guildId);
  return settings?.reward_role_id || REWARD_ROLE_ID || "";
}
async function resolveManagerRole(guildId) {
  const settings = await getGuildSettings(guildId);
  return settings?.manager_role_id || MOD_ROLE_ID || "";
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
      s.setName("setcard").setDescription("Choose your stamp card design")
        .addStringOption((o) =>
          o.setName("card").setDescription("Search for a card design").setRequired(true).setAutocomplete(true)
        )
        .addUserOption((o) => o.setName("user").setDescription("Set card for this user (managers only)"))
    )
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) =>
          o.setName("design").setDescription("Override your saved stamp for this action (optional)").addChoices(...STAMP_CHOICES)
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
          o.setName("card").setDescription("Switch to a new card after reset (optional)").setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s.setName("setstamp").setDescription("Set your preferred stamp design (managers only)")
        .addStringOption((o) =>
          o.setName("design").setDescription("Which stamp?").setRequired(true).addChoices(...STAMP_CHOICES)
        )
    )
    .addSubcommand((s) =>
      s.setName("claim").setDescription("Mark a completed card as claimed/unclaimed (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addIntegerOption((o) => o.setName("card").setDescription("Card number to mark").setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o.setName("status").setDescription("Claimed or unclaimed?").setRequired(true)
            .addChoices(
              { name: "✅ Claimed", value: "claimed" },
              { name: "⏳ Unclaimed", value: "unclaimed" }
            )
        )
    )
    .addSubcommand((s) =>
      s.setName("deletecompleted").setDescription("Remove a completed card from a user's history (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
        .addIntegerOption((o) => o.setName("card").setDescription("Card number to delete").setRequired(true).setMinValue(1))
    )
    .addSubcommand((s) =>
      s.setName("resetall").setDescription("Reset ALL stamp cards in this server (admin/owner only)")
    )
    .addSubcommand((s) =>
      s.setName("setchannel").setDescription("Set the log or completed channel (admin only)")
        .addStringOption((o) =>
          o.setName("type").setDescription("Which channel to set?").setRequired(true)
            .addChoices(
              { name: "📋 Stamp Log", value: "log" },
              { name: "🎉 Completed Cards", value: "completed" }
            )
        )
        .addChannelOption((o) =>
          o.setName("channel").setDescription("The channel to use").setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName("setup").setDescription("Configure the bot for this server (admin only)")
        .addStringOption((o) =>
          o.setName("type").setDescription("What to configure?").setRequired(true)
            .addChoices(
              { name: "🛡️ Manager Role (can add/remove stamps)", value: "manager" },
              { name: "🏆 Reward Role (given on card completion)", value: "reward" }
            )
        )
        .addRoleOption((o) =>
          o.setName("role").setDescription("The role to assign").setRequired(true)
        )
    ),
].map((c) => c.toJSON());

// =====================
// REGISTER COMMANDS
// =====================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  // Clear all commands first, then re-register fresh
  await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log("Slash commands registered globally");
});

// =====================
// RENDER
// =====================
async function renderStampCard(cardId, stampCount, stampId = "black_stamp") {
  const card = STAMP_CARDS[cardId];
  if (!card) throw new Error("Unknown cardId: " + cardId);

  const stamp = STAMPS[stampId] || STAMPS.black_stamp;

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
  const logChannelId = await resolveChannel(interaction.guildId, "log");
  if (!logChannelId) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  await sendToChannel(logChannelId, {
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
  const completedChannelId = await resolveChannel(interaction.guildId, "completed");
  if (!completedChannelId) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  await sendToChannel(completedChannelId, {
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
  const logChannelId = await resolveChannel(interaction.guildId, "log");
  if (!logChannelId) return;
  await sendToChannel(logChannelId, {
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
async function canManage(interaction) {
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  const member = interaction.member;
  const roleIds = member?.roles?.cache ? [...member.roles.cache.keys()] : Array.isArray(member?.roles) ? member.roles : [];
  const dbManagerRole = await resolveManagerRole(interaction.guildId);
  const hasManagerRole = (dbManagerRole && roleIds.includes(dbManagerRole)) ||
    STAMP_MANAGER_ROLE_IDS.some((id) => roleIds.includes(id));
  return Boolean(isOwner || isAdmin || hasManagerRole);
}

// =====================
// AUTOCOMPLETE
// =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isAutocomplete()) return;
  if (interaction.commandName !== "stamp") return;
  const sub = interaction.options.getSubcommand();
  if (sub === "setcard" || sub === "reset") {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = Object.entries(STAMP_CARDS)
      .filter(([, card]) => card.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(([value, card]) => ({ name: card.name, value }));
    await interaction.respond(choices);
  }
});

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

      await interaction.deferReply();

      const savedStamp = await getCard(guildId, user.id);
      const stampId = savedStamp?.stamp_id || 'gold_stamp';

      // First message: header only
      await interaction.editReply({
        content: `## <a:412536pastelpurplesparklies:1489110919354253363> Stamp History for ${user.username} <a:412536pastelpurplesparklies:1489110919354253363>\n<:cards:1489111688849657917> Total cards completed: **${total}**`,
        allowedMentions: { users: [] },
      });

      // Each card: single follow-up with image + all info in caption
      for (const r of rows) {
        if (!STAMP_CARDS[r.card_id]) continue;
        const cardName = STAMP_CARDS[r.card_id]?.name || r.card_id;
        const date = `<t:${Math.floor(r.completed_at / 1000)}:D>`;
        const claimStatus = (r.claimed === true || r.claimed === 't' || r.claimed === 'true') ? `<a:5707lightpurplecheck:1488750465804926976> Claimed` : `<:hourglass:1489113198509424901> Unclaimed`;
        const buffer = await renderStampCard(r.card_id, 10, stampId);
        await interaction.followUp({
          content: `<:medaltop:1489043799307980893> **Card #${r.card_number}** — ${cardName} — ${date} — ${claimStatus}`,
          files: [{ attachment: buffer, name: `card_${r.card_number}.png` }],
          allowedMentions: { users: [] },
        });
      }

      return;
    }

    // ===== DELETE COMPLETED =====
    if (sub === "deletecompleted") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to do this.", ephemeral: true });
      const targetUser = interaction.options.getUser("user", true);
      const cardNumber = interaction.options.getInteger("card", true);

      const res = await pool.query(
        'SELECT * FROM completed_cards WHERE guild_id=$1 AND user_id=$2 AND card_number=$3',
        [guildId, targetUser.id, cardNumber]
      );
      const record = res.rows[0];
      if (!record) return interaction.reply({ content: `❌ Card #${cardNumber} not found for **${targetUser.username}**.`, ephemeral: true });

      await pool.query('DELETE FROM completed_cards WHERE id=$1', [record.id]);

      return interaction.reply({
        content: `🗑️ **Card #${cardNumber}** has been removed from **${targetUser.username}'s** history.`,
        allowedMentions: { users: [] },
      });
    }

    // ===== CLAIM =====
    if (sub === "claim") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to mark claims.", ephemeral: true });
      const targetUser = interaction.options.getUser("user", true);
      const cardNumber = interaction.options.getInteger("card", true);
      const status = interaction.options.getString("status", true);

      // Find the completed card by user and card number
      const res = await pool.query(
        'SELECT * FROM completed_cards WHERE guild_id=$1 AND user_id=$2 AND card_number=$3',
        [guildId, targetUser.id, cardNumber]
      );
      const record = res.rows[0];
      if (!record) return interaction.reply({ content: `❌ Card #${cardNumber} not found for ${targetUser.username}.`, ephemeral: true });

      const claimed = status === 'claimed';
      await setClaimedStatus(record.id, claimed);

      const emoji = claimed ? '✅' : '⏳';
      return interaction.reply({
        content: `${emoji} **Card #${cardNumber}** for **${targetUser.username}** has been marked as **${claimed ? 'Claimed' : 'Unclaimed'}**.`,
        allowedMentions: { users: [] },
      });
    }

    // ===== SETSTAMP =====
    if (sub === "setstamp") {
      if (!(await canManage(interaction))) {
        return interaction.reply({ content: "❌ Only managers can set a stamp preference.", ephemeral: true });
      }
      const stampId = interaction.options.getString("design", true);
      if (!STAMPS[stampId]) return interaction.reply({ content: "❌ Unknown stamp.", ephemeral: true });
      await setStaffStamp(guildId, interaction.user.id, stampId);
      return interaction.reply({
        content: `✅ Your preferred stamp is now **${STAMPS[stampId].name}**. It will be used automatically when you add stamps.`,
        ephemeral: true,
      });
    }

    // ===== SETCARD =====
    if (sub === "setcard") {
      const cardId = interaction.options.getString("card", true);
      const targetUser = interaction.options.getUser("user");
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ Unknown card choice. Please pick from the list.", ephemeral: true });

      const userId = (targetUser && targetUser.id !== interaction.user.id) ? targetUser.id : interaction.user.id;
      const isOther = targetUser && targetUser.id !== interaction.user.id;

      if (isOther && !(await canManage(interaction))) {
        return interaction.reply({ content: "❌ You don't have permission to set another member's card.", ephemeral: true });
      }

      // Transfer stamps from old card to new card
      const oldSaved = await getCard(guildId, userId);
      const oldCardId = oldSaved?.card_id || oldSaved;
      let transferredCount = 0;
      if (oldCardId && oldCardId !== cardId && STAMP_CARDS[oldCardId]) {
        transferredCount = await getCount(guildId, userId, oldCardId);
        if (transferredCount > 0) {
          await deleteCount(guildId, userId, oldCardId);
          await upsertCount(guildId, userId, cardId, transferredCount);
        }
      }

      await setCard(guildId, userId, cardId);

      const transferNote = transferredCount > 0 ? ` **${transferredCount}** stamp(s) have been transferred to the new card!` : "";

      // Render preview with 1 stamp
      await interaction.deferReply({ ephemeral: true });
      const savedStampInfo = await getCard(guildId, userId);
      const previewStampId = savedStampInfo?.stamp_id || "gold_stamp";
      const previewBuffer = await renderStampCard(cardId, 1, previewStampId);

      if (isOther) {
        return interaction.editReply({
          content: `✅ **${targetUser.username}'s** stamp card has been set to **${STAMP_CARDS[cardId].name}**.${transferNote}`,
          files: [{ attachment: previewBuffer, name: "card-preview.png" }],
        });
      }
      return interaction.editReply({
        content: `✅ Your stamp card is now **${STAMP_CARDS[cardId].name}**!${transferNote}
*Here's a preview of your new card:*`,
        files: [{ attachment: previewBuffer, name: "card-preview.png" }],
      });
    }

    // ===== VIEW =====
    if (sub === "view") {
      const user = interaction.options.getUser("user") || interaction.user;
      const saved = await getCard(guildId, user.id);
      const cardId = saved?.card_id || saved || "og";
      const stampId = saved?.stamp_id || "black_stamp";
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ Your saved card is invalid. Run `/stamp setcard` again.", ephemeral: true });
      const count = await getCount(guildId, user.id, cardId);
      const buffer = await renderStampCard(cardId, count, stampId);
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

    // ===== SETCHANNEL =====
    if (sub === "setchannel") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can set channels.", ephemeral: true });
      const type = interaction.options.getString("type", true);
      const channel = interaction.options.getChannel("channel", true);
      if (!channel.isTextBased()) return interaction.reply({ content: "❌ Please select a text channel.", ephemeral: true });
      await setGuildChannel(guildId, type, channel.id);
      const label = type === "log" ? "📋 Stamp Log" : "🎉 Completed Cards";
      return interaction.reply({ content: `✅ **${label}** channel set to ${channel}.`, ephemeral: true });
    }

    // ===== SETUP =====
    if (sub === "setup") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can configure the bot.", ephemeral: true });
      const type = interaction.options.getString("type", true);
      const role = interaction.options.getRole("role", true);
      await setGuildRole(guildId, type, role.id);
      const label = type === "manager" ? "🛡️ Manager Role" : "🏆 Reward Role";
      return interaction.reply({ content: `✅ **${label}** set to ${role}. Staff with this role can now manage stamps.`, ephemeral: true });
    }

    // ===== ADD / REMOVE / RESET =====
    if (sub === "add" || sub === "remove" || sub === "reset") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to manage stamps.", ephemeral: true });
      await interaction.deferReply();

      const targetUser = interaction.options.getUser("user", true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.reply({ content: "❌ I can't find that member in this server.", ephemeral: true });

      const savedCard = await getCard(guildId, targetUser.id);
      const cardId = savedCard?.card_id || savedCard || "og";
      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "❌ That user has an invalid saved card. Ask them to run `/stamp setcard`.", ephemeral: true });

      // RESET
      if (sub === "reset") {
        const current = await getCount(guildId, targetUser.id, cardId);
        await resetUser(guildId, targetUser.id, cardId);
        const newCardId = interaction.options.getString("card") || interaction.options.getString("card2");
        if (newCardId && STAMP_CARDS[newCardId]) await setCard(guildId, targetUser.id, newCardId);
        const activeCardId = newCardId && STAMP_CARDS[newCardId] ? newCardId : cardId;
        const cardSwitchNote = newCardId && STAMP_CARDS[newCardId] ? ` Their card has been switched to **${STAMP_CARDS[newCardId].name}**.` : "";
        const rewardRoleId = await resolveRewardRole(guildId);
        if (rewardRoleId && targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.remove(rewardRoleId).catch(() => {});
        await logStampWithImage({
          interaction, targetUser, cardId: activeCardId, stampId: "black_stamp",
          action: `♻️ Reset (was ${current})${newCardId && STAMP_CARDS[newCardId] ? ` → switched to ${STAMP_CARDS[newCardId].name}` : ""}`,
          count: 0,
        });
        return interaction.editReply(`♻️ Reset complete. ${targetUser.username} is now **0/${STAMP_GOAL}** on **${STAMP_CARDS[activeCardId].name}**.${cardSwitchNote}`);
      }

      // ADD / REMOVE
      const current = await getCount(guildId, targetUser.id, cardId);
      const amount = interaction.options.getInteger("amount") || 1;
      const next = sub === "add" ? current + amount : Math.max(0, current - amount);
      const overrideStamp = interaction.options.getString("design");
      const stampId = overrideStamp || await getStaffStamp(guildId, interaction.user.id);
      const rewardRoleId = await resolveRewardRole(guildId);

      await upsertCount(guildId, targetUser.id, cardId, next);
      await setStamp(guildId, targetUser.id, stampId);

      // Completion with overflow
      if (sub === "add" && current < STAMP_GOAL && next >= STAMP_GOAL) {
        const overflow = next - STAMP_GOAL;
        const prevTotal = await countCompleted(guildId, targetUser.id);
        const cardNumber = prevTotal + 1;
        await insertCompleted(guildId, targetUser.id, cardId, cardNumber);
        await postCompletedWithImage({ interaction, targetUser, cardId, stampId, count: STAMP_GOAL, cardNumber });
        await deleteCount(guildId, targetUser.id, cardId);
        if (rewardRoleId && !targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.add(rewardRoleId).catch(() => {});
        await logStampWithImage({ interaction, targetUser, cardId, stampId, action: `🏅 Card #${cardNumber} COMPLETED & reset for next card`, count: STAMP_GOAL });

        if (overflow > 0) {
          await upsertCount(guildId, targetUser.id, cardId, overflow);
        }

        const overflowNote = overflow > 0 ? ` **${overflow}** stamp(s) have been carried over to their new card!` : ` They can start collecting again!`;
        return interaction.editReply(
          `<a:confettipenguin:1489113733845356704> **${targetUser.username}** has completed **${STAMP_CARDS[cardId].name}** (Card #${cardNumber})! <:medaltop:1489043799307980893>\n${overflowNote}`
        );
      }

      if (rewardRoleId && next >= STAMP_GOAL && !targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.add(rewardRoleId).catch(() => {});
      if (rewardRoleId && next < STAMP_GOAL && targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.remove(rewardRoleId).catch(() => {});

      await logStampWithImage({
        interaction, targetUser, cardId, stampId,
        action: sub === "add" ? `➕ Added ${amount} (${current} → ${next})` : `➖ Removed ${amount} (${current} → ${next})`,
        count: next,
      });
      return interaction.editReply(`✅ ${targetUser.username} now has **${next}/${STAMP_GOAL}** on **${STAMP_CARDS[cardId].name}**.`);
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
