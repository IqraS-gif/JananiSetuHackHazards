const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY; // Managed via .env for security
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Generate dynamic nutritional insights using Groq.
 */
export async function getDynamicInsights(foodItems, nutritionTotals) {
    if (GROQ_API_KEY.includes('YOUR_KEY_HERE')) {
        console.log('[Groq] API Key not set, skipping dynamic insights.');
        return null;
    }

    try {
        const foodList = foodItems.map(f => f.name || f.name_en || f.name_hi).join(', ');
        const prompt = `
            You are a professional pregnancy nutritionist in India. Analyze this meal for a pregnant mother:
            Foods: ${foodList}
            Total Nutrients: ${Math.round(nutritionTotals.calories)}kcal, ${Math.round(nutritionTotals.protein)}g protein, ${Math.round(nutritionTotals.iron)}mg iron.
            
            Instructions:
            1. For EACH specific food item, provide a professional health evaluation (20-30 words) explaining its impact on pregnancy/fetal development.
            2. Assign a 'sentiment': "positive" (for healthy/recommended), or "warning" (for junk/processed/high-risk).
            3. Provide two overall summary alerts (food and nutrition).
            4. Provide a 'conclusion' (30-40 words): A professional final recommendation or verdict for this specific meal.
            
            Return ONLY a JSON object:
            {
              "item_insights": [
                { 
                  "name": "Exact Food Name", 
                  "sentiment": "positive/warning", 
                  "hi": "विस्तृत हिंदी विश्लेषण (20-30 शब्द)", 
                  "en": "Detailed English analysis (20-30 words)" 
                }
              ],
              "summary_alerts": [
                 {"type": "food_alert", "sentiment": "warning/positive/caution", "hi": "...", "en": "..."},
                 {"type": "nutrition_alert", "sentiment": "warning/positive/caution", "hi": "...", "en": "..."}
              ],
              "conclusion": {
                "hi": "अंतिम पेशेवर निष्कर्ष (चिकित्सीय सलाह)",
                "en": "Final professional nutritionist recommendation/conclusion"
              }
            }
            Do not include extra text.
        `;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);

        return {
            itemInsights: content.item_insights || [],
            summaryAlerts: content.summary_alerts || [],
            conclusion: content.conclusion || null
        };
    } catch (error) {
        console.warn('[Groq] Error fetching insights (offline or API down):', error.message);
        return null;
    }
}

/**
 * Transcribe audio using Groq Whisper.
 * @param {string} uri - Local URI of the audio file
 */
