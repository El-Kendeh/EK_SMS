const fs = require('fs');
const path = require('path');

const modelFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'index.js' && f !== 'associations.js')
  .sort();

for (const file of modelFiles) {
  require(path.join(__dirname, file));
}

require('./associations');
