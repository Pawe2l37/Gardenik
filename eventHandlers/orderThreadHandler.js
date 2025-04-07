const fs = require('fs');
const path = require('path');
const { sendOrderSummary } = require('./summaryHandler');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const {
    handleButtonInteraction,
    handleTextFieldInteraction,
    handleTextFieldButtonInteraction
} = require('./threadInteractionHandler');

// Przechowanie zamówień w pamięci
const orders = {};

const orderTypeMap = {
    'niebieskiSegregator': {
        displayName: 'Niebieski Segregator',
        fileName: 'questionsNiebieski.json'
    },
    'zielonySegregator': {
        displayName: 'Zielony Segregator',
        fileName: 'questionsZielony.json'
    },
    'kartaPogrzebowa': {
        displayName: 'Karta Pogrzebowa',
        fileName: 'questionsKarta.json'
    }
};

function getQuestionsForOrderType(orderTypeKey) {
    const orderType = orderTypeMap[orderTypeKey];
    if (!orderType) {
        throw new Error(`No mapping found for order type key: ${orderTypeKey}`);
    }

    const questionsPath = path.join(__dirname, '../utils/questions', orderType.fileName);
    return JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
}

async function handleOrderThreadInteraction(interaction, client, threadName) {
    try {
        const channel = await client.channels.fetch(interaction.channelId);
        if (!channel) {
            console.error('Channel could not be fetched:', interaction.channelId);
            return;
        }

        // Sprawdzamy, czy kanał obsługuje wątki
        if (!channel.isTextBased()) {
            console.error('Channel is not text-based:', interaction.channelId);
            return;
        }

        const thread = await channel.threads.create({
            name: threadName,
            autoArchiveDuration: 60,
        });

        const orderTypeKey = interaction.customId;
        const orderType = orderTypeMap[orderTypeKey];
        if (!orderType) {
            console.error('Unknown order type:', orderTypeKey);
            return;
        }

        const questionsData = getQuestionsForOrderType(orderTypeKey);
        const questions = questionsData[orderType.displayName];

        if (!questions || !questions.pytanie) {
            console.error('Questions not found or empty for order type:', orderType.displayName);
            return;
        }

        const order = {
            orderNumber: threadName.split(' ')[2],
            // Nie ustawiamy currentQuestionKey na pierwsze pytanie, bo najpierw je zadamy
            answers: { miejsceZamowienia: orderType.displayName }
        };
        
        // Zapisujemy zamówienie w pamięci
        orders[thread.id] = order;

        // Dodajemy unikalne ID dla pierwszego pytania
        const firstQuestion = {
            pytanie: questions.pytanie,
            interactionType: questions.interactionType,
            przyciski: questions.odpowiedzi || questions.przyciski,
            key: 'firstQuestion'
        };

        // Zadajemy pierwsze pytanie ("Na kiedy?")
        await askQuestion(thread, firstQuestion, components => {
            order.currentQuestionKey = 'firstQuestion';
        });

        // Nie wywołujemy jeszcze askNextQuestion - czekamy na odpowiedź użytkownika
    } catch (error) {
        console.error('Error handling order thread interaction:', error);
    }
}

// Dodajemy funkcję do obliczania daty
function getLocalizedDate(daysToAdd) {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('pl-PL', options);
}

