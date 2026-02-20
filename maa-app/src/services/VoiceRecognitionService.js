/**
 * VoiceRecognitionService.js
 * Wrapper for audio recording (expo-av) + transcription (Groq Whisper)
 * Now includes Voice Activity Detection (VAD) for auto-stopping during eye tests.
 */

import { transcribeAudio } from './ai/GroqService';

let Audio;
try {
    const AV = require("expo-av");
    Audio = AV.Audio;
} catch (e) {
    Audio = null;
}

let recording = null;
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
     */
    async start() {
        if (!Audio) throw new Error("Audio recording not supported");
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

                // Metering values are typically -160 to 0 (dB)
                const db = status.metering || -160;

                // Basic VAD Logic
                if (db > -55) { // Threshold for "speech"
                    speechDetected = true;
                    silenceCount = 0;
                } else if (speechDetected) {
                    silenceCount++;
                    // If silent for ~400ms (4 updates of 100ms), stop automatically
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
            console.log('[Voice] Recording started with VAD');
        } catch (err) {
            console.error('[Voice] Failed to start recording', err);
            throw err;
        }
    },

    /**
     * Stop recording and transcribe
     */
    async stop() {
        if (!recording) return;

        try {
            console.log('[Voice] Stopping recording...');
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            recording = null;

            console.log('[Voice] Transcribing audio with Groq...');
            const transcript = await transcribeAudio(uri);

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
