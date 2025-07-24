const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleOrderThreadInteraction } = require('./orderThreadHandler');
const { readOrderNumber, updateOrderNumber } = require('./orderNumberHandler');
const startMessageContent = 'Wybierz typ zamówienia:';

async function sendStartMessage(client) {
    const channelId = process.env.LADA_CHANNEL_ID;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('niebieskiSegregator')
                    .setLabel('Niebieski Segregator')
                    .setStyle(ButtonStyle.Primary)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('zielonySegregator')
                    .setLabel('Zielony Segregator')
                    .setStyle(ButtonStyle.Success)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kartaPogrzebowa')
                    .setLabel('Karta Pogrzebowa')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({
            content: startMessageContent,
            components: [row],
        });
    } catch (error) {
        console.error('Error sending start message:', error);
    }
}

async function handleStartMessageButtonInteraction(interaction, client) {
    if (!interaction.isButton()) return;

    // Najpierw pobieramy aktualny numer zamówienia
    const orderNumber = readOrderNumber();
    // Dopiero potem go aktualizujemy
    updateOrderNumber();

    try {
        // Próbujemy usunąć wiadomość, ale ignorujemy błąd jeśli się nie uda
        try {
            await interaction.message.delete();
        } catch (error) {
            console.log('Message already deleted or unable to delete, continuing...');
        }
        
        await handleOrderThreadInteraction(interaction, client, `Zamówienie numer ${orderNumber}`);

        if (orderNumber % 10 === 0) {
            await deleteOldThreads(client);
        }

        await sendNewStartMessage(client);
    } catch (error) {
        console.error('Error handling start message button interaction:', error);
    }
}

async function deleteOldThreads(client) {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const channelId = process.env.HI_CHANNEL_ID;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Sprawdzamy, czy kanał obsługuje wątki
        if (!channel.threads) {
            console.error('Channel does not support threads:', channelId);
            return;
        }

        const threads = await channel.threads.fetchActive();
        const sortedThreads = Array.from(threads.threads.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        // Skip the most recent 5 threads
        const threadsToConsider = sortedThreads.slice(5);

        for (const thread of threadsToConsider) {
            try {
                const messages = await thread.messages.fetch();
                const messageCount = messages.size;
                const threadCreationTime = thread.createdTimestamp;

                if (messageCount <= 2 || threadCreationTime < oneWeekAgo) {
                    await thread.delete();
                    console.log(`Thread deleted: ${thread.name}`);
                }
            } catch (threadError) {
                console.log(`Could not process thread ${thread.id}: ${threadError.message}`);
                continue; // przejdź do następnego wątku
            }
        }
    } catch (error) {
        console.error('Error fetching threads or deleting threads:', error);
    }
}

async function sendNewStartMessage(client) {
    await deleteStartMessage(client);
    await sendStartMessage(client);
}

async function deleteStartMessage(client) {
    const channelId = process.env.LADA_CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);

    if (!channel) return;

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const startMessage = messages.find(
            msg => msg.author.id === client.user.id && msg.content.includes(startMessageContent)
        );

        if (startMessage) {
            try {
                await startMessage.delete();
                console.log('Start message deleted successfully');
            } catch (deleteError) {
                // Ignoruj błąd jeśli wiadomość została już usunięta (10008) 
                // lub z innych powodów nie można jej usunąć
                console.log(`Could not delete start message: ${deleteError.message}`);
            }
        } else {
            console.log('No start message found to delete');
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

module.exports = { sendStartMessage, handleStartMessageButtonInteraction, sendNewStartMessage, deleteStartMessage };
