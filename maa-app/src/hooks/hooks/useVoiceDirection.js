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
let ExpoSpeechRecognitionModule;
let useSpeechRecognitionEvent;

try {
    const SpeechMod = require("expo-speech-recognition");
    ExpoSpeechRecognitionModule = SpeechMod.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = SpeechMod.useSpeechRecognitionEvent;
} catch (e) {
    // Mock for Expo Go
    ExpoSpeechRecognitionModule = {
        requestPermissionsAsync: async () => ({ granted: false }),
        start: async () => { },
        stop: async () => { },
    };
    useSpeechRecognitionEvent = () => { }; // Dummy hook
}

const DIRECTION_MAP = {
    // UP
    'ऊपर': 'up', 'upar': 'up', 'uppar': 'up', 'up': 'up', 'top': 'up',
    // DOWN
    'नीचे': 'down', 'neeche': 'down', 'neche': 'down', 'niche': 'down', 'down': 'down', 'bottom': 'down',
    // LEFT
    'बाएं': 'left', 'baayen': 'left', 'bayen': 'left', 'baen': 'left', 'left': 'left',
    // RIGHT
    'दाएं': 'right', 'dayen': 'right', 'daayen': 'right', 'dayan': 'right', 'right': 'right', 'daain': 'right',
};

function parseDirection(transcript) {
    const words = transcript.toLowerCase().trim().split(/\s+/);
    for (const w of words) {
        if (DIRECTION_MAP[w]) return DIRECTION_MAP[w];
    }
    // Try partial match
    for (const key of Object.keys(DIRECTION_MAP)) {
        if (transcript.toLowerCase().includes(key)) return DIRECTION_MAP[key];
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
        const dir = parseDirection(raw);
        if (dir) {
            onDirectionRef.current(dir);
            // stop after a valid answer
            ExpoSpeechRecognitionModule.stop();
            listeningRef.current = false;
        }
    });

    useSpeechRecognitionEvent('end', () => {
        listeningRef.current = false;
    });

    useSpeechRecognitionEvent('error', () => {
        listeningRef.current = false;
    });

    const startListening = useCallback(async () => {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) return false;
        listeningRef.current = true;
        ExpoSpeechRecognitionModule.start({
            lang: 'hi-IN',        // Hindi primary
            interimResults: false,
            continuous: false,
        });
        return true;
    }, []);

    const stopListening = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
        listeningRef.current = false;
    }, []);

    return { startListening, stopListening };
}
