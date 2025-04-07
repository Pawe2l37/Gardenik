const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../utils/data.json');

function readOrderNumber() {
  
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ currentOrderNumber: 0 }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  return data.currentOrderNumber;
}

function updateOrderNumber() {
  const newOrderNumber = readOrderNumber() + 1;
  const data = { currentOrderNumber: newOrderNumber };
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

module.exports = { readOrderNumber, updateOrderNumber };
