/**
 * WeightGainTool.js
 * Visual breakdown of pregnancy weight gain — baby, placenta, fluids, etc.
 * Uses weight_breakdown and trimester_targets from learn_content.json
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

const topic = content.topics.find((t) => t.id === 'weight_gain');
const breakdown = topic?.weight_breakdown || [];
const trimesterTargets = topic?.trimester_targets || [];

const BMI_CATEGORIES = ['underweight', 'normal', 'overweight', 'obese'];

export default function WeightGainTool() {
    const [selectedBMI, setSelectedBMI] = useState('normal');
    const target = trimesterTargets.find((t) => t.bmi_category === selectedBMI) || trimesterTargets[0];

    return (
        <View style={styles.container}>
            {/* BMI Category Selector */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 आपकी BMI श्रेणी / Your BMI Category</Text>
                <View style={styles.chipRow}>
                    {BMI_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.chip, selectedBMI === cat && styles.chipActive]}
                            onPress={() => setSelectedBMI(cat)}
                        >
                            <Text style={[styles.chipText, selectedBMI === cat && styles.chipTextActive]}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {target && (
                    <View style={styles.targetBox}>
                        <Text style={styles.targetLabel}>कुल अनुशंसित वज़न / Total Recommended Gain</Text>
                        <Text style={styles.targetValue}>{target.total_gain_en}</Text>
                        <View style={styles.trimesterRow}>
                            <View style={styles.trimesterItem}>
                                <Text style={styles.trimesterLabel}>T1</Text>
                                <Text style={styles.trimesterValue}>{target.t1_en}</Text>
                            </View>
                            <View style={styles.trimesterItem}>
                                <Text style={styles.trimesterLabel}>T2</Text>
                                <Text style={styles.trimesterValue}>{target.t2_en}</Text>
                            </View>
                            <View style={styles.trimesterItem}>
                                <Text style={styles.trimesterLabel}>T3</Text>
                                <Text style={styles.trimesterValue}>{target.t3_en}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Breakdown bars */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>⚖️ वज़न कहाँ जाता है? / Where Does the Weight Go?</Text>
                {breakdown.map((item, i) => (
                    <View key={i} style={styles.breakdownItem}>
                        <View style={styles.breakdownHeader}>
                            <Text style={styles.breakdownEmoji}>{item.emoji}</Text>
                            <Text style={styles.breakdownPart}>{item.partHi}</Text>
                            <Text style={styles.breakdownKg}>{item.kgMin}–{item.kgMax} kg</Text>
                        </View>
                        <View style={styles.barBg}>
                            <View
                                style={[
                                    styles.barFill,
                                    { width: `${item.percentage}%`, backgroundColor: item.color || Colors.primary },
                                ]}
                            />
                        </View>
                        <Text style={styles.barPercent}>{item.percentage}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 8 },
    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        padding: 16,
        marginBottom: 14,
        elevation: 1,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
    chipTextActive: { color: Colors.white },

    targetBox: {
        backgroundColor: `${Colors.primary}12`,
        borderRadius: 12, padding: 14,
        borderLeftWidth: 4, borderLeftColor: Colors.primary,
    },
    targetLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
    targetValue: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginVertical: 4 },
    trimesterRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
    trimesterItem: { alignItems: 'center', flex: 1, backgroundColor: Colors.white, padding: 8, borderRadius: 10 },
    trimesterLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '700' },
    trimesterValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

    breakdownItem: { marginBottom: 14 },
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    breakdownEmoji: { fontSize: 18, marginRight: 8 },
    breakdownPart: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
    breakdownKg: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
    barBg: { height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: 10, borderRadius: 5 },
    barPercent: { fontSize: 11, color: Colors.textLight, marginTop: 2, textAlign: 'right' },
});
