/**
 * AmslerTestScreen.js
 * Amsler Grid Test — Interactive 20×20 touch grid
 * Tap/drag to mark wavy or missing areas.
 * Bilingual Hindi/English, dark grid, large touch targets.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Dimensions,
} from 'react-native';
import Svg, {
    Rect, Line, Circle, G,
} from 'react-native-svg';

const { width: SW } = Dimensions.get('window');
const GRID_PX = Math.min(SW - 32, 360);
const GRID_N = 20;
const CELL = GRID_PX / GRID_N;
const FIX_RADIUS = CELL * 1.5; // safety radius around center

const PHASES = ['बायीं आँख\nLeft Eye', 'दाईं आँख\nRight Eye'];

function cellKey(col, row) { return `${col},${row}`; }

function getQuadrant(col, row) {
    const h = col < GRID_N / 2 ? 'बाईं' : 'दाईं';
    const v = row < GRID_N / 2 ? 'ऊपरी' : 'निचली';
    return `${v} ${h}`;
}

function AmslerGrid({ markedCells }) {
    const cx = GRID_PX / 2;
    const cy = GRID_PX / 2;

    // Grid lines
    const lines = [];
    for (let i = 0; i <= GRID_N; i++) {
        const pos = i * CELL;
        lines.push(<Line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={GRID_PX} stroke="#374151" strokeWidth={0.8} />);
        lines.push(<Line key={`h${i}`} x1={0} y1={pos} x2={GRID_PX} y2={pos} stroke="#374151" strokeWidth={0.8} />);
    }

    // Marked cells
    const marks = Array.from(markedCells).map(key => {
        const [c, r] = key.split(',').map(Number);
        return (
            <Rect
                key={key}
                x={c * CELL + 1}
                y={r * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                fill="rgba(239,68,68,0.65)"
            />
        );
    });

    return (
        <Svg width={GRID_PX} height={GRID_PX} style={{ borderRadius: 10 }} pointerEvents="none">
            <Rect width={GRID_PX} height={GRID_PX} fill="#111827" rx={10} />
            {lines}
            {marks}
            <Circle cx={cx} cy={cy} r={18} fill="rgba(34,197,94,0.15)" />
            <Circle cx={cx} cy={cy} r={8} fill="rgba(34,197,94,0.5)" />
            <Circle cx={cx} cy={cy} r={5} fill="#22C55E" />
            <Circle cx={cx} cy={cy} r={2} fill="#fff" />
        </Svg>
    );
}

export default function AmslerTestScreen({ navigation }) {
    const [phase, setPhase] = useState('instructions');
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [markedCells, setMarkedCells] = useState(new Set());
    const [allPhaseResults, setAllPhaseResults] = useState({});
    const [observationTime, setObservationTime] = useState(10);
    const [answers, setAnswers] = useState({ wavy: null, missing: null, blurry: null });

    const timerRef = useRef(null);
    const gridRef = useRef(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const gridLayout = useRef({ x: 0, y: 0 });

    const measureGrid = useCallback(() => {
        gridRef.current?.measureInWindow((x, y, width, height) => {
            gridLayout.current = { x, y };
            console.log(`[Amsler] Grid Measured: x=${x}, y=${y}`);
        });
    }, []);

    const markAt = useCallback((pageX, pageY) => {
        if (phase !== 'questionnaire') return;

        // Use the measured offsets
        const lx = pageX - gridLayout.current.x;
        const ly = pageY - gridLayout.current.y;

        const col = Math.floor(lx / CELL);
        const row = Math.floor(ly / CELL);

        if (col < 0 || col >= GRID_N || row < 0 || row >= GRID_N) return;

        // Safety check: center dot
        const dx = lx - GRID_PX / 2;
        const dy = ly - GRID_PX / 2;
        if (Math.sqrt(dx * dx + dy * dy) < FIX_RADIUS) return;

        const key = cellKey(col, row);
        setMarkedCells(prev => {
            const next = new Set(prev);
            if (!next.has(key)) {
                next.add(key);
                return next;
            }
            return prev; // No-op if already marked during this drag
        });
    }, [phase]);

    const handleTouch = (e, isMove = false) => {
        const { pageX, pageY } = e.nativeEvent;
        markAt(pageX, pageY);
    };

    const startObservation = useCallback(() => {
        setObservationTime(10);
        setMarkedCells(new Set());
        setAnswers({ wavy: null, missing: null, blurry: null });
        setPhase('observation');
    }, []);

    // 10s Timer Effect
    useEffect(() => {
        if (phase === 'observation' && observationTime > 0) {
            timerRef.current = setInterval(() => {
                setObservationTime(prev => prev - 1);
            }, 1000);
        } else if (phase === 'observation' && observationTime === 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('questionnaire');
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, observationTime]);

    const submitPhase = useCallback(() => {
        const hasAns = answers.wavy || answers.missing || answers.blurry;
        const hasMark = markedCells.size > 0;
        const score = {
            hasDistortion: hasAns || hasMark,
            answers,
            markedCount: markedCells.size,
            severity: (hasAns || hasMark) ? 'जोखिम / At Risk' : 'सामान्य / Normal',
            riskScore: (hasAns || hasMark) ? 75 : 0,
        };
        const phaseName = PHASES[phaseIndex];
        const updated = { ...allPhaseResults, [phaseName]: score };
        setAllPhaseResults(updated);

        if (phaseIndex < PHASES.length - 1) {
            setPhaseIndex(pi => pi + 1);
            setPhase('intermission');
        } else {
            const final = Object.values(updated).some(r => r.hasDistortion);
            navigation.navigate('EyeHealth', {
                amslerResult: {
                    hasDistortion: final,
                    eyeData: updated,
                }
            });
            setPhase('done');
        }
    }, [answers, markedCells, phaseIndex, navigation, allPhaseResults]);

    if (phase === 'instructions') {
        return (
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={s.wrap}>
                    <Text style={s.emoji}>📐</Text>
                    <Text style={s.title}>आम्सलर ग्रिड टेस्ट{'\n'}Amsler Grid Test</Text>
                    <View style={s.card}>
                        <Text style={s.instrTxt}>
                            {'• एक आँख ढकें\n(Cover one eye)\n\n'}
                            {'• बीच की बिंदी पर नज़र टिकाए रखें\n(Focus on the center dot)\n\n'}
                            {'• ग्रिड को 10 सेकंड तक ध्यान से देखें\n(Observe the grid for 10 seconds)'}
                        </Text>
                    </View>
                    <TouchableOpacity style={s.bigBtn} onPress={startObservation}>
                        <Text style={s.bigBtnTxt}>तैयार हूँ / I'm Ready</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (phase === 'observation') {
        return (
            <SafeAreaView style={[s.safe, { backgroundColor: '#000' }]}>
                <View style={s.center}>
                    <Text style={s.timerTxt}>⏱️ {observationTime}s</Text>
                    <View style={s.gridWrap}>
                        <AmslerGrid markedCells={new Set()} />
                    </View>
                    <Text style={s.obsNote}>बिंदी पर देखें / Look at the dot</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'questionnaire') {
        return (
            <SafeAreaView style={s.safe}>
                <ScrollView
                    contentContainerStyle={s.scrollPad}
                    scrollEnabled={scrollEnabled}
                >
                    <View style={s.badge}>
                        <Text style={s.badgeTxt}>{PHASES[phaseIndex].split('\n')[0]}</Text>
                    </View>

                    <Text style={s.qTitle}>क्या आपको इनमें से कुछ लगा?{'\n'}Did you notice any of these?</Text>

                    {[
                        { id: 'wavy', text: 'लकीरें टेढ़ी दिखीं? (Wavy lines?)' },
                        { id: 'missing', text: 'कोई हिस्सा गायब या काला दिखा? (Missing areas?)' },
                        { id: 'blurry', text: 'कोई धुंधला हिस्सा दिखा? (Blurry regions?)' }
                    ].map(q => (
                        <View key={q.id} style={s.qRow}>
                            <Text style={s.qText}>{q.text}</Text>
                            <View style={s.qBtns}>
                                <TouchableOpacity
                                    style={[s.qBtn, answers[q.id] === true && s.qBtnActive]}
                                    onPress={() => setAnswers(prev => ({ ...prev, [q.id]: true }))}
                                >
                                    <Text style={[s.qBtnTxt, answers[q.id] === true && s.qBtnTxtActive]}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.qBtn, answers[q.id] === false && s.qBtnActiveNo]}
                                    onPress={() => setAnswers(prev => ({ ...prev, [q.id]: false }))}
                                >
                                    <Text style={[s.qBtnTxt, answers[q.id] === false && s.qBtnTxtActive]}>No</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <Text style={s.markHint}>नीचे ग्रिड पर टेढ़ी जगह को मार्क करें (वैकल्पिक):{'\n'}Tap distortion on the grid (Optional):</Text>
                    <View
                        ref={gridRef}
                        onLayout={measureGrid}
                        style={s.gridWrap}
                        onTouchStart={(e) => {
                            setScrollEnabled(false);
                            handleTouch(e);
                        }}
                        onTouchMove={(e) => handleTouch(e, true)}
                        onTouchEnd={() => setScrollEnabled(true)}
                        onTouchCancel={() => setScrollEnabled(true)}
                    >
                        <AmslerGrid markedCells={markedCells} />
                    </View>

                    <TouchableOpacity
                        style={[s.bigBtn, { marginTop: 24 }]}
                        onPress={submitPhase}
                        disabled={answers.wavy === null || answers.missing === null || answers.blurry === null}
                    >
                        <Text style={s.bigBtnTxt}>जमा करें / Submit ✓</Text>
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
                    <Text style={s.subTitle}>अब: {PHASES[phaseIndex].split('\n')[0]}</Text>
                    <Text style={s.noteTxt}>दूसरी आँख ढकें।{'\n'}Switch eye cover.</Text>
                    <TouchableOpacity style={[s.bigBtn, { marginTop: 32 }]} onPress={startObservation}>
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
                    <Text style={s.title}>जांच सफल!{'\n'}Test Complete!</Text>
                </View>
            </SafeAreaView>
        );
    }

    return null;
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0F172A' },
    wrap: { padding: 24, alignItems: 'center' },
    scrollPad: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emoji: { fontSize: 60, marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', textAlign: 'center', marginBottom: 18, lineHeight: 30 },
    subTitle: { fontSize: 18, fontWeight: '700', color: '#60A5FA', textAlign: 'center', marginBottom: 8 },
    noteTxt: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
    card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, marginBottom: 14, width: '100%' },
    instrTxt: { fontSize: 16, color: '#CBD5E1', lineHeight: 28, textAlign: 'center' },
    bigBtn: { backgroundColor: '#2563EB', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 36, width: '100%', alignItems: 'center' },
    bigBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
    timerTxt: { color: '#FCD34D', fontSize: 28, fontWeight: '900', marginBottom: 20 },
    gridWrap: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
    obsNote: { color: '#94A3B8', marginTop: 20, fontSize: 16, fontWeight: '600' },
    badge: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16 },
    badgeTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
    qTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9', marginBottom: 20 },
    qRow: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 12 },
    qText: { fontSize: 15, color: '#CBD5E1', marginBottom: 12, fontWeight: '600' },
    qBtns: { flexDirection: 'row', gap: 10 },
    qBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    qBtnActive: { backgroundColor: '#064E3B', borderColor: '#059669' },
    qBtnActiveNo: { backgroundColor: '#451A03', borderColor: '#D97706' },
    qBtnTxt: { color: '#94A3B8', fontWeight: '700' },
    qBtnTxtActive: { color: '#fff' },
    markHint: { color: '#94A3B8', fontSize: 13, marginTop: 20, marginBottom: 10, lineHeight: 18 },
});
