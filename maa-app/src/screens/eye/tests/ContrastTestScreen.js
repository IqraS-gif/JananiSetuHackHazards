/**
 * ContrastTestScreen.js
 * Contrast Sensitivity Test — Sloan Letters, Pelli-Robson protocol
 * Bilingual Hindi/English, large touch buttons, fully offline.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, SafeAreaView, Dimensions,
} from 'react-native';
import Svg, { Text as SvgText, Rect, Circle } from 'react-native-svg';
import { Colors } from '../../../constants';

const { width: SW } = Dimensions.get('window');
const CANVAS_W = Math.min(SW - 40, 360);
const CANVAS_H = Math.round(CANVAS_W * 0.55);

const SLOAN = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
const LOG_STEP = 0.15;
const LETTERS_PER_LEVEL = 3;
const PHASES = ['बायीं आँख\nLeft Eye', 'दाईं आँख\nRight Eye'];

function logCStoGray(logCS) {
    const contrast = Math.max(0.005, Math.pow(10, -logCS));
    const gray = Math.round(255 * (1 - contrast));
    return `rgb(${gray},${gray},${gray})`;
}

function ContrastCanvas({ letter, logCS }) {
    const color = logCStoGray(logCS);
    const fontSize = Math.round(CANVAS_H * 0.65);
    return (
        <Svg width={CANVAS_W} height={CANVAS_H} style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}>
            <Rect width={CANVAS_W} height={CANVAS_H} fill="#FFFFFF" />
            <Circle cx={CANVAS_W / 2} cy={CANVAS_H / 2} r={3} fill="rgba(0,0,0,0.08)" />
            <SvgText
                x={CANVAS_W / 2}
                y={CANVAS_H / 2 + fontSize * 0.35}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight="bold"
                fill={color}
                fontFamily="monospace"
            >
                {letter}
            </SvgText>
        </Svg>
    );
}

function getInterpretation(logCS) {
    if (logCS >= 1.7) return 'बहुत अच्छा / Excellent';
    if (logCS >= 1.5) return 'सामान्य / Normal';
    if (logCS >= 1.25) return 'थोड़ा कम / Mildly Reduced';
    if (logCS >= 1.0) return 'काफी कम / Moderately Reduced';
    return 'बहुत कम / Severely Reduced';
}

export default function ContrastTestScreen({ navigation }) {
    const [phase, setPhase] = useState('instructions');
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [currentLogCS, setCurrentLogCS] = useState(0);
    const [lettersInLevel, setLettersInLevel] = useState(0);
    const [correctInLevel, setCorrectInLevel] = useState(0);
    const [lastPassedLogCS, setLastPassedLogCS] = useState(-0.15);
    const [currentLetter, setCurrentLetter] = useState('');
    const [allPhaseResults, setAllPhaseResults] = useState({});
    const [answering, setAnswering] = useState(false);
    const [timeLeft, setTimeLeft] = useState(40);
    const timerRef = useRef(null);

    const pickLetter = useCallback(() => {
        return SLOAN[Math.floor(Math.random() * SLOAN.length)];
    }, []);

    const startPhase = useCallback(() => {
        setCurrentLogCS(0);
        setLettersInLevel(0);
        setCorrectInLevel(0);
        setLastPassedLogCS(-0.15);
        setAnswering(false);
        setTimeLeft(40);
        setCurrentLetter(pickLetter());
        setPhase('test');
    }, [pickLetter]);

    const handleAnswer = useCallback((selected) => {
        if (answering) return;
        setAnswering(true);

        const correct = selected === currentLetter;
        const newCorrect = correct ? correctInLevel + 1 : correctInLevel;
        const newInLevel = lettersInLevel + 1;

        if (newInLevel >= LETTERS_PER_LEVEL) {
            // Evaluate this triplet
            if (newCorrect >= 2) {
                const newPassedLogCS = currentLogCS;
                const newLogCS = parseFloat((currentLogCS + LOG_STEP).toFixed(2));
                setLastPassedLogCS(newPassedLogCS);
                setCurrentLogCS(newLogCS);
                setLettersInLevel(0);
                setCorrectInLevel(0);
                setCurrentLetter(pickLetter());
                setAnswering(false);
            } else {
                // Phase complete — failed triplet
                const finalLogCS = Math.max(0, lastPassedLogCS);
                const phaseName = PHASES[phaseIndex];
                const updated = { ...allPhaseResults, [phaseName]: { logCS: finalLogCS, interpretation: getInterpretation(finalLogCS) } };
                setAllPhaseResults(updated);

                if (phaseIndex < PHASES.length - 1) {
                    setPhaseIndex(pi => pi + 1);
                    setPhase('intermission');
                } else {
                    // All done — navigate back
                    const finalResult = updated[PHASES[1]] || updated[PHASES[0]] || { logCS: finalLogCS };
                    navigation.navigate('EyeHealth', {
                        contrastResult: {
                            logCS: finalResult.logCS,
                            eyeData: updated,
                        }
                    });
                    setPhase('done');
                }
            }
        } else {
            setLettersInLevel(newInLevel);
            setCorrectInLevel(newCorrect);
            setCurrentLetter(pickLetter());
            setTimeout(() => setAnswering(false), 300);
        }
    }, [answering, currentLetter, correctInLevel, lettersInLevel, currentLogCS, lastPassedLogCS, phaseIndex, pickLetter, allPhaseResults, navigation]);

    // Timer Effect: Pure decrement
    React.useEffect(() => {
        if (phase === 'test' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [phase]);

    // Finish Condition: Check when time runs out
    React.useEffect(() => {
        if (phase === 'test' && timeLeft === 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Complete phase when time's up
            const finalLogCS = Math.max(0, lastPassedLogCS);
            const phaseName = PHASES[phaseIndex];
            const updated = { ...allPhaseResults, [phaseName]: { logCS: finalLogCS, interpretation: getInterpretation(finalLogCS) } };
            setAllPhaseResults(updated);

            if (phaseIndex < PHASES.length - 1) {
                setPhaseIndex(pi => pi + 1);
                setPhase('intermission');
            } else {
                const finalResult = updated[PHASES[1]] || updated[PHASES[0]] || { logCS: finalLogCS };
                navigation.navigate('EyeHealth', {
                    contrastResult: { logCS: finalResult.logCS, eyeData: updated }
                });
                setPhase('done');
            }
        }
    }, [timeLeft, phase]);

    if (phase === 'instructions') {
        return (
            <SafeAreaView style={styles.safe}>
                <ScrollView contentContainerStyle={styles.wrap}>
                    <Text style={styles.bigEmoji}>📊</Text>
                    <Text style={styles.title}>कॉन्ट्रास्ट टेस्ट{'\n'}Contrast Test</Text>
                    <View style={styles.card}>
                        <Text style={styles.instrHead}>क्या करना है:</Text>
                        <Text style={styles.instrText}>
                            {'• स्क्रीन पर एक अक्षर दिखेगा — धीरे-धीरे फीका होता जाएगा\n(A letter appears — it gets fainter each round)\n\n'}
                            {'• नीचे बटन में उसी अक्षर को दबाएं\n(Tap the matching letter below)\n\n'}
                            {'• अंदाज़ा लगाएं — यह ठीक है!\n(Guessing is okay!)'}
                        </Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: '#FFF3CD' }]}>
                        <Text style={styles.warnText}>⚠️ एक आँख ढकें{'\n'}Cover one eye as instructed</Text>
                    </View>
                    <TouchableOpacity style={styles.bigBtn} onPress={startPhase}>
                        <Text style={styles.bigBtnText}>शुरू करें / Start</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (phase === 'intermission') {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Text style={styles.bigEmoji}>✅</Text>
                    <Text style={styles.title}>चरण पूरा!{'\n'}Phase Done!</Text>
                    <Text style={styles.subtitle}>अब: {PHASES[phaseIndex].split('\n')[0]}</Text>
                    <Text style={styles.instrText}>दूसरी आँख ढकें।{'\n'}Switch eye cover.</Text>
                    <TouchableOpacity style={[styles.bigBtn, { marginTop: 40 }]} onPress={startPhase}>
                        <Text style={styles.bigBtnText}>आगे / Continue</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'done') {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Text style={styles.bigEmoji}>🎉</Text>
                    <Text style={styles.title}>टेस्ट पूरा!{'\n'}Test Complete!</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Test
    return (
        <SafeAreaView style={styles.safe}>
            {/* Progress Bar */}
            <View style={styles.topRow}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(timeLeft / 40) * 100}%` }]} />
                </View>
                <View style={styles.timerBox}>
                    <Text style={[styles.timerTxt, timeLeft < 10 && { color: '#EF4444' }]}>
                        ⏱️ {timeLeft}s
                    </Text>
                </View>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{PHASES[phaseIndex].split('\n')[0]}</Text>
                </View>
                <Text style={styles.headerInfo}>LogCS: <Text style={styles.bold}>{currentLogCS.toFixed(2)}</Text></Text>
            </View>

            {/* Letter Canvas */}
            <View style={styles.canvasWrap}>
                <ContrastCanvas letter={currentLetter} logCS={currentLogCS} />
            </View>

            <Text style={styles.hint}>नीचे वाले अक्षर में टैप करें / Tap the letter you see</Text>

            {/* Letter buttons — large 2-row grid */}
            <View style={styles.letterGrid}>
                {SLOAN.map(l => (
                    <TouchableOpacity
                        key={l}
                        style={[styles.letterBtn, answering && styles.disabledBtn]}
                        onPress={() => handleAnswer(l)}
                        disabled={answering}
                    >
                        <Text style={styles.letterBtnText}>{l}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    wrap: { padding: 24, alignItems: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    bigEmoji: { fontSize: 64, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 20, lineHeight: 30 },
    subtitle: { fontSize: 18, fontWeight: '600', color: '#3B82F6', textAlign: 'center', marginBottom: 12 },
    card: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 18, marginBottom: 16, width: '100%' },
    instrHead: { fontSize: 15, fontWeight: '700', color: '#1D4ED8', marginBottom: 8 },
    instrText: { fontSize: 15, color: '#374151', lineHeight: 24, textAlign: 'center' },
    warnText: { fontSize: 14, color: '#856404', lineHeight: 22 },
    bigBtn: { backgroundColor: '#2563EB', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 40, width: '100%', alignItems: 'center', marginTop: 12 },
    bigBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    badge: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    headerInfo: { color: '#64748B', fontSize: 14 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 12 },
    progressBar: { height: 6, backgroundColor: '#E2E8F0', flex: 1, marginRight: 12, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
    timerBox: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    timerTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    bold: { fontWeight: '700', color: '#1E293B' },
    canvasWrap: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: '#E2E8F0', elevation: 2 },
    hint: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 12, marginBottom: 8, paddingHorizontal: 20 },
    letterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
    letterBtn: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    letterBtnText: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
    disabledBtn: { opacity: 0.45 },
});
