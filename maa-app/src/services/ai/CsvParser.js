/**
 * CsvParser.js
 * Utility for parsing the Indian Food Nutrition CSV.
 */

import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export async function parseFoodCsv() {
    try {
        const fileUri = FileSystem.documentDirectory + 'Indian_Food_Nutrition_Processed.csv';
        // Check if exists, else copy from assets if we had it there
        // For now, assume it's in the project root and accessible via FileSystem if we copy it or read it
        // Since we are in Expo Go, reading from project root is tricky. 
        // We might need to use require() if we rename it to .txt or something, 
        // but FileSystem.readAsStringAsync is better if we have the file path.

        // As a workaround for Expo Go, let's try to read it from the path provided by the user
        // c:\Users\iqras\OneDrive\Desktop\jananisetu2.0\mini-project-sem6\maa-app\Indian_Food_Nutrition_Processed (1).csv
        // In reality, we should bundle this. For this task, I'll implement a function that accepts the content.
    } catch (e) {
        console.error('CSV Parsing error:', e);
        return [];
    }
}

export function parseCsvContent(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = parseLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const entry = {};
        headers.forEach((h, index) => {
            const key = h.trim();
            const val = values[index]?.trim();
            // Store as is or float
            entry[key] = (val !== '' && !isNaN(val)) ? parseFloat(val) : val;
        });
        data.push(entry);
    }
    return data;
}

/**
 * Split CSV line handling quotes and commas
 */
function parseLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}
