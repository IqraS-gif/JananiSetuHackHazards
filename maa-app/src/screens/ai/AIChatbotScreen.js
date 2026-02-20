/**
 * AIChatbotScreen.js
 * React Native AI Orb — featuring actual Gemini Voice Chat.
 *   • Voice to Text via Gemini
 *   • Empathetic Chat generation via Gemini
 *   • Text-to-Speech playback
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, {
    Path,
} from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useT } from '../../i18n/useT';

// AI Services
import { generateMultimodalPregnancyChatResponse } from '../../services/ai/GeminiService';
import { playTextToSpeech, stopTextToSpeech } from '../../services/TextToSpeechService';

const { width: SW } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────
const BG = '#f3e8ff';
const CARD_BG = 'rgba(230,225,255,0.85)'; // more opaque, brighter glassmorphism
const USER_BG = 'rgba(255,255,255,0.95)';
const AI_TEXT = '#1e1c3a';           // darker purple/black for legibility
const USER_TEXT = '#444444';         // darker grey
const RED = '#ff0002';           // title / waveform colour
const ORB_SIZE = 96;
const CHAT_W = Math.min(SW - 40, 360);
const CHAT_H = 350;

// ─── Waveform title icon ───────────────────────────────────────
function WaveformIcon({ isRecording }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isRecording) {
            Animated.loop(Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
            ])).start();
        } else {
            anim.stopAnimation();
            anim.setValue(0);
        }
    }, [isRecording]);

    const color = anim.interpolate({ inputRange: [0, 1], outputRange: ['#888', RED] });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M3 14V10" stroke={isRecording ? RED : '#888'} strokeWidth={2} strokeLinecap="round" />
                <Path d="M21 14V10" stroke={isRecording ? RED : '#888'} strokeWidth={2} strokeLinecap="round" />
                <Path d="M16.5 18V8" stroke={isRecording ? RED : '#888'} strokeWidth={2} strokeLinecap="round" />
                <Path d="M12 22V2" stroke={isRecording ? RED : '#888'} strokeWidth={2} strokeLinecap="round" />
                <Path d="M7.5 18V6" stroke={isRecording ? RED : '#888'} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Animated.Text style={{ color, fontSize: 14, fontWeight: '500' }}>
                {isRecording ? "Listening..." : "Chat History"}
            </Animated.Text>
        </View>
    );
}

// ─── SVG Icons ────────────────────────────────────────────────
function MicIcon({ color = '#fff', size = 32 }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path fill={color} d="M8 2C5.79 2 4 3.79 4 6v5c0 3.87 3.13 7 7 7s7-3.13 7-7V6c0-2.21-1.79-4-4-4H8z" />
            <Path stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" d="M5 11a7 7 0 0 0 14 0M12 19v3" />
        </Svg>
    );
}

function CloseIcon({ color = '#fff', size = 22 }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path fill={color}
                d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4" />
        </Svg>
    );
}

// ─── Orb core — lotus avatar with gentle pulse ────────────────
function OrbCore({ chatOpen, isRecording, isSpeaking }) {
    const pulse = useRef(new Animated.Value(1)).current;
    const loopRef = useRef(null);

    useEffect(() => {
        if (isRecording || isSpeaking) {
            // Rapid pulse when active
            loopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulse, { toValue: 0.96, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            );
            loopRef.current.start();
        } else if (!chatOpen) {
            // Gentle idle pulse
            loopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.05, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulse, { toValue: 0.98, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            );
            loopRef.current.start();
        } else {
            // Static when chat is open but idle
            loopRef.current?.stop();
            Animated.spring(pulse, { toValue: 1, useNativeDriver: true }).start();
        }
        return () => loopRef.current?.stop();
    }, [chatOpen, isRecording, isSpeaking]);

    return (
        <Animated.View style={{ transform: [{ scale: pulse }], width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, overflow: 'hidden' }}>
            <Image
                source={require('../../assets/images/ai_flower_avatar.png')}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
        </Animated.View>
    );
}

function OrbGlow() {
    return <View pointerEvents="none" style={styles.orbGlow} />;
}

// ─── Single animated word ──────────────────────────────────────
function AnimatedWord({ word, delay, isRunning, color }) {
    const o = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (isRunning) {
            Animated.timing(o, { toValue: 1, duration: 500, delay: delay * 1000, useNativeDriver: true, easing: Easing.out(Easing.back(1.3)) }).start();
        } else {
            o.setValue(1);
        }
    }, [isRunning]);
    return (
        <Animated.View style={{ opacity: o }}>
            <Text style={{ color: color, fontSize: 13, lineHeight: 18 }}>{word} </Text>
        </Animated.View>
    );
}

// ─── Chat bubble ─────────────────────────────────────────────────
function ChatBubble({ role, text, delay, isRunning }) {
    const isUser = role === 'user';
    const textColor = isUser ? USER_TEXT : AI_TEXT;

    // Split by single or multiple newlines
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    let wIdx = 0;

    return (
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
            {lines.map((line, i) => (
                <View key={i} style={[styles.wordsRow, { marginTop: i > 0 ? 12 : 0 }]}>
                    {line.split(' ').map((w, j) => (
                        <AnimatedWord key={j} word={w} delay={delay + (wIdx++) * 0.05} isRunning={isRunning} color={textColor} />
                    ))}
                </View>
            ))}
        </View>
    );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function AIChatbotScreen({ navigation }) {
    const { isHindi } = useT();
    const langCode = isHindi ? 'hi' : 'en';

    const [chatOpen, setChatOpen] = useState(false);

    // Chat state
    const [messages, setMessages] = useState([
        { role: 'ai', text: isHindi ? 'नमस्ते! मैं जननी हूँ। आपकी गर्भावस्था के दौरान मैं कैसे मदद कर सकती हूँ?' : 'Hello! I am Janani. How can I help you during your pregnancy today?' }
    ]);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [recordingObj, setRecordingObj] = useState(null);

    const scrollViewRef = useRef();

    // Animations
    const panelOpacity = useRef(new Animated.Value(0)).current;
    const panelScale = useRef(new Animated.Value(0.75)).current;
    const orbTransY = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    const openPanel = () => {
        setChatOpen(true);
        Animated.parallel([
            Animated.spring(panelOpacity, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
            Animated.spring(panelScale, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
            Animated.spring(orbTransY, { toValue: 110, useNativeDriver: true, bounciness: 12 }),
        ]).start();
    };

    const closePanel = () => {
        Animated.parallel([
            Animated.timing(panelOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.spring(panelScale, { toValue: 0.75, useNativeDriver: true }),
            Animated.spring(orbTransY, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
        ]).start(() => setChatOpen(false));
    };

    const toggle = () => chatOpen ? closePanel() : openPanel();

    // Reset TTS on unmount
    useEffect(() => {
        return () => { stopTextToSpeech(); };
    }, []);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatOpen && scrollViewRef.current) {
            setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 200);
        }
    }, [messages, chatOpen]);

    // ─── Audio Recording Logic ───
    const startRecording = async () => {
        if (isProcessing) return; // Guard against rapid taps
        try {
            if (recordingObj) {
                try {
                    await recordingObj.stopAndUnloadAsync();
                } catch (e) { /* ignore */ }
                setRecordingObj(null);
            }

            try {
                await stopTextToSpeech();
                setIsSpeaking(false);
            } catch (e) { /* ignore */ }

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecordingObj(recording);
            setIsRecording(true);
            if (!chatOpen) openPanel();
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!recordingObj) return;
        setIsRecording(false);
        setIsProcessing(true);
        try {
            try {
                await recordingObj.stopAndUnloadAsync();
            } catch (e) {
                console.log('Ignored stop/unload error:', e.message);
            }
            const uri = recordingObj.getURI();
            setRecordingObj(null);

            if (!uri) throw new Error("Could not retrieve audio location.");

            // 1. Send Audio and History to Gemini in ONE API CALL!
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

            setIsProcessing(true);
            // Gets both what the user said, and the empathetic AI response
            const { transcript, response } = await generateMultimodalPregnancyChatResponse(messages, base64, langCode);

            if (!transcript || transcript === 'NO_SPEECH') {
                setIsProcessing(false);
                return; // Silently ignore empty or silent recordings
            }

            if (transcript.trim() === '') {
                setIsProcessing(false);
                return;
            }

            // Append both to history
            const newHistory = [
                ...messages,
                { role: 'user', text: transcript },
                { role: 'ai', text: response || "I'm sorry, I couldn't generate a response." }
            ];
            setMessages(newHistory);

            // Play TTS
            if (response && response.trim() !== '') {
                setIsSpeaking(true);
                await playTextToSpeech(response, langCode);
                setIsSpeaking(false);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Companion</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Canvas */}
            <View style={styles.canvas}>

                {/* ── Chat panel ── */}
                <Animated.View style={[
                    styles.chatPanel,
                    { opacity: panelOpacity, transform: [{ scale: panelScale }] },
                ]} pointerEvents={chatOpen ? 'auto' : 'none'}>

                    {/* Title bar */}
                    <View style={styles.titleBar}>
                        <WaveformIcon isRecording={isRecording} />
                    </View>

                    {/* Chat area */}
                    <View style={styles.chatArea}>
                        <View style={styles.maskTop} pointerEvents="none" />
                        <ScrollView
                            ref={scrollViewRef}
                            contentContainerStyle={styles.chats}
                            showsVerticalScrollIndicator={false}
                        >
                            {messages.map((msg, i) => (
                                <ChatBubble
                                    key={i}
                                    role={msg.role}
                                    text={msg.text}
                                    delay={0} // We only animate new ones realistically, but simplifying for now
                                    isRunning={i === messages.length - 1 && msg.role === 'ai'}
                                />
                            ))}
                            {isProcessing && (
                                <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic', paddingLeft: 8 }}>...</Text>
                            )}
                        </ScrollView>
                    </View>
                </Animated.View>

                {/* ── Orb ── */}
                <Animated.View style={[styles.orbContainer, { transform: [{ translateY: orbTransY }] }]}>
                    <OrbGlow />

                    <Pressable
                        onPress={() => {
                            if (isRecording) {
                                Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
                                stopRecording();
                            } else {
                                Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true }).start();
                                startRecording();
                            }
                        }}
                    >
                        <Animated.View style={{ width: ORB_SIZE, height: ORB_SIZE, transform: [{ scale: pressScale }] }}>
                            {/* Core lotus & pulse */}
                            <OrbCore chatOpen={chatOpen} isRecording={isRecording} isSpeaking={isSpeaking} />

                            {/* Center Mic icon logic */}
                            {/* Center Mic icon logic */}
                            <View style={styles.iconLayer}>
                                <View style={{ opacity: isRecording ? 1 : 0, position: 'absolute', backgroundColor: 'rgba(255,0,0,0.6)', borderRadius: 30, padding: 8 }}>
                                    <MicIcon size={32} color="#fff" />
                                </View>
                            </View>
                        </Animated.View>
                    </Pressable>
                </Animated.View>

                {/* Hint */}
                {!chatOpen && (
                    <Text style={styles.hint}>Tap the lotus to speak</Text>
                )}
                {isRecording && (
                    <Text style={styles.hint}>Tap again to send</Text>
                )}

            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 36 : 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#2a2a3e' },

    canvas: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    chatPanel: {
        width: CHAT_W,
        height: CHAT_H,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: 'rgba(180,150,255,0.25)',
        ...Platform.select({
            ios: { shadowColor: '#9c6de0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 },
            android: { elevation: 6 },
        }),
    },

    titleBar: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(180,150,255,0.18)',
    },

    chatArea: {
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
    },

    maskTop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, height: 32,
        zIndex: 10,
        backgroundColor: 'rgba(220,210,248,0.0)',
    },

    chats: {
        padding: 14,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 8,
        flexDirection: 'column',
    },

    bubble: {
        maxWidth: '85%',
    },
    bubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: USER_BG,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderTopRightRadius: 3,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
            android: { elevation: 2 },
        }),
    },
    bubbleAI: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderTopLeftRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
            android: { elevation: 1 },
        }),
    },
    wordsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
    },

    orbContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: ORB_SIZE + 32,
        height: ORB_SIZE + 32,
    },

    orbGlow: {
        position: 'absolute',
        width: ORB_SIZE + 32,
        height: 24,
        bottom: -4,
        borderRadius: 40,
        backgroundColor: 'rgba(180,100,255,0.3)',
        ...Platform.select({
            ios: { shadowColor: '#b064ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 14 },
            android: { elevation: 0 },
        }),
    },

    iconLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },

    closeBtn: {
        position: 'absolute',
        top: 10,
        right: 0,
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center', justifyContent: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
            android: { elevation: 2 },
        }),
    },

    hint: {
        marginTop: 20,
        color: 'rgba(80,60,120,0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
});
