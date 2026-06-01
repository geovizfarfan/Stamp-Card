// Run this ONCE to clear ALL commands (global + all guilds):
// DISCORD_TOKEN=your_token_here node clear_commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error("❌ No DISCORD_TOKEN found. Run: DISCORD_TOKEN=your_token node clear_commands.js"); process.exit(1); }

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  // Get bot info
  const app = await rest.get(Routes.oauth2CurrentApplication());
  const clientId = app.id;
  console.log(`Bot ID: ${clientId}`);

  // Clear all global commands
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  console.log("✅ Cleared global commands");

  // Get ALL guilds the bot is in and clear each one
  const guilds = await rest.get(`/users/@me/guilds`);
  console.log(`Found ${guilds.length} guild(s)`);
  for (const guild of guilds) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
      console.log(`✅ Cleared guild commands: ${guild.name} (${guild.id})`);
    } catch (e) {
      console.log(`⚠️ Could not clear ${guild.name}: ${e.message}`);
    }
  }

  console.log("\n✅ All done! Now redeploy your bot on Railway and commands will re-register cleanly.");
  process.exit(0);
})();
