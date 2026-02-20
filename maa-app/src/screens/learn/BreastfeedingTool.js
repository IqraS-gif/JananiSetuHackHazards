/**
 * BreastfeedingTool.js
 * Latch guide, feeding positions, and common problem checker.
 * Uses positions, latch_guide, common_problems from learn_content.json
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

const topic = content?.topics?.find((t) => t.id === 'breastfeeding');
const positions = Array.isArray(topic?.positions) ? topic.positions : [];
const latchGuideData = topic?.latch_guide || null;
const commonProblems = Array.isArray(topic?.common_problems) ? topic.common_problems : [];

const TABS = [
    { id: 'positions', label: '🤱 Positions' },
    { id: 'latch', label: '📋 Latch Guide' },
    { id: 'problems', label: '💊 Problems' },
];

export default function BreastfeedingTool() {
    const [tab, setTab] = useState('positions');
    const [expanded, setExpanded] = useState(null);

    return (
        <View style={styles.container}>
            {/* Tab Row */}
            <View style={styles.tabRow}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
                        onPress={() => { setTab(t.id); setExpanded(null); }}
                    >
                        <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Positions */}
            {tab === 'positions' && positions.map((pos) => {
                const isOpen = expanded === pos.id;
                return (
                    <TouchableOpacity
                        key={pos.id}
                        style={styles.card}
                        onPress={() => setExpanded(isOpen ? null : pos.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>{pos.emoji}</Text>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{pos.nameHi}</Text>
                                <Text style={styles.cardSub}>{pos.difficultyHi}</Text>
                            </View>
                            <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                        </View>
                        {isOpen && (
                            <View style={styles.cardDetail}>
                                <Text style={styles.detailText}>{pos.descriptionHi}</Text>
                                {pos.steps_hi && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={styles.detailLabel}>तरीका / Steps</Text>
                                        {pos.steps_hi.map((step, idx) => (
                                            <Text key={idx} style={styles.detailText}>• {step}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Latch Guide */}
            {tab === 'latch' && latchGuideData && (
                <View>
                    <Text style={styles.sectionTitle}>{latchGuideData.titleHi}</Text>
                    <Text style={styles.sectionHint}>{latchGuideData.introHi}</Text>

                    {Array.isArray(latchGuideData.steps_hi) && latchGuideData.steps_hi.map((step, i) => (
                        <View key={i} style={styles.stepCard}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{i + 1}</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepDesc}>{step}</Text>
                            </View>
                        </View>
                    ))}

                    <Text style={[styles.detailLabel, { marginTop: 16 }]}>अच्छे लैच के संकेत</Text>
                    {latchGuideData.good_latch_signs_hi?.map((sign, i) => (
                        <Text key={i} style={styles.bulletText}>✅ {sign}</Text>
                    ))}
                </View>
            )}

            {/* Common Problems */}
            {tab === 'problems' && commonProblems.map((prob) => {
                const isOpen = expanded === prob.id;
                return (
                    <TouchableOpacity
                        key={prob.id}
                        style={styles.problemCard}
                        onPress={() => setExpanded(isOpen ? null : prob.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>{prob.emoji || '❓'}</Text>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{prob.problemHi}</Text>
                            </View>
                            <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                        </View>
                        {isOpen && (
                            <View style={styles.cardDetail}>
                                <Text style={styles.detailLabel}>समाधान / Solution</Text>
                                <Text style={styles.detailText}>{prob.solutionHi}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 8 },
    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    tabBtn: {
        flex: 1, paddingVertical: 10, paddingHorizontal: 4,
        borderRadius: 12, alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBackground,
    },
    tabBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}12` },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
    tabBtnTextActive: { color: Colors.primary },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    sectionHint: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },

    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 10,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    cardEmoji: { fontSize: 28, marginRight: 12 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    cardSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
    chevron: { fontSize: 12, color: Colors.textLight },
    cardDetail: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border },
    detailLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
    detailText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
    tipText: { fontSize: 13, color: Colors.info, marginTop: 8, fontStyle: 'italic' },
    bulletText: { fontSize: 14, color: Colors.textPrimary, marginBottom: 8, paddingLeft: 8 },

    stepCard: {
        flexDirection: 'row', backgroundColor: Colors.cardBackground,
        borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: Colors.border,
    },
    stepNumber: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    stepNumberText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
    stepContent: { flex: 1, justifyContent: 'center' },
    stepDesc: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

    problemCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 10,
        borderWidth: 1, borderColor: `${Colors.warning}50`, overflow: 'hidden',
    },
});
