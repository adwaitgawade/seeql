const fs = require('fs');
const path = require('path');

/**
 * Convert JSON (with dbml key) to a .dbml file
 * @param {Object|string} input - JSON object or JSON string
 * @param {string} outputFile - Output file path
 */
function jsonToDbmlFile(input, outputFile = 'schema.dbml') {
    try {
        // Parse if string
        const data = typeof input === 'string' ? JSON.parse(input) : input;

        if (!data.dbml) {
            throw new Error('Missing "dbml" key in JSON');
        }

        const dbmlContent = data.dbml;

        // Ensure .dbml extension
        const filePath = path.extname(outputFile)
            ? outputFile
            : `${outputFile}.dbml`;

        // Write file
        fs.writeFileSync(filePath, dbmlContent, 'utf-8');

        console.log(`✅ DBML file created at: ${filePath}`);
    } catch (err) {
        console.error('❌ Error creating DBML file:', err.message);
    }
}

// Example usage:

const inputJson = require('./db.json'); // your JSON file

jsonToDbmlFile(inputJson, 'neondb.dbml');