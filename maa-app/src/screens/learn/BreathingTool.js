/**
 * BreathingTool.js
 * 1-minute guided breathing timer for mental health
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Colors } from '../../constants';

const PHASES = [
    { id: 'inhale', labelHi: 'साँस लें', labelEn: 'Inhale', seconds: 4, color: '#4CAF50' },
    { id: 'hold', labelHi: 'रोकें', labelEn: 'Hold', seconds: 7, color: '#FF9800' },
    { id: 'exhale', labelHi: 'साँस छोड़ें', labelEn: 'Exhale', seconds: 8, color: '#2196F3' },
];

export default function BreathingTool() {
    const [running, setRunning] = useState(false);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(PHASES[0].seconds);
    const [cycleCount, setCycleCount] = useState(0);
    const scale = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef(null);

    const pulse = (targetScale, duration) => {
        Animated.timing(scale, {
            toValue: targetScale,
            duration: duration * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        if (running) {
            const phase = PHASES[phaseIndex];
            if (phase.id === 'inhale') pulse(1.4, phase.seconds);
            else if (phase.id === 'exhale') pulse(1.0, phase.seconds);
            // hold phase: animation stays at current scale

            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        const nextPhase = (phaseIndex + 1) % PHASES.length;
                        if (nextPhase === 0) setCycleCount(c => c + 1);
                        setPhaseIndex(nextPhase);
                        setTimeLeft(PHASES[nextPhase].seconds);
                        return PHASES[nextPhase].seconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
            scale.setValue(1);
        }
        return () => clearInterval(intervalRef.current);
    }, [running, phaseIndex]);

    const stop = () => {
        setRunning(false);
        setPhaseIndex(0);
        setTimeLeft(PHASES[0].seconds);
        setCycleCount(0);
        scale.setValue(1);
    };

    const phase = PHASES[phaseIndex];

    return (
        <View style={styles.container}>
            <View style={styles.info}>
                <Text style={styles.infoTitle}>४-७-८ श्वास / 4-7-8 Breathing</Text>
                <Text style={styles.infoText}>तनाव कम करने की सबसे असरदार तकनीक।{'\n'}This powerful technique reduces stress quickly.</Text>
            </View>

            <View style={styles.circleWrapper}>
                <Animated.View style={[styles.outerCircle, { borderColor: phase.color, transform: [{ scale }] }]}>
                    <View style={[styles.innerCircle, { backgroundColor: phase.color + '30' }]}>
                        <Text style={styles.phaseEmoji}>
                            {phase.id === 'inhale' ? '🌬️' : phase.id === 'hold' ? '✋' : '💨'}
                        </Text>
                        <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.labelHi}</Text>
                        <Text style={styles.phaseLabelEn}>{phase.labelEn}</Text>
                        <Text style={[styles.timer, { color: phase.color }]}>{timeLeft}s</Text>
                    </View>
                </Animated.View>
            </View>

            {cycleCount > 0 && (
                <Text style={styles.cycleCount}>✅ {cycleCount} चक्र पूरे / cycles completed</Text>
            )}

            <View style={styles.buttons}>
                {!running ? (
                    <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={() => setRunning(true)}>
                        <Text style={styles.btnText}>▶️  शुरू करें / Start</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity style={[styles.btn, styles.pauseBtn]} onPress={() => setRunning(false)}>
                            <Text style={styles.btnTextDark}>⏸  रोकें / Pause</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.stopBtn]} onPress={stop}>
                            <Text style={styles.btnText}>⏹  बंद / Stop</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={styles.guide}>
                {PHASES.map((p, i) => (
                    <View key={p.id} style={[styles.guideStep, i === phaseIndex && running && { backgroundColor: p.color + '15' }]}>
                        <Text style={[styles.guideNum, { color: p.color }]}>{p.seconds}s</Text>
                        <Text style={styles.guideLabel}>{p.labelHi} / {p.labelEn}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 4 },
    info: { backgroundColor: '#E8F5E9', padding: 16, borderRadius: 14, marginBottom: 24 },
    infoTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    infoText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    circleWrapper: { alignItems: 'center', marginBottom: 24 },
    outerCircle: {
        width: 200, height: 200, borderRadius: 100,
        borderWidth: 4, justifyContent: 'center', alignItems: 'center',
        backgroundColor: Colors.white,
        elevation: 4,
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8,
    },
    innerCircle: { width: 170, height: 170, borderRadius: 85, justifyContent: 'center', alignItems: 'center' },
    phaseEmoji: { fontSize: 36, marginBottom: 4 },
    phaseLabel: { fontSize: 24, fontWeight: '800' },
    phaseLabelEn: { fontSize: 13, color: Colors.textSecondary },
    timer: { fontSize: 40, fontWeight: '900', marginTop: 4 },

    cycleCount: { textAlign: 'center', color: Colors.success, fontWeight: '700', marginBottom: 16 },

    buttons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
    btn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, elevation: 2 },
    startBtn: { backgroundColor: Colors.primary },
    pauseBtn: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.warning },
    stopBtn: { backgroundColor: Colors.danger },
    btnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
    btnTextDark: { color: Colors.warning, fontWeight: '800', fontSize: 16 },

    guide: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: 14, padding: 16 },
    guideStep: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
    guideNum: { fontSize: 22, fontWeight: '900' },
    guideLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});
