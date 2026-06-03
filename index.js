// index.js
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
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
  pink_stamp:       { name: "Pink Crown",               file: "Pink_Stamp.png" },
  purple_stamp:     { name: "Purple Crown",             file: "Purple_Stamp.png" },
  silver_stamp:     { name: "Silver Crown",             file: "Silver_Stamp.png" },
  verified_gold:    { name: "Verified Gold",            file: "Verified_Gold.png" },
  verified_black:   { name: "Verified Black",           file: "Verified_Black_Stamp.png" },
  daisy_stamp:      { name: "Daisy",                    file: "daisy_stamp.png" },
  fall_stamp:       { name: "Fall Pumpkin",             file: "fall_stamp.png" },
  flower_stamp:     { name: "Flower Crown",             file: "flower_stamp.png" },
  fuscia_stamp:     { name: "Fuscia",                   file: "fuscia_stamp.png" },
  les_stamp:        { name: "Lesbian",                  file: "les_stamp.png" },
  meow_stamp:       { name: "Meow",                     file: "meow_stamp.png" },
  pride_stamp:      { name: "Pride",                    file: "pride_stamp.png" },
  pup_stamp:        { name: "Pup",                      file: "pup_stamp.png" },
  trans_stamp:      { name: "Trans",                    file: "trans_stamp.png" },
  kirby_stamp:      { name: "Kirby Heart",              file: "Kirby_stamp.png" },
  kirby_star:       { name: "Kirby Star",               file: "Kirby_star.png" },
  kirby_fuscia:     { name: "Kirby Fuscia",             file: "fucsia_kirby.png" },
  kirby_sleepy:     { name: "Kirby Sleepy",             file: "sleepy_kirby.png" },
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
    { cx: 245, cy: 452 }, { cx: 479, cy: 457 }, { cx: 755, cy: 461 }, { cx: 1015, cy: 460 }, { cx: 1264, cy: 461 },
    { cx: 245, cy: 689 }, { cx: 472, cy: 683 }, { cx: 740, cy: 686 }, { cx: 1022, cy: 686 }, { cx: 1258, cy: 682 },
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
    { cx: 278, cy: 416 }, { cx: 509, cy: 419 }, { cx: 743, cy: 419 }, { cx: 968, cy: 419 }, { cx: 1220, cy: 419 },
    { cx: 281, cy: 635 }, { cx: 509, cy: 641 }, { cx: 742, cy: 634 }, { cx: 973, cy: 632 }, { cx: 1210, cy: 637 },
  ],
  neon_purple: [
    { cx: 259, cy: 440 }, { cx: 511, cy: 451 }, { cx: 763, cy: 451 }, { cx: 1019, cy: 445 }, { cx: 1276, cy: 445 },
    { cx: 263, cy: 670 }, { cx: 511, cy: 670 }, { cx: 766, cy: 668 }, { cx: 1019, cy: 674 }, { cx: 1282, cy: 673 },
  ],
  og_tbp: [
    { cx: 290, cy: 379 }, { cx: 524, cy: 377 }, { cx: 766, cy: 380 }, { cx: 1004, cy: 374 }, { cx: 1241, cy: 377 },
    { cx: 287, cy: 619 }, { cx: 523, cy: 619 }, { cx: 766, cy: 617 }, { cx: 1004, cy: 620 }, { cx: 1240, cy: 619 },
  ],
  pink_card: [
    { cx: 314, cy: 448 }, { cx: 524, cy: 449 }, { cx: 742, cy: 446 }, { cx: 956, cy: 446 }, { cx: 1175, cy: 449 },
    { cx: 313, cy: 649 }, { cx: 517, cy: 646 }, { cx: 742, cy: 649 }, { cx: 952, cy: 647 }, { cx: 1174, cy: 652 },
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
    { cx: 236, cy: 395 }, { cx: 488, cy: 379 }, { cx: 742, cy: 392 }, { cx: 1015, cy: 392 }, { cx: 1270, cy: 392 },
    { cx: 236, cy: 629 }, { cx: 494, cy: 626 }, { cx: 752, cy: 617 }, { cx: 1021, cy: 635 }, { cx: 1270, cy: 635 },
  ],
  purple_thunder: [
    { cx: 296, cy: 424 }, { cx: 529, cy: 430 }, { cx: 748, cy: 431 }, { cx: 974, cy: 428 }, { cx: 1192, cy: 427 },
    { cx: 304, cy: 647 }, { cx: 524, cy: 646 }, { cx: 749, cy: 646 }, { cx: 974, cy: 638 }, { cx: 1199, cy: 643 },
  ],
  silver_card: [
    { cx: 232, cy: 413 }, { cx: 490, cy: 406 }, { cx: 742, cy: 410 }, { cx: 1003, cy: 412 }, { cx: 1261, cy: 403 },
    { cx: 227, cy: 640 }, { cx: 497, cy: 646 }, { cx: 746, cy: 647 }, { cx: 1007, cy: 643 }, { cx: 1262, cy: 640 },
  ],
  spring_new: [
    { cx: 317, cy: 412 }, { cx: 544, cy: 415 }, { cx: 755, cy: 412 }, { cx: 967, cy: 412 }, { cx: 1181, cy: 407 },
    { cx: 311, cy: 625 }, { cx: 541, cy: 622 }, { cx: 749, cy: 625 }, { cx: 965, cy: 625 }, { cx: 1186, cy: 622 },
  ],
  summer: [
    { cx: 218, cy: 422 }, { cx: 473, cy: 424 }, { cx: 731, cy: 424 }, { cx: 974, cy: 422 }, { cx: 1243, cy: 418 },
    { cx: 226, cy: 647 }, { cx: 478, cy: 652 }, { cx: 728, cy: 649 }, { cx: 992, cy: 647 }, { cx: 1240, cy: 649 },
  ],
  white_marble: [
    { cx: 293, cy: 482 }, { cx: 526, cy: 482 }, { cx: 761, cy: 482 }, { cx: 994, cy: 482 }, { cx: 1226, cy: 482 },
    { cx: 293, cy: 675 }, { cx: 529, cy: 675 }, { cx: 766, cy: 675 }, { cx: 991, cy: 675 }, { cx: 1231, cy: 675 },
  ],
  winter: [
    { cx: 256, cy: 419 }, { cx: 505, cy: 412 }, { cx: 748, cy: 421 }, { cx: 985, cy: 410 }, { cx: 1219, cy: 415 },
    { cx: 266, cy: 635 }, { cx: 500, cy: 646 }, { cx: 736, cy: 646 }, { cx: 986, cy: 637 }, { cx: 1225, cy: 640 },
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
  white_marble:      160,
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      guild_id TEXT, name TEXT, label TEXT,
      created_at BIGINT, ended_at BIGINT,
      active BOOLEAN DEFAULT TRUE,
      UNIQUE(guild_id, name)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_campaign_cards (
      guild_id TEXT, user_id TEXT, campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
      card_id TEXT, stamp_id TEXT,
      PRIMARY KEY (guild_id, user_id, campaign_id)
    )
  `);
  await pool.query(`ALTER TABLE stamps ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL`);
  // Simple unique index for per-campaign stamp tracking (no primary key change needed)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS stamps_campaign_pk ON stamps(guild_id, user_id, card_id, COALESCE(campaign_id, -1))`).catch(() => {});
  await pool.query(`ALTER TABLE completed_cards ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL`);
  console.log("✅ Database tables ready.");
}

