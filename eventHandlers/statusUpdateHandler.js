const fs = require('fs');
const path = require('path');

async function sendBotStatusUpdate(client) {
    try {
        const updateChannel = await client.channels.fetch(process.env.UPDATE_CHANNEL_ID);
        const packageJson = require('../package.json');
        
        // Pobieramy aktualny numer zamówienia
        const dataFilePath = path.join(__dirname, '../utils/data.json');
        let currentOrderNumber = 0;
        
        if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            currentOrderNumber = data.currentOrderNumber || 0;
        }
        
        // Tworzymy wiadomość statusu jako checklist
        const statusMessage = `
🤖 **GARDENIK BOT - STATUS URUCHOMIENIA**
📅 **Data:** ${new Date().toLocaleString('pl-PL')}
📦 **Wersja:** ${packageJson.version}
🔢 **Aktualny numer zamówienia:** ${currentOrderNumber}

## ✅ **DZIAŁAJĄCE FUNKCJONALNOŚCI:**

### 📋 **System zamówień:**
✅ Składanie zamówień (3 kategorie: Niebieski/Zielony Segregator, Karta Pogrzebowa)
✅ Automatyczna numeracja zamówień  
✅ Interaktywne formularze z przyciskami i polami tekstowymi
✅ System wątków Discord dla każdego zamówienia
✅ Zapisywanie zamówień do plików JSON

### 🎯 **Routing zamówień według kategorii:**
✅ **Zielony Segregator** → <#${process.env.READY_ORDERS_LADA_CHANNEL_ID}>
✅ **Niebieski Segregator** → <#${process.env.READY_ORDERS_WORKSHOP_CHANNEL_ID}>
✅ **Karta Pogrzebowa** → <#${process.env.FUNERAL_ORDERS_CHANNEL_ID}>

### 🔘 **Przyciski akcji podsumowania:**
✅ Przekierowanie do innych kategorii
✅ Anulowanie zamówienia → <#${process.env.CANCELLED_ORDERS_CHANNEL_ID}>
✅ Zamówienie gotowe → odpowiedni kanał według kategorii
✅ Zamówienie odebrane → <#${process.env.ARCHIVE_CHANNEL_ID}> + usunięcie wątku
✅ Edycja zamówienia (placeholder)

### 🗂️ **Zarządzanie wątkami:**
✅ Automatyczne tworzenie wątków
✅ Usuwanie starych/nieaktywnych wątków co 10 zamówień
✅ Usuwanie wątków po odebraniu zamówienia

### 💾 **Przechowywanie danych:**
✅ Automatyczne zapisywanie do plików JSON
✅ Śledzenie numeru zamówienia w data.json
✅ Backup zamówień w folderze /temp

## 🔧 **W TRAKCIE PRAC:**
🟡 Optymalizacja systemu pytań
🟡 Dodatkowe funkcje edycji zamówień

## 📋 **DO ZROBIENIA:**
🔴 System zaległych zamówień (auto-przenoszenie nieodebranych)
🔴 Rozbudowa funkcji edycji zamówień
🔴 Integracja z systemem pracowni (routing do <#${process.env.WORKSHOP_CHANNEL_ID}>)
🔴 Dashboard z statystykami zamówień

## 📡 **KONFIGURACJA KANAŁÓW:**
✅ Lada (składanie): <#${process.env.LADA_CHANNEL_ID}>
✅ Pracownia: <#${process.env.WORKSHOP_CHANNEL_ID}>
✅ Gotowe lada: <#${process.env.READY_ORDERS_LADA_CHANNEL_ID}>
✅ Gotowe pracownia: <#${process.env.READY_ORDERS_WORKSHOP_CHANNEL_ID}>
✅ Zabrac na pogrzeb: <#${process.env.FUNERAL_ORDERS_CHANNEL_ID}>
✅ Archiwum: <#${process.env.ARCHIVE_CHANNEL_ID}>
✅ Anulowane: <#${process.env.CANCELLED_ORDERS_CHANNEL_ID}>
✅ Update: <#${process.env.UPDATE_CHANNEL_ID}>

---
🟢 **BOT DZIAŁA POPRAWNIE I JEST GOTOWY DO UŻYCIA!**
        `;

        await updateChannel.send(statusMessage);
        console.log('Status bota wysłany na kanał update');
        
    } catch (error) {
        console.error('Błąd podczas wysyłania statusu bota:', error);
    }
}

module.exports = { sendBotStatusUpdate }; 