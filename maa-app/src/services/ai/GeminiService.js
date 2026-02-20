/**
 * GeminiService.js
 * Integration with Google Gemini via REST API (for maximum compatibility in Expo/React Native).
 */

// Placeholder - User should set this in their environment
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

/**
 * Identify food items from a base64 image string.
 * @param {string} base64Image - Base64 encoded image data.
 * @returns {Promise<Array<string>>} List of identified food items.
 */
export async function identifyFoodFromImage(base64Image) {
    if (!API_KEY) {
        throw new Error("Gemini API Key is not set. Go to src/services/ai/GeminiService.js to add it.");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Identify the main staple food items in this meal (e.g., 'Dal', 'Rice', 'Roti'). For each item, provide the English name and the Hindi name in parentheses (e.g., 'Rice (Chawal)', 'Yellow Dal (पीली दाल)'). If it is a common staple, try to be specific like 'Boiled Rice' or 'Moong Dal'. Return only a comma-separated list of these bilingual names. Format: 'English Name (Hindi Name), English Name (Hindi Name)'." },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error result:", data);
            throw new Error(data.error?.message || "Gemini API request failed");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[Gemini] AI Identified items:", text);
        return text.split(',').map(item => item.trim()).filter(i => i.length > 0);
    } catch (error) {
        console.error("Gemini AI fetch error:", error);
        throw error;
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: SWELLING_PROMPT },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image,
                            },
                        },
                    ],
                }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[GeminiService] Swelling analysis API error:', data);
            throw new Error(data.error?.message || 'Gemini swelling analysis failed');
        }

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
        console.error('[GeminiService] Swelling analysis error:', error);
        throw error;
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: PROMPT }]
                }],
                generationConfig: {
                    temperature: 0.4,
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Gemini] Entitlement explanation API error:', data);
            throw new Error(data.error?.message || 'Gemini text generation failed');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.trim();
    } catch (error) {
        console.error('[Gemini] Entitlement explanation error:', error);
        throw error;
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
            })
        });

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleaned);

        return {
            name: result.name || "Unknown Medicine",
            count: result.total_count || 10
        };
    } catch (error) {
        console.error("[Gemini] Medicine extraction error:", error);
        throw error;
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

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("[Gemini] Visit summarization error:", error);
        throw error;
    }
}

/**
 * Generate an empathetic, domain-specific chat response for a pregnant user.
 * @param {Array<{role: string, text: string}>} messages - Chat history.
 * @param {string} language - User's preferred language ('hi' or 'en').
 * @returns {Promise<string>} AI's response text.
 */
export async function generatePregnancyChatResponse(messages, language = 'hi') {
    if (!API_KEY) {
        throw new Error("Gemini API Key is not set.");
    }

    const isHi = language === 'hi';
    const persona = isHi ? "Janani (जननी)" : "Janani";

    // System instruction to enforce domain and tone
    const SYSTEM_PROMPT = `You are ${persona}, an empathetic, homely, and expert maternal health assistant for pregnant women in India.
Your GOAL is to answer pregnancy-related questions, offer comfort, and provide accurate, safe advice.
RULES:
1. ONLY answer questions related to pregnancy, maternal health, baby care, or women's health. If the user asks about something else (like politics, coding, or general trivia), politely steer the conversation back to their health and pregnancy.
2. Tone MUST be extremely empathetic, warm, comforting, and 'homely'. Speak like a caring older sister or an experienced ASHA worker.
3. Language MUST be exclusively ${isHi ? "simple conversational Hindi (using Devanagari script)" : "simple English"}. Do not use complex medical jargon without explaining it simply.
4. If a symptom sounds dangerous (severe pain, heavy bleeding, loss of movement), strongly urge them to visit a doctor or ASHA worker immediately.
5. Keep responses concise so they are easy to listen to.
6. When giving advice or multiple steps, ALWAYS format your response in clear, short, numbered points (1., 2., 3.) separated by newlines so it is easy to read. Do NOT use markdown like asterisks (*) or hashes (#). Just use plain text numbers.`;

    // Convert our internal message format to Gemini's format
    const formattedHistory = messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    // Start with the system prompt as a 'user' message if using v1beta (since systemInstruction is newer, we can prepend it to be safe)
    // Actually, v1beta Gemini API supports systemInstruction directly.
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: formattedHistory,
                generationConfig: {
                    temperature: 0.7, // Slightly creative but grounded
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Gemini] Chat API error:', data);
            throw new Error(data.error?.message || 'Gemini chat generation failed');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.trim();
    } catch (error) {
        console.error('[Gemini] Chat response error:', error);
        throw error;
    }
}