// =====================
// DB HELPERS
// =====================
async function getCount(guildId, userId, cardId, campaignId = null) {
  if (campaignId) {
    // Get campaign-specific count only
    const res = await pool.query(
      `SELECT COALESCE(SUM(count),0) as count FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3 AND campaign_id=$4`,
      [guildId, userId, cardId, campaignId]
    );
    return parseInt(res.rows[0].count, 10);
  }
  // No campaign — get all stamps for this card
  const res = await pool.query(
    `SELECT COALESCE(SUM(count),0) as count FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3`,
    [guildId, userId, cardId]
  );
  return parseInt(res.rows[0].count, 10);
}
async function upsertCount(guildId, userId, cardId, count, campaignId = null) {
  const updated = await pool.query(
    `UPDATE stamps SET count=$4, updated_at=$5 WHERE guild_id=$1 AND user_id=$2 AND card_id=$3 AND campaign_id IS NOT DISTINCT FROM $6`,
    [guildId, userId, cardId, count, Date.now(), campaignId]
  );
  if (updated.rowCount === 0) {
    await pool.query(
      `INSERT INTO stamps (guild_id, user_id, card_id, count, updated_at, campaign_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [guildId, userId, cardId, count, Date.now(), campaignId]
    ).catch(() => {});
  }
}
async function deleteCount(guildId, userId, cardId, campaignId = null) {
  await pool.query(
    `DELETE FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3 AND campaign_id IS NOT DISTINCT FROM $4`,
    [guildId, userId, cardId, campaignId]
  );
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
async function maxCardNumber(guildId, userId) {
  const res = await pool.query("SELECT COALESCE(MAX(card_number),0) as maxnum FROM completed_cards WHERE guild_id=$1 AND user_id=$2", [guildId, userId]);
  return parseInt(res.rows[0].maxnum, 10);
}
async function insertCompleted(guildId, userId, cardId, cardNumber, campaignId = null) {
  await pool.query(
    `INSERT INTO completed_cards (guild_id, user_id, card_id, card_number, completed_at, campaign_id) VALUES ($1,$2,$3,$4,$5,$6)`,
    [guildId, userId, cardId, cardNumber, Date.now(), campaignId]
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
    `SELECT id, card_id, card_number, completed_at, claimed, campaign_id FROM completed_cards WHERE guild_id=$1 AND user_id=$2 ORDER BY completed_at DESC`,
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

async function getAllMembers(guildId) {
  const res = await pool.query(
    `SELECT user_id,
      COALESCE((SELECT SUM(count) FROM stamps WHERE guild_id=s.guild_id AND user_id=s.user_id),0) as current_stamps,
      COALESCE((SELECT COUNT(*) FROM completed_cards WHERE guild_id=s.guild_id AND user_id=s.user_id),0) as cards_completed,
      COALESCE((SELECT COUNT(*) FROM completed_cards WHERE guild_id=s.guild_id AND user_id=s.user_id AND claimed IS NOT TRUE),0) as unclaimed
     FROM (
       SELECT DISTINCT guild_id, user_id FROM stamps WHERE guild_id=$1
       UNION
       SELECT DISTINCT guild_id, user_id FROM completed_cards WHERE guild_id=$1
     ) s WHERE guild_id=$1
     ORDER BY cards_completed DESC, current_stamps DESC`,
    [guildId]
  );
  return res.rows;
}

async function getCampaignCard(guildId, userId, campaignId) {
  const res = await pool.query(
    `SELECT card_id, stamp_id FROM user_campaign_cards WHERE guild_id=$1 AND user_id=$2 AND campaign_id=$3`,
    [guildId, userId, campaignId]
  );
  return res.rows[0] || null;
}
async function setCampaignCard(guildId, userId, campaignId, cardId, stampId) {
  await pool.query(
    `INSERT INTO user_campaign_cards (guild_id, user_id, campaign_id, card_id, stamp_id) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (guild_id, user_id, campaign_id) DO UPDATE SET card_id=EXCLUDED.card_id, stamp_id=COALESCE(EXCLUDED.stamp_id, user_campaign_cards.stamp_id)`,
    [guildId, userId, campaignId, cardId, stampId]
  );
}
async function setCampaignStamp(guildId, userId, campaignId, stampId) {
  await pool.query(
    `INSERT INTO user_campaign_cards (guild_id, user_id, campaign_id, card_id, stamp_id) VALUES ($1,$2,$3,'og',$4)
     ON CONFLICT (guild_id, user_id, campaign_id) DO UPDATE SET stamp_id=EXCLUDED.stamp_id`,
    [guildId, userId, campaignId, stampId]
  );
}

async function getCampaignStampsForUser(guildId, userId) {
  const res = await pool.query(
    `SELECT c.label, c.id, SUM(s.count) as total
     FROM stamps s
     JOIN campaigns c ON s.campaign_id = c.id
     WHERE s.guild_id=$1 AND s.user_id=$2
     GROUP BY c.id, c.label ORDER BY c.created_at DESC`,
    [guildId, userId]
  );
  return res.rows;
}


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
// CAMPAIGN HELPERS
// =====================
async function createCampaign(guildId, name, label) {
  const res = await pool.query(
    `INSERT INTO campaigns (guild_id, name, label, created_at, active) VALUES ($1,$2,$3,$4,TRUE)
     ON CONFLICT (guild_id, name) DO UPDATE SET label=EXCLUDED.label, ended_at=NULL, active=TRUE
     RETURNING id`,
    [guildId, name, label, Date.now()]
  );
  return res.rows[0].id;
}
async function endCampaign(guildId, name) {
  await pool.query(
    `UPDATE campaigns SET active=FALSE, ended_at=$1 WHERE guild_id=$2 AND name=$3`,
    [Date.now(), guildId, name]
  );
}
async function getActiveCampaign(guildId, name) {
  const res = await pool.query(
    `SELECT * FROM campaigns WHERE guild_id=$1 AND name=$2 AND active=TRUE`,
    [guildId, name]
  );
  return res.rows[0] || null;
}
async function listCampaigns(guildId) {
  const res = await pool.query(
    `SELECT * FROM campaigns WHERE guild_id=$1 ORDER BY created_at DESC LIMIT 20`,
    [guildId]
  );
  return res.rows;
}
async function getCampaignLeaderboard(guildId, campaignId) {
  const res = await pool.query(
    `SELECT user_id, COUNT(*) as cards_completed
     FROM completed_cards
     WHERE guild_id=$1 AND campaign_id=$2
     GROUP BY user_id ORDER BY cards_completed DESC LIMIT 10`,
    [guildId, campaignId]
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
      s.setName("reassign").setDescription("Assign all existing stamps/completed cards to a campaign (managers only)")
        .addStringOption((o) =>
          o.setName("campaign").setDescription("Campaign to assign all existing stamps to").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s.setName("memberlist").setDescription("Show all members' stamp counts (managers only)")
    )
    .addSubcommand((s) =>
      s.setName("memberstats").setDescription("Show a member's full stamp record (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("Member to look up").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("announce").setDescription("DM all members with a new card design announcement (managers only)")
        .addStringOption((o) =>
          o.setName("message").setDescription("The announcement message to DM all members").setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName("view").setDescription("View stamp progress")
        .addUserOption((o) => o.setName("user").setDescription("Member to view").setRequired(true))
        .addStringOption((o) =>
          o.setName("campaign").setDescription("Which campaign to view").setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s.setName("fixcampaigns").setDescription("Fix completed cards with missing campaign (managers only)")
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
        .addStringOption((o) =>
          o.setName("campaign").setDescription("Which campaign is this card for").setRequired(true).setAutocomplete(true)
        )
        .addUserOption((o) => o.setName("user").setDescription("Set card for this user (managers only)"))
    )
    .addSubcommand((s) =>
      s.setName("campaign").setDescription("Manage stamp campaigns (managers only)")
        .addStringOption((o) =>
          o.setName("action").setDescription("What to do").setRequired(true)
            .addChoices(
              { name: "🚀 Start campaign", value: "start" },
              { name: "🛑 End campaign", value: "end" },
              { name: "📋 List campaigns", value: "list" },
              { name: "🏆 Campaign leaderboard", value: "leaderboard" },
            )
        )
        .addStringOption((o) =>
          o.setName("name").setDescription("Campaign name").setAutocomplete(true)
        )
        .addStringOption((o) =>
          o.setName("label").setDescription("Display name (e.g. Summer 2025 Event)")
        )
    )
    .addSubcommand((s) =>
      s.setName("add").setDescription("Add stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) =>
          o.setName("campaign").setDescription("Campaign to add stamps to").setRequired(true).setAutocomplete(true)
        )
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1))
        .addStringOption((o) =>
          o.setName("stamp_design").setDescription("Stamp design (required for 1st stamp, optional after — saves as default)").addChoices(...STAMP_CHOICES)
        )
    )
    .addSubcommand((s) =>
      s.setName("remove").setDescription("Remove stamps (managers only)")
        .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
        .addStringOption((o) => o.setName("campaign").setDescription("Campaign to remove stamps from").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("amount").setDescription("Amount").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for removing stamps").setRequired(true))
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
        .addIntegerOption((o) => o.setName("card").setDescription("Card number to delete (check /stamp history)").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("reason").setDescription("Reason for removal (optional)"))
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
client.once("clientReady", async () => {
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

async function logStampWithImage({ interaction, targetUser, cardId, stampId, action, count, campaignLabel, reason }) {
  const logChannelId = await resolveChannel(interaction.guildId, "log");
  if (!logChannelId) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  const campaignLine = campaignLabel ? `\n<:BULLET:1488760457073524947> **Campaign:** ${campaignLabel}` : "";
  const reasonLine = reason ? `\n<:BULLET:1488760457073524947> **Reason:** ${reason}` : "";
  await sendToChannel(logChannelId, {
    content:
      `## <:receipts:1488760952924143616> Stamp Transcript\n` +
      `<:BULLET:1488760457073524947> **Member:** ${targetUser}\n` +
      `<:BULLET:1488760457073524947> **Action:** ${action}\n` +
      `<:BULLET:1488760457073524947> **Card:** **${STAMP_CARDS[cardId].name}**\n` +
      `<:BULLET:1488760457073524947> **Total:** **${count}/${STAMP_GOAL}**` +
      campaignLine +
      reasonLine +
      `\n<:BULLET:1488760457073524947> **By:** ${interaction.user}\n` +
      `<:BULLET:1488760457073524947> **When:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    files: [{ attachment: buffer, name: "stamp-card.png" }],
    allowedMentions: { users: [], roles: [] },
  });
}

async function postCompletedWithImage({ interaction, targetUser, cardId, stampId, count, cardNumber, campaignLabel }) {
  const completedChannelId = await resolveChannel(interaction.guildId, "completed");
  if (!completedChannelId) return;
  const buffer = await renderStampCard(cardId, count, stampId);
  const campLine = campaignLabel ? `\n<:BULLET:1488760457073524947> **Campaign:** ${campaignLabel}` : "";
  await sendToChannel(completedChannelId, {
    content:
      `## <a:8720rainbowconfetti:1488749313130762383> STAMP CARD COMPLETED! <a:8720rainbowconfetti:1488749313130762383>\n` +
      `<a:2313purplecrown:1488749776571863091> **Member:** ${targetUser}\n` +
      `<a:5707lightpurplecheck:1488750465804926976> **Card #${cardNumber}:** **${STAMP_CARDS[cardId].name}**` +
      campLine +
      `\n<:518169rolemodpurple:1488750784785940663> **Verified By:** ${interaction.user}\n` +
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
  const focused = interaction.options.getFocused(true);
  console.log(`Autocomplete triggered: sub=${sub} focused=${focused.name} guild=${interaction.guildId}`);

  try {  if ((sub === "setcard" || sub === "reset") && focused.name === "card") {
    const choices = Object.entries(STAMP_CARDS)
      .filter(([, card]) => card.name.toLowerCase().includes(focused.value.toLowerCase()))
      .slice(0, 25)
      .map(([value, card]) => ({ name: card.name, value }));
    return interaction.respond(choices);
  }

  if (sub === "setcard" && focused.name === "campaign") {
    const rows = await pool.query(
      `SELECT name, label FROM campaigns WHERE guild_id=$1 AND active=TRUE ORDER BY created_at DESC LIMIT 25`,
      [interaction.guildId]
    );
    const choices = rows.rows
      .filter(r => r.label.toLowerCase().includes(focused.value.toLowerCase()))
      .map(r => ({ name: `🟢 ${r.label}`, value: r.name }));
    return interaction.respond(choices);
  }

  if ((sub === "add" || sub === "remove" || sub === "reassign" || sub === "view") && focused.name === "campaign") {
    const rows = await pool.query(
      `SELECT name, label FROM campaigns WHERE guild_id=$1 AND active=TRUE ORDER BY created_at DESC LIMIT 25`,
      [interaction.guildId]
    );
    const choices = rows.rows
      .filter(r => r.label.toLowerCase().includes(focused.value.toLowerCase()) || r.name.toLowerCase().includes(focused.value.toLowerCase()))
      .map(r => ({ name: r.label, value: r.name }));
    return interaction.respond(choices);
  }

  if (sub === "campaign" && focused.name === "name") {
    const action = interaction.options.getString("action");
    // Start = new campaign, don't suggest existing ones
    if (action === "start") return interaction.respond([]);
    // End = only active campaigns
    const activeOnly = action === "end";
    const rows = await pool.query(
      activeOnly
        ? `SELECT name, label, active FROM campaigns WHERE guild_id=$1 AND active=TRUE ORDER BY created_at DESC LIMIT 25`
        : `SELECT name, label, active FROM campaigns WHERE guild_id=$1 ORDER BY active DESC, created_at DESC LIMIT 25`,
      [interaction.guildId]
    );
    const choices = rows.rows
      .filter(r => r.label.toLowerCase().includes(focused.value.toLowerCase()) || r.name.toLowerCase().includes(focused.value.toLowerCase()))
      .map(r => ({ name: `${r.active ? "🟢" : "🔴"} ${r.label}`, value: r.name }));
    return interaction.respond(choices);
  }
  } catch (err) {
    console.error("Autocomplete error:", err);
    interaction.respond([]).catch(() => {});
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

    // ===== REASSIGN =====
    if (sub === "reassign") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "<:wrong:1510784077794377838> You don't have permission.", flags: 64 });
      await interaction.deferReply({ flags: 64 });

      const campaignName = interaction.options.getString("campaign", true);
      const camp = await getActiveCampaign(guildId, campaignName);
      if (!camp) return interaction.editReply(`<:wrong:1510784077794377838> No active campaign named \`${campaignName}\`.`);

      // Assign all stamps and completed_cards in this guild that have no campaign to this campaign
      const stampsRes = await pool.query(
        `UPDATE stamps SET campaign_id=$1 WHERE guild_id=$2 AND (campaign_id IS NULL) RETURNING user_id`,
        [camp.id, guildId]
      );
      const completedRes = await pool.query(
        `UPDATE completed_cards SET campaign_id=$1 WHERE guild_id=$2 AND (campaign_id IS NULL) RETURNING id`,
        [camp.id, guildId]
      );

      const uniqueMembers = new Set(stampsRes.rows.map(r => r.user_id)).size;
      return interaction.editReply(
        `<:checkmark:1510784068487479318> **Reassign complete!**\n` +
        `<:BULLET:1488760457073524947> Campaign: **${camp.label}**\n` +
        `<:BULLET:1488760457073524947> Stamp records updated: **${stampsRes.rowCount}** (${uniqueMembers} members)\n` +
        `<:BULLET:1488760457073524947> Completed cards updated: **${completedRes.rowCount}**`
      );
    }

    // ===== MEMBERLIST =====
    if (sub === "memberlist") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "<:wrong:1510784077794377838> You don't have permission to view member list.", flags: 64 });
      await interaction.deferReply();

      const rows = await getAllMembers(guildId);
      if (!rows.length) return interaction.editReply({ content: "<:wrong:1510784077794377838> No stamp data found for this server." });

      const PAGE_SIZE = 10;
      const totalPages = Math.ceil(rows.length / PAGE_SIZE);

      const buildPage = async (pageIndex) => {
        const pageRows = rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
        let content = `## <a:purplesparkle:1510784631945953422> All Members Stamps <a:purplesparkle:1510784631945953422>\n*Page ${pageIndex + 1}/${totalPages}*\n\n`;
        for (const row of pageRows) {
          const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
          const name = member ? member.user.username : `Unknown (${row.user_id})`;
          const stamps = Math.min(Number(row.current_stamps), STAMP_GOAL);
          const completedLine = Number(row.cards_completed) > 0 ? `\n<a:completed:1510786649439731803> ${row.cards_completed} Completed` : "";
          const unclaimedLine = Number(row.unclaimed) > 0 ? `\n<a:Loading:1510810314709401751> ${row.unclaimed} Unclaimed` : "";
          content += `### ${name} — ${stamps}/${STAMP_GOAL}${completedLine}${unclaimedLine}\n`;
        }
        return content;
      };

      const buildButtons = (pageIndex) => {
        if (totalPages <= 1) return [];
        return [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ml_prev").setLabel("◀ Previous").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
          new ButtonBuilder().setCustomId("ml_next").setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === totalPages - 1),
        )];
      };

      let currentPage = 0;
      const msg = await interaction.editReply({ content: await buildPage(0), components: buildButtons(0) });
      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120_000 });
      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) return btn.reply({ content: "❌ Only the person who ran this command can flip pages.", flags: 64 });
        if (btn.customId === "ml_prev") currentPage = Math.max(0, currentPage - 1);
        if (btn.customId === "ml_next") currentPage = Math.min(totalPages - 1, currentPage + 1);
        await btn.update({ content: await buildPage(currentPage), components: buildButtons(currentPage) });
      });
      collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // ===== MEMBERSTATS =====
    if (sub === "memberstats") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to view member stats.", flags: 64 });
      const targetUser = interaction.options.getUser("user", true);

      const savedCard = await getCard(guildId, targetUser.id);
      const cardId = savedCard?.card_id;
      const stampId = savedCard?.stamp_id || "black_stamp";
      const currentCount = cardId ? await getCount(guildId, targetUser.id, cardId) : 0;
      const completedRows = await getHistory(guildId, targetUser.id);
      const totalCompleted = completedRows.length;
      const unclaimed = completedRows.filter(r => !(r.claimed === true || r.claimed === 't' || r.claimed === 'true'));
      const claimed = completedRows.filter(r => (r.claimed === true || r.claimed === 't' || r.claimed === 'true'));

      const lines = [
        `## 📋 Member Stats — ${targetUser}`,
        ``,
        `<:BULLET:1488760457073524947> **Current Card:** ${cardId && STAMP_CARDS[cardId] ? STAMP_CARDS[cardId].name : "Not set"}`,
        `<:BULLET:1488760457073524947> **Current Stamps:** ${currentCount}/${STAMP_GOAL}`,
        `<:BULLET:1488760457073524947> **Preferred Stamp:** ${STAMPS[stampId]?.name || stampId}`,
        `<:BULLET:1488760457073524947> **Cards Completed:** ${totalCompleted}`,
        `<:BULLET:1488760457073524947> **Unclaimed Rewards:** ${unclaimed.length}`,
        `<:BULLET:1488760457073524947> **Claimed Rewards:** ${claimed.length}`,
      ];

      if (unclaimed.length > 0) {
        lines.push(``, `**<a:RojasClock:1510787896574083182> Unclaimed Cards:**`);
        for (const r of unclaimed) {
          const cardName = STAMP_CARDS[r.card_id]?.name || r.card_id;
          const date = `<t:${Math.floor(r.completed_at / 1000)}:D>`;
          lines.push(`  • Card #${r.card_number} — ${cardName} — completed ${date}`);
        }
      }

      return interaction.reply({
        content: lines.join("\n"),
        allowedMentions: { users: [], roles: [] },
        flags: 64,
      });
    }

    // ===== ANNOUNCE =====
    if (sub === "announce") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to send announcements.", flags: 64 });
      const message = interaction.options.getString("message", true);
      await interaction.deferReply({ flags: 64 });

      const members = await interaction.guild.members.fetch();
      let sent = 0, failed = 0;
      for (const [, member] of members) {
        if (member.user.bot) continue;
        try {
          await member.user.send(`## 📬 New Stamp Card Announcement from **${interaction.guild.name}**\n\n${message}`);
          sent++;
        } catch {
          failed++;
        }
      }
      return interaction.editReply({ content: `✅ Announcement sent!\n> **Delivered:** ${sent} members\n> **Failed (DMs closed):** ${failed} members` });
    }

    // ===== FIXCAMPAIGNS =====
    if (sub === "fixcampaigns") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "<:wrong:1510784077794377838> No permission.", flags: 64 });
      await interaction.deferReply({ flags: 64 });

      // Check what's there
      const check = await pool.query(
        `SELECT COUNT(*) as total, COUNT(campaign_id) as with_campaign FROM completed_cards WHERE guild_id=$1`,
        [guildId]
      );
      const campaigns = await pool.query(
        `SELECT id, name, label FROM campaigns WHERE guild_id=$1 ORDER BY created_at DESC`,
        [guildId]
      );

      const nullCount = parseInt(check.rows[0].total) - parseInt(check.rows[0].with_campaign);

      if (nullCount === 0) {
        return interaction.editReply(
          `✅ All **${check.rows[0].total}** completed cards already have campaigns assigned!\n` +
          `Available campaigns: ${campaigns.rows.map(c => `**${c.label}** (id:${c.id})`).join(", ")}`
        );
      }

      const res = await pool.query(`
        UPDATE completed_cards SET campaign_id = (
          SELECT id FROM campaigns 
          WHERE guild_id = completed_cards.guild_id 
          ORDER BY created_at DESC LIMIT 1
        )
        WHERE guild_id = $1 AND campaign_id IS NULL
        RETURNING id
      `, [guildId]);

      return interaction.editReply(`<:checkmark:1510784068487479318> Fixed **${res.rowCount}** completed cards — campaign assigned!`);
    }
    if (sub === "leaderboard") {
      const rows = await getLeaderboard(guildId);
      if (!rows.length) return interaction.reply({ content: "<:wrong:1510784077794377838> No stamps have been issued yet.", flags: 64 });

      const lines = [];
      for (const row of rows) {
        const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
        if (!member) continue;
        const stamps = Math.min(Number(row.current_stamps), STAMP_GOAL);
        lines.push(`### ${member.user.username} — ${stamps}/${STAMP_GOAL}`);

        // Get completed cards grouped by campaign
        const campRes = await pool.query(
          `SELECT c.label, COUNT(*) as total
           FROM completed_cards cc
           LEFT JOIN campaigns c ON cc.campaign_id = c.id
           WHERE cc.guild_id=$1 AND cc.user_id=$2
           GROUP BY c.label ORDER BY total DESC`,
          [guildId, row.user_id]
        );
        for (const cr of campRes.rows) {
          lines.push(`<a:completed:1510786649439731803> ${cr.total} completed — ${cr.label || "No Campaign"}`);
        }
      }

      return interaction.reply({
        content: `## <a:purplesparkle:1510784631945953422> Stamp Leaderboard <a:purplesparkle:1510784631945953422>\n<:member:1510784070957797396> **Top 10 Members:**\n\n` + lines.join("\n"),
        allowedMentions: { users: [] },
      });
    }

    // ===== HISTORY =====
    if (sub === "history") {
      const user = interaction.options.getUser("user") || interaction.user;
      const rows = await getHistory(guildId, user.id);
      const total = await countCompleted(guildId, user.id);
      const savedCard = await getCard(guildId, user.id);
      const currentCardId = savedCard?.card_id;
      const currentCount = currentCardId ? await getCount(guildId, user.id, currentCardId) : 0;

      const lines = [
        `## <a:purplesparkle:1510784631945953422> Stamp History ${user} <a:purplesparkle:1510784631945953422>`,
        `<a:SS_PurpleCandles:1510784631136587868> Total Cards Completed: **${total}**`,
        ``,
      ];

      for (const r of rows) {
        const isClaimed = (r.claimed === true || r.claimed === 't' || r.claimed === 'true');
        const claimStatus = isClaimed ? `<:checkmark:1510784068487479318> Claimed` : `<:wrong:1510784077794377838> Unclaimed`;
        const date = `<t:${Math.floor(r.completed_at / 1000)}:D>`;
        let campaignName = "No Campaign";
        if (r.campaign_id) {
          const campRes = await pool.query("SELECT label FROM campaigns WHERE id=$1", [r.campaign_id]);
          if (campRes.rows[0]) campaignName = campRes.rows[0].label;
        }
        lines.push(`<:Board_Princess_Stamp:1510805274779320410> Card #${r.card_number} — ${campaignName} — Completed — ${date} — ${claimStatus}`);
      }

      // Current in-progress card
      if (currentCardId && STAMP_CARDS[currentCardId] && currentCount < STAMP_GOAL) {
        const lastStamped = `<t:${Math.floor(Date.now() / 1000)}:D>`;
        lines.push(`#${total + 1} — In Progress — <a:Loading:1510810314709401751> — ${lastStamped} — ${currentCount}/${STAMP_GOAL}`);
      }

      if (lines.length <= 3) lines.push(`📭 No stamp history yet.`);

      return interaction.reply({
        content: lines.join("\n"),
        allowedMentions: { users: [], roles: [] },
      });
    }

    // ===== DELETE COMPLETED =====
    if (sub === "deletecompleted") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to do this.", flags: 64 });
      const targetUser = interaction.options.getUser("user", true);
      const cardNumber = interaction.options.getInteger("card", true);
      const reason = interaction.options.getString("reason") || "No reason provided";

      const res = await pool.query(
        'SELECT * FROM completed_cards WHERE guild_id=$1 AND user_id=$2 AND card_number=$3',
        [guildId, targetUser.id, cardNumber]
      );
      const record = res.rows[0];
      if (!record) return interaction.reply({ content: `<:wrong:1510784077794377838> Card #${cardNumber} not found for **${targetUser.username}**. Check their history with \`/stamp history\`.`, flags: 64 });

      const cardName = STAMP_CARDS[record.card_id]?.name || record.card_id;
      const campRes = record.campaign_id ? await pool.query("SELECT label FROM campaigns WHERE id=$1", [record.campaign_id]) : null;
      const campName = campRes?.rows[0]?.label || "No Campaign";

      await pool.query('DELETE FROM completed_cards WHERE id=$1', [record.id]);

      return interaction.reply({
        content: `🗑️ **Card #${cardNumber}** removed from **${targetUser.username}'s** history.\n<:BULLET:1488760457073524947> **Card:** ${cardName}\n<:BULLET:1488760457073524947> **Campaign:** ${campName}\n<:receipts:1488760952924143616> **Reason:** ${reason}`,
        allowedMentions: { users: [] },
      });
    }

    // ===== CLAIM =====
    if (sub === "claim") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to mark claims.", flags: 64 });
      const targetUser = interaction.options.getUser("user", true);
      const cardNumber = interaction.options.getInteger("card", true);
      const status = interaction.options.getString("status", true);

      // Find the completed card by user and card number
      const res = await pool.query(
        'SELECT * FROM completed_cards WHERE guild_id=$1 AND user_id=$2 AND card_number=$3',
        [guildId, targetUser.id, cardNumber]
      );
      const record = res.rows[0];
      if (!record) return interaction.reply({ content: `❌ Card #${cardNumber} not found for ${targetUser.username}.`, flags: 64 });

      const claimed = status === 'claimed';
      await setClaimedStatus(record.id, claimed);

      const emoji = claimed ? '<:checkmark:1510784068487479318>' : '<a:RojasClock:1510787896574083182>';
      return interaction.reply({
        content: `${emoji} **Card #${cardNumber}** for **${targetUser.username}** has been marked as **${claimed ? 'Claimed' : 'Unclaimed'}**.`,
        allowedMentions: { users: [] },
      });
    }

    // ===== SETSTAMP =====
    if (sub === "setstamp") {
      if (!(await canManage(interaction))) {
        return interaction.reply({ content: "❌ Only managers can set a stamp preference.", flags: 64 });
      }
      const stampId = interaction.options.getString("design", true);
      if (!STAMPS[stampId]) return interaction.reply({ content: "❌ Unknown stamp.", flags: 64 });
      await setStaffStamp(guildId, interaction.user.id, stampId);
      return interaction.reply({
        content: `✅ Your preferred stamp is now **${STAMPS[stampId].name}**. It will be used automatically when you add stamps.`,
        flags: 64,
      });
    }

    // ===== SETCARD =====
    if (sub === "setcard") {
      const cardId = interaction.options.getString("card", true);
      const targetUser = interaction.options.getUser("user");
      const campaignName = interaction.options.getString("campaign");
      const stampChoice = interaction.options.getString("stamp");

      if (!STAMP_CARDS[cardId]) return interaction.reply({ content: "<:wrong:1510784077794377838> Unknown card choice. Please pick from the list.", flags: 64 });

      const userId = (targetUser && targetUser.id !== interaction.user.id) ? targetUser.id : interaction.user.id;
      const isOther = targetUser && targetUser.id !== interaction.user.id;
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      const isManager = await canManage(interaction);

      // Only admins/owners/managers can set for others
      if (isOther && !isManager) {
        return interaction.reply({ content: "<:wrong:1510784077794377838> You don't have permission to set another member's card.", flags: 64 });
      }

      // Everyone must select a campaign
      if (!campaignName) {
        return interaction.reply({ content: "<:wrong:1510784077794377838> Please select a campaign from the dropdown.", flags: 64 });
      }

      await interaction.deferReply({ flags: 64 });

      // Per-campaign card
      if (campaignName) {
        const camp = await pool.query(
          `SELECT * FROM campaigns WHERE guild_id=$1 AND name=$2`,
          [guildId, campaignName]
        );
        const c = camp.rows[0];
        if (!c) return interaction.editReply(`<:wrong:1510784077794377838> Campaign \`${campaignName}\` not found.`);

        const existingCampCard = await getCampaignCard(guildId, userId, c.id);
        const stampId = existingCampCard?.stamp_id || "gold_stamp";

        // Transfer stamps from old card to new card if card changed
        if (existingCampCard && existingCampCard.card_id !== cardId) {
          const oldCount = await getCount(guildId, userId, existingCampCard.card_id, c.id);
          if (oldCount > 0) {
            await deleteCount(guildId, userId, existingCampCard.card_id, c.id);
            await upsertCount(guildId, userId, cardId, oldCount, c.id);
          }
        }

        await setCampaignCard(guildId, userId, c.id, cardId, stampId);

        const count = await getCount(guildId, userId, cardId, c.id);
        const previewBuffer = await renderStampCard(cardId, Math.max(count, 1), stampId);
        return interaction.editReply({
          content: `<:checkmark:1510784068487479318> ${isOther ? `**${targetUser.username}'s**` : "Your"} card for **${c.label}** is now **${STAMP_CARDS[cardId].name}**!${count > 0 ? ` (${count} stamps carried over)` : ""}`,
          files: [{ attachment: previewBuffer, name: "card-preview.png" }],
        });
      }

      // Default card — managers/admins/owners only
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
      const transferNote = transferredCount > 0 ? ` **${transferredCount}** stamp(s) transferred!` : "";
      const savedStampInfo = await getCard(guildId, userId);
      const previewStampId = stampChoice || savedStampInfo?.stamp_id || "gold_stamp";
      if (stampChoice) await pool.query(
        `UPDATE user_cards SET stamp_id=$1 WHERE guild_id=$2 AND user_id=$3`,
        [stampChoice, guildId, userId]
      );
      const previewBuffer = await renderStampCard(cardId, 1, previewStampId);
      return interaction.editReply({
        content: `<:checkmark:1510784068487479318> ${isOther ? `**${targetUser.username}'s**` : "Your"} default stamp card is now **${STAMP_CARDS[cardId].name}**!${transferNote}`,
        files: [{ attachment: previewBuffer, name: "card-preview.png" }],
      });
    }

    // ===== VIEW =====
    if (sub === "view") {
      const user = interaction.options.getUser("user", true);
      const campaignName = interaction.options.getString("campaign", true);

      // Resolve campaign
      const campRes = await pool.query(
        `SELECT * FROM campaigns WHERE guild_id=$1 AND name=$2`,
        [guildId, campaignName]
      );
      const camp = campRes.rows[0];
      if (!camp) return interaction.reply({ content: `<:wrong:1510784077794377838> Campaign not found.`, flags: 64 });

      const campCard = await getCampaignCard(guildId, user.id, camp.id);
      if (!campCard || !STAMP_CARDS[campCard.card_id]) {
        return interaction.reply({
          content: `👑 **${user.username}** hasn't set a card for **${camp.label}** yet. They need to run \`/stamp setcard\` and select **${camp.label}**.`,
          flags: 64,
        });
      }

      const count = Math.min(await getCount(guildId, user.id, campCard.card_id, camp.id), STAMP_GOAL);
      const buffer = await renderStampCard(campCard.card_id, count, campCard.stamp_id || "gold_stamp");

      return interaction.reply({
        content: `👑 **${user.username}** — **${camp.label}** — **${STAMP_CARDS[campCard.card_id].name}** — **${count}/${STAMP_GOAL}**`,
        files: [{ attachment: buffer, name: "stamp-card.png" }],
      });
    }

    // ===== RESETALL =====
    if (sub === "resetall") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can reset the entire server.", flags: 64 });
      await resetAll(guildId);
      await logResetAll({ interaction });
      return interaction.reply("♻️ **Server reset complete.** All stamp cards are back to **0**.");
    }

    // ===== SETCHANNEL =====
    if (sub === "setchannel") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can set channels.", flags: 64 });
      const type = interaction.options.getString("type", true);
      const channel = interaction.options.getChannel("channel", true);
      if (!channel.isTextBased()) return interaction.reply({ content: "❌ Please select a text channel.", flags: 64 });
      await setGuildChannel(guildId, type, channel.id);
      const label = type === "log" ? "📋 Stamp Log" : "🎉 Completed Cards";
      return interaction.reply({ content: `✅ **${label}** channel set to ${channel}.`, flags: 64 });
    }

    // ===== SETUP =====
    if (sub === "setup") {
      const isOwner = interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isOwner && !isAdmin) return interaction.reply({ content: "❌ Only the server owner or admins can configure the bot.", flags: 64 });
      const type = interaction.options.getString("type", true);
      const role = interaction.options.getRole("role", true);
      await setGuildRole(guildId, type, role.id);
      const label = type === "manager" ? "🛡️ Manager Role" : "🏆 Reward Role";
      return interaction.reply({ content: `✅ **${label}** set to ${role}. Staff with this role can now manage stamps.`, flags: 64 });
    }

    // ===== CAMPAIGN =====
    if (sub === "campaign") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to manage campaigns.", flags: 64 });
      const action = interaction.options.getString("action", true);
      const name = interaction.options.getString("name")?.toLowerCase().replace(/\s+/g, "_");
      const label = interaction.options.getString("label");

      if (action === "start") {
        if (!name) return interaction.reply({ content: "❌ Provide a `name` for the campaign (e.g. `summer2025`).", flags: 64 });
        const displayLabel = label || name;
        const id = await createCampaign(guildId, name, displayLabel);
        return interaction.reply({
          content: `<a:checkmarkgood:1510786567482904707> **Campaign started!**\n> **Name (ID):** \`${name}\`\n> **Label:** ${displayLabel}\n> **Campaign ID:** #${id}\n\nUse \`/stamp add @user campaign:${name}\` to tag stamps to this campaign.`,
          allowedMentions: { users: [] },
        });
      }

      if (action === "end") {
        if (!name) return interaction.reply({ content: "❌ Provide the campaign `name` to end.", flags: 64 });
        await endCampaign(guildId, name);
        return interaction.reply({ content: `<:wrong:1510784077794377838> Campaign **\`${name}\`** has been ended.` });
      }

      if (action === "list") {
        const rows = await listCampaigns(guildId);
        if (!rows.length) return interaction.reply({ content: "<a:list:1510793730070937620> No campaigns found for this server.", flags: 64 });
        const lines = rows.map(r => {
          const status = r.active ? "🟢 Active" : "🔴 Ended";
          const since = `<t:${Math.floor(r.created_at / 1000)}:D>`;
          return `${status} **${r.label}** (\`${r.name}\`) — started ${since}`;
        });
        return interaction.reply({ content: `<a:list:1510793730070937620> **Campaigns**\n\n${lines.join("\n")}`, allowedMentions: { users: [] } });
      }

      if (action === "leaderboard") {
        if (!name) return interaction.reply({ content: "<:wrong:1510784077794377838> Provide the campaign `name` to view its leaderboard.", flags: 64 });
        const campaign = await pool.query("SELECT * FROM campaigns WHERE guild_id=$1 AND name=$2", [guildId, name]);
        const c = campaign.rows[0];
        if (!c) return interaction.reply({ content: `<:wrong:1510784077794377838> Campaign \`${name}\` not found.`, flags: 64 });
        const rows = await getCampaignLeaderboard(guildId, c.id);
        if (!rows.length) return interaction.reply({ content: `<a:trophies:1510784061638053969> No completed cards yet for **${c.label}**.`, flags: 64 });
        const lines = [];
        let rank = 1;
        for (const row of rows) {
          const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
          if (!member) continue;
          lines.push(`**${rank}.** ${member.user.username} — **${row.cards_completed}** card(s) completed`);
          rank++;
        }
        return interaction.reply({
          content: `<a:trophies:1510784061638053969> **${c.label} — Campaign Leaderboard**\n\n${lines.join("\n")}`,
          allowedMentions: { users: [] },
        });
      }

      return interaction.reply({ content: "❌ Unknown campaign action.", flags: 64 });
    }

    // ===== ADD / REMOVE / RESET =====
    if (sub === "add" || sub === "remove" || sub === "reset") {
      if (!(await canManage(interaction))) return interaction.reply({ content: "❌ You don't have permission to manage stamps.", flags: 64 });
      await interaction.deferReply();

      const targetUser = interaction.options.getUser("user", true);
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: "❌ I can't find that member in this server." });

      // For add: resolve campaign first, then get card from user_campaign_cards
      let cardId, campaignId = null, campaignLabel = null;

      if (sub === "add") {
        const campaignName = interaction.options.getString("campaign", true);
        const camp = await getActiveCampaign(guildId, campaignName);
        if (!camp) return interaction.editReply(`<:wrong:1510784077794377838> No active campaign named \`${campaignName}\`. Start one first with \`/stamp campaign action:Start\`.`);
        campaignId = camp.id;
        campaignLabel = camp.label;

        // Get card from user_campaign_cards for this campaign
        const campCard = await getCampaignCard(guildId, targetUser.id, campaignId);
        if (campCard && STAMP_CARDS[campCard.card_id]) {
          cardId = campCard.card_id;
        } else {
          // Fallback to default user_cards
          const savedCard = await getCard(guildId, targetUser.id);
          cardId = savedCard?.card_id || savedCard;
          if (!cardId || !STAMP_CARDS[cardId]) {
            return interaction.editReply(`<:wrong:1510784077794377838> **${targetUser.username}** hasn't set a card for **${campaignLabel}** yet. Ask them to run \`/stamp setcard\` and select the **${campaignLabel}** campaign.`);
          }
        }
      } else if (sub === "remove") {
        const campaignName = interaction.options.getString("campaign", true);
        const camp = await pool.query(`SELECT * FROM campaigns WHERE guild_id=$1 AND name=$2`, [guildId, campaignName]);
        const c = camp.rows[0];
        if (!c) return interaction.editReply(`<:wrong:1510784077794377838> Campaign not found.`);
        campaignId = c.id;
        campaignLabel = c.label;
        const campCard = await getCampaignCard(guildId, targetUser.id, campaignId);
        cardId = campCard?.card_id;
        if (!cardId || !STAMP_CARDS[cardId]) return interaction.editReply(`<:wrong:1510784077794377838> **${targetUser.username}** hasn't set a card for **${campaignLabel}** yet.`);
      } else {
        // reset — use default saved card
        const savedCard = await getCard(guildId, targetUser.id);
        cardId = savedCard?.card_id || savedCard;
        if (!cardId || !STAMP_CARDS[cardId]) return interaction.editReply({ content: "❌ That user has an invalid saved card. Ask them to run `/stamp setcard`." });
      }

      if (!STAMP_CARDS[cardId]) return interaction.editReply({ content: `❌ Card \`${cardId}\` not found. Ask the user to run \`/stamp setcard\`.` });

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

      const amount = interaction.options.getInteger("amount") || 1;
      const overrideStamp = interaction.options.getString("stamp_design");
      const rewardRoleId = await resolveRewardRole(guildId);

      // Get existing campaign card to check if stamp is already set
      const campCardForStamp = sub === "add" ? await getCampaignCard(guildId, targetUser.id, campaignId) : null;
      const savedCardInfo = await getCard(guildId, targetUser.id);
      const existingStamp = campCardForStamp?.stamp_id || savedCardInfo?.stamp_id;

      // First stamp requires stamp_design to be selected
      const currentCheck = await getCount(guildId, targetUser.id, cardId, campaignId);
      if (sub === "add" && currentCheck === 0 && !overrideStamp && !existingStamp) {
        return interaction.editReply(`<:wrong:1510784077794377838> This is **${targetUser.username}'s** first stamp for **${campaignLabel}** — please select a **stamp design** from the dropdown.`);
      }

      // If stamp_design selected, save it permanently to their campaign card
      const stampId = overrideStamp || existingStamp || await getStaffStamp(guildId, interaction.user.id);
      if (overrideStamp && campaignId) {
        if (campCardForStamp) {
          await pool.query(
            `UPDATE user_campaign_cards SET stamp_id=$1 WHERE guild_id=$2 AND user_id=$3 AND campaign_id=$4`,
            [overrideStamp, guildId, targetUser.id, campaignId]
          );
        } else {
          await setCampaignCard(guildId, targetUser.id, campaignId, cardId, overrideStamp);
        }
      }

      // Migrate legacy stamps (NULL campaign_id) to this campaign on first use
      if (sub === "add" && campaignId) {
        const legacyCount = await pool.query(
          `SELECT count FROM stamps WHERE guild_id=$1 AND user_id=$2 AND card_id=$3 AND campaign_id IS NULL`,
          [guildId, targetUser.id, cardId]
        );
        if (legacyCount.rows[0]?.count > 0) {
          // Move legacy count to this campaign
          await pool.query(
            `UPDATE stamps SET campaign_id=$4 WHERE guild_id=$1 AND user_id=$2 AND card_id=$3 AND campaign_id IS NULL`,
            [guildId, targetUser.id, cardId, campaignId]
          );
        }
      }

      const current = await getCount(guildId, targetUser.id, cardId, campaignId);
      const next = sub === "add" ? current + amount : Math.max(0, current - amount);

      await upsertCount(guildId, targetUser.id, cardId, next, campaignId);
      await setStamp(guildId, targetUser.id, stampId);

      // Completion with overflow
      if (sub === "add" && current < STAMP_GOAL && next >= STAMP_GOAL) {
        const overflow = next - STAMP_GOAL;
        const cardNumber = (await maxCardNumber(guildId, targetUser.id)) + 1;
        await insertCompleted(guildId, targetUser.id, cardId, cardNumber, campaignId);
        await postCompletedWithImage({ interaction, targetUser, cardId, stampId, count: STAMP_GOAL, cardNumber, campaignLabel });
        await deleteCount(guildId, targetUser.id, cardId, campaignId);
        if (rewardRoleId && !targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.add(rewardRoleId).catch(() => {});
        await logStampWithImage({ interaction, targetUser, cardId, stampId, action: `🏅 Card #${cardNumber} COMPLETED`, count: STAMP_GOAL, campaignLabel });

        if (overflow > 0) await upsertCount(guildId, targetUser.id, cardId, overflow, campaignId);

        const overflowNote = overflow > 0 ? ` **${overflow}** stamp(s) carried over!` : ` They can start collecting again!`;
        return interaction.editReply(
          `<a:confettipenguin:1489113733845356704> **${targetUser.username}** has completed **${STAMP_CARDS[cardId].name}** (Card #${cardNumber})! <:medaltop:1489043799307980893>\n` +
          `<:BULLET:1488760457073524947> Campaign: **${campaignLabel}**\n${overflowNote}`
        );
      }

      if (rewardRoleId && next >= STAMP_GOAL && !targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.add(rewardRoleId).catch(() => {});
      if (rewardRoleId && next < STAMP_GOAL && targetMember.roles.cache.has(rewardRoleId)) await targetMember.roles.remove(rewardRoleId).catch(() => {});

      const reason = sub === "remove" ? interaction.options.getString("reason", true) : null;

      await logStampWithImage({
        interaction, targetUser, cardId, stampId,
        action: sub === "add" ? `➕ Added ${amount} (${current} → ${next})` : `➖ Removed ${amount} (${current} → ${next})`,
        count: next,
        campaignLabel,
        reason,
      });

      if (sub === "add") {
        return interaction.editReply(
          `<:checkmark:1510784068487479318> **${targetUser.username}** now has **${next}/${STAMP_GOAL}** <a:confettipenguin:1489113733845356704>\n` +
          `<:BULLET:1488760457073524947> Campaign: **${campaignLabel}**`
        );
      } else {
        return interaction.editReply(
          `<:checkmark:1510784068487479318> **${targetUser.username}** now has **${next}/${STAMP_GOAL}**\n` +
          `<:receipts:1488760952924143616> Reason: ${reason}`
        );
      }
    }

    return interaction.reply({ content: "❌ Unknown subcommand.", flags: 64 });

  } catch (err) {
    console.error("Interaction error:", err);
    const msg = "❌ Something went wrong while running that command.";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, flags: 64 }).catch(() => {});
      else await interaction.reply({ content: msg, flags: 64 }).catch(() => {});
    }
  }
});

// =====================
// START
// =====================
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
client.on("error", (err) => {
  console.error("Client error:", err);
});

initDB().then(() => client.login(TOKEN));
