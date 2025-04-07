const fs = require('fs');
const path = require('path');

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
        if (key === 'Treść szarfy') {
          // Specjalne formatowanie dla szarf - każda w nowej linii
          return `${key}:\n${value.map(szarfa => `  - ${szarfa}`).join('\n')}`;
        } else {
          // Ogólne formatowanie dla innych tablic
          return `${key}: ${value.join(', ')}`;
        }
      } else {
        // Standardowe formatowanie dla pojedynczych wartości
        return `${key}: ${value}`;
      }
    }).join('\n');

    const thread = await client.channels.fetch(threadId);
    await thread.send(`Podsumowanie zamówienia:\n${summaryLines}`);
    
    // Opcjonalnie zapisujemy plik
    const orderFilePath = path.join(__dirname, `../temp/order${ordersObj[threadId].orderNumber}.json`);
    fs.writeFileSync(orderFilePath, JSON.stringify(orderData, null, 2));
  } else {
    console.error('Order not found in memory for summary.');
  }
}

module.exports = { sendOrderSummary };