export async function transcribeAudio(uri) {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri,
            name: 'audio.m4a',
            type: 'audio/m4a',
        });
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'hi'); // Default to Hindi for JananiSetu
        formData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Groq STT] Error:', errBody);
            throw new Error(`Groq STT failed: ${response.status}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('[Groq STT] Error transcribing audio:', error);
        throw error;
    }
}

/**
 * Extract food items from text and estimate nutrition using AI.
 * Used as a fallback when local DB/Dataset search fails.
 * @param {string} text - The transcribed text from voice
 * @param {Array<string>} excludedItems - Items already found locally
 */
export async function getAIFoodNutrition(text, excludedItems = []) {
    try {
        const prompt = `
            You are a professional nutrition expert for pregnancy in India. 
            Analyize this food mention: "${text}"
            
            Instructions:
            1. Identify the proper, canonical name for the food mentioned.
            2. Extract accurate nutritional details for a standard Indian serving (e.g., 1 katori, 1 medium bowl, or 100g).
            3. Ensure the names are clear and recognizable (e.g., "Dal" instead of just "Pulses").
            
            Return ONLY a JSON array of objects with this structure:
            [
              {
                "name": "Proper Food Name (English)",
                "name_hi": "सही भोजन का नाम (Hindi)",
                "calories": number (kcal),
                "protein": number (g),
                "iron": number (mg),
                "calcium": number (mg),
                "folate": number (µg),
                "confidence": number (0-1)
              }
            ]
            Return an empty array [] if no food item is found. No extra text.
        `;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) throw new Error(`Groq API failed: ${response.status}`);

        const result = await response.json();
        let content = JSON.parse(result.choices[0].message.content);

        // Return the array directly if it's the root, or check for common keys
        if (Array.isArray(content)) return content;
        if (content.foods) return content.foods;
        if (content.items) return content.items;

        return [];
    } catch (error) {
        console.error('[Groq AI Nutrition] Error:', error);
        return [];
    }
}

/**
 * Extract an array of food names from a given sentence.
 * Useful for high-level identification before tiered lookup.
 */
export async function extractFoodNames(text) {
    if (!text || text.length < 3) return [];

    try {
        const prompt = `
            Extract all distinct food/drink items from this sentence: "${text}".
            Return only a simple JSON array of strings in English.
            Example: ["dal", "rice", "pizza"]
            If no foods found, return [].
        `;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) throw new Error(`Groq API failed: ${response.status}`);

        const result = await response.json();
        const content = JSON.parse(result.choices[0].message.content);

        if (Array.isArray(content)) return content;
        if (content.foods) return content.foods;
        if (content.items) return content.items;

        return [];
    } catch (error) {
        console.error('[Groq Extract Names] Error:', error);
        return [];
    }
}

/**
 * Verify if the user's speech matches the target direction using LLM.
 * Returns "right" or "wrong".
 */
export async function verifyDirection(targetDir, userSpeech) {
    if (!userSpeech || userSpeech.length < 2) return "wrong";

    try {
        const prompt = `
            Correct Direction: ${targetDir}
            User Said: "${userSpeech}"
            
            Instructions:
            1. If the user's speech (in Hindi or English) matches the Correct Direction, return "right".
            2. If user said a different direction or something unrelated, return "wrong".
            3. Common Hindi matches: "ऊपर/upar" -> up, "नीचे/neeche" -> down, "बाएं/baayen" -> left, "दाएं/daayen" -> right.
            
            Return ONLY the word "right" or "wrong". No punctuation or extra text.
        `;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            }),
        });

        if (!response.ok) throw new Error(`Groq API failed: ${response.status}`);

        const result = await response.json();
        const content = result.choices[0].message.content.toLowerCase().trim();

        if (content.includes('right')) return 'right';
        return 'wrong';
    } catch (error) {
        console.error('[Groq Verify Dir] Error:', error);
        return 'wrong';
    }
}

/**
 * Extract health parameters from a medical test report image.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<object>} Extracted health data.
 */
export async function extractHealthDataFromReport(base64Image) {
    if (!GROQ_API_KEY || GROQ_API_KEY.includes('YOUR_KEY_HERE')) {
        throw new Error("Groq API Key is not set.");
    }

    const prompt = `
        You are a medical data extraction assistant. Analyze this medical lab report image.
        Extract the following health parameters if present:
        1. Blood Pressure: Systolic and Diastolic values (e.g., 120/80).
        2. Blood Sugar (Glucose): General level in mg/dL.
        3. HbA1c: Glycated Hemoglobin level in %.
        4. FBS: Fasting Blood Sugar in mg/dL.
        5. PPBS: Post-Prandial Blood Sugar in mg/dL.
        6. Age: of the patient.
        7. Gender: of the patient (Male/Female).
        8. Height: in centimeters (cm).
        9. Weight: in kilograms (kg).

        Return ONLY a JSON object with these keys:
        {
          "systolic": number | null,
          "diastolic": number | null,
          "blood_sugar": number | null,
          "hba1c": number | null,
          "fbs": number | null,
          "ppbs": number | null,
          "age": number | null,
          "gender": string | null,
          "height_cm": number | null,
          "weight_kg": number | null
        }
        Do not include any other text or explanation. If a value is not found, use null.
    `;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.2-11b-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('[Groq Extraction] API Error:', err);
            throw new Error(err.error?.message || `Groq API failed: ${response.status}`);
        }

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);

        console.log('[Groq Extraction] Success:', content);
        return {
            systolic: content.systolic || null,
            diastolic: content.diastolic || null,
            blood_sugar: content.blood_sugar || null,
            hba1c: content.hba1c || null,
            fbs: content.fbs || null,
            ppbs: content.ppbs || null,
            age: content.age || null,
            gender: content.gender || null,
            height_cm: content.height_cm || null,
            weight_kg: content.weight_kg || null
        };
    } catch (error) {
        console.error('[Groq Extraction] Error:', error);
        throw error;
    }
}


/**
 * Extract food items and their nutrition details in a single pass.
 * Consolidated for maximum speed and accuracy in Voice Logging.
 */
export async function getAIFoodItemsFromText(text) {
    if (!text || text.length < 3) return [];

    try {
        const prompt = `
            You are a professional Indian pregnancy nutritionist.
            The user said: "${text}"
            
            Instructions:
            1. Extract all food/drink items mentioned.
            2. For EACH item, identify its proper canonical name in English and Hindi.
            3. Estimate accurate nutrition (Calories, Protein, Iron, Calcium, Folate) for a standard 100g or 1 katori serving.
            
            Return ONLY a JSON array of objects:
            [
              {
                "name": "Canonical Name (EN)",
                "name_hi": "नाम (HI)",
                "calories": number,
                "protein": number,
                "iron": number,
                "calcium": number,
                "folate": number
              }
            ]
            If no food is found, return []. No conversational text.
        `;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) throw new Error(`Groq API failed: ${response.status}`);

        const result = await response.json();
        const content = JSON.parse(result.choices[0].message.content);

        // Normalize the return value
        let items = [];
        if (Array.isArray(content)) items = content;
        else if (content.foods) items = content.foods;
        else if (content.items) items = content.items;

        return items.map(item => ({
            ...item,
            id: `ai_${item.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            is_ai_generated: true,
            source: 'ai_deep_extract'
        }));
    } catch (error) {
        console.error('[Groq Deep Extraction] Error:', error);
        return [];
    }
}
