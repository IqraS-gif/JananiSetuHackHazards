/**
 * TextToSpeechService.js
 * Wrapper for expo-speech to provide nutritional alerts readout.
 */

import * as Speech from 'expo-speech';
let Audio;
try {
    Audio = require('expo-av').Audio;
} catch (e) {
    Audio = null;
}

let stopRequested = false;

export const TextToSpeechService = {
    /**
     * Speak a list of alerts.
     * @param {Array} alerts - Array of alert objects { hi, en, type }
     */
    async speakAlerts(alerts) {
        if (!alerts || alerts.length === 0) return;
        stopRequested = false;

        try {
            await ensureAudioMode();
            await Speech.stop();
            await new Promise(r => setTimeout(r, 200));
        } catch (e) { }

        for (const alert of alerts) {
            // CRITICAL: Check if stop was requested between alerts
            if (stopRequested) {
                console.log('[TTS] speakAlerts cancelled');
                break;
            }

            // Remove common emojis for cleaner TTS
            const textToSpeak = `${alert.hi}. ${alert.en}`.replace(/[✅ℹ️⚠️🥗📊🍽️📝📊📈📉]/g, '').trim();

            if (!textToSpeak) continue;

            await new Promise((resolve) => {
                let hasResolved = false;
                const safeResolve = () => {
                    if (!hasResolved) {
                        hasResolved = true;
                        resolve();
                    }
                };

                // Check again immediately before speaking
                if (stopRequested) {
                    safeResolve();
                    return;
                }

                Speech.speak(textToSpeak, {
                    language: 'hi-IN',
                    rate: 0.9,
                    onDone: safeResolve,
                    onStopped: safeResolve,
                    onError: (error) => {
                        console.warn('[TTS] hi-IN failed, trying fallback hi:', error);
                        if (stopRequested) { safeResolve(); return; }
                        Speech.speak(textToSpeak, {
                            language: 'hi',
                            rate: 0.9,
                            onDone: safeResolve,
                            onStopped: safeResolve,
                            onError: (e2) => {
                                console.warn('[TTS] hi failed, trying default:', e2);
                                if (stopRequested) { safeResolve(); return; }
                                Speech.speak(textToSpeak, {
                                    rate: 0.9,
                                    onDone: safeResolve,
                                    onStopped: safeResolve,
                                    onError: (e3) => {
                                        console.error('[TTS] speakAlerts absolute failure:', e3?.message || e3);
                                        safeResolve();
                                    }
                                });
                            }
                        });
                    },
                });

                // Fail-safe to prevent promise hanging
                setTimeout(safeResolve, 12000);
            });

            if (stopRequested) break;
            await new Promise(r => setTimeout(r, 450));
        }
    },

    /**
     * Stop all speech.
     */
    async stop() {
        stopRequested = true;
        try {
            await Speech.stop();
        } catch (e) {
            console.warn('[TTS] Stop failed:', e);
        }
    }
};

/**
 * Helper to ensure audio mode is set correctly for speech (needed for some Android/iOS versions)
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

/**
 * Generic Text to Speech player for single text strings
 * @param {string} text - text to speak
 * @param {string} language - 'hi' or 'en'
 */
export async function playTextToSpeech(text, language = 'hi') {
    if (!text) return;

    const primaryLang = language === 'hi' ? 'hi-IN' : 'en-IN';
    const fallbackLang = language === 'hi' ? 'hi' : 'en';

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
                }
            };

            Speech.speak(text, {
                language: primaryLang,
                rate: 0.9,
                onDone: safeResolve,
                onStopped: safeResolve,
                onError: (error) => {
                    console.warn(`[TTS] ${primaryLang} failed, trying ${fallbackLang}:`, error);
                    // Fallback to simpler code
                    Speech.speak(text, {
                        language: fallbackLang,
                        rate: 0.9,
                        onDone: safeResolve,
                        onStopped: safeResolve,
                        onError: (err2) => {
                            console.warn(`[TTS] ${fallbackLang} failed, trying default:`, err2);
                            // Fallback to system default
                            Speech.speak(text, {
                                rate: 0.9,
                                onDone: safeResolve,
                                onStopped: safeResolve,
                                onError: (err3) => {
                                    console.error('[TTS] playTextToSpeech absolute failure:',
                                        err3?.message || err3 || 'Unknown Error');
                                    safeResolve();
                                }
                            });
                        }
                    });
                }
            });

            // Fail-safe to prevent promise hanging (12 seconds)
            setTimeout(safeResolve, 12000);
        });
    } catch (e) {
        console.error('[TTS] error in generic playTextToSpeech:', e?.message || e);
    }
}

/**
 * Stops any ongoing TTS immediately
 */
export async function stopTextToSpeech() {
    await TextToSpeechService.stop();
}