// Nowa funkcja do zadawania pojedynczego pytania
async function askQuestion(thread, question, callback) {
    const components = [];

    switch (question.interactionType) {
        case 'button':
            if (question.przyciski || question.odpowiedzi) {
                const buttonRow = new ActionRowBuilder();
                const przyciski = question.przyciski || question.odpowiedzi;
                
                if (Array.isArray(przyciski)) {
                    przyciski.forEach((przycisk, index) => {
                        // Sprawdzamy, czy to kod JavaScript do obliczenia daty
                        if (typeof przycisk === 'string' && przycisk.startsWith('(()')) {
                            // Zamiast używać kodu JS bezpośrednio, używamy indeksu
                            let dateValue = '';
                            let dayOffset = 0;
                            
                            if (przycisk.includes('getDate() + 1')) {
                                dayOffset = 1;
                            } else if (przycisk.includes('getDate() + 2')) {
                                dayOffset = 2;
                            } else if (przycisk.includes('getDate() + 3')) {
                                dayOffset = 3;
                            } else if (przycisk.includes('getDate() + 4')) {
                                dayOffset = 4;
                            }
                            
                            // Obliczamy datę lokalnie
                            dateValue = getLocalizedDate(dayOffset);
                            
                            buttonRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`data_${dayOffset}`)
                                    .setLabel(dateValue)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        }
                        // Reszta kodu bez zmian...
                        else if (typeof przycisk === 'object' && przycisk.przycisk) {
                            buttonRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(przycisk.przycisk)
                                    .setLabel(przycisk.przycisk)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        } else if (typeof przycisk === 'string') {
                            buttonRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(przycisk)
                                    .setLabel(przycisk)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        }
                    });
                } else {
                    buttonRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(przyciski)
                            .setLabel(przyciski)
                            .setStyle(ButtonStyle.Primary)
                    );
                }
                
                components.push(buttonRow);
            }
            break;

        case 'textField':
            // Dla pól tekstowych nie dodajemy komponentów
            break;

        case 'textField+button':
            if (question.przyciski) {
                const textFieldButtonRow = new ActionRowBuilder();
                
                if (Array.isArray(question.przyciski)) {
                    question.przyciski.forEach(przycisk => {
                        if (typeof przycisk === 'object' && przycisk.przycisk) {
                            textFieldButtonRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(przycisk.przycisk)
                                    .setLabel(przycisk.przycisk)
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        } else if (typeof przycisk === 'string') {
                            textFieldButtonRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(przycisk)
                                    .setLabel(przycisk)
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        }
                    });
                } else {
                    textFieldButtonRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(question.przyciski)
                            .setLabel(question.przyciski)
                            .setStyle(ButtonStyle.Secondary)
                    );
                }
                
                components.push(textFieldButtonRow);
            }
            break;
    }

    await thread.send({
        content: question.pytanie,
        components: components.length > 0 ? components : undefined,
    });

    if (callback) callback(components);
}

async function askNextQuestion(threadId, client, order, questions) {
    // Dodajemy rekurencyjne przeszukiwanie drzewa pytań
    const nextQuestion = findNextQuestion(order, questions);
    
    if (!nextQuestion) {
        await sendOrderSummary(threadId, client);
        return;
    }

    const thread = await client.channels.fetch(threadId);
    await askQuestion(thread, nextQuestion.question, () => {
        // Zapisujemy klucz pytania - używamy klucza, a jeśli go nie ma to treści pytania
        order.currentQuestionKey = nextQuestion.question.pytanie;
        order.currentQuestionPath = nextQuestion.path; // Zapisujemy ścieżkę do pytania
        console.log(`Ustawiam currentQuestionKey na: ${order.currentQuestionKey}, ścieżka: ${nextQuestion.path}`);
    });
}

