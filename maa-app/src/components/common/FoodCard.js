/**
 * FoodCard.js
 * Maa App – Grid food card with image placeholder, safety badge, and select state.
 */

import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Dimensions } from '../../constants';
import { getAndCacheFoodImage } from '../../services/ImageService';

const SAFETY_BADGE = {
    safe: null,
    limit: { text: '⚠️', color: Colors.warning },
    avoid: { text: '⛔', color: Colors.danger },
};

/**
 * @param {Object} props
 * @param {Object} props.food - Food object from DB
 * @param {boolean} props.selected - Whether this food is selected
 * @param {Function} props.onPress - Tap handler
 * @param {Function} props.onInfoPress - Info button handler
 */
export default function FoodCard({ food, selected, onPress, onInfoPress }) {
    const badge = SAFETY_BADGE[food.safety_status];
    const [imgUrl, setImgUrl] = useState(food.image_path);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        // If it exists but is not a local file:// path, we need to download it into local storage
        const needsLocalDownload = !food.image_path || !food.image_path.startsWith('file://');

        if (needsLocalDownload) {
            setLoading(true);
            getAndCacheFoodImage(food).then(url => {
                if (isMounted) {
                    if (url) {
                        setImgUrl(url);
                    } else {
                        setImgUrl(null);
                    }
                    setLoading(false);
                }
            }).catch(err => {
                console.error(`[FoodCard] 💥 Error caching image to local storage for ${food.name_en}:`, err);
                if (isMounted) {
                    setImgUrl(food.image_path); // Fallback to whatever we had
                    setLoading(false);
                }
            });
        } else {
            setImgUrl(food.image_path);
        }
        return () => { isMounted = false; };
    }, [food.id, food.image_path]);

    return (
        <TouchableOpacity
            style={[styles.card, selected && styles.cardSelected]}
            onPress={onPress}
            activeOpacity={0.8}
            accessible
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!selected }}
            accessibilityLabel={`${food.name_hi || food.name_en}, ${food.name_en}, ${food.calories} calories${food.safety_status !== 'safe' ? ', ' + (food.safety_status === 'avoid' ? 'avoid during pregnancy' : 'eat in limited quantity') : ''}`}
            accessibilityHint={selected ? 'Double tap to deselect' : 'Double tap to select'}
        >
            {/* Image section – shows real image from SerpApi with cache & emoji fallback */}
            <View style={[styles.imagePlaceholder, selected && styles.imagePlaceholderSelected]}>
                {imgUrl ? (
                    <Image
                        source={{ uri: imgUrl }}
                        style={styles.foodImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                    />
                ) : (
                    <View style={styles.emojiOverlay}>
                        <Text style={[styles.foodEmoji, { opacity: loading ? 0.4 : 1 }]}>
                            {getCategoryEmoji(food.category)}
                        </Text>
                    </View>
                )}

                {loading && (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                )}
            </View>

            {/* Safety badge */}
            {
                badge && (
                    <View style={[styles.badge, { backgroundColor: badge.color }]}>
                        <Text style={styles.badgeText}>{badge.text}</Text>
                    </View>
                )
            }

            {/* Checkmark overlay */}
            {
                selected && (
                    <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                )
            }

            {/* Labels */}
            <Text style={styles.nameHi} numberOfLines={1}>{food.name_hi || food.name_en}</Text>
            <Text style={styles.nameEn} numberOfLines={1}>{food.name_en}</Text>
            <View style={styles.foodDetailsRow}>
                <Text style={styles.cal}>{food.calories} cal</Text>
                {food.source && food.source !== 'app' && (
                    <Text style={styles.sourceText}>• {food.source === 'Open Food Facts' ? 'OFF' : food.source}</Text>
                )}
            </View>

            {/* Info Icon for breakdown */}
            <TouchableOpacity
                style={styles.infoIconBox}
                onPress={(e) => {
                    e.stopPropagation();
                    onInfoPress && onInfoPress(food);
                }}
            >
                <Text style={styles.infoIconText}>ⓘ</Text>
            </TouchableOpacity>
        </TouchableOpacity >
    );
}

function getCategoryEmoji(category) {
    const map = {
        grain: '🌾', protein: '🥜', vegetable: '🥬', fruit: '🍎',
        dairy: '🥛', snack: '🍪', drink: '🥤',
    };
    return map[category] || '🍴';
}

const styles = StyleSheet.create({
    card: {
        width: '31%',
        backgroundColor: Colors.cardBackground,
        borderRadius: 14,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    imagePlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF0F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    imagePlaceholderSelected: {
        backgroundColor: Colors.primaryLight,
    },
    foodImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        zIndex: 2,
    },
    emojiOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    foodEmoji: {
        fontSize: 30,
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 30,
        zIndex: 3,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        borderRadius: 10,
        width: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 12,
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 14,
    },
    nameHi: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        lineHeight: 18,
    },
    nameEn: {
        fontSize: 10,
        color: Colors.textLight,
        textAlign: 'center',
    },
    cal: {
        fontSize: 10,
        color: Colors.textSecondary,
    },
    foodDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sourceText: {
        fontSize: 9,
        color: Colors.primary,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    infoIconBox: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        padding: 4,
    },
    infoIconText: {
        fontSize: 18,
        color: Colors.primary,
        fontWeight: 'bold',
    },
});
