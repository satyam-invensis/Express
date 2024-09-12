const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bodyParser = require('body-parser');

const app = express();

// Serve static files from the 'Frontend' directory
app.use(express.static(path.join(__dirname, '../Frontend')));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../Frontend'));

let csvData = [];
const csvFilePath = path.join(__dirname, 'htsdata.csv');

function loadCSV(callback) {
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => {
            // Extract numeric value from Column 2 Rate of Duty
            let score = extractNumericScore(data['Column 2 Rate of Duty']);
            data.Score = score;
            csvData.push(data);
        })
        .on('end', () => {
            console.log('CSV data loaded successfully');
            callback(null);
        })
        .on('error', (err) => {
            console.error('Error reading CSV file:', err);
            callback(err);
        });
}

loadCSV((err) => {
    if (err) {
        console.error('Failed to load CSV data. Exiting...');
        process.exit(1);
    }
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});

app.get('/', (req, res) => {
    res.render('index');  // Render the homepage with the form
});

app.post('/predict', (req, res) => {
    try {
        const inputText = req.body.text ? req.body.text.trim().toLowerCase() : '';

        if (!inputText) {
            throw new Error('Input text is empty');
        }

        let predictions = predictFromCSV(inputText);

        if (predictions.length > 0) {
            predictions.forEach(p => {
                p.score = (p.score).toFixed(2) + '%';
                p.htsNumber = formatHSCode(p.htsNumber);
            });
            // Render the results page with EJS
            res.render('result', { results: predictions, error: null });
        } else {
            // Render the results page with EJS
            res.render('result', { results: [], error: 'No matching results found.' });
        }
    } catch (error) {
        console.error('Error during prediction:', error);
        // Render the results page with EJS
        res.status(500).render('result', { results: [], error: 'An error occurred. Please try again.' });
    }
});

function predictFromCSV(text) {
    return csvData
        .filter(row => row.Description && row.Description.toLowerCase().includes(text))
        .map(row => ({
            htsNumber: row['﻿HTS Number'] || 'N/A',
            description: row.Description || 'N/A',
            score: row.Score || 0
        }))
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 8); // Get the top 8 entries
}

function extractNumericScore(dutyRate) {
    if (!dutyRate) return 0;

    // Extract the percentage from the string and convert to a number
    let match = dutyRate.match(/(\d+(\.\d+)?)%?/);
    if (match) {
        return parseFloat(match[1]);
    }
    return 0; // Default to 0 if no match found
}

function formatHSCode(code) {
    if (code === 'N/A' || !code.trim()) return code;
    return code.replace(/(\d{1,2})(?=(\d{2})+(?!\d))/g, '$1.');
}