// Nowa rekurencyjna funkcja znajdująca następne pytanie
function findNextQuestion(order, questions, basePath = "") {
    // Przypadek dla pierwszego pytania
    if (order.currentQuestionKey === 'firstQuestion') {
        console.log('Pobieram pierwsze pytanie z kolejnych pytań');
        return { 
            question: questions[0], 
            path: "0" 
        }; 
    }

    // Jeśli mamy zapisaną ścieżkę, używamy jej
    if (order.currentQuestionPath) {
        const pathSegments = order.currentQuestionPath.split(".");
        let currentQuestions = questions;
        let currentQuestion = null;
        let newPath = "";
        
        // Przechodzimy przez segmenty ścieżki
        for (let i = 0; i < pathSegments.length; i++) {
            const index = parseInt(pathSegments[i]);
            currentQuestion = currentQuestions[index];
            
            // Jeśli to ostatni segment, szukamy następnego pytania na tym poziomie
            if (i === pathSegments.length - 1) {
                if (index + 1 < currentQuestions.length) {
                    // Następne pytanie na tym samym poziomie
                    const nextPath = pathSegments.slice(0, i).join(".") + (i > 0 ? "." : "") + (index + 1);
                    console.log(`Znaleziono następne pytanie na tym samym poziomie: ${currentQuestions[index + 1].pytanie}, ścieżka: ${nextPath}`);
                    return { 
                        question: currentQuestions[index + 1], 
                        path: nextPath 
                    };
                } else if (currentQuestion.kolejnePytania && currentQuestion.kolejnePytania.length > 0) {
                    // Idziemy poziom niżej (do kolejnePytania)
                    const nextPath = order.currentQuestionPath + ".0";
                    console.log(`Przechodzę poziom niżej do kolejnePytania: ${currentQuestion.kolejnePytania[0].pytanie}, ścieżka: ${nextPath}`);
                    return { 
                        question: currentQuestion.kolejnePytania[0], 
                        path: nextPath 
                    };
                } else {
                    // Wracamy do poprzedniego poziomu, jeśli to możliwe
                    if (i > 0) {
                        const parentPathSegments = pathSegments.slice(0, i - 1);
                        const parentIndex = parseInt(pathSegments[i - 1]);
                        let parentQuestions = questions;
                        
                        // Znajdujemy rodzica
                        for (let j = 0; j < parentPathSegments.length; j++) {
                            parentQuestions = parentQuestions[parseInt(parentPathSegments[j])].kolejnePytania;
                        }
                        
                        if (parentIndex + 1 < parentQuestions.length) {
                            const nextPath = parentPathSegments.join(".") + (parentPathSegments.length > 0 ? "." : "") + (parentIndex + 1);
                            console.log(`Wracam do poprzedniego poziomu: ${parentQuestions[parentIndex + 1].pytanie}, ścieżka: ${nextPath}`);
                            return { 
                                question: parentQuestions[parentIndex + 1], 
                                path: nextPath 
                            };
                        }
                    }
                }
            }
            
            // Przygotowujemy się do zejścia na kolejny poziom
            if (currentQuestion.kolejnePytania) {
                currentQuestions = currentQuestion.kolejnePytania;
            } else {
                break;
            }
        }
    }
    
    // Jeśli nie znaleźliśmy pytania po ścieżce, próbujemy stary sposób
    // Szukamy po pytaniu w głównej liście
    const currentIndex = questions.findIndex(q => q.pytanie === order.currentQuestionKey);
    
    if (currentIndex !== -1) {
        if (currentIndex + 1 < questions.length) {
            console.log(`Znaleziono następne pytanie w głównej liście: ${questions[currentIndex + 1].pytanie}`);
            return { 
                question: questions[currentIndex + 1], 
                path: `${currentIndex + 1}` 
            };
        } else if (questions[currentIndex].kolejnePytania && questions[currentIndex].kolejnePytania.length > 0) {
            console.log(`Przechodzę do kolejnePytania dla ${questions[currentIndex].pytanie}: ${questions[currentIndex].kolejnePytania[0].pytanie}`);
            return { 
                question: questions[currentIndex].kolejnePytania[0], 
                path: `${currentIndex}.0` 
            };
        }
    }
    
    // Jeśli nie znaleźliśmy, wyszukujemy rekurencyjnie
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Jeśli to jest aktualne pytanie
        if (question.pytanie === order.currentQuestionKey) {
            // Sprawdzamy, czy ma kolejne pytania
            if (question.kolejnePytania && question.kolejnePytania.length > 0) {
                const nextPath = (basePath ? basePath + "." : "") + i + ".0";
                console.log(`Znaleziono kolejnePytania dla aktualnego pytania: ${question.kolejnePytania[0].pytanie}, ścieżka: ${nextPath}`);
                return { 
                    question: question.kolejnePytania[0], 
                    path: nextPath 
                };
            }
        }
        
        // Rekurencyjnie sprawdzamy kolejnePytania
        if (question.kolejnePytania && question.kolejnePytania.length > 0) {
            const nextPath = (basePath ? basePath + "." : "") + i;
            const found = findNextQuestion(order, question.kolejnePytania, nextPath);
            if (found) {
                return found;
            }
        }
    }
    
    console.log(`Nie znaleziono następnego pytania dla ${order.currentQuestionKey}`);
    return null;
}

