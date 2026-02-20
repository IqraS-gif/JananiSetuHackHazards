/**
 * EmptyState.js
 * Maa App – Reusable empty / zero-data state component
 *
 * Usage:
 *   <EmptyState emoji="🍽️" titleHi="कोई खाना नहीं" titleEn="No foods found" />
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';

export default function EmptyState({
    emoji = '🔍',
    titleHi,
    titleEn,
    subtitleEn,
    actionLabel,
    onAction,
}) {
    return (
        <View style={styles.container} accessible accessibilityLabel={`${titleEn || titleHi}. ${subtitleEn || ''}`}>
            <Text style={styles.emoji}>{emoji}</Text>
            {titleHi ? <Text style={styles.titleHi}>{titleHi}</Text> : null}
            {titleEn ? <Text style={styles.titleEn}>{titleEn}</Text> : null}
            {subtitleEn ? <Text style={styles.subtitle}>{subtitleEn}</Text> : null}
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onAction}
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emoji: {
        fontSize: 56,
        marginBottom: Spacing.md,
    },
    titleHi: {
        ...Typography.h3,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    titleEn: {
        ...Typography.label,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        ...Typography.caption,
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: Spacing.lg,
    },
    actionBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
    },
    actionText: {
        ...Typography.bodyBold,
        color: Colors.white,
    },
});