/**
 * Generate a chat response directly from audio in ONE API call.
 * Returns both the transcript of the audio and the AI's response in JSON format.
 * @param {Array} messages - Chat history
 * @param {string} base64Audio - The new voice recording
 * @param {string} langCode - User language
 * @returns {Promise<{transcript: string, response: string}>}
 */
export async function generateMultimodalPregnancyChatResponse(messages, base64Audio, langCode = 'hi') {
    if (!API_KEY) {
        throw new Error("Gemini API Key is not set.");
    }

    const isHi = langCode === 'hi';
    const persona = isHi ? "Janani (जननी)" : "Janani";
    const languageName = isHi ? "Hindi" : "English";

    const SYSTEM_PROMPT = `You are ${persona}, an empathetic, homely maternal health assistant for pregnant women in India.
Your GOAL is to transcribe the user's audio and provide a caring, accurate response.
RULES:
1. ONLY answer questions related to pregnancy, maternal health, baby care, or women's health.
2. Tone MUST be extremely empathetic, warm, and 'homely'.
3. Language MUST be exclusively ${isHi ? "simple conversational Hindi in Devanagari script" : "simple English"}.
4. Keep responses EXTREMELY concise. No introductory or concluding fluff. Start directly with the advice.
5. Provide max 3 points. Each point MUST be EXACTLY one short sentence and MUST start on a NEW LINE (\n). No bulky paragraphs. Do NOT use markdown.
6. If the audio is completely silent, background noise, or unintelligible, set transcript to "NO_SPEECH" and response to "".
7. You MUST return EXACTLY a raw JSON object with no markdown fences, formatted as:
{"transcript": "what the user said in ${languageName}", "response": "your empathetic reply in ${languageName}"}`;

    // Convert history
    const formattedHistory = messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    // Append the new audio as the latest user message
    formattedHistory.push({
        role: 'user',
        parts: [
            { inline_data: { mime_type: 'audio/m4a', data: base64Audio } }
        ]
    });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: formattedHistory,
                generationConfig: {
                    temperature: 0.4,
                    response_mime_type: "application/json"
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Gemini] Multimodal API error:', data);
            throw new Error(data.error?.message || 'Gemini multi-modal failed');
        }

        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // 1. Strip markdown code fences if Gemini included them
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        // 2. Simple sanitization: Remove control characters that break JSON.parse
        // (U+0000 thru U+001F) except maybe newlines if handled carefully, 
        // but it's safer to just replace them with spaces for now.
        const sanitized = rawText.replace(/[\u0000-\u001F]/g, " ");

        try {
            const parsed = JSON.parse(sanitized);
            return {
                transcript: parsed.transcript || 'NO_SPEECH',
                response: parsed.response || ''
            };
        } catch (parseError) {
            console.error('[Gemini] JSON Parse failed. Raw text:', rawText);
            // Fallback: search for strings if JSON is totally broken
            return {
                transcript: 'Could not transcribe (JSON error)',
                response: 'I am sorry, I had trouble processing that message. Please try again.'
            };
        }
    } catch (error) {
        console.error('[Gemini] Multimodal error:', error);
        throw error;
    }
}

/**
 * Transcribe base64 audio buffer into text using Gemini.
 * @param {string} base64Audio 
 * @param {string} langCode - 'hi' or 'en'
 * @param {string} mimeType 
 * @returns {Promise<string>}
 */
export async function transcribeAudio(base64Audio, langCode = 'hi', mimeType = 'audio/m4a') {
    if (!API_KEY) {
        throw new Error("Gemini API Key is not set.");
    }

    const languageName = langCode === 'hi' ? 'Hindi' : 'English';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Transcribe this audio EXACTLY in ${languageName} (do not translate, just transcribe). If the audio is empty, silent, just background noise, clicking, or unintelligible, you MUST reply EXACTLY with the word: NO_SPEECH. Return ONLY the transcription with no other words.` },
                        { inline_data: { mime_type: mimeType, data: base64Audio } }
                    ]
                }],
                generationConfig: { temperature: 0.1 }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Gemini] Transcribe API error:', data);
            throw new Error(data.error?.message || 'Gemini transcribe failed');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.trim();
    } catch (error) {
        console.error('[Gemini] Transcribe error:', error);
        throw error;
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
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
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
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('[Gemini PDF Extraction] API Error:', err);
            throw new Error(err.error?.message || `Gemini API failed: ${response.status}`);
        }

        const data = await response.json();
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
