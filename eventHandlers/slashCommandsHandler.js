async function handleSlashCommand(interaction) {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const timeTaken = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! This message had a latency of ${timeTaken}ms.`);
    console.log('Ping command executed, channel id:', interaction.channel.id, 'latency:', timeTaken, 'ms');
  }
}

module.exports = { handleSlashCommand };
