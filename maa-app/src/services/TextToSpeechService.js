/**
 * TextToSpeechService.js
 * Wrapper to provide high-fidelity Indic voice reads using Sarvam AI TTS (Bulbul v3),
 * with a fallback to expo-speech for offline or unconfigured environments.
 */

import * as Speech from 'expo-speech';
let Audio;
try {
    Audio = require('expo-av').Audio;
} catch (e) {
    Audio = null;
}

let stopRequested = false;
let currentSound = null;

const _parseKeys = (envVal) => (envVal || '').split(',').map(k => k.trim()).filter(Boolean);
const SARVAM_KEYS = _parseKeys(process.env.EXPO_PUBLIC_SARVAM_API_KEY);
let _sarvamIdx = 0;

function getSarvamKey() { return SARVAM_KEYS[_sarvamIdx] || ''; }
function rotateSarvam() { _sarvamIdx = (_sarvamIdx + 1) % Math.max(SARVAM_KEYS.length, 1); console.warn(`[KeyRotate] Sarvam TTS → key ${_sarvamIdx}`); }
const _shouldRotate = (status) => status === 401 || status === 403 || status === 429;

function getSarvamLangCode(language) {
    const mapping = {
        'hi': 'hi-IN',
        'en': 'en-IN',
        'bilingual': 'hi-IN',
        'bn': 'bn-IN',
        'gu': 'gu-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'mr': 'mr-IN',
        'or': 'or-IN',
        'pa': 'pa-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
    };
    return mapping[language] || 'hi-IN';
}

/**
 * Play base64 audio string using Expo AV.
 * @param {string} base64Audio 
 * @param {function} onDone - Callback when playback finishes
 */
async function playBase64Audio(base64Audio, onDone = null) {
    // Unload existing sound first
    await stopCurrentSoundOnly();

    const FileSystem = require('expo-file-system/legacy');
    const tempUri = `${FileSystem.cacheDirectory}sarvam_tts.wav`;
    
    // Write base64 string to a temporary WAV file
    await FileSystem.writeAsStringAsync(tempUri, base64Audio, {
        encoding: 'base64',
    });

    if (!Audio) {
        console.warn("[TTS] expo-av Audio module is not available.");
        if (onDone) onDone();
        return;
    }

    // Load and play the audio file
    const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { shouldPlay: true }
    );
    
    currentSound = sound;
    
    // Listen for completion to unload and cleanup
    sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            if (currentSound === sound) {
                currentSound = null;
            }
            if (onDone) onDone();
        }
    });
}

/**
 * Helper to stop the current Expo AV Sound instance.
 */
async function stopCurrentSoundOnly() {
    if (currentSound) {
        try {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
        } catch (e) {
            console.warn('[TTS] Error stopping currentSound:', e);
        }
        currentSound = null;
    }
}

/**
 * Internal promise-based TTS function that can optionally wait for completion.
 */
async function playTextToSpeechPromise(text, language = 'hi', waitForCompletion = false) {
    if (!text) return;
    stopRequested = false;

    if (SARVAM_KEYS.length > 0) {
        let lastError;
        for (let attempt = 0; attempt < SARVAM_KEYS.length; attempt++) {
            const key = getSarvamKey();
            try {
                console.log(`[Sarvam TTS] Generating speech using bulbul:v3 (attempt ${attempt + 1}/${SARVAM_KEYS.length}) for text: "${text.substring(0, 40)}..."`);
                const response = await fetch('https://api.sarvam.ai/text-to-speech', {
                    method: 'POST',
                    headers: {
                        'api-subscription-key': key,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        target_language_code: getSarvamLangCode(language),
                        speaker: 'shreya',
                        model: 'bulbul:v3'
                    })
                });

                if (_shouldRotate(response.status)) {
                    console.warn(`[Sarvam TTS] Key ${_sarvamIdx} rejected (${response.status}), rotating...`);
                    rotateSarvam();
                    lastError = new Error(`Sarvam key rejected (${response.status})`);
                    continue;
                }

                const data = await response.json();
                if (response.ok && data.audios && data.audios.length > 0) {
                    await new Promise(async (resolve, reject) => {
                        try {
                            await playBase64Audio(data.audios[0], () => {
                                resolve(); // Resolve when audio playback finishes
                            });
                            if (!waitForCompletion) {
                                resolve(); // Resolve immediately if not waiting
                            }
                        } catch (e) {
                            reject(e);
                        }
                    });
                    return;
                } else {
                    console.warn('[Sarvam TTS] API returned error, attempting next key:', data);
                    throw new Error(data.error || 'Sarvam TTS failed');
                }
            } catch (error) {
                lastError = error;
                if (_shouldRotate(error?.status)) {
                    rotateSarvam();
                    continue;
                }
                console.warn('[Sarvam TTS] Request failed, attempting next key:', error.message || error);
            }
        }
        console.warn('[Sarvam TTS] All keys exhausted or failed, falling back to expo-speech');
    }

    // Fallback: Use standard expo-speech
    await new Promise((resolve) => {
        playTextToSpeechFallback(text, language, () => {
            resolve();
        });
        if (!waitForCompletion) {
            resolve();
        }
    });
}

