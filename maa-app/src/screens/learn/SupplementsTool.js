/**
 * SupplementsTool.js
 * Daily supplement tracker — Iron/FA, Calcium, Folic Acid.
 * Uses supplement_schedule from learn_content.json
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

const topic = content.topics.find((t) => t.id === 'supplements');
const schedule = topic?.supplement_schedule || [];

export default function SupplementsTool() {
    const [taken, setTaken] = useState({});
    const [expanded, setExpanded] = useState(null);

    const toggle = (id) => setTaken((prev) => ({ ...prev, [id]: !prev[id] }));
    const takenCount = Object.values(taken).filter(Boolean).length;

    return (
        <View style={styles.container}>
            {/* Progress header */}
            <View style={styles.progressCard}>
                <View style={styles.progressCircle}>
                    <Text style={styles.progressNumber}>{takenCount}</Text>
                    <Text style={styles.progressDenom}>/{schedule.length}</Text>
                </View>
                <View style={styles.progressText}>
                    <Text style={styles.progressTitle}>आज की दवाइयाँ / Today's Supplements</Text>
                    <Text style={styles.progressSub}>
                        {takenCount === schedule.length
                            ? '✅ सभी ली गईं! / All taken!'
                            : `${schedule.length - takenCount} बाकी / remaining`}
                    </Text>
                </View>
            </View>

            {/* Supplement cards */}
            {schedule.map((supp) => {
                const isTaken = !!taken[supp.id];
                const isExpanded = expanded === supp.id;
                return (
                    <View key={supp.id} style={[styles.suppCard, isTaken && styles.suppCardDone]}>
                        <TouchableOpacity
                            style={styles.suppHeader}
                            onPress={() => setExpanded(isExpanded ? null : supp.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.suppEmoji}>{supp.emoji}</Text>
                            <View style={styles.suppInfo}>
                                <Text style={styles.suppName}>{supp.nameHi}</Text>
                                <Text style={styles.suppNameEn}>{supp.nameEn}</Text>
                                <Text style={styles.suppDose}>{supp.dose_en}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.checkBtn, isTaken && { backgroundColor: Colors.success }]}
                                onPress={() => toggle(supp.id)}
                            >
                                <Text style={styles.checkBtnText}>{isTaken ? '✓' : '+'}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>

                        {isExpanded && (
                            <View style={styles.suppDetail}>
                                <Text style={styles.detailHeading}>कब लें / When to take</Text>
                                <Text style={styles.detailText}>{supp.timing_en}</Text>
                                <Text style={styles.detailHeading}>क्यों ज़रूरी / Why important</Text>
                                <Text style={styles.detailText}>{supp.why_en}</Text>
                                {supp.tip_en ? (
                                    <>
                                        <Text style={styles.detailHeading}>💡 टिप / Tip</Text>
                                        <Text style={styles.detailText}>{supp.tip_en}</Text>
                                    </>
                                ) : null}
                            </View>
                        )}
                    </View>
                );
            })}

            <Text style={styles.disclaimer}>
                ⚕️ दवाई की मात्रा और समय अपने डॉक्टर से confirm करें।{'\n'}
                Always confirm dosage with your doctor.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 8 },
    progressCard: {
        backgroundColor: Colors.primary,
        borderRadius: Dimensions.borderRadius,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    progressCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', marginRight: 16,
    },
    progressNumber: { fontSize: 28, fontWeight: '800', color: Colors.white },
    progressDenom: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 6 },
    progressText: { flex: 1 },
    progressTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
    progressSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

    suppCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 10,
        overflow: 'hidden',
        borderWidth: 1, borderColor: Colors.border,
    },
    suppCardDone: { borderColor: Colors.success, opacity: 0.85 },
    suppHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    suppEmoji: { fontSize: 32, marginRight: 12 },
    suppInfo: { flex: 1 },
    suppName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
    suppNameEn: { fontSize: 12, color: Colors.textSecondary },
    suppDose: { fontSize: 13, color: Colors.info, fontWeight: '600', marginTop: 2 },
    checkBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    checkBtnText: { color: Colors.white, fontSize: 20, fontWeight: '800' },

    suppDetail: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border },
    detailHeading: { fontSize: 12, fontWeight: '700', color: Colors.textLight, marginTop: 10, marginBottom: 3, textTransform: 'uppercase' },
    detailText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },

    disclaimer: {
        marginTop: 8, fontSize: 12, color: Colors.textLight,
        textAlign: 'center', lineHeight: 18,
        padding: 12, backgroundColor: `${Colors.warning}15`,
        borderRadius: 10,
    },
});
