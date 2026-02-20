/**
 * PeripheralTestScreen.js
 * Peripheral Vision Test — Flash detection using voice input
 *
 * INPUT METHOD: Voice — say "हाँ" / "हा" / "देखा" (or "yes" / "saw") when you see the flash.
 * Fall back: large tap button.
 *
 * Protocol:
 *   - Concentric rings of test points (5°, 10°, 15°, 20° eccentricity)
 *   - 3 flash intensities: bright / medium / dim
 *   - Fixation dot in centre; user must not move eyes
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, ScrollView, Dimensions, Animated,
} from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');
const CANVAS = Math.min(SW - 40, 360);
const CX = CANVAS / 2;
const CY = CANVAS / 2;

// No voice keywords needed (Touch Only)

// Generate test points arranged in rings
function buildTestPoints() {
    const eccentricities = [
        { deg: 5, r: CANVAS * 0.12 },
        { deg: 10, r: CANVAS * 0.22 },
        { deg: 15, r: CANVAS * 0.33 },
        { deg: 20, r: CANVAS * 0.44 },
    ];
    const anglesPerRing = [8, 10, 12, 14];
    const points = [];
    let id = 0;
    eccentricities.forEach(({ deg, r }, ri) => {
        const n = anglesPerRing[ri];
        for (let i = 0; i < n; i++) {
            const angle = (2 * Math.PI / n) * i - Math.PI / 2;
            points.push({
                id: id++,
                x: CX + r * Math.cos(angle),
                y: CY + r * Math.sin(angle),
                eccentricity: deg,
            });
        }
    });
    return points;
}

const TEST_POINTS = buildTestPoints();
const INTENSITIES = ['bright', 'medium', 'dim'];
const FLASH_DUR = 200; // ms
const RESPONSE_WIN = 1000; // 1 second user has to respond

const PHASES = ['बायीं आँख\nLeft Eye', 'दाईं आँख\nRight Eye'];

export default function PeripheralTestScreen({ navigation }) {
    const [phase, setPhase] = useState('instructions');
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [results, setResults] = useState([]);
    const [allPhaseResults, setAllPhaseResults] = useState({});
    const [trialQueue, setTrialQueue] = useState([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [flashVisible, setFlashVisible] = useState(false);
    const [activePoint, setActivePoint] = useState(null);
    const [waitingResponse, setWaitingResponse] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [timeLeft, setTimeLeft] = useState(40); // 40s per eye
    const [progress, setProgress] = useState(0);
    const timersRef = useRef([]);
    const timerRef = useRef(null); // Main countdown
    const respondedRef = useRef(false);

    const totalPoints = TEST_POINTS.length * INTENSITIES.length;

    const clearAllTimers = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];
    }, []);

    const addTimer = (id) => {
        timersRef.current.push(id);
        return id;
    };

    // Timer Effect: Pure decrement
    useEffect(() => {
        if (phase === 'test' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => clearAllTimers();
    }, [clearAllTimers]);

    // Finish Condition: Check when time runs out
    useEffect(() => {
        if (phase === 'test' && timeLeft === 0) {
            clearAllTimers();
            finishPhase(results);
        }
    }, [timeLeft, phase, results, finishPhase, clearAllTimers]);

    const flashColor = useCallback((intensityLevel) => {
        if (intensityLevel === 'bright') return 'rgba(255,255,200,0.95)';
        if (intensityLevel === 'medium') return 'rgba(255,255,200,0.55)';
        return 'rgba(255,255,200,0.2)';
    }, []);

    const finishPhase = useCallback((finalResults) => {
        clearAllTimers();
        const seen = finalResults.filter(r => r.seen).length;
        const vfi = Math.round((seen / (finalResults.length || 1)) * 100);
        const phaseName = PHASES[phaseIndex];
        const updatedAll = { ...allPhaseResults, [phaseName]: { vfi, results: finalResults } };
        setAllPhaseResults(updatedAll);

        if (phaseIndex < PHASES.length - 1) {
            setPhaseIndex(pi => pi + 1);
            setPhase('intermission');
        } else {
            const finalVfi = Math.round(Object.values(updatedAll).reduce((acc, curr) => acc + curr.vfi, 0) / PHASES.length);
            navigation.navigate('EyeHealth', {
                peripheralResult: { vfi: finalVfi, eyeData: updatedAll }
            });
            setPhase('done');
        }
    }, [phaseIndex, allPhaseResults, navigation, clearAllTimers]);

    const recordResponse = useCallback((seen) => {
        if (phase !== 'test') return;
        setWaitingResponse(false);
        setFeedback(seen ? 'correct' : 'wrong');

        const currentTrial = trialQueue[queueIndex];
        if (!currentTrial) return;

        const newResult = {
            pointId: TEST_POINTS[currentTrial.pointIndex]?.id,
            eccentricity: TEST_POINTS[currentTrial.pointIndex]?.eccentricity,
            intensity: currentTrial.intensity,
            seen,
        };

        const updatedResults = [...results, newResult];
        setResults(updatedResults);
        setProgress(updatedResults.length / totalPoints);

        // Feedback Delay then Next
        addTimer(setTimeout(() => {
            if (phase !== 'test') return;
            setFeedback(null);
            const nextIdx = queueIndex + 1;
            if (nextIdx < trialQueue.length && timeLeft > 0) {
                setQueueIndex(nextIdx);
                showNextFlashFromQueue(nextIdx);
            } else if (timeLeft > 0) {
                finishPhase(updatedResults);
            }
        }, 600));
    }, [phase, trialQueue, queueIndex, totalPoints, results, timeLeft, finishPhase, showNextFlashFromQueue]);

    const showNextFlashFromQueue = useCallback((idx) => {
        if (phase !== 'test') return;
        const trial = trialQueue[idx];
        if (!trial) return;
        const point = TEST_POINTS[trial.pointIndex];
        if (!point) return;
        setActivePoint(point);

        const preDelay = 800 + Math.random() * 600;
        addTimer(setTimeout(() => {
            if (phase !== 'test') return;
            setFlashVisible(true);
            addTimer(setTimeout(() => {
                if (phase !== 'test') return;
                setFlashVisible(false);
                setWaitingResponse(true);
                respondedRef.current = false;
                addTimer(setTimeout(() => {
                    if (phase !== 'test') return;
                    if (!respondedRef.current) {
                        respondedRef.current = true;
                        recordResponse(false);
                    }
                }, RESPONSE_WIN));
            }, FLASH_DUR));
        }, preDelay));
    }, [phase, recordResponse, trialQueue]);

    const startTest = useCallback(() => {
        clearAllTimers();
        const fullQueue = [];
        TEST_POINTS.forEach((_, ptIdx) => {
            INTENSITIES.forEach(intensityLevel => {
                fullQueue.push({ pointIndex: ptIdx, intensity: intensityLevel });
            });
        });
        for (let i = fullQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullQueue[i], fullQueue[j]] = [fullQueue[j], fullQueue[i]];
        }
        setTrialQueue(fullQueue);
        setQueueIndex(0);
        setResults([]);
        setProgress(0);
        setTimeLeft(40);
        setFeedback(null);
        setWaitingResponse(false);
        setFlashVisible(false);
        setPhase('test');
    }, [clearAllTimers]);

    // Auto-trigger first flash when queue is ready
    useEffect(() => {
        if (phase === 'test' && trialQueue.length > 0 && queueIndex === 0 && results.length === 0) {
            showNextFlashFromQueue(0);
        }
    }, [phase, trialQueue]);

    // ── Instructions ────────────────────────────────────────────
    if (phase === 'instructions') {
        return (
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={s.wrap}>
                    <Text style={s.emoji}>🔦</Text>
                    <Text style={s.title}>परिधीय दृष्टि टेस्ट{'\n'}Peripheral Vision Test</Text>

                    <View style={s.card}>
                        <Text style={s.cardHead}>कैसे करें / How to do it:</Text>
                        <View style={s.stepRow}>
                            <Text style={s.stepNum}>1️⃣</Text>
                            <Text style={s.stepTxt}>बीच की हरी बिंदी पर नज़र टिकाएं — हिलाएं नहीं!{'\n'}Look at the green dot — don't look away!</Text>
                        </View>
                        <View style={s.stepRow}>
                            <Text style={s.stepNum}>2️⃣</Text>
                            <Text style={s.stepTxt}>जैसे ही किनारे पर कोई चमक दिखे, बटन दबाएं या स्क्रीन छुएं{'\n'}When you see a flash, tap the button or screen</Text>
                        </View>
                        <View style={s.stepRow}>
                            <Text style={s.stepNum}>3️⃣</Text>
                            <Text style={s.stepTxt}>यह टेस्ट 40 सेकंड तक चलेगा{'\n'}This test will last 40 seconds</Text>
                        </View>
                    </View>

                    <View style={[s.card, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={s.voiceTip}>👁️ बस "देखा!" बटन दबाएं जब चमक दिखे{'\n'}Just tap "I Saw It!" when you see the flash</Text>
                    </View>

                    <TouchableOpacity style={s.bigBtn} onPress={startTest}>
                        <Text style={s.bigBtnTxt}>शुरू करें / Begin</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (phase === 'intermission') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Text style={s.emoji}>✅</Text>
                    <Text style={s.title}>चरण पूरा!{'\n'}Phase Done!</Text>
                    <Text style={s.subTitle}>अगला: {PHASES[phaseIndex].split('\n')[0]}</Text>
                    <Text style={s.noteTxt}>दूसरी आँख ढकें।{'\n'}Switch eye cover.</Text>
                    <TouchableOpacity style={[s.bigBtn, { marginTop: 32 }]} onPress={startTest}>
                        <Text style={s.bigBtnTxt}>आगे / Continue</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'done') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <Text style={s.emoji}>🎉</Text>
                    <Text style={s.title}>टेस्ट पूरा!{'\n'}Test Complete!</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Test canvas ──────────────────────────────────────────────
    return (
        <SafeAreaView style={s.safe}>
            <View style={s.topRow}>
                <View style={s.badge}>
                    <Text style={s.badgeTxt}>{PHASES[phaseIndex].split('\n')[0]}</Text>
                </View>
                <View style={s.progressBar}>
                    <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
                <View style={s.timerBox}>
                    <Text style={[s.timerTxt, timeLeft < 10 && { color: '#EF4444' }]}>
                        ⏱️ {timeLeft}s
                    </Text>
                </View>
            </View>
            <Text style={s.progressTxt}>{Math.round(progress * 100)}% पूरा / done</Text>

            {/* Canvas Area with Feedback Border */}
            <View style={[s.canvasOuter,
            feedback === 'correct' && s.borderCorrect,
            feedback === 'wrong' && s.borderWrong
            ]}>
                <View style={s.canvasWrap}>
                    <Svg width={CANVAS} height={CANVAS}>
                        {/* Background */}
                        <Rect width={CANVAS} height={CANVAS} fill="#111827" />

                        {/* Flash point */}
                        {flashVisible && activePoint ? (
                            <Circle
                                cx={activePoint.x}
                                cy={activePoint.y}
                                r={14}
                                fill={flashColor(trialQueue[queueIndex]?.intensity || 'bright')}
                            />
                        ) : null}

                        {/* Fixation glow */}
                        <Circle cx={CX} cy={CY} r={22} fill="rgba(34,197,94,0.15)" />
                        <Circle cx={CX} cy={CY} r={10} fill="rgba(34,197,94,0.5)" />
                        <Circle cx={CX} cy={CY} r={6} fill="#22C55E" />
                        <Circle cx={CX} cy={CY} r={2.5} fill="#fff" />
                    </Svg>
                </View>
            </View>

            <View style={s.hintRow}>
                <Text style={s.hintTxt}>
                    बीच में देखते रहें!{'\n'}Keep looking at the center!
                </Text>
            </View>

            {/* Fallback tap button */}
            <TouchableOpacity
                style={[s.tapBtn, !waitingResponse && s.tapBtnDisabled]}
                onPress={() => {
                    if (waitingResponse && !respondedRef.current) {
                        respondedRef.current = true;
                        recordResponse(true);
                    }
                }}
                disabled={!waitingResponse}
            >
                <Text style={s.tapBtnTxt}>👁️ देखा! / I Saw It!</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#111827' },
    wrap: { padding: 24, alignItems: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emoji: { fontSize: 60, marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', textAlign: 'center', marginBottom: 18, lineHeight: 30 },
    subTitle: { fontSize: 18, fontWeight: '700', color: '#60A5FA', textAlign: 'center', marginBottom: 8 },
    noteTxt: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
    card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, marginBottom: 14, width: '100%' },
    cardHead: { fontSize: 15, fontWeight: '700', color: '#60A5FA', marginBottom: 14 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
    stepNum: { fontSize: 22, lineHeight: 26 },
    stepTxt: { flex: 1, fontSize: 14, color: '#CBD5E1', lineHeight: 22 },
    voiceTip: { fontSize: 15, color: '#FCD34D', lineHeight: 24, textAlign: 'center' },
    bigBtn: { backgroundColor: '#2563EB', borderRadius: 18, paddingVertical: 18, width: '100%', alignItems: 'center', marginTop: 10 },
    bigBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 12 },
    badge: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginRight: 10 },
    badgeTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
    progressBar: { height: 6, backgroundColor: '#1E293B', flex: 1, marginRight: 16, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
    timerBox: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    timerTxt: { fontSize: 13, fontWeight: '700', color: '#CBD5E1' },
    progressTxt: { textAlign: 'left', marginLeft: 24, color: '#64748B', fontSize: 12, marginBottom: 8 },
    canvasOuter: { alignSelf: 'center', pading: 4, borderRadius: 18, borderWidth: 8, borderColor: 'transparent' },
    borderCorrect: { borderColor: '#059669' },
    borderWrong: { borderColor: '#DC2626' },
    canvasWrap: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B' },
    hintRow: { marginTop: 16, alignItems: 'center' },
    hintTxt: { textAlign: 'center', color: '#94A3B8', fontSize: 14, lineHeight: 20 },
    tapBtn: { marginHorizontal: 24, marginTop: 'auto', marginBottom: 20, paddingVertical: 20, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center' },
    tapBtnDisabled: { backgroundColor: '#1E293B' },
    tapBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
