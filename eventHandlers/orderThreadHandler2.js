const fs = require('fs');
const path = require('path');
const { sendOrderSummary } = require('./summaryHandler');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    handleButtonInteraction,
    handleTextFieldInteraction,
    handleTextFieldButtonInteraction
} = require('./threadInteractionHandler');

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

    const questionsPath = path.join(__dirname, '../utils/questions', "questionsStructure.json");
    const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    return questions;
}











