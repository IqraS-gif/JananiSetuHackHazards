/**
 * ExerciseTool.js
 * Safe exercise guide + warning signs checker for pregnancy.
 * Uses routine and warning_signs_during_exercise from learn_content.json
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

const topic = content.topics.find((t) => t.id === 'exercise');
const exercises = topic?.routine || [];
const warningSigns = topic?.warning_signs_during_exercise || [];

const TABS = ['exercises', 'warnings'];

export default function ExerciseTool() {
    const [tab, setTab] = useState('exercises');
    const [expanded, setExpanded] = useState(null);

    return (
        <View style={styles.container}>
            {/* Tab switcher */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'exercises' && styles.tabBtnActive]}
                    onPress={() => setTab('exercises')}
                >
                    <Text style={[styles.tabBtnText, tab === 'exercises' && styles.tabBtnTextActive]}>
                        🏃‍♀️ व्यायाम
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, tab === 'warnings' && styles.tabBtnActive]}
                    onPress={() => setTab('warnings')}
                >
                    <Text style={[styles.tabBtnText, tab === 'warnings' && styles.tabBtnTextActive]}>
                        ⚠️ चेतावनी
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === 'exercises' && (
                <View>
                    <Text style={styles.hint}>💡 सुरक्षित व्यायाम जो गर्भावस्था में किए जा सकते हैं।</Text>
                    {exercises.map((ex) => {
                        const isOpen = expanded === ex.id;
                        return (
                            <TouchableOpacity
                                key={ex.id}
                                style={styles.exCard}
                                onPress={() => setExpanded(isOpen ? null : ex.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.exHeader}>
                                    <Text style={styles.exEmoji}>{ex.emoji}</Text>
                                    <View style={styles.exInfo}>
                                        <Text style={styles.exName}>{ex.nameHi}</Text>
                                        <Text style={styles.exDuration}>{ex.duration_hi}</Text>
                                    </View>
                                    <Text style={styles.exChevron}>{isOpen ? '▲' : '▼'}</Text>
                                </View>
                                {isOpen && (
                                    <View style={styles.exDetail}>
                                        <Text style={styles.detailLabel}>फायदे / Benefits</Text>
                                        {(ex.benefitsHi || []).map((b, i) => (
                                            <Text key={i} style={styles.detailBullet}>• {b}</Text>
                                        ))}
                                        {ex.cautionsHi ? (
                                            <>
                                                <Text style={[styles.detailLabel, { color: Colors.warning }]}>
                                                    सावधानियाँ / Cautions
                                                </Text>
                                                <Text style={styles.detailBullet}>⚠️ {ex.cautionsHi}</Text>
                                            </>
                                        ) : null}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {tab === 'warnings' && (
                <View>
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningBannerText}>
                            🛑 अगर व्यायाम के दौरान इनमें से कोई लक्षण हो, तो तुरंत रुकें और डॉक्टर को बताएं।
                        </Text>
                    </View>
                    {warningSigns.map((w, i) => (
                        <View key={i} style={styles.warningItem}>
                            <Text style={styles.warningDot}>•</Text>
                            <Text style={styles.warningText}>{w.signHi}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 8 },
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    tabBtn: {
        flex: 1, padding: 12, borderRadius: 12,
        alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
        backgroundColor: Colors.cardBackground,
    },
    tabBtnActive: { borderColor: Colors.success, backgroundColor: `${Colors.success}15` },
    tabBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
    tabBtnTextActive: { color: Colors.success },
    hint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, fontStyle: 'italic' },

    exCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 10,
        borderWidth: 1, borderColor: Colors.border,
        overflow: 'hidden',
    },
    exHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    exEmoji: { fontSize: 28, marginRight: 12 },
    exInfo: { flex: 1 },
    exName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
    exDuration: { fontSize: 13, color: Colors.success, fontWeight: '600', marginTop: 2 },
    exChevron: { fontSize: 12, color: Colors.textLight },
    exDetail: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border },
    detailLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
    detailBullet: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, marginBottom: 2 },

    warningBanner: {
        backgroundColor: `${Colors.danger}12`,
        borderRadius: 12, padding: 14, marginBottom: 12,
        borderLeftWidth: 4, borderLeftColor: Colors.danger,
    },
    warningBannerText: { fontSize: 14, color: Colors.danger, fontWeight: '600', lineHeight: 20 },
    warningItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.cardBackground, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
    warningDot: { fontSize: 18, color: Colors.danger, marginRight: 10, marginTop: -2 },
    warningText: { flex: 1, fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
});