function saveOrderToFile(order) {
    const filePath = path.join(__dirname, `../temp/order${order.orderNumber}.json`);
    fs.writeFileSync(filePath, JSON.stringify(order.answers, null, 2));
}

async function handleUserResponse(interaction, client) {
    let threadId, userInput, customId, messageToDisable;
    
    // Obsługa różnych typów interakcji
    if (interaction.isButton && interaction.isButton()) {
        // To jest interakcja przycisku
        threadId = interaction.channel.id;
        customId = interaction.customId;
        messageToDisable = interaction.message;
        
        // Potwierdź użytkownikowi że interakcja została przyjęta
        try {
            await interaction.deferUpdate();
        } catch (error) {
            console.error('Nie można potwierdzić interakcji:', error);
        }
        
        console.log(`Button interaction received: ${customId} in thread ${threadId}`);
    } else if (interaction.author) {
        // To jest wiadomość tekstowa
        threadId = interaction.channel.id;
        userInput = interaction.content;
        console.log(`Message received: "${userInput}" in thread ${threadId}`);
    } else {
        console.error('Nieznany typ interakcji:', interaction);
        return;
    }

    // Pobieramy zamówienie dla tego wątku
    const order = orders[threadId];
    if (!order) {
        console.log(`Brak zamówienia dla wątku ${threadId}. Może to jest nowy wątek lub wiadomość w kanale głównym.`);
        return;
    }

    // Pobieramy aktualne pytania dla tego zamówienia z pliku
    const orderTypeKey = order.answers.miejsceZamowienia === 'Niebieski Segregator' ? 'niebieskiSegregator' : 
                         order.answers.miejsceZamowienia === 'Zielony Segregator' ? 'zielonySegregator' :
                         'kartaPogrzebowa';
    
    const questionsData = getQuestionsForOrderType(orderTypeKey);
    const questions = questionsData[order.answers.miejsceZamowienia];
    
    let odpowiedz;
    
    // Obsługa pierwszego pytania
    if (order.currentQuestionKey === 'firstQuestion') {
        if (customId) {
            // Obsługa przycisku dla pierwszego pytania
            if (customId === 'Pomiń' || customId === 'inna data') {
                odpowiedz = 'Nieznana data';
            } else if (customId.startsWith('data_')) {
                // Jeśli to jest przycisk daty w postaci "data_1", "data_2" itp.
                const dayOffset = parseInt(customId.substring(5));
                odpowiedz = getLocalizedDate(dayOffset);
            } else {
                odpowiedz = customId;
            }
            
            // Zapisujemy odpowiedź
            order.answers['naKiedy'] = odpowiedz;
            saveOrderToFile(order);
            
            // Inicjalizujemy ścieżkę
            order.currentQuestionPath = "";
            
            // Wyszarzamy przyciski, jeśli to interakcja przycisku
            if (messageToDisable) {
                try {
                    // Klonujemy komponenty, aby nie modyfikować oryginalnych
                    const disabledComponents = messageToDisable.components.map(row => {
                        const newRow = new ActionRowBuilder();
                        
                        row.components.forEach(component => {
                            if (component.type === 2) { // ButtonComponent
                                newRow.addComponents(
                                    ButtonBuilder.from(component)
                                        .setDisabled(true)
                                );
                            } else {
                                newRow.addComponents(component);
                            }
                        });
                        
                        return newRow;
                    });
                    
                    await messageToDisable.edit({ components: disabledComponents });
                } catch (error) {
                    console.error('Nie można wyłączyć przycisków:', error);
                }
            }
            
            // Przechodzimy do kolejnych pytań
            await askNextQuestion(threadId, client, order, questions.kolejnePytania);
        } else if (userInput) {
            // Obsługa wprowadzonej daty ręcznie
            odpowiedz = userInput;
            
            // Zapisujemy odpowiedź
            order.answers['naKiedy'] = odpowiedz;
            saveOrderToFile(order);
            
            // Inicjalizujemy ścieżkę
            order.currentQuestionPath = "";
            
            // Przechodzimy do kolejnych pytań
            await askNextQuestion(threadId, client, order, questions.kolejnePytania);
        }
        return;
    }
    
    // Obsługa pozostałych pytań
    const currentQuestion = findCurrentQuestion(order, questions.kolejnePytania);
    
    if (!currentQuestion) {
        console.error('Nie znaleziono aktualnego pytania:', order.currentQuestionKey);
        console.log('Dostępne pytania w głównej liście:', questions.kolejnePytania.map(q => q.pytanie));
        return;
    }

    // Sprawdzamy, czy mamy ostatnie pytanie - komentarz
    // Jeśli tak, to nie reagujemy na nowe wiadomości
    if (currentQuestion.pytanie === 'Komentarz' && !customId) {
        console.log('Ostatnie pytanie (Komentarz) - ignorujemy nowe wiadomości tekstowe');
        return;
    }

    // Obsługa powtarzalnych pytań (repetableTextField+button)
    if (currentQuestion.interactionType === 'repetableTextField+button') {
        if (customId) {
            // Obsługa przycisku w powtarzalnym pytaniu
            if (customId === 'Pomiń') {
                // Kończymy powtarzanie
                odpowiedz = 'Pominięto';
                
                // Wyszarzamy przyciski
                if (messageToDisable) {
                    try {
                        const disabledComponents = messageToDisable.components.map(row => {
                            const newRow = new ActionRowBuilder();
                            row.components.forEach(component => {
                                if (component.type === 2) { // ButtonComponent
                                    newRow.addComponents(
                                        ButtonBuilder.from(component)
                                            .setDisabled(true)
                                    );
                                } else {
                                    newRow.addComponents(component);
                                }
                            });
                            return newRow;
                        });
                        
                        await messageToDisable.edit({ components: disabledComponents });
                    } catch (error) {
                        console.error('Nie można wyłączyć przycisków:', error);
                    }
                }
                
                // Przechodzimy do następnego pytania
                await askNextQuestion(threadId, client, order, questions.kolejnePytania);
                return;
            } else if (customId === 'Kolejna szarfa') {
                // Ten kod nie będzie już używany
                return;
            }
        } else if (userInput) {
            // Obsługa wpisanego tekstu (np. treść szarfy)
            odpowiedz = userInput;
            
            // Zapisujemy do tablicy odpowiedzi
            if (!order.answers[currentQuestion.pytanie]) {
                order.answers[currentQuestion.pytanie] = [];
            }
            
            order.answers[currentQuestion.pytanie].push(odpowiedz);
            saveOrderToFile(order);
            
            // Ponownie zadajemy to samo pytanie, ale zmieniamy treść na "Dodaj treść szarfy"
            const thread = await client.channels.fetch(threadId);
            await askQuestion(thread, {
                pytanie: "Dodaj treść szarfy",
                interactionType: "textField+button",
                przyciski: "Pomiń",
            }, () => {
                // Nie zmieniamy currentQuestionKey ani ścieżki
            });
            
            return;
        }
    } else {
        // Standardowa obsługa pytań
        if (customId) {
            // Obsługa przycisku
            if (customId === 'Pomiń') {
                odpowiedz = 'Pominięto';
            } else {
                odpowiedz = customId;
                
                // Sprawdzamy, czy przycisk ma dodatkowe pytanie
                if (Array.isArray(currentQuestion.przyciski)) {
                    // Szukamy przycisku w tablicy przycisków
                    const buttonWithQuestion = currentQuestion.przyciski.find(p => 
                        typeof p === 'object' && p.przycisk === customId && p.pytanie);
                    
                    if (buttonWithQuestion) {
                        console.log(`Znaleziono przycisk z dodatkowym pytaniem: ${buttonWithQuestion.pytanie}`);
                        
                        // Wyszarzamy przyciski, jeśli to interakcja przycisku
                        if (messageToDisable) {
                            try {
                                const disabledComponents = messageToDisable.components.map(row => {
                                    const newRow = new ActionRowBuilder();
                                    row.components.forEach(component => {
                                        if (component.type === 2) { // ButtonComponent
                                            newRow.addComponents(
                                                ButtonBuilder.from(component)
                                                    .setDisabled(true)
                                            );
                                        } else {
                                            newRow.addComponents(component);
                                        }
                                    });
                                    return newRow;
                                });
                                
                                await messageToDisable.edit({ components: disabledComponents });
                            } catch (error) {
                                console.error('Nie można wyłączyć przycisków:', error);
                            }
                        }
                        
                        // Zapisujemy odpowiedź
                        order.answers[currentQuestion.pytanie] = odpowiedz;
                        saveOrderToFile(order);
                        
                        // Zadajemy dodatkowe pytanie
                        const thread = await client.channels.fetch(threadId);
                        await askQuestion(thread, buttonWithQuestion, () => {
                            order.currentQuestionKey = buttonWithQuestion.pytanie;
                            // Nie ustawiamy ścieżki, aby system mógł znaleźć następne pytanie po tym dodatkowym
                        });
                        
                        return; // Kończymy, bo zadaliśmy dodatkowe pytanie
                    }
                }
            }
        } else if (userInput) {
            // Obsługa tekstu
            odpowiedz = userInput;
        } else {
            console.error('Brak danych do obsługi interakcji.');
            return;
        }
        
        // Zapisujemy odpowiedź używając pytania jako klucza
        order.answers[currentQuestion.pytanie] = odpowiedz;
        saveOrderToFile(order);
        
        // Wyszarzamy przyciski, jeśli to interakcja przycisku
        if (messageToDisable) {
            try {
                // Klonujemy komponenty, aby nie modyfikować oryginalnych
                const disabledComponents = messageToDisable.components.map(row => {
                    const newRow = new ActionRowBuilder();
                    
                    row.components.forEach(component => {
                        if (component.type === 2) { // ButtonComponent
                            newRow.addComponents(
                                ButtonBuilder.from(component)
                                    .setDisabled(true)
                            );
                        } else {
                            newRow.addComponents(component);
                        }
                    });
                    
                    return newRow;
                });
                
                await messageToDisable.edit({ components: disabledComponents });
            } catch (error) {
                console.error('Nie można wyłączyć przycisków:', error);
            }
        }
        
        // Przechodzimy do kolejnego pytania
        await askNextQuestion(threadId, client, order, questions.kolejnePytania);
    }
}