/**
 * Fallback expo-speech player.
 */
async function playTextToSpeechFallback(text, language = 'hi', onDone = null) {
    if (!text) {
        if (onDone) onDone();
        return;
    }

    const primaryLang = getSarvamLangCode(language);
    const fallbackLang = language;

    try {
        await ensureAudioMode();
        await Speech.stop();
        await new Promise(r => setTimeout(r, 200));

        await new Promise((resolve) => {
            let hasResolved = false;
            const safeResolve = () => {
                if (!hasResolved) {
                    hasResolved = true;
                    resolve();
                    if (onDone) onDone();
                }
            };

            Speech.speak(text, {
                language: primaryLang,
                rate: 0.9,
                onDone: safeResolve,
                onStopped: safeResolve,
                onError: (error) => {
                    console.warn(`[TTS Fallback] ${primaryLang} failed, trying ${fallbackLang}:`, error);
                    Speech.speak(text, {
                        language: fallbackLang,
                        rate: 0.9,
                        onDone: safeResolve,
                        onStopped: safeResolve,
                        onError: (err2) => {
                            console.warn(`[TTS Fallback] ${fallbackLang} failed, trying default:`, err2);
                            Speech.speak(text, {
                                rate: 0.9,
                                onDone: safeResolve,
                                onStopped: safeResolve,
                                onError: (err3) => {
                                    console.error('[TTS Fallback] Playback absolute failure:', err3?.message || err3);
                                    safeResolve();
                                }
                            });
                        }
                    });
                }
            });

            // Fail-safe timeout (12 seconds)
            setTimeout(safeResolve, 12000);
        });
    } catch (e) {
        console.error('[TTS Fallback] Error playing speech:', e);
        if (onDone) onDone();
    }
}

/**
 * Helper to ensure audio mode is set correctly for speech.
 */
async function ensureAudioMode() {
    if (Audio) {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                staysActiveInBackground: false,
                playThroughEarpieceAndroid: false
            });
        } catch (e) {
            console.warn('[TTS] Audio mode setup failed:', e);
        }
    }
}

export const TextToSpeechService = {
    /**
     * Speak a list of alerts sequentially.
     * @param {Array} alerts - Array of alert objects { hi, en }
     */
    async speakAlerts(alerts) {
        if (!alerts || alerts.length === 0) return;
        stopRequested = false;

        try {
            await ensureAudioMode();
            await stopTextToSpeech();
            await new Promise(r => setTimeout(r, 200));
        } catch (e) { }

        stopRequested = false; // Reset to false after stopping previous alerts to allow this sequence to speak

        for (const alert of alerts) {
            if (stopRequested) {
                console.log('[TTS] speakAlerts stopped');
                break;
            }

            const textToSpeak = `${alert.hi}. ${alert.en}`.replace(/[✅ℹ️⚠️🥗📊🍽️📝📊📈📉]/g, '').trim();
            if (!textToSpeak) continue;

            // Speak and wait for completion before proceeding to next alert
            await playTextToSpeechPromise(textToSpeak, 'hi', true);

            if (stopRequested) break;
            await new Promise(r => setTimeout(r, 450));
        }
    },

    /**
     * Stop all speech audio.
     */
    async stop() {
        stopRequested = true;
        await stopCurrentSoundOnly();
        try {
            await Speech.stop();
        } catch (e) {
            console.warn('[TTS] Stop failed:', e);
        }
    }
};

/**
 * Generic Text to Speech player for single text strings.
 * @param {string} text - text to speak
 * @param {string} language - 'hi' or 'en'
 */
export async function playTextToSpeech(text, language = 'hi') {
    await playTextToSpeechPromise(text, language, false);
}

/**
 * Stops any ongoing TTS immediately.
 */
export async function stopTextToSpeech() {
    await TextToSpeechService.stop();
}
