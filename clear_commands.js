// Run this ONCE to clear all duplicate commands:
// node clear_commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  const app = await rest.get(Routes.oauth2CurrentApplication());
  const clientId = app.id;
  console.log(`Bot ID: ${clientId}`);

  // Clear global commands
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  console.log("✅ Cleared all global commands");

  // Clear guild-specific commands if GUILD_ID is set
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), { body: [] });
    console.log(`✅ Cleared guild commands for ${GUILD_ID}`);
  }

  console.log("Done! Restart your bot and commands will re-register cleanly.");
  process.exit(0);
})();
