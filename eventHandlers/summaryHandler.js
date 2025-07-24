const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Nie importujemy bezpośrednio orders z orderThreadHandler.js, aby uniknąć circular dependency
// Zamiast tego, przekazujemy orders jako argument

async function sendOrderSummary(threadId, client) {
  const ordersObj = require('./orderThreadHandler').orders;
  
  if (ordersObj[threadId]) {
    const orderData = ordersObj[threadId].answers;
    
    // Modyfikacja wyświetlania podsumowania
    const summaryLines = Object.entries(orderData).map(([key, value]) => {
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

    // Tworzymy przyciski akcji
    const actionButtons1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`redirect_categories_${threadId}`)
          .setLabel('Przekierowanie do innych kategorii')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`cancel_order_${threadId}`)
          .setLabel('Anuluj zamówienie')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`order_ready_${threadId}`)
          .setLabel('Zamówienie gotowe')
          .setStyle(ButtonStyle.Success)
      );

    const actionButtons2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`order_collected_${threadId}`)
          .setLabel('Zamówienie odebrane')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`edit_order_${threadId}`)
          .setLabel('Edycja zamówienia')
          .setStyle(ButtonStyle.Primary)
      );

    const thread = await client.channels.fetch(threadId);
    await thread.send({
      content: `Podsumowanie zamówienia:\n${summaryLines}`,
      components: [actionButtons1, actionButtons2]
    });
    
    // Opcjonalnie zapisujemy plik
    const orderFilePath = path.join(__dirname, `../temp/order${ordersObj[threadId].orderNumber}.json`);
    fs.writeFileSync(orderFilePath, JSON.stringify(orderData, null, 2));
  } else {
    console.error('Order not found in memory for summary.');
  }
}

module.exports = { sendOrderSummary };
