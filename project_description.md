# Gardenik - Bot Discord do zarządzania zamówieniami kwiaciarni

## Opis projektu
Gardenik to bot Discord stworzony na potrzeby zarządzania zamówieniami w kwiaciarni. Bot umożliwia pracownikom składanie zamówień poprzez interaktywny formularz w kanale Discord, organizując je w wątki i zarządzając numeracją zamówień.

## Funkcjonalności
1. **Wybór typu zamówienia**:
   - Niebieski Segregator
   - Zielony Segregator
   - Karta Pogrzebowa

2. **Interaktywny formularz zamówienia**:
   - Dynamiczne pytania w zależności od typu zamówienia
   - Różne typy interakcji (przyciski, pola tekstowe)
   - Możliwość pomijania niektórych pytań

3. **Zarządzanie zamówieniami**:
   - Automatyczna numeracja zamówień
   - Tworzenie osobnych wątków dla każdego zamówienia
   - Automatyczne usuwanie starych/nieaktywnych wątków (co 10 zamówień)
   - Podsumowanie zamówienia po zakończeniu procesu

4. **Przechowywanie danych**:
   - Zapisywanie informacji o zamówieniach w plikach JSON
   - Śledzenie numeru aktualnego zamówienia

## Architektura systemu
- **index.js** - główny plik bota, inicjalizacja klienta Discord
- **eventHandlers/** - obsługa różnych zdarzeń i interakcji
  - **startMessageHandler.js** - obsługa głównego menu wyboru typu zamówienia
  - **orderThreadHandler.js** - obsługa wątków zamówień
  - **summaryHandler.js** - generowanie podsumowania zamówienia
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
- DISCORD_TOKEN - token autoryzacyjny bota Discord
- HI_CHANNEL_ID - ID kanału do wyświetlania wiadomości startowej
- WORKSHOP_CHANNEL_ID - ID kanału warsztatowego
- GUILD_ID/SERVER_ID - ID serwera Discord

## Instrukcja uruchomienia
1. Zainstaluj zależności: `npm install`
2. Upewnij się, że plik .env zawiera wszystkie wymagane zmienne
3. Uruchom bota: `node index.js` 