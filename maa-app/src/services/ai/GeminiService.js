/**
 * GeminiService.js
 * Integration with Google Gemini via REST API (for maximum compatibility in Expo/React Native).
 */

// ── Key Rotation Pools ────────────────────────────────────────────────────────
// Reads comma-separated keys from env vars and rotates through them on failure.
const _parseKeys = (envVal) => (envVal || '').split(',').map(k => k.trim()).filter(Boolean);

const GEMINI_KEYS = _parseKeys(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
const SARVAM_KEYS = _parseKeys(process.env.EXPO_PUBLIC_SARVAM_API_KEY);
const GROQ_KEYS = _parseKeys(process.env.EXPO_PUBLIC_GROQ_API_KEY);

let _geminiIdx = 0;
let _sarvamIdx = 0;
let _groqIdx = 0;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=';

function getGeminiKey() { return GEMINI_KEYS[_geminiIdx] || ''; }
function getSarvamKey() { return SARVAM_KEYS[_sarvamIdx] || ''; }
function getGroqKey() { return GROQ_KEYS[_groqIdx] || ''; }

function rotateGemini() { _geminiIdx = (_geminiIdx + 1) % Math.max(GEMINI_KEYS.length, 1); console.warn(`[KeyRotate] Gemini → key ${_geminiIdx}`); }
function rotateSarvam() { _sarvamIdx = (_sarvamIdx + 1) % Math.max(SARVAM_KEYS.length, 1); console.warn(`[KeyRotate] Sarvam → key ${_sarvamIdx}`); }
function rotateGroq() { _groqIdx = (_groqIdx + 1) % Math.max(GROQ_KEYS.length, 1); console.warn(`[KeyRotate] Groq   → key ${_groqIdx}`); }

/** Returns true if the HTTP status indicates a key should be rotated */
const _shouldRotate = (status) => status === 401 || status === 403 || status === 429;

// Legacy compat: single key reference (always points to current active Gemini key)
const getApiUrl = () => `${GEMINI_BASE}${getGeminiKey()}`;
// Keep API_KEY for old code that checks `if (!API_KEY)`
const API_KEY = GEMINI_KEYS[0] || '';
const API_URL = getApiUrl; // functions that use API_URL must call it: API_URL()

// Helper to fetch from Gemini with robust key rotation
async function fetchGemini(bodyPayload) {
    if (GEMINI_KEYS.length === 0) {
        throw new Error("Gemini API Key is missing.");
    }
    let lastError;
    for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
        try {
            const url = getApiUrl();
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            if (_shouldRotate(response.status)) {
                console.warn(`[KeyRotate] Gemini key ${_geminiIdx} rejected (${response.status}), rotating...`);
                rotateGemini();
                lastError = new Error(`Gemini key rejected (${response.status})`);
                continue;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Gemini API error');
            }
            return data;
        } catch (err) {
            lastError = err;
            if (_shouldRotate(err?.status)) {
                rotateGemini();
                continue;
            }
            throw err;
        }
    }
    throw lastError || new Error('All Gemini keys exhausted');
}

// Helper to fetch from Groq with robust key rotation
async function fetchGroq(endpoint, options = {}) {
    if (GROQ_KEYS.length === 0) {
        throw new Error("Groq API Key is missing.");
    }
    let lastError;
    for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
        const key = getGroqKey();
        try {
            const headers = {
                ...(options.headers || {}),
                'Authorization': `Bearer ${key}`
            };
            const response = await fetch(endpoint, {
                ...options,
                headers
            });
            if (_shouldRotate(response.status)) {
                console.warn(`[KeyRotate] Groq key ${_groqIdx} rejected (${response.status}), rotating...`);
                rotateGroq();
                lastError = new Error(`Groq key rejected (${response.status})`);
                continue;
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Groq API error');
            }
            return data;
        } catch (err) {
            lastError = err;
            if (_shouldRotate(err?.status)) {
                rotateGroq();
                continue;
            }
            throw err;
        }
    }
    throw lastError || new Error('All Groq keys exhausted');
}

/**
 * Identify food items from a base64 image string.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<Array<string>>} List of identified food items.
 */
export async function identifyFoodFromImage(base64Image) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is not set. Go to src/services/ai/GeminiService.js to add it.");
    }

    const prompt = "Identify the main staple food items in this meal (e.g., 'Dal', 'Rice', 'Roti'). For each item, provide the English name and the Hindi name in parentheses (e.g., 'Rice (Chawal)', 'Yellow Dal (पीली दाल)'). If it is a common staple, try to be specific like 'Boiled Rice' or 'Moong Dal'. Return only a comma-separated list of these bilingual names. Format: 'English Name (Hindi Name), English Name (Hindi Name)'.";

    try {
        const data = await fetchGemini({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64Image
                        }
                    }
                ]
            }]
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[Gemini] AI Identified items:", text);
        return text.split(',').map(item => item.trim()).filter(i => i.length > 0);
    } catch (error) {
        console.warn("[Gemini] Food identification failed, attempting Groq backup:", error.message || error);
        try {
            const text = await callGroqVision(null, prompt, base64Image, false);
            console.log("[Groq Vision] AI Identified items:", text);
            return text.split(',').map(item => item.trim()).filter(i => i.length > 0);
        } catch (groqError) {
            console.error("[Groq Vision] Food identification failed:", groqError);
            throw error;
        }
    }
}

/**
 * Analyze ankle/foot swelling image for edema risk screening.
 * @param {string} base64Image - Base64 encoded image (JPEG/PNG).
 * @returns {Promise<object>} Structured risk result with risk_level, swelling_level, observations, recommendations.
 */
export async function analyzeSwellingFromImage(base64Image) {
    if (!API_KEY) {
        throw new Error('Gemini API Key is not set.');
    }

    const SWELLING_PROMPT = `You are a clinical maternal health AI screening assistant embedded in a mobile app for pregnant women in India.

A pregnant woman has uploaded a photo of her feet or ankles for edema (swelling) screening.

Your task is to classify the swelling into one of three risk levels:

LOW RISK — Normal physiological pregnancy edema
  • Mild, symmetric swelling in both feet
  • Typical end-of-day swelling that goes away with rest
  • No face or hand involvement
  • NOT dangerous

MEDIUM RISK — Concerning edema, monitor closely
  • Moderate puffiness or some asymmetry (one foot more swollen than other)
  • Swelling that looks tight or shiny
  • Persistent throughout the day
  • Needs monitoring and ASHA worker check

HIGH RISK — Possible preeclampsia, contact doctor immediately
  • Sudden severe swelling
  • Face, hands, or full leg involvement
  • Extreme pitting or tightness visible
  • Combined with any mention of headache, blurred vision, or high BP — CRITICAL

Instructions:
- If the image does not clearly show feet or ankles, state risk_level as "UNCLEAR" and explain in observations.
- Provide at least 2 observations in English and Hindi each.
- Recommendations must be specific and actionable for a rural Indian pregnant woman.
- Keep Hindi simple and easily understandable.

Return ONLY a valid JSON object, no markdown, no extra text:
{
  "risk_level": "LOW|MEDIUM|HIGH|UNCLEAR",
  "swelling_level": "Mild|Moderate|Severe|Not Visible",
  "preeclampsia_flag": true or false,
  "observations_en": ["observation 1", "observation 2"],
  "observations_hi": ["अवलोकन 1", "अवलोकन 2"],
  "recommendation_en": "Actionable recommendation in English.",
  "recommendation_hi": "हिंदी में सलाह।",
  "confidence": 0.0
}`;

    try {
        const data = await fetchGemini({
            contents: [{
                parts: [
                    { text: SWELLING_PROMPT },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        });

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        console.log('[GeminiService] Swelling analysis raw response:', rawText.substring(0, 200));

        // Parse — Gemini may sometimes wrap in ```json blocks even with responseMimeType set
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleaned);

        return {
            risk_level: result.risk_level || 'UNCLEAR',
            swelling_level: result.swelling_level || 'Not Visible',
            preeclampsia_flag: result.preeclampsia_flag || false,
            observations_en: result.observations_en || ['Unable to analyze image clearly.'],
            observations_hi: result.observations_hi || ['तस्वीर स्पष्ट नहीं है।'],
            recommendation_en: result.recommendation_en || 'Please retake the photo with both ankles clearly visible in good lighting.',
            recommendation_hi: result.recommendation_hi || 'कृपया अच्छी रोशनी में दोनों टखनों की स्पष्ट तस्वीर लें।',
            confidence: result.confidence || 0.5,
        };
    } catch (error) {
        console.warn('[Gemini] Swelling analysis failed, attempting Groq backup:', error.message || error);
        try {
            const rawResponse = await callGroqVision(null, SWELLING_PROMPT, base64Image, true);
            const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const result = JSON.parse(cleaned);
            return {
                risk_level: result.risk_level || 'UNCLEAR',
                swelling_level: result.swelling_level || 'Not Visible',
                preeclampsia_flag: result.preeclampsia_flag || false,
                observations_en: result.observations_en || ['Unable to analyze image clearly.'],
                observations_hi: result.observations_hi || ['तस्वीर स्पष्ट नहीं है।'],
                recommendation_en: result.recommendation_en || 'Please retake the photo with both ankles clearly visible in good lighting.',
                recommendation_hi: result.recommendation_hi || 'कृपया अच्छी रोशनी में दोनों टखनों की स्पष्ट तस्वीर लें।',
                confidence: result.confidence || 0.5,
            };
        } catch (groqError) {
            console.error('[Groq Vision] Swelling analysis failure:', groqError);
            throw error;
        }
    }
}

/**
 * Offline rule-based swelling risk assessment.
 * Uses the same clinical criteria as the Gemini AI prompt but runs entirely on-device.
 * Called automatically when Gemini API is unreachable (no internet).
 *
 * @param {object} answers - Questionnaire answers
 * @param {string} answers.location - 'both_feet' | 'one_foot' | 'face_hands'
 * @param {string} answers.skin - 'normal' | 'shiny_tight' | 'pitting'
 * @param {string} answers.timing - 'evening_only' | 'all_day' | 'sudden'
 * @param {Array<string>} answers.symptoms - ['headache', 'blurred_vision', 'abdominal_pain'] or []
 * @returns {object} Same shape as analyzeSwellingFromImage result
 */
export function assessSwellingOffline(answers) {
            const { location, skin, timing, symptoms = [] } = answers;

            let riskScore = 0;

            // ── Location scoring ──
            if (location === 'both_feet') riskScore += 1;        // Normal physiological
            else if (location === 'one_foot') riskScore += 3;    // Asymmetry = concerning
            else if (location === 'face_hands') riskScore += 5;  // Systemic = high risk

            // ── Skin appearance scoring ──
            if (skin === 'normal') riskScore += 0;
            else if (skin === 'shiny_tight') riskScore += 2;
            else if (skin === 'pitting') riskScore += 4;

            // ── Timing scoring ──
            if (timing === 'evening_only') riskScore += 0;       // Physiological
            else if (timing === 'all_day') riskScore += 2;       // Persistent
            else if (timing === 'sudden') riskScore += 4;        // Acute onset

            // ── Danger symptoms (preeclampsia markers) ──
            const hasHeadache = symptoms.includes('headache');
            const hasVision = symptoms.includes('blurred_vision');
            const hasPain = symptoms.includes('abdominal_pain');
            const dangerCount = [hasHeadache, hasVision, hasPain].filter(Boolean).length;
            riskScore += dangerCount * 3;

            // ── Classify risk level ──
            let risk_level, swelling_level, preeclampsia_flag, confidence;

            if (riskScore >= 8 || dangerCount >= 1) {
                risk_level = 'HIGH';
                swelling_level = 'Severe';
                preeclampsia_flag = dangerCount >= 1;
                confidence = 0.85;
            } else if (riskScore >= 4) {
                risk_level = 'MEDIUM';
                swelling_level = 'Moderate';
                preeclampsia_flag = false;
                confidence = 0.75;
            } else {
                risk_level = 'LOW';
                swelling_level = 'Mild';
                preeclampsia_flag = false;
                confidence = 0.80;
            }

            // ── Build bilingual observations ──
            const observations_en = [];
            const observations_hi = [];

            if (location === 'both_feet') {
                observations_en.push('Symmetric swelling in both feet — common in pregnancy.');
                observations_hi.push('दोनों पैरों में समान सूजन — गर्भावस्था में सामान्य।');
            } else if (location === 'one_foot') {
                observations_en.push('Asymmetric swelling detected — one foot more swollen than the other.');
                observations_hi.push('असमान सूजन — एक पैर में दूसरे से ज़्यादा सूजन है।');
            } else if (location === 'face_hands') {
                observations_en.push('Swelling in face or hands — this is NOT normal pregnancy swelling.');
                observations_hi.push('चेहरे या हाथों में सूजन — यह सामान्य गर्भावस्था की सूजन नहीं है।');
            }

            if (skin === 'shiny_tight') {
                observations_en.push('Skin appears shiny or tight — indicates moderate fluid retention.');
                observations_hi.push('त्वचा चमकदार या तनी हुई दिखती है — मध्यम द्रव प्रतिधारण का संकेत।');
            } else if (skin === 'pitting') {
                observations_en.push('Pitting edema reported — skin retains dent when pressed.');
                observations_hi.push('दबाने पर गड्ढा बनता है — गंभीर सूजन का संकेत।');
            }

            if (timing === 'sudden') {
                observations_en.push('Sudden onset of swelling — requires immediate medical attention.');
                observations_hi.push('अचानक सूजन शुरू हुई — तुरंत डॉक्टर को दिखाएं।');
            } else if (timing === 'all_day') {
                observations_en.push('Persistent swelling throughout the day — needs monitoring.');
                observations_hi.push('पूरे दिन सूजन बनी रहती है — निगरानी ज़रूरी है।');
            }

            if (hasHeadache) {
                observations_en.push('Headache reported — a key warning sign for preeclampsia.');
                observations_hi.push('सिरदर्द की शिकायत — प्रीक्लेम्पसिया का एक प्रमुख चेतावनी संकेत।');
            }
            if (hasVision) {
                observations_en.push('Blurred vision reported — seek medical help immediately.');
                observations_hi.push('धुंधली दृष्टि — तुरंत चिकित्सा सहायता लें।');
            }
            if (hasPain) {
                observations_en.push('Upper abdominal pain — can indicate liver involvement in preeclampsia.');
                observations_hi.push('पेट के ऊपरी हिस्से में दर्द — प्रीक्लेम्पसिया में लिवर प्रभावित हो सकता है।');
            }

            // ── Recommendations ──
            let recommendation_en, recommendation_hi;

            if (risk_level === 'HIGH') {
                recommendation_en = 'URGENT: Contact your ASHA worker or doctor immediately. Do not delay. If possible, visit the nearest PHC or hospital today.';
                recommendation_hi = 'तुरंत: अपने आशा कार्यकर्ता या डॉक्टर से अभी संपर्क करें। देरी न करें। यदि संभव हो तो आज ही नजदीकी PHC या अस्पताल जाएं।';
            } else if (risk_level === 'MEDIUM') {
                recommendation_en = 'Rest with feet elevated. Reduce salt intake. Monitor daily. If swelling increases or you get headaches, contact your ASHA worker.';
                recommendation_hi = 'पैर ऊपर रखकर आराम करें। नमक कम खाएं। रोज़ाना निगरानी करें। यदि सूजन बढ़े या सिरदर्द हो तो आशा कार्यकर्ता से संपर्क करें।';
            } else {
                recommendation_en = 'Normal pregnancy swelling. Rest with feet elevated in the evening. Stay hydrated and reduce salt intake. No immediate concern.';
                recommendation_hi = 'सामान्य गर्भावस्था की सूजन। शाम को पैर ऊपर रखकर आराम करें। पानी पीती रहें और नमक कम खाएं। तुरंत कोई चिंता नहीं।';
            }

            return {
                risk_level,
                swelling_level,
                preeclampsia_flag,
                observations_en,
                observations_hi,
                recommendation_en,
                recommendation_hi,
                confidence,
                source: 'offline_questionnaire',
            };
        }

        /**
         * Generate a conversational voice explanation of the Entitlement Gap Report.
         * @param {object} profile - User profile
         * @param {object} report - Gap Report from Entitlement Engine
         * @param {string} language - 'hi' or 'en'
         * @returns {Promise<string>} Conversational text suitable for TTS
         */
        export async function generateEntitlementExplanation(profile, report, language = 'hi') {
            if (!API_KEY) {
                throw new Error('Gemini API Key is not set.');
            }

            if (!report || report.schemes.length === 0) {
                return language === 'hi'
                    ? "अभी तक कोई योजना रिपोर्ट उपलब्ध नहीं है। कृपया अपनी प्रोफ़ाइल में जानकारी अपडेट करें।"
                    : "No scheme report available yet. Please update your profile information.";
            }

            const isHi = language === 'hi';
            const PROMPT = `You are Janani, a warm maternal health assistant speaking to a pregnant woman in rural India.
Speak in simple ${isHi ? "Hindi (Devanagari script)" : "English"}.
Use short sentences. Be warm and reassuring. Never use government jargon.

User context:
- Pregnancy week: ${profile.pregnancy_week || 'Unknown'}
- Ration card: ${profile.ration_category || 'Unknown'}

Her Entitlement Gap Report (JSON data):
${JSON.stringify({
                total_unclaimed_amount_rupees: report.totalPotentialBenefit,
                schemes: report.schemes.map(s => ({
                    name: s.name_en,
                    urgency: s.urgency,
                    unclaimed_amount: s.unclaimed_amount,
                    missing_nutrition_context: s.nutrition_insight_en,
                    action_to_claim: s.action_en
                }))
            }, null, 2)}

Task: Explain this report to her as if you are talking to her on a voice call.
1. Start with a warm greeting.
2. Tell her the total unclaimed amount she can get (if greater than 0).
3. CRITICAL: You MUST explicitly mention EVERY SINGLE SCHEME listed in the JSON data above. Do not skip any.
4. For EACH scheme, state WHY she needs it (e.g. mention nutrition gaps if present) AND exactly HOW to claim it using the "action_to_claim" field.
5. Emphasize the scheme with 'HIGH' urgency the most.

Keep it conversational but thorough. 
DO NOT use markdown formatting (* or #). Just plain text.`;

            try {
                const data = await fetchGemini({
                    contents: [{
                        parts: [{ text: PROMPT }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                    }
                });

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return text.trim();
            } catch (error) {
                console.warn('[Gemini] Entitlement explanation failed, attempting Groq backup:', error.message || error);
                try {
                    const systemPrompt = `You are Janani, a warm maternal health assistant speaking to a pregnant woman in rural India.
Speak in simple ${isHi ? "Hindi (Devanagari script)" : "English"}.
Use short sentences. Be warm and reassuring. Never use government jargon.
DO NOT use markdown formatting (* or #). Just plain text.`;
                    const text = await callGroqChat(systemPrompt, PROMPT, false);
                    return text.trim();
                } catch (groqError) {
                    console.error('[Groq Backup] Entitlement explanation failure:', groqError);
                    throw error; // Throw the original Gemini error if Groq fallback also fails
                }
            }
        }

        /**
         * Extract medicine name and tablet count from a photo of a medicine strip/box.
         * @param {string} base64Image - Base64 encoded image data.
         * @returns {Promise<object>} { name: string, count: number }
         */
        export async function extractMedicineInfoFromImage(base64Image) {
            if (!API_KEY) {
                throw new Error("Gemini API Key is not set.");
            }

            const PROMPT = `You are a medical pharmacy assistant. Look at this photo of a medicine strip or box.
    Extract:
    1. The Brand Name and Clinical Name of the medicine (e.g., 'Shelcal 500 (Calcium)').
    2. The total count of tablets visible or mentioned as 'Total Tablets' in the pack. If not clearly visible, estimate based on the strip size or common packaging (usually 10, 15, or 30).
    
    Return ONLY a JSON object:
    {
      "name": "Medicine Name (Clinical Name)",
      "total_count": 10
    }`;

            try {
                const data = await fetchGemini({
                    contents: [{
                        parts: [
                            { text: PROMPT },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Image
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                });

                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const result = JSON.parse(cleaned);

                return {
                    name: result.name || "Unknown Medicine",
                    count: result.total_count || 10
                };
            } catch (error) {
                console.warn("[Gemini] Medicine extraction failed, attempting Groq backup:", error.message || error);
                try {
                    const rawResponse = await callGroqVision(null, PROMPT, base64Image, true);
                    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const result = JSON.parse(cleaned);
                    return {
                        name: result.name || "Unknown Medicine",
                        count: result.total_count || 10
                    };
                } catch (groqError) {
                    console.error("[Groq Vision] Medicine extraction failure:", groqError);
                    throw error;
                }
            }
        }

        /**
         * Summarize ASHA field notes into a structured bilingual document.
         * Supports both raw text and audio (base64).
         * @param {string} input - The raw text or base64 audio data.
         * @param {boolean} isAudio - Whether the input is audio data.
         * @param {string} mimeType - The mime type of the audio (e.g., 'audio/m4a').
         * @returns {Promise<object>} Structured document with en and hi fields.
         */
        export async function summarizeVisit(input, isAudio = false, mimeType = 'audio/m4a') {
            if (!API_KEY) {
                throw new Error("Gemini API Key is not set.");
            }

            const PROMPT = `You are a clinical assistant for ASHA workers in India.
    ${isAudio ? "Transcribe the following audio and then convert" : "Convert"} these field notes into a structured, formal Visit Summary.
    
    The structured report must include:
    1. Visit Summary (Main observations)
    2. Key Health Indicators (Symptoms/Vitals mentioned)
    3. Advice Given (Actionable steps told to the mother)
    4. Emergency Warning (Alerts if something critical was noted)
    
    You MUST provide the summary in both English and Hindi.
    Keep Hindi simple and clinically accurate.
    
    Return ONLY a JSON object:
    {
      "summary_en": {
        "title": "Visit Summary",
        "observations": "...",
        "indicators": ["...", "..."],
        "advice": ["...", "..."],
        "emergency": "None or specific alert"
      },
      "summary_hi": {
        "title": "विज़िट सारांश",
        "observations": "...",
        "indicators": ["...", "..."],
        "advice": ["...", "..."],
        "emergency": "कोई नहीं या विशिष्ट चेतावनी"
      }
    }`;

            try {
                const contents = [{
                    parts: [
                        { text: PROMPT },
                        isAudio
                            ? { inline_data: { mime_type: mimeType, data: input } }
                            : { text: `Raw Notes: "${input}"` }
                    ]
                }];

                const data = await fetchGemini({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.3,
                        responseMimeType: "application/json"
                    }
                });

                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                return JSON.parse(cleaned);
            } catch (error) {
                console.warn("[Gemini] Visit summarization failed, attempting Groq backup:", error.message || error);
                try {
                    if (isAudio) {
                        throw new Error("Groq does not support direct audio input. Transcription must occur before summary.");
                    }
                    const userPrompt = `Raw Notes: "${input}"`;
                    const rawResponse = await callGroqChat(PROMPT, userPrompt, true);
                    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    return JSON.parse(cleaned);
                } catch (groqError) {
                    console.error("[Groq Backup] Visit summarization failure:", groqError);
                    throw error;
                }
            }
        }

        function getSystemPrompt(language, dialect = 'standard') {
            const isHi = language === 'hi' || language === 'bilingual';
            const persona = isHi ? "Janani (जननी)" : "Janani";

            const languageNames = {
                'hi': 'Hindi (हिन्दी)',
                'en': 'English',
                'bilingual': 'colloquial bilingual Hinglish (code-switching between Hindi and English, keeping Devanagari script for Hindi sentences and Latin alphabet for English phrases)',
                'bn': 'Bengali (বাংলা)',
                'gu': 'Gujarati (ગુજરાતી)',
                'mr': 'Marathi (मराठी)',
                'te': 'Telugu (తెలుగు)',
                'ta': 'Tamil (தமிழ்)',
                'kn': 'Kannada (ಕನ್ನಡ)',
                'ml': 'Malayalam (മലയാളം)',
                'pa': 'Punjabi (ਪੰਜਾਬੀ)',
                'or': 'Odia (ଓଡ଼ିଆ)'
            };
            const targetLangName = languageNames[language] || 'Hindi (हिन्दी)';

            let dialectRule = `Language MUST be exclusively generated in ${targetLangName}. Keep it simple, warm, colloquial, and natural to express empathy and ease of communication.`;
            if (isHi) {
                if (dialect === 'bihari') {
                    dialectRule = "Language MUST be colloquial and natural. EXCLUSIVELY use Bihari style Hindi colloquialisms and vocabulary (e.g. use Bihari respectful 'रउआ' instead of standard 'आप', use Bihari 'तनी' for standard 'थोड़ा', end sentences with local Bihari style like 'बा' or 'हई' where appropriate, while keeping Devanagari script for Hindi text). This makes the Bihari mother feel at home.";
                } else if (dialect === 'haryanvi') {
                    dialectRule = "Language MUST be colloquial and natural. EXCLUSIVELY use Haryanvi style Hindi colloquialisms and vocabulary (e.g. use Haryanvi terms like 'थारे', 'मारे', 'इब', 'के', 'ताऊ' where natural, while keeping Devanagari script for Hindi text). This makes the Haryanvi mother feel at home.";
                }
            }

            return `You are ${persona}, an empathetic, homely, and expert maternal health assistant for pregnant women in India.
Your GOAL is to answer pregnancy-related questions, offer comfort, and provide accurate, safe advice.
RULES:
1. ONLY answer questions related to pregnancy, maternal health, baby care, or women's health. If the user asks about something else, politely steer the conversation back to their health and pregnancy.
2. Tone MUST be extremely empathetic, warm, comforting, and 'homely'. Speak like a caring older sister or an experienced ASHA worker.
3. ${dialectRule}
4. If a symptom sounds dangerous (severe pain, heavy bleeding, loss of movement), strongly urge them to visit a doctor or ASHA worker immediately.
5. Keep responses concise so they are easy to listen to.
6. When giving advice or multiple steps, ALWAYS format your response in clear, short, numbered points (1., 2., 3.) separated by newlines so it is easy to read. Do NOT use markdown like asterisks (*) or hashes (#). Just use plain text numbers.`;
        }

        export async function callSarvamChatAPI(messages, language = 'hi', dialect = 'standard') {
            if (SARVAM_KEYS.length === 0) throw new Error('Sarvam API Key is missing.');
            const SYSTEM_PROMPT = getSystemPrompt(language, dialect);
            const formattedMessages = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));

            let lastError;
            for (let attempt = 0; attempt < SARVAM_KEYS.length; attempt++) {
                const key = getSarvamKey();
                try {
                    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'sarvam-30b',
                            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...formattedMessages],
                            temperature: 0.6,
                        })
                    });
                    if (_shouldRotate(response.status)) { rotateSarvam(); lastError = new Error(`Sarvam key rejected (${response.status})`); continue; }
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error?.message || 'Sarvam chat API error');
                    return (data.choices?.[0]?.message?.content || '').trim();
                } catch (err) { lastError = err; if (_shouldRotate(err?.status)) { rotateSarvam(); continue; } throw err; }
            }
            throw lastError || new Error('All Sarvam keys exhausted');
        }

        export async function callGeminiChatAPI(messages, language = 'hi', dialect = 'standard') {
            const SYSTEM_PROMPT = getSystemPrompt(language, dialect);
            const formattedHistory = messages.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

            const data = await fetchGemini({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: formattedHistory,
                generationConfig: { temperature: 0.7 }
            });

            return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        }

        export async function callGroqChatAPI(messages, language = 'hi', dialect = 'standard') {
            const SYSTEM_PROMPT = getSystemPrompt(language, dialect);
            const formattedMessages = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.text
            }));

            const data = await fetchGroq('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...formattedMessages],
                    temperature: 0.7,
                })
            });

            return (data.choices?.[0]?.message?.content || '').trim();
        }

        export async function generatePregnancyChatResponse(messages, language = 'hi') {
            let dialect = 'standard';
            try {
                const { getUserProfile } = require('../database/DatabaseService');
                const profile = await getUserProfile('user_001'); // Default patient profile
                if (profile && profile.dialect) {
                    dialect = profile.dialect;
                    console.log("[Chat Service] Resolved user dialect:", dialect);
                }
            } catch (dbError) {
                console.warn("[Chat Service] Could not fetch user profile dialect, using standard:", dbError.message || dbError);
            }

            // Tier 1: Sarvam Chat
            try {
                console.log(`[Chat Service] Tier 1: Attempting Sarvam Chat (sarvam-30b) with dialect: ${dialect}...`);
                return await callSarvamChatAPI(messages, language, dialect);
            } catch (sarvamError) {
                console.warn("[Chat Service] Tier 1 failed, trying Tier 2 (Gemini):", sarvamError.message || sarvamError);

                // Tier 2: Gemini Chat
                try {
                    console.log(`[Chat Service] Tier 2: Attempting Gemini Chat with dialect: ${dialect}...`);
                    return await callGeminiChatAPI(messages, language, dialect);
                } catch (geminiError) {
                    console.warn("[Chat Service] Tier 2 failed, trying Tier 3 (Groq):", geminiError.message || geminiError);

                    // Tier 3: Groq Chat
                    try {
                        console.log(`[Chat Service] Tier 3: Attempting Groq Chat with dialect: ${dialect}...`);
                        return await callGroqChatAPI(messages, language, dialect);
                    } catch (groqError) {
                        console.error("[Chat Service] All tiers failed. Throwing final error.", groqError);
                        throw groqError;
                    }
                }
            }
        }

        export async function generateSarvamPregnancyChatResponse(messages, language = 'hi') {
            return callSarvamChatAPI(messages, language);
        }

        export async function generateMultimodalPregnancyChatResponse(messages, base64Audio, langCode = 'hi') {
            console.log("[Multimodal Chat] Transcribing audio query...");
            let transcript = 'NO_SPEECH';
            try {
                transcript = await transcribeAudio(base64Audio, langCode);
            } catch (sttError) {
                console.error("[Multimodal Chat] Transcription failed across all layers:", sttError);
                throw sttError;
            }

            if (!transcript || transcript === 'NO_SPEECH') {
                return { transcript: 'NO_SPEECH', response: '' };
            }
            console.log("[Multimodal Chat] Transcript:", transcript);

            // Call our 3-tier fallback text generator
            const updatedMessages = [...messages, { role: 'user', text: transcript }];
            const responseText = await generatePregnancyChatResponse(updatedMessages, langCode);

            return {
                transcript,
                response: responseText
            };
        }

        /**
         * Transcribe audio using Sarvam Indic STT API.
         * @param {string} fileUri - Local file path of the recorded audio
         * @param {string} langCode - 'hi' or 'en'
         * @returns {Promise<string>} Transcription text
         */
        export async function transcribeAudioWithSarvam(fileUri, langCode = 'hi') {
            if (SARVAM_KEYS.length === 0) throw new Error('Sarvam API Key is not set.');

            let lastError;
            // Try each Sarvam key in rotation order, wrapping around
            for (let attempt = 0; attempt < SARVAM_KEYS.length; attempt++) {
                const key = getSarvamKey();
                try {
                    const formData = new FormData();
                    formData.append('file', { uri: fileUri, name: 'audio.mp3', type: 'audio/mpeg' });
                    formData.append('model', 'saaras:v3');
                    formData.append('language_code', langCode === 'hi' ? 'hi-IN' : 'en-IN');

                    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
                        method: 'POST',
                        headers: { 'api-subscription-key': key, 'Accept': 'application/json' },
                        body: formData
                    });

                    if (_shouldRotate(response.status)) {
                        console.warn(`[Sarvam STT] Key ${_sarvamIdx} → status ${response.status}, rotating...`);
                        rotateSarvam();
                        lastError = new Error(`Sarvam key ${attempt} rejected (${response.status})`);
                        continue;
                    }

                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Sarvam STT failed');
                    return data.transcript || '';
                } catch (err) {
                    lastError = err;
                    if (_shouldRotate(err?.status)) { rotateSarvam(); continue; }
                    throw err;
                }
            }
            throw lastError || new Error('All Sarvam keys exhausted');
        }

        /**
         * Transcribe audio buffer or file URI into text using Sarvam STT (with Gemini fallback).
         * @param {string} audioSource - Base64 encoded audio or local file URI
         * @param {string} langCode - 'hi' or 'en'
         * @param {string} mimeType 
         * @returns {Promise<string>}
         */
        export async function transcribeAudio(audioSource, langCode = 'hi', mimeType = 'audio/m4a') {
            const FileSystem = require('expo-file-system/legacy');
            const isUri = typeof audioSource === 'string' && (
                audioSource.startsWith('file://') ||
                audioSource.startsWith('/') ||
                audioSource.startsWith('content://') ||
                /^[a-zA-Z]:[/\\]/.test(audioSource)
            );

            let fileUri = isUri ? audioSource : null;
            let base64Data = isUri ? null : audioSource;

            // 1. Try Sarvam STT first
            if (SARVAM_KEYS.length > 0) {
                try {
                    if (!fileUri && base64Data) {
                        // Write base64 to a temp file for Sarvam STT
                        fileUri = `${FileSystem.cacheDirectory}temp_audio_sarvam.m4a`;
                        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                            encoding: 'base64'
                        });
                    }

                    if (fileUri) {
                        console.log("[Sarvam STT] Starting transcription for URI:", fileUri);
                        const transcript = await transcribeAudioWithSarvam(fileUri, langCode);
                        if (transcript) return transcript;
                    }
                } catch (err) {
                    console.warn("[Sarvam STT] Failed, falling back to Gemini:", err.message || err);
                }
            }

            // 2. Try Gemini STT
            try {
                if (!base64Data && fileUri) {
                    base64Data = await FileSystem.readAsStringAsync(fileUri, {
                        encoding: 'base64',
                    });
                }

                if (!base64Data) {
                    throw new Error("No audio data available for Gemini transcription");
                }

                const languageName = langCode === 'hi' ? 'Hindi' : 'English';
                console.log("[Gemini STT] Starting transcription...");
                const data = await fetchGemini({
                    contents: [{
                        parts: [
                            { text: `Transcribe this audio EXACTLY in ${languageName} (do not translate, just transcribe). If the audio is empty, silent, just background noise, clicking, or unintelligible, you MUST reply EXACTLY with the word: NO_SPEECH. Return ONLY the transcription with no other words.` },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1 }
                });

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return text.trim();
            } catch (geminiError) {
                console.warn("[Gemini STT] Failed, attempting Groq Whisper fallback:", geminiError.message || geminiError);

                // 3. Try Groq Whisper STT
                try {
                    if (!fileUri && base64Data) {
                        fileUri = `${FileSystem.cacheDirectory}temp_audio_groq.m4a`;
                        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                            encoding: 'base64'
                        });
                    }

                    if (fileUri) {
                        console.log("[Groq STT] Starting transcription for URI:", fileUri);
                        const transcript = await transcribeAudioWithGroq(fileUri, langCode);
                        if (transcript) return transcript;
                    }
                    throw new Error("No file URI available for Groq STT");
                } catch (groqError) {
                    console.error("[Groq STT] Transcription failure:", groqError.message || groqError);
                    throw geminiError; // Throw the original Gemini error if all fail
                }
            }
        }
        /**
         * Extract health parameters from a medical report PDF.
         * @param {string} base64Data - Base64 encoded PDF data.
         * @returns {Promise<object>} Extracted health data.
         */
        export async function extractHealthDataFromPDF(base64Data) {
            if (!API_KEY) {
                throw new Error("Gemini API Key is not set.");
            }

            const prompt = `
        You are a medical data extraction assistant. Analyze this medical lab report document (PDF).
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
                const data = await fetchGemini({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: "application/pdf",
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                });

                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const content = JSON.parse(cleaned);

                console.log('[Gemini PDF Extraction] Success:', content);
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
                console.error('[Gemini PDF Extraction] Error:', error);
                throw error;
            }
        }

        /**
         * Convert raw doctor instructions into clean bilingual structured bullet points.
         * @param {string} text - Raw instruction text
         * @returns {Promise<{en: string, hi: string}>} Bilingual structured instructions
         */
        export async function structureDoctorInstruction(text) {
            if (!API_KEY) {
                throw new Error("Gemini API Key is not set.");
            }

            const PROMPT = `You are a clinical AI assistant for maternal health in India.
Your task is to take a doctor's raw medical instruction (which may be in English, Hindi, or Hinglish/Latin script) and structure it.
Generate a structured, professional, and concise list of instructions in BOTH English and Hindi.
Each instruction point should start with a bullet point (•) and a space, and be separated by a single newline.
Do not add any additional chat response or conversational text. Return ONLY the JSON object.

Return ONLY a JSON object:
{
  "en": "• point 1\\n• point 2",
  "hi": "• बिंदु 1\\n• बिंदु 2"
}`;

            try {
                const data = await fetchGemini({
                    contents: [{
                        parts: [
                            { text: PROMPT },
                            { text: `Raw Medical Instruction: "${text}"` }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                });

                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                return JSON.parse(cleaned);
            } catch (error) {
                console.warn("[Gemini] Structure doctor instruction failed, attempting Groq backup:", error.message || error);
                try {
                    const userPrompt = `Raw Medical Instruction: "${text}"`;
                    const rawResponse = await callGroqChat(PROMPT, userPrompt, true);
                    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    return JSON.parse(cleaned);
                } catch (groqError) {
                    console.error("[Groq Backup] Structure doctor instruction failure:", groqError);
                    throw error;
                }
            }
        }

        /**
         * Helper to call the Groq completions endpoint with standard fallback models.
         */
        export async function callGroqChat(systemPrompt, userPrompt, jsonMode = false) {
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: userPrompt });

            const payload = {
                model: "llama-3.3-70b-versatile",
                messages: messages,
                temperature: 0.2,
            };

            if (jsonMode) {
                payload.response_format = { type: "json_object" };
            }

            const data = await fetchGroq('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return data.choices?.[0]?.message?.content || '';
        }

        /**
         * Helper to call the Groq completions endpoint with a vision model.
         */
        export async function callGroqVision(systemPrompt, userPrompt, base64Image, jsonMode = false) {
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: userPrompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            });

            const payload = {
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: messages,
                temperature: 0.2,
            };

            if (jsonMode) {
                payload.response_format = { type: "json_object" };
            }

            const data = await fetchGroq('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return data.choices?.[0]?.message?.content || '';
        }

        /**
         * Helper to transcribe audio using Groq's Whisper API.
         */
        export async function transcribeAudioWithGroq(fileUri, langCode = 'hi') {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: fileUri,
                    name: 'audio.m4a',
                    type: 'audio/m4a'
                });
                formData.append('model', 'whisper-large-v3');
                formData.append('language', langCode);

                const data = await fetchGroq('https://api.groq.com/openai/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: formData
                });

                return data.text || '';
            } catch (error) {
                console.error('[Groq STT] Error transcribing:', error);
                throw error;
            }
        }

        /**
         * Parses spoken voice commands into structured React Navigation routes & patient details.
         */
        export async function parseVoiceNavigation(transcript, language = 'hi') {
            let patients = [];
            try {
                if (global.mockGetPatientsList) {
                    patients = await global.mockGetPatientsList();
                } else if (typeof require !== 'undefined') {
                    const db = require('../database/DatabaseService.js');
                    patients = await db.getPatientsList();
                } else {
                    const db = await import('../database/DatabaseService.js');
                    patients = await db.getPatientsList();
                }
            } catch (dbErr) {
                console.warn("[Voice Parser] Error fetching patients list, using empty list:", dbErr);
            }

            const patientMappingString = patients.map(p => `ID: "${p.id}", Name: "${p.name}"`).join('\n');

            const prompt = `
You are a voice navigation routing parser for an ASHA worker tablet app (Maa App).
Your job is to read the transcribed voice command and map it to a specific screen and patient if applicable.

Valid App Navigation Routes (screens):
1. "AshaDashboard" (or "Dashboard"): The home dashboard, stats, main screen.
2. "SmartRouteMap" (or "Route Map"): Maps home visits, lists visit routes.
3. "MedicationTracker" (or "Medication Adherence"): Pill tracking, patient prescriptions.
4. "AshaProfile" (or "Profile"): ASHA worker's own details and language settings.
5. "QrRegister" (or "QR Scanner"): Access scanning QR codes for registering or verifying mothers.
6. "PatientHistory" (or "Patient Profile"): Detail page for a specific pregnant mother. Requires a patientId.

Active Registered Patients:
${patientMappingString}

Parsing Rules:
- If the command mentions a specific patient (e.g. "Sunita Devi's profile", "सुनीता देवी की प्रोफाइल", "अंजली की प्रोफाइल", "Meena", "पूजा"), match it with the closest patient in the Active Registered Patients list and set the "route" to "PatientHistory" and "patientId" to their corresponding ID.
- Match phonetically or logically (e.g. "सुनीता" maps to "Sunita Devi").
- If no patient name matches, but they want to open a profile or history, route to "AshaDashboard" or set route to null.
- Translate intent:
  - "दवा" or "pill" or "tracker" or "medication" or "adherence" -> "MedicationTracker"
  - "नक्शा" or "map" or "visit" or "route" -> "SmartRouteMap"
  - "scan" or "qr" or "register" or "पंजीकरण" -> "QrRegister"
  - "profile" (without patient name) or "me" or "भाषा" -> "AshaProfile"
  - "home" or "dashboard" or "back" or "नमस्ते" -> "AshaDashboard"

Format the response strictly as a single JSON object. Do not include any markdown fences or surrounding words. Output only the JSON.

Expected Output Format:
{
  "route": "AshaDashboard" | "SmartRouteMap" | "MedicationTracker" | "AshaProfile" | "QrRegister" | "PatientHistory" | null,
  "patientId": string | null,
  "patientName": string | null,
  "message": string (A warm confirmation message in the language/dialect of the spoken command, e.g. "सुनीता देवी की प्रोफाइल खोली जा रही है" or "Opening the medication tracker...")
}
`;

            try {
                const data = await fetchGemini({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { text: `User command: "${transcript}"` }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                });

                const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);
            } catch (geminiError) {
                console.warn("[Voice Parser] Gemini failed, attempting Groq fallback:", geminiError.message || geminiError);

                try {
                    const data = await fetchGroq('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                { role: "system", content: prompt },
                                { role: "user", content: `User command: "${transcript}"` }
                            ],
                            temperature: 0.1,
                            response_format: { type: "json_object" }
                        })
                    });

                    const text = data.choices?.[0]?.message?.content || '';
                    return JSON.parse(text);
                } catch (groqError) {
                    console.error("[Voice Parser] Both Gemini and Groq failed, running rule fallback:", groqError);
                    return runRuleBasedNavigationParser(transcript, patients);
                }
            }
        }

        /**
         * Quick local string-matching fallback when APIs are offline or fail.
         */
        function runRuleBasedNavigationParser(transcript, patients) {
            const clean = (transcript || '').toLowerCase().trim();

            for (const p of patients) {
                const nameParts = p.name.toLowerCase().split(' ');
                for (const part of nameParts) {
                    if (part.length > 2 && clean.includes(part)) {
                        return {
                            route: "PatientHistory",
                            patientId: p.id,
                            patientName: p.name,
                            message: `Opening profile for ${p.name}`
                        };
                    }
                }
            }

            if (clean.includes('dava') || clean.includes('pill') || clean.includes('track') || clean.includes('medication') || clean.includes('adherence') || clean.includes('दवा')) {
                return {
                    route: "MedicationTracker",
                    patientId: null,
                    patientName: null,
                    message: "Opening Medication Tracker"
                };
            }
            if (clean.includes('map') || clean.includes('route') || clean.includes('visit') || clean.includes('नक्शा') || clean.includes('मार्ग')) {
                return {
                    route: "SmartRouteMap",
                    patientId: null,
                    patientName: null,
                    message: "Opening Route Map"
                };
            }
            if (clean.includes('scan') || clean.includes('qr') || clean.includes('register') || clean.includes('पंजीकरण')) {
                return {
                    route: "QrRegister",
                    patientId: null,
                    patientName: null,
                    message: "Opening QR Scanner"
                };
            }
            if (clean.includes('profile') || clean.includes('me') || clean.includes('भाषा')) {
                return {
                    route: "AshaProfile",
                    patientId: null,
                    patientName: null,
                    message: "Opening Profile Screen"
                };
            }
            return {
                route: "AshaDashboard",
                patientId: null,
                patientName: null,
                message: "Navigating to Dashboard"
            };
        }


