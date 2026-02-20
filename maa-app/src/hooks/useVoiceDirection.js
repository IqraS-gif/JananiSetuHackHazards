/**
 * useVoiceDirection.js
 * Shared hook: listens for Hindi/English direction words and maps them to
 * 'up' | 'down' | 'left' | 'right' | null.
 *
 * Word map (Hindi + English + Hinglish):
 *   up    → ऊपर upar uppar top
 *   down  → नीचे neeche neche niche
 *   left  → बाएं baayen bayen left
 *   right → दाएं dayen daayen right
 */
import { useEffect, useRef, useCallback } from 'react';
// Safe import for Expo Go compatibility
import { VoiceRecognitionService, useSpeechRecognitionEvent } from '../services/VoiceRecognitionService';

const ExpoSpeechRecognitionModule = VoiceRecognitionService;

const DIRECTION_MAP = {
    // UP
    'ऊपर': 'up', 'upar': 'up', 'uppar': 'up', 'upper': 'up', 'up': 'up', 'top': 'up', 'upr': 'up', 'upaar': 'up', 'upar par': 'up',
    // DOWN
    'नीचे': 'down', 'neeche': 'down', 'neche': 'down', 'niche': 'down', 'down': 'down', 'bottom': 'down',
    // LEFT
    'बाएं': 'left', 'baayen': 'left', 'bayen': 'left', 'baen': 'left', 'left': 'left', 'baaye': 'left', 'baayein': 'left', 'bain': 'left', 'bai': 'left', 'bayi': 'left', 'baayi': 'left',
    // RIGHT
    'दाएं': 'right', 'dayen': 'right', 'daayen': 'right', 'dayan': 'right', 'right': 'right', 'daain': 'right', 'daaye': 'right', 'daayan': 'right', 'daayein': 'right', 'danyi': 'right', 'daanyi': 'right', 'daai': 'right',
};

function parseDirection(transcript) {
    if (!transcript) return null;
    const clean = transcript.toLowerCase().trim();
    const words = clean.split(/\s+/);

    // Prioritize exact word matches
    for (const w of words) {
        if (DIRECTION_MAP[w]) return DIRECTION_MAP[w];
    }

    // Secondary: Search for substrings in the entire transcript
    // (Helps if speech engine joins words)
    for (const [key, value] of Object.entries(DIRECTION_MAP)) {
        if (clean.includes(key)) return value;
    }
    return null;
}

/**
 * @param {function} onDirection - called with 'up'|'down'|'left'|'right'
 * @param {boolean} active - only listens when true
 * @returns {{ listening: boolean, startListening: fn, stopListening: fn, error: string|null }}
 */
export function useVoiceDirection({ onDirection, active }) {
    const listeningRef = useRef(false);
    const onDirectionRef = useRef(onDirection);
    onDirectionRef.current = onDirection;

    useSpeechRecognitionEvent('result', (event) => {
        if (!listeningRef.current) return;
        const raw = event.results?.[0]?.transcript ?? '';
        console.log(`[Voice] Raw Transcript: "${raw}"`);

        const dir = parseDirection(raw);

        // Notify of EVERYTHING. If dir is null, AcuityTest will handle the "Retry" logic.
        if (onDirectionRef.current) {
            onDirectionRef.current(dir, raw);
        }

        if (dir) {
            console.log(`[Voice] Matched Direction: ${dir}`);
            // stop after a valid answer
            ExpoSpeechRecognitionModule.stop();
            listeningRef.current = false;
        }
    });

    useSpeechRecognitionEvent('end', () => {
        console.log('[Voice] session ended');
        listeningRef.current = false;
    });

    useSpeechRecognitionEvent('error', (event) => {
        console.error('[Voice] Error:', event.error, event.message);
        listeningRef.current = false;
    });

    const startListening = useCallback(async () => {
        console.log('[Voice] Requesting permissions...');
        const granted = await VoiceRecognitionService.requestPermissions();
        console.log('[Voice] Permission granted:', granted);
        if (!granted) return false;

        listeningRef.current = true;
        console.log('[Voice] Starting Groq Recording (Reactive)...');
        // This will now auto-stop via Silence Detection (VAD) in the service
        await VoiceRecognitionService.start();
        return true;
    }, []);

    const stopListening = useCallback(() => {
        console.log('[Voice] Manual stop/cancel');
        VoiceRecognitionService.cancel();
        listeningRef.current = false;
    }, []);

    return { startListening, stopListening };
}
