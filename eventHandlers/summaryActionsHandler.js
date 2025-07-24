const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Mapowanie typów zamówień
const orderTypeMap = {
    'Niebieski Segregator': 'niebieskiSegregator',
    'Zielony Segregator': 'zielonySegregator', 
    'Karta Pogrzebowa': 'kartaPogrzebowa'
};

const orderTypeDisplayMap = {
    'niebieskiSegregator': 'Niebieski Segregator',
    'zielonySegregator': 'Zielony Segregator',
    'kartaPogrzebowa': 'Karta Pogrzebowa'
};

// Funkcja do określenia właściwego kanału na podstawie kategorii zamówienia
function getReadyOrdersChannelId(orderCategory) {
    switch (orderCategory) {
        case 'Zielony Segregator':
            return process.env.READY_ORDERS_LADA_CHANNEL_ID; // gotowe zamówienia lada
        case 'Niebieski Segregator':
            return process.env.READY_ORDERS_WORKSHOP_CHANNEL_ID; // gotowe zamówienia pracownia
        case 'Karta Pogrzebowa':
            return process.env.FUNERAL_ORDERS_CHANNEL_ID; // zabrac na pogrzeb
        default:
            console.error('Nieznana kategoria zamówienia:', orderCategory);
            return process.env.READY_ORDERS_LADA_CHANNEL_ID; // fallback
    }
}

async function handleSummaryAction(interaction, client) {
    const customId = interaction.customId;
    const threadId = customId.split('_').pop(); // Pobieramy ID wątku z końca customId
    
    // Pobieramy zamówienie z pamięci
    const ordersObj = require('./orderThreadHandler').orders;
    const order = ordersObj[threadId];
    
    if (!order) {
        await interaction.reply({ content: 'Błąd: Nie znaleziono zamówienia.', ephemeral: true });
        return;
    }

    try {
        if (customId.startsWith('redirect_categories_')) {
            await handleCategoryRedirect(interaction, client, order, threadId);
        } else if (customId.startsWith('change_category_')) {
            await handleCategoryChange(interaction, client, order, threadId);
        } else if (customId.startsWith('cancel_order_')) {
            await handleCancelOrder(interaction, client, order, threadId);
        } else if (customId.startsWith('order_ready_')) {
            await handleOrderReady(interaction, client, order, threadId);
        } else if (customId.startsWith('order_collected_')) {
            await handleOrderCollected(interaction, client, order, threadId);
        } else if (customId.startsWith('edit_order_')) {
            await handleEditOrder(interaction, client, order, threadId);
        }
    } catch (error) {
        console.error('Błąd podczas obsługi akcji podsumowania:', error);
        await interaction.reply({ content: 'Wystąpił błąd podczas wykonywania akcji.', ephemeral: true });
    }
}

async function handleCategoryRedirect(interaction, client, order, threadId) {
    const currentCategory = order.answers.miejsceZamowienia;
    
    // Znajdujemy pozostałe kategorie (te, które nie są aktualną kategorią)
    const availableCategories = Object.keys(orderTypeDisplayMap).filter(key => 
        orderTypeDisplayMap[key] !== currentCategory
    );
    
    const redirectButtons = new ActionRowBuilder();
    
    availableCategories.forEach(categoryKey => {
        const displayName = orderTypeDisplayMap[categoryKey];
        const buttonStyle = categoryKey === 'niebieskiSegregator' ? ButtonStyle.Primary :
                           categoryKey === 'zielonySegregator' ? ButtonStyle.Success : 
                           ButtonStyle.Danger;
        
        redirectButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`change_category_${categoryKey}_${threadId}`)
                .setLabel(displayName)
                .setStyle(buttonStyle)
        );
    });

    await interaction.reply({
        content: `Aktualna kategoria: **${currentCategory}**\nWybierz nową kategorię:`,
        components: [redirectButtons],
        ephemeral: true
    });
}

async function handleCategoryChange(interaction, client, order, threadId) {
    const customIdParts = interaction.customId.split('_');
    const newCategoryKey = customIdParts[2]; // change_category_niebieskiSegregator_threadId
    const newCategoryDisplay = orderTypeDisplayMap[newCategoryKey];
    
    // Aktualizujemy kategorię zamówienia
    order.answers.miejsceZamowienia = newCategoryDisplay;
    
    // Zapisujemy zmiany do pliku
    const orderFilePath = path.join(__dirname, `../temp/order${order.orderNumber}.json`);
    fs.writeFileSync(orderFilePath, JSON.stringify(order.answers, null, 2));
    
    await interaction.reply({ 
        content: `✅ Kategoria zamówienia #${order.orderNumber} została zmieniona na: **${newCategoryDisplay}**`, 
        ephemeral: true 
    });
    
    // Opcjonalnie: zaktualizuj podsumowanie w wątku
    const thread = await client.channels.fetch(threadId);
    const summaryText = formatOrderSummary(order);
    
    await thread.send(`📝 **Kategoria zamówienia została zmieniona na: ${newCategoryDisplay}**\n\nZaktualizowane podsumowanie:\n${summaryText}`);
}

