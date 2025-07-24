# Gardenik - Bot Discord do zarządzania zamówieniami kwiaciarni

## Opis projektu
Gardenik to bot Discord stworzony na potrzeby zarządzania zamówieniami w kwiaciarni. Bot umożliwia pracownikom składanie zamówień poprzez interaktywny formularz w kanale Discord, organizując je w wątki i zarządzając numeracją zamówień.

## Funkcjonalności
1. **Wybór typu zamówienia**:
   - Niebieski Segregator → Pracownia
   - Zielony Segregator → Lada  
   - Karta Pogrzebowa → Pogrzeby

2. **Interaktywny formularz zamówienia**:
   - Dynamiczne pytania w zależności od typu zamówienia
   - Różne typy interakcji (przyciski, pola tekstowe, Select Menu)
   - **NOWOŚĆ**: Select Menu z datami na 14 dni dla przycisku "Inna"
   - **NOWOŚĆ**: Pytanie o "Wyposażenie dodatkowe" dla kart pogrzebowych (Znicz/Wkłady/Stojaki)
   - Możliwość pomijania niektórych pytań
   - Normalizacja dat do formatu YYYY-MM-DD dla przyszłych funkcji

3. **System routingu zamówień**:
   - Automatyczne kierowanie zamówień do właściwych kanałów
   - Zielony Segregator → Kanał gotowych zamówień lada
   - Niebieski Segregator → Kanał gotowych zamówień pracownia  
   - Karta Pogrzebowa → Kanał "zabrac na pogrzeb"

4. **Zarządzanie zamówieniami**:
   - Automatyczna numeracja zamówień
   - Tworzenie osobnych wątków dla każdego zamówienia
   - **NOWOŚĆ**: 5 przycisków akcji w podsumowaniu zamówienia:
     - 🔄 Przekierowanie do innych kategorii
     - ❌ Anuluj zamówienie → Kanał anulowanych
     - ✅ Zamówienie gotowe → Odpowiedni kanał według kategorii
     - 📦 Zamówienie odebrane → Archiwum + usunięcie wątku
     - ✏️ Edycja zamówienia (placeholder)
   - Automatyczne usuwanie starych/nieaktywnych wątków (co 10 zamówień)
   - Podsumowanie zamówienia po zakończeniu procesu

5. **Przechowywanie danych**:
   - Zapisywanie informacji o zamówieniach w plikach JSON
   - Śledzenie numeru aktualnego zamówienia
   - Backup wszystkich zamówień w folderze /temp

6. **System statusu i monitoringu**:
   - Automatyczne wysyłanie statusu bota na kanał update przy uruchomieniu
   - Wyświetlanie aktualnego numeru zamówienia
   - Lista działających funkcjonalności i planowanych rozszerzeń

## Architektura systemu
- **index.js** - główny plik bota, inicjalizacja klienta Discord
- **eventHandlers/** - obsługa różnych zdarzeń i interakcji
  - **startMessageHandler.js** - obsługa głównego menu wyboru typu zamówienia
  - **orderThreadHandler.js** - obsługa wątków zamówień + Select Menu dat
  - **summaryHandler.js** - generowanie podsumowania zamówienia z przyciskami akcji
  - **summaryActionsHandler.js** - **NOWY**: obsługa 5 przycisków akcji podsumowania
  - **statusUpdateHandler.js** - **NOWY**: wysyłanie statusu bota na kanał update
  - **orderNumberHandler.js** - zarządzanie numeracją zamówień  
  - **threadInteractionHandler.js** - obsługa różnych typów interakcji w wątkach
  - **slashCommandsHandler.js** - obsługa poleceń slash (np. /ping)
- **utils/** - narzędzia pomocnicze
  - **commands.js** - definicje poleceń slash
  - **questions/** - pliki JSON z pytaniami dla różnych typów zamówień
  - **data.json** - plik przechowujący aktualny numer zamówienia
- **temp/** - katalog na pliki tymczasowe (dane zamówień)

## Proces składania zamówienia
1. Bot wyświetla wiadomość startową z trzema przyciskami typów zamówień
2. Po wyborze typu, bot tworzy nowy wątek z nazwą "Zamówienie numer X"
3. W wątku bot rozpoczyna serię pytań zależnych od typu zamówienia
4. Użytkownik odpowiada na pytania za pomocą przycisków lub wpisywania tekstu
5. Po zakończeniu procesu bot generuje podsumowanie zamówienia
6. Dane zamówienia są zapisywane w pliku JSON

## Technologie
- Node.js
- Discord.js - biblioteka do tworzenia botów Discord
- System wątków i interaktywnych przycisków Discord

## Wymagane zmienne środowiskowe (.env)
### Tokeny autoryzacyjne:
- DISCORD_TOKEN - token autoryzacyjny bota Discord
- OPENAI_API_KEY - klucz API OpenAI (dla przyszłych funkcji AI)

### Konfiguracja kanałów Discord:
- LADA_CHANNEL_ID - kanał główny do składania zamówień (lada)
- WORKSHOP_CHANNEL_ID - kanał pracowni
- READY_ORDERS_LADA_CHANNEL_ID - kanał gotowych zamówień lada
- READY_ORDERS_WORKSHOP_CHANNEL_ID - kanał gotowych zamówień pracownia
- FUNERAL_ORDERS_CHANNEL_ID - kanał "zabrac na pogrzeb"
- OVERDUE_ORDERS_CHANNEL_ID - kanał zaległych zamówień (planowane)
- ARCHIVE_CHANNEL_ID - kanał archiwum odebranych zamówień
- CANCELLED_ORDERS_CHANNEL_ID - kanał anulowanych zamówień
- UPDATE_CHANNEL_ID - kanał do wysyłania statusów bota

## Instrukcja uruchomienia
1. Zainstaluj zależności: `npm install`
2. Upewnij się, że plik .env zawiera wszystkie wymagane zmienne
3. Uruchom bota: `node index.js` 