const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function handleButtonInteraction(interaction) {
    if (interaction.customId === "Pomiń") {
        return " ";
    }
    return interaction.customId;
}

function handleTextFieldInteraction(interaction, userInput) {
    return userInput;
}

function handleTextFieldButtonInteraction(interaction, userInput) {
    if (interaction.customId === "Pomiń") {
        return userInput;
    }
    return `${interaction.customId}, ${userInput}`;
}

module.exports = {
    handleButtonInteraction,
    handleTextFieldInteraction,
    handleTextFieldButtonInteraction
};