async function handleCancelOrder(interaction, client, order, threadId) {
    try {
        const cancelChannel = await client.channels.fetch(process.env.CANCELLED_ORDERS_CHANNEL_ID);
        
        // Formatujemy podsumowanie zamówienia
        const summaryText = formatOrderSummary(order);
        
        await cancelChannel.send(`**ZAMÓWIENIE ANULOWANE**\nNumer zamówienia: ${order.orderNumber}\n\n${summaryText}`);
        
        // Potwierdzenie dla użytkownika
        await interaction.reply({ 
            content: `✅ Zamówienie #${order.orderNumber} zostało anulowane i przeniesione na kanał anulowanych zamówień.`, 
            ephemeral: true 
        });
        
        // Usuwamy wątek po krótkiej chwili
        setTimeout(async () => {
            try {
                const thread = await client.channels.fetch(threadId);
                await thread.delete();
            } catch (error) {
                console.error('Błąd podczas usuwania wątku:', error);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Błąd podczas anulowania zamówienia:', error);
        await interaction.reply({ content: 'Błąd podczas anulowania zamówienia.', ephemeral: true });
    }
}

async function handleOrderReady(interaction, client, order, threadId) {
    try {
        // Wybieramy właściwy kanał na podstawie kategorii zamówienia
        const readyChannelId = getReadyOrdersChannelId(order.answers.miejsceZamowienia);
        const readyChannel = await client.channels.fetch(readyChannelId);
        
        // Formatujemy podsumowanie zamówienia
        const summaryText = formatOrderSummary(order);
        
        const channelName = order.answers.miejsceZamowienia === 'Zielony Segregator' ? 'gotowe zamówienia lada' :
                           order.answers.miejsceZamowienia === 'Niebieski Segregator' ? 'gotowe zamówienia pracownia' :
                           'zabrac na pogrzeb';
        
        await readyChannel.send(`**ZAMÓWIENIE GOTOWE**\nNumer zamówienia: ${order.orderNumber}\nKategoria: ${order.answers.miejsceZamowienia}\n\n${summaryText}`);
        
        await interaction.reply({ 
            content: `✅ Zamówienie #${order.orderNumber} zostało oznaczone jako gotowe i wysłane na kanał: **${channelName}**.`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error('Błąd podczas oznaczania zamówienia jako gotowe:', error);
        await interaction.reply({ content: 'Błąd podczas oznaczania zamówienia jako gotowe.', ephemeral: true });
    }
}

async function handleOrderCollected(interaction, client, order, threadId) {
    try {
        // Najpierw usuwamy z kanału gotowych zamówień (jeśli tam było)
        const readyChannelId = getReadyOrdersChannelId(order.answers.miejsceZamowienia);
        
        // Wysyłamy do archiwum
        const archiveChannel = await client.channels.fetch(process.env.ARCHIVE_CHANNEL_ID);
        
        // Formatujemy podsumowanie zamówienia
        const summaryText = formatOrderSummary(order);
        
        // Wysyłamy do archiwum
        await archiveChannel.send(`**ZAMÓWIENIE ODEBRANE**\nNumer zamówienia: ${order.orderNumber}\nKategoria: ${order.answers.miejsceZamowienia}\n\n${summaryText}`);
        
        await interaction.reply({ 
            content: `✅ Zamówienie #${order.orderNumber} zostało oznaczone jako odebrane i przeniesione do archiwum.`, 
            ephemeral: true 
        });
        
        // Usuwamy wątek po krótkiej chwili
        setTimeout(async () => {
            try {
                const thread = await client.channels.fetch(threadId);
                await thread.delete();
                
                // Usuwamy także z pamięci
                delete require('./orderThreadHandler').orders[threadId];
            } catch (error) {
                console.error('Błąd podczas usuwania wątku:', error);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Błąd podczas oznaczania zamówienia jako odebrane:', error);
        await interaction.reply({ content: 'Błąd podczas oznaczania zamówienia jako odebrane.', ephemeral: true });
    }
}

async function handleEditOrder(interaction, client, order, threadId) {
    // Na razie placeholder - nic nie robi
    await interaction.reply({ 
        content: `🔧 Funkcja edycji zamówienia #${order.orderNumber} będzie dostępna wkrótce.`, 
        ephemeral: true 
    });
}

function formatOrderSummary(order) {
    const orderData = order.answers;
    
    return Object.entries(orderData).map(([key, value]) => {
        // Jeśli wartość jest tablicą (np. tablica szarf)
        if (Array.isArray(value)) {
            // Sprawdzamy nazwy pól związanych z szarfami
            if (key === 'Treść szarfy' || key === 'Dodaj treść szarfy') {
                // Specjalne formatowanie dla szarf - każda w nowej linii z tym samym wcięciem
                if (value.length === 0) {
                    return `Treść szarfy: brak`;
                }
                return `Treść szarfy:\n${value.map(szarfa => `- ${szarfa}`).join('\n')}`;
            } else {
                // Ogólne formatowanie dla innych tablic
                return `${key}: ${value.join(', ')}`;
            }
        } else {
            // Standardowe formatowanie dla pojedynczych wartości
            return `${key}: ${value}`;
        }
    }).join('\n');
}

module.exports = { handleSummaryAction };