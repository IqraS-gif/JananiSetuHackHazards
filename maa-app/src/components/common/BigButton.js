/**
 * BigButton.js
 * Maa App – Large, colorful action button with emoji and bilingual label.
 * Minimum 60x60 touch target, designed for low-literacy users.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

/**
 * @param {Object} props
 * @param {string} props.emoji - Emoji icon
 * @param {string} props.labelHi - Hindi label
 * @param {string} props.labelEn - English label
 * @param {string} props.color - Background color
 * @param {Function} props.onPress - Tap handler
 * @param {boolean} props.fullWidth - If true, spans full width
 * @param {boolean} props.disabled - Disable state
 */
export default function BigButton({ emoji, labelHi, labelEn, color = Colors.primary, onPress, fullWidth = false, disabled = false }) {
    const { isHindi, isBilingual } = useLanguage();
    const primaryLabel = (isHindi || isBilingual) ? labelHi : labelEn;
    const secondaryLabel = isBilingual ? labelEn : null;
    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: color },
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled}
            accessible
            accessibilityLabel={`${labelEn}`}
            accessibilityRole="button"
        >
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={styles.labels}>
                <Text style={styles.labelHi}>{primaryLabel}</Text>
                {secondaryLabel && <Text style={styles.labelEn}>{secondaryLabel}</Text>}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: Dimensions.touchTarget,
        borderRadius: Dimensions.borderRadius,
        paddingHorizontal: 18,
        paddingVertical: 14,
        width: '48%',
        marginBottom: 10,
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    emoji: {
        fontSize: 28,
        marginRight: 10,
    },
    labels: {
        alignItems: 'flex-start',
    },
    labelHi: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textOnPrimary,
    },
    labelEn: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
});
