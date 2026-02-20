/**
 * LoadingPlaceholder.js
 * Maa App – Animated skeleton loader rows
 *
 * Usage:
 *   <LoadingPlaceholder rows={3} />
 *   <LoadingPlaceholder variant="grid" />
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants';

function SkeletonBox({ style }) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [opacity]);

    return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

export default function LoadingPlaceholder({ rows = 4, variant = 'list' }) {
    if (variant === 'grid') {
        // 2-row x 3-col food card skeleton
        return (
            <View style={styles.gridContainer}>
                {Array.from({ length: rows * 3 }).map((_, i) => (
                    <SkeletonBox key={i} style={styles.gridCell} />
                ))}
            </View>
        );
    }

    // Default: list rows
    return (
        <View style={styles.listContainer}>
            {Array.from({ length: rows }).map((_, i) => (
                <View key={i} style={styles.listRow}>
                    <SkeletonBox style={styles.listAvatar} />
                    <View style={styles.listLines}>
                        <SkeletonBox style={styles.lineWide} />
                        <SkeletonBox style={styles.lineNarrow} />
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: Colors.border,
        borderRadius: 8,
    },
    // List variant
    listContainer: { padding: Spacing.md },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    listAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: Spacing.md },
    listLines: { flex: 1, gap: Spacing.xs },
    lineWide: { height: 14, borderRadius: 7, width: '80%' },
    lineNarrow: { height: 10, borderRadius: 5, width: '55%' },
    // Grid variant
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    gridCell: {
        width: '30%',
        height: 100,
        borderRadius: 12,
        margin: '1.5%',
    },
});
