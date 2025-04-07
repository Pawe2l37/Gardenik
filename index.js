require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { commands } = require('./utils/commands');
const { handleSlashCommand } = require('./eventHandlers/slashCommandsHandler');
const { sendNewStartMessage, handleStartMessageButtonInteraction } = require('./eventHandlers/startMessageHandler');
const { handleUserResponse } = require('./eventHandlers/orderThreadHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once('ready', async () => {
  console.log('Bot is online!');

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to reload application (/) commands:', error);
  }

  const channelId = process.env.HI_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  await sendNewStartMessage(client);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Obsługa przycisków w wiadomości startowej
    if (interaction.isButton() && interaction.message && interaction.message.content.includes('Wybierz typ zamówienia')) {
      await handleStartMessageButtonInteraction(interaction, client);
    }
    // Obsługa przycisków w wątkach zamówień
    else if (interaction.isButton()) {
      await handleUserResponse(interaction, client);
    }
    // Obsługa komend slashowych
    else if (interaction.isCommand()) {
      await handleSlashCommand(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

// Dodajemy obsługę wiadomości w wątkach
client.on('messageCreate', async (message) => {
  try {
    // Pomijamy wiadomości od botów i wiadomości poza wątkami
    if (message.author.bot || !message.channel.isThread()) return;
    
    // Obsługa wprowadzanych tekstów w wątkach zamówień
    await handleUserResponse(message, client);
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
