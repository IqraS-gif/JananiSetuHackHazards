/**
 * VoiceRecognitionService.js
 * Wrapper for audio recording (expo-av) + transcription (Groq Whisper)
 * Now includes Voice Activity Detection (VAD) for auto-stopping during eye tests.
 */

import { transcribeAudio } from './ai/GeminiService';

let Audio;
try {
    const AV = require("expo-av");
    Audio = AV.Audio;
} catch (e) {
    Audio = null;
}

let recording = null;
let isStarting = false;
let activeLanguage = 'hi';
let eventCallbacks = {
    result: [],
    end: [],
    error: []
};

/**
 * useSpeechRecognitionEvent - Compatibility hook
 */
export function useSpeechRecognitionEvent(event, callback) {
    const React = require('react');
    React.useEffect(() => {
        VoiceRecognitionService.subscribe(event, callback);
        return () => VoiceRecognitionService.unsubscribe(event, callback);
    }, [event, callback]);
}

export const VoiceRecognitionService = {
    isNativeModuleAvailable: !!Audio,

    /**
     * Subscribe to events
     */
    subscribe(event, callback) {
        if (eventCallbacks[event]) {
            eventCallbacks[event].push(callback);
        }
    },

    /**
     * Unsubscribe
     */
    unsubscribe(event, callback) {
        if (eventCallbacks[event]) {
            eventCallbacks[event] = eventCallbacks[event].filter(cb => cb !== callback);
        }
    },

    /**
     * Check and request permissions
     */
    async requestPermissions() {
        if (!Audio) return false;
        try {
            const { status } = await Audio.requestPermissionsAsync();
            return status === 'granted';
        } catch (e) {
            console.error('[Voice] Permission error:', e);
            return false;
        }
    },

    /**
     * Start recording with auto-silence detection (VAD)
     * maxMs caps the recording so Sarvam STT never sees >30s audio.
     */
    async start(langCode = 'hi', maxMs = 8000) {
        activeLanguage = langCode;
        if (!Audio) throw new Error("Audio recording not supported");
        if (isStarting) {
            console.log('[Voice] Already starting a recording, ignoring start request');
            return;
        }
        isStarting = true;
        try {
            // Safety: Unload previous recording if it exists
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) { }
                recording = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            let silenceCount = 0;
            let speechDetected = false;

            const onStatusUpdate = async (status) => {
                if (!status.isRecording) return;

                const db = status.metering || -160;

                if (db > -55) {
                    speechDetected = true;
                    silenceCount = 0;
                } else if (speechDetected) {
                    silenceCount++;
                    // ~400ms of silence after speech → stop
                    if (silenceCount >= 4) {
                        console.log('[Voice] Silence detected, auto-stopping...');
                        VoiceRecognitionService.stop();
                    }
                }
            };

            const recordingOptions = {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                android: {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                    isMeteringEnabled: true,
                },
                ios: {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                    isMeteringEnabled: true,
                },
            };

            const { recording: newRecording } = await Audio.Recording.createAsync(
                recordingOptions,
                onStatusUpdate,
                100 // Update every 100ms
            );

            recording = newRecording;
            isStarting = false;
            console.log('[Voice] Recording started with VAD');

            // Hard cap: stop after maxMs regardless of VAD
            setTimeout(() => {
                if (recording === newRecording) {
                    console.log(`[Voice] Max duration (${maxMs}ms) reached, stopping...`);
                    VoiceRecognitionService.stop();
                }
            }, maxMs);

        } catch (err) {
            isStarting = false;
            console.error('[Voice] Failed to start recording', err);
            throw err;
        }
    },

    /**
     * Stop recording and transcribe
     */
    async stop() {
        if (!recording) {
            if (isStarting) {
                console.log('[Voice] Stop called while starting, waiting to stop...');
                let checks = 0;
                while (isStarting && checks < 20) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    checks++;
                }
                if (recording) {
                    return this.stop();
                }
            }
            return;
        }

        try {
            console.log('[Voice] Stopping recording...');
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            recording = null;

            console.log(`[Voice] Transcribing audio using multi-tier STT (lang: ${activeLanguage})...`);
            const transcript = await transcribeAudio(uri, activeLanguage);

            // Notify subscribers
            eventCallbacks.result.forEach(cb => cb({ results: [{ transcript }] }));
            eventCallbacks.end.forEach(cb => cb());

            return transcript;
        } catch (err) {
            console.error('[Voice] Stop/Transcribe failed', err);
            eventCallbacks.error.forEach(cb => cb(err));
            throw err;
        }
    },

    /**
     * Cancel
     */
    async cancel() {
        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
            } catch (e) { }
            recording = null;
        }
    }
};
