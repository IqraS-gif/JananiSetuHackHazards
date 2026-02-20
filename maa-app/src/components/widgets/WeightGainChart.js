import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Colors } from '../../constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * WeightGainChart -> Milestone Path Redesign
 * Visualizes weight logs as a sequence of "Milestone Cards" with simple safety gauges.
 * Backend Logic: Uses trimester-specific medical guidelines (IOM).
 */
export default function WeightGainChart({ weights, startWeight, heightCm }) {
    const sWeight = parseFloat(startWeight);
    const hCm = parseFloat(heightCm);

    if (!sWeight || !hCm || isNaN(sWeight) || isNaN(hCm) || hCm <= 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>वज़न की प्रोग्रेस <Text style={styles.subEn}>(Weight Progress)</Text></Text>
                <View style={styles.missingContainer}>
                    <Text style={styles.missingText}>
                        कृपया अपनी प्रोफाइल में अपनी ऊँचाई और शुरुआत का वज़न ठीक से भरें।
                    </Text>
                </View>
            </View>
        );
    }

    if (weights.length === 0) return null;

    // BMI logic for range per week
    const heightM = hCm / 100;
    const bmi = sWeight / (heightM * heightM);

    /** 
     * Medical Guidelines (IOM) for Weight Gain:
     * - Trimester 1 (0-12 wk): 0.5 - 2kg total
     * - Trimester 2/3 (13-40 wk): Weekly gain based on BMI
     */
    const getRangeForWeek = (week) => {
        let weeklyRate = { low: 0.35, high: 0.50 }; // Normal BMI
        let t1Total = { low: 0.5, high: 2.0 };

        if (bmi < 18.5) { // Underweight
            weeklyRate = { low: 0.44, high: 0.58 };
            t1Total = { low: 1.0, high: 3.0 };
        } else if (bmi >= 25 && bmi < 30) { // Overweight
            weeklyRate = { low: 0.23, high: 0.33 };
            t1Total = { low: 0.5, high: 2.0 };
        } else if (bmi >= 30) { // Obese
            weeklyRate = { low: 0.17, high: 0.27 };
            t1Total = { low: 0.5, high: 2.0 };
        }

        if (week <= 12) {
            // Linear growth within Trimester 1 limits
            const factor = week / 12;
            return {
                low: t1Total.low * factor,
                high: t1Total.high * factor
            };
        } else {
            // Trimester 1 max + accumulated weekly gain
            const remainingWeeks = week - 12;
            return {
                low: t1Total.low + (weeklyRate.low * remainingWeeks),
                high: t1Total.high + (weeklyRate.high * remainingWeeks)
            };
        }
    };

    const sortedWeights = [...weights].sort((a, b) => b.week_of_pregnancy - a.week_of_pregnancy);
    const latest = sortedWeights[0];
    const latestRange = getRangeForWeek(latest.week_of_pregnancy);
    const latestGain = latest.weight_kg - sWeight;

    const getStatus = (gain, range) => {
        // More generous buffer for rural context (+/- 1kg)
        if (gain > range.high + 1.5) return { label: 'ज़्यादा है (High)', color: '#F44336', icon: '⚠️' };
        if (gain < range.low - 1.5) return { label: 'कम है (Low)', color: '#FF9800', icon: '⚠️' };
        return { label: 'बिलकुल सही (Perfect)', color: '#4CAF50', icon: '✅' };
    };

    const latestStatus = getStatus(latestGain, latestRange);

    // Gauge Mapping: 0kg to 25kg full scale
    const FULL_SCALE = 25;
    const getPos = (val) => `${Math.min(Math.max((val / FULL_SCALE) * 100, 0), 100)}%`;

    return (
        <View style={styles.container}>
            {/* Header / Summary */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View>
                        <Text style={styles.summaryTitle}>अभी का स्टेटस</Text>
                        <Text style={styles.subEn}>(Current Path Status)</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: latestStatus.color }]}>
                        <Text style={styles.badgeText}>{latestStatus.label}</Text>
                    </View>
                </View>

                <View style={styles.mainInfo}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>कुल वज़न बढ़ा <Text style={styles.subEn}>(Gain)</Text></Text>
                        <Text style={[styles.infoValue, { color: latestStatus.color }]}>+{latestGain.toFixed(1)} kg</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>सप्ताह <Text style={styles.subEn}>(Week)</Text></Text>
                        <Text style={styles.infoValue}>{latest.week_of_pregnancy}</Text>
                    </View>
                </View>

                {/* Accuracy Check Logic Box */}
                <View style={styles.gaugeWrapper}>
                    <View style={styles.gaugeTopLabels}>
                        <Text style={styles.gaugeHint}>0kg</Text>
                        <Text style={styles.gaugeHint}>सुरक्षित सीमा: {latestRange.low.toFixed(1)}-{latestRange.high.toFixed(1)}kg</Text>
                        <Text style={styles.gaugeHint}>{FULL_SCALE}kg</Text>
                    </View>
                    <View style={styles.gaugeTrack}>
                        {/* Dynamic Safe Zone Area */}
                        <View style={[styles.gaugeSafeZone, {
                            left: getPos(latestRange.low),
                            width: getPos(latestRange.high - latestRange.low),
                        }]} />
                        {/* User Marker */}
                        <View style={[styles.marker, {
                            left: getPos(latestGain),
                            backgroundColor: latestStatus.color
                        }]} />
                    </View>
                </View>
            </View>

            <Text style={styles.milestoneHeading}>आपका रिकॉर्ड <Text style={styles.subEn}>(Your Logs)</Text></Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.milestoneList}
            >
                {sortedWeights.map((w, i) => {
                    const range = getRangeForWeek(w.week_of_pregnancy);
                    const gain = w.weight_kg - sWeight;
                    const status = getStatus(gain, range);

                    return (
                        <View key={i} style={styles.milestoneCard}>
                            <View style={styles.msCircle}>
                                <Text style={styles.msWeekText}>{w.week_of_pregnancy}</Text>
                                <Text style={styles.msLabel}>सप्ताह</Text>
                            </View>
                            <View style={styles.msContent}>
                                <Text style={styles.msWeight}>{w.weight_kg} kg</Text>
                                <Text style={[styles.msStatus, { color: status.color }]}>{status.icon} {status.label.split(' ')[0]}</Text>

                                <View style={styles.miniGauge}>
                                    <View style={styles.miniTrack} />
                                    <View style={[styles.miniSafeZone, {
                                        left: getPos(range.low),
                                        width: getPos(range.high - range.low)
                                    }]} />
                                    <View style={[styles.miniMarker, {
                                        left: getPos(gain),
                                        backgroundColor: status.color
                                    }]} />
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                    हरे रंग के घेरे में रहना आपके बच्चे की सेहत के लिए सबसे अच्छा है।
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 15 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 4 },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    summaryTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
    subEn: { fontSize: 11, fontWeight: '400', color: '#888' },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    mainInfo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FAFAFA', borderRadius: 12, marginVertical: 5 },
    infoBlock: { flex: 1, alignItems: 'center' },
    infoLabel: { fontSize: 11, color: '#666', marginBottom: 2, fontWeight: '700' },
    infoValue: { fontSize: 26, fontWeight: '900' },
    verticalDivider: { width: 1, height: 40, backgroundColor: '#ddd' },
    gaugeWrapper: { marginTop: 20 },
    gaugeTopLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    gaugeHint: { fontSize: 10, color: '#999', fontWeight: '800' },
    gaugeTrack: { height: 12, backgroundColor: '#EEEEEE', borderRadius: 6, position: 'relative' },
    gaugeSafeZone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(76, 175, 80, 0.3)', borderRadius: 2 },
    marker: { position: 'absolute', top: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', elevation: 3 },

    milestoneHeading: { fontSize: 16, fontWeight: '900', color: '#444', marginBottom: 15, marginLeft: 5 },
    milestoneList: { paddingLeft: 5, paddingRight: 20, paddingBottom: 15 },
    milestoneCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 15,
        marginRight: 15,
        width: 140,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        alignItems: 'center'
    },
    msCircle: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFF0F3',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: Colors.primaryLight
    },
    msWeekText: { fontSize: 20, fontWeight: '900', color: Colors.primary },
    msLabel: { fontSize: 9, color: Colors.primary, fontWeight: '800', marginTop: -2 },
    msContent: { alignItems: 'center', width: '100%' },
    msWeight: { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },
    msStatus: { fontSize: 11, fontWeight: '800', marginTop: 3 },
    miniGauge: { width: '100%', height: 6, marginTop: 12, position: 'relative' },
    miniTrack: { width: '100%', height: '100%', backgroundColor: '#F0F0F0', borderRadius: 3 },
    miniSafeZone: { position: 'absolute', height: '100%', backgroundColor: 'rgba(76, 175, 80, 0.3)', borderRadius: 1 },
    miniMarker: { position: 'absolute', top: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },

    hintBox: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 },
    hintText: { fontSize: 12, color: '#666', textAlign: 'center', fontWeight: '600' },
    missingContainer: { padding: 30, alignItems: 'center' },
    missingText: { textAlign: 'center', color: '#666', fontWeight: '700', lineHeight: 20 }
});
