/**
 * StatusCard.js
 * Maa App – Reusable Status Card (Nutrition, Water, Supplements)
 * Shows icon, label (bilingual), value, and colored progress bar.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

/**
 * @param {Object} props
 * @param {string} props.emoji - Emoji icon
 * @param {string} props.labelHi - Hindi label
 * @param {string} props.labelEn - English label
 * @param {string} props.value - Display value
 * @param {number} props.percentage - 0-100 progress
 * @param {'good'|'medium'|'low'} props.status - Status for color
 * @param {Function} props.onPress - Tap handler
 */
export default function StatusCard({ emoji, labelHi, labelEn, value, percentage = 0, status = 'good', onPress }) {
    const { isHindi, isBilingual } = useLanguage();
    const statusColor = status === 'good' ? Colors.success : status === 'medium' ? Colors.warning : Colors.danger;
    const primaryLabel = (isHindi || isBilingual) ? labelHi : labelEn;
    const secondaryLabel = isBilingual ? labelEn : null;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.85}
            accessible
            accessibilityLabel={`${labelEn}: ${value}`}
        >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.labelHi}>{primaryLabel}</Text>
            {secondaryLabel && <Text style={styles.labelEn}>{secondaryLabel}</Text>}
            <Text style={[styles.value, { color: statusColor }]}>{value}</Text>
            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColor }]} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        padding: 14,
        marginHorizontal: 4,
        alignItems: 'center',
        elevation: 3,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        minHeight: 130,
    },
    emoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    labelHi: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    labelEn: {
        fontSize: 11,
        color: Colors.textLight,
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: '800',
        marginVertical: 2,
    },
    progressBg: {
        width: '100%',
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginTop: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