// Dodajemy pomocniczą funkcję do znajdowania aktualnego pytania
function findCurrentQuestion(order, questions, basePath = "") {
    // Jeśli mamy zapisaną ścieżkę, używamy jej
    if (order.currentQuestionPath) {
        const pathSegments = order.currentQuestionPath.split(".");
        let currentQuestions = questions;
        let currentQuestion = null;
        
        for (let i = 0; i < pathSegments.length; i++) {
            const index = parseInt(pathSegments[i]);
            if (index >= currentQuestions.length) {
                console.error(`Nieprawidłowy indeks ${index} w ścieżce ${order.currentQuestionPath}`);
                return null;
            }
            currentQuestion = currentQuestions[index];
            
            if (i === pathSegments.length - 1) {
                return currentQuestion;
            }
            
            if (currentQuestion.kolejnePytania) {
                currentQuestions = currentQuestion.kolejnePytania;
            } else {
                break;
            }
        }
        return null;
    }
    
    // Jeśli nie mamy ścieżki, szukamy po pytaniu
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        if (question.pytanie === order.currentQuestionKey) {
            return question;
        }
        
        if (question.kolejnePytania && question.kolejnePytania.length > 0) {
            const nextPath = (basePath ? basePath + "." : "") + i;
            const found = findCurrentQuestion(order, question.kolejnePytania, nextPath);
            if (found) {
                return found;
            }
        }
    }
    
    return null;
}

module.exports = { handleOrderThreadInteraction, askQuestion, askNextQuestion, saveOrderToFile, handleUserResponse, orders };
