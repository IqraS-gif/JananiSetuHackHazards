/**
 * HomeScreen.js
 * Maa App - Focused "Today" Dashboard.
 * Prioritizes daily tasks: Meal Logging, Supplements, and ANC Checkups.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import learnContent from '../../../learn_content.json';
import StatusCard from '../../components/common/StatusCard';
import EmptyState from '../../components/common/EmptyState';
import { Colors, Dimensions, SupplementTypes } from '../../constants';
import GradientCard from '../../components/ui/GradientCard';
import FloatingAIButton from '../../components/ui/FloatingAIButton';
import ScanLoadingAnimation from '../../components/ui/ScanLoadingAnimation';
import designSystem from '../../theme/designSystem';
import * as Location from 'expo-location';
import { useT } from '../../i18n/useT';
import {
    getDailySummary,
    getNextANC,
    getNutritionRequirements,
    getTodayMeals,
    getUserProfile,
    logSupplement,
    logWater,
} from '../../services/database/DatabaseService';
import { showEmergencyOptions } from '../../services/emergency/EmergencyService';
import {
    calculateDailyNutrition,
    calculateNutritionGaps,
    generateRecommendations,
    getOverallNutritionStatus,
} from '../../services/nutrition/NutritionCalculator';

function parseCheckups(rawValue) {
    if (!rawValue) return '';
    try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed.join(' | ') : '';
    } catch (error) {
        console.error('[HomeScreen] Invalid checkups_list:', error);
        return '';
    }
}

export default function HomeScreen({ navigation }) {
    const { t, isHindi, isBilingual } = useT();

    const [profile, setProfile] = useState(null);
    const [dailySummary, setDailySummary] = useState(null);
    const [nutritionGaps, setNutritionGaps] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [nextANC, setNextANC] = useState(null);
    const [dailyTip, setDailyTip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            console.log('[HomeScreen] Loading Profile...');
            const userProfile = await getUserProfile();
            console.log('[HomeScreen] Profile loaded:', userProfile?.name);
            setProfile(userProfile);

            const summary = await getDailySummary();
            setDailySummary(summary);

            const meals = await getTodayMeals();
            const consumed = calculateDailyNutrition(meals);
            const week = userProfile?.pregnancy_week || 1;
            const requirements = await getNutritionRequirements(week);
            const gaps = calculateNutritionGaps(consumed, requirements);
            setNutritionGaps(gaps);
            setRecommendations(generateRecommendations(gaps));
            const anc = await getNextANC(week);
            setNextANC(anc);
        } catch (error) {
            console.error('[HomeScreen] Load error:', error);
            setLoadError(t('error_load'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const tips = learnContent?.daily_tips || [];
        if (!tips.length) return;

        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        setDailyTip(tips[dayOfYear % tips.length]);
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation, loadData]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('[HomeScreen] Location permission not granted');
            }
        })();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleLogWater = async () => {
        try {
            const glasses = await logWater();
            Alert.alert(t('water_logged_title'), t('water_logged_msg', { num: glasses }));
            loadData();
        } catch (error) {
            console.error('[HomeScreen] logWater error:', error);
        }
    };

    const handleLogSupplement = () => {
        Alert.alert(
            t('supplement_title'),
            t('which_supps'),
            SupplementTypes.map((item) => ({
                text: `${item.emoji} ${isBilingual ? (item.name_hi + ' / ' + item.name_en) : (isHindi ? item.name_hi : item.name_en)}`,
                onPress: async () => {
                    try {
                        await logSupplement(item.id);
                        Alert.alert(t('saved'), t('recorded', { name: (isHindi ? item.name_hi : item.name_en) }));
                        loadData();
                    } catch (error) {
                        console.error('[HomeScreen] logSupplement error:', error);
                    }
                },
            })).concat([{ text: t('cancel'), style: 'cancel' }])
        );
    };

    const handleEmergency = () => {
        navigation.navigate('SOS', { profile });
    };

    const week = profile?.pregnancy_week || 0;
    const name = profile?.name || 'Maa';
    const overallNutrition = nutritionGaps ? getOverallNutritionStatus(nutritionGaps) : 'low';
    const waterGlasses = dailySummary?.water_glasses || 0;
    const waterTarget = 10;
    const supplementCount = dailySummary?.supplements_taken || 0;
    const supplementTarget = 3;

    const checkupsText = useMemo(() => parseCheckups(nextANC?.checkups_list), [nextANC?.checkups_list]);

    if (loading) {
        return <ScanLoadingAnimation title={t('dashboard_loading', { name })} source={null} />;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[designSystem.colors.primary]} />}
            >
                {/* Error Banner */}
                {loadError ? (
                    <View style={styles.errorBanner} accessible accessibilityRole="alert" accessibilityLabel={loadError}>
                        <Text style={styles.errorBannerEmoji}>⚠️</Text>
                        <Text style={styles.errorBannerText}>{loadError}</Text>
                    </View>
                ) : null}

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>{t('greeting')}, {name}</Text>
                        <Text style={styles.subGreeting}>{t('plan_today')}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.emergencyBtn}
                        onPress={handleEmergency}
                        accessibilityRole="button"
                        accessibilityLabel="Emergency SOS"
                        accessibilityHint="Double tap to call emergency services"
                    >
                        <Text style={styles.emergencyText}>🚨</Text>
                        <Text style={styles.emergencyLabel}>SOS</Text>
                    </TouchableOpacity>
                </View>

                {/* Pregnancy Progress */}
                <View style={styles.progressCard}>
                    <View style={styles.weekInfo}>
                        <Text style={styles.weekLabel}>{t('pregnancy_week')}</Text>
                        <Text style={styles.weekValue}>{week || '--'}</Text>
                    </View>
                    <View style={styles.progressSeparator} />
                    <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '15' }]}>
                        <Text style={[styles.statusBadgeText, { color: Colors.primary }]}>
                            {week > 28 ? t('tri_3') : week > 13 ? t('tri_2') : t('tri_1')}
                        </Text>
                    </View>
                </View>

                {/* Ration Card Entitlements Card */}
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('RationCard')}>
                    <GradientCard colors={designSystem.colors.cardGradientPurple} contentStyle={styles.taskCardRow} style={styles.taskCardSpacing}>
                        <View style={styles.taskIconContainer}>
                            <Text style={styles.taskEmoji}>🃏</Text>
                        </View>
                        <View style={styles.taskTextContent}>
                            <Text style={styles.taskTitleHi}>{t('entitlement_report')}</Text>
                            {isBilingual && <Text style={styles.taskTitleEn}>Entitlement Report</Text>}
                            <Text style={styles.taskStatus}>{t('gov_schemes')}</Text>
                        </View>
                        <Text style={styles.taskArrow}>→</Text>
                    </GradientCard>
                </TouchableOpacity>

                {/* Primary Tasks - Large Cards */}
                <Text style={styles.sectionTitle}>{t('major_tasks_today')}</Text>

                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Food')}>
                    <GradientCard colors={designSystem.colors.cardGradientPink} contentStyle={styles.taskCardRow} style={styles.taskCardSpacing}>
                        <View style={styles.taskIconContainer}>
                            <Text style={styles.taskEmoji}>🍚</Text>
                        </View>
                        <View style={styles.taskTextContent}>
                            <Text style={styles.taskTitleHi}>{t('log_meals_hi')}</Text>
                            {isBilingual && <Text style={styles.taskTitleEn}>Log Your Meals</Text>}
                            <Text style={styles.taskStatus}>
                                {nutritionGaps?.calories?.percentage >= 100 ? t('target_met') : t('track_nutrition')}
                            </Text>
                        </View>
                        <Text style={styles.taskArrow}>→</Text>
                    </GradientCard>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.9} onPress={handleLogSupplement}>
                    <GradientCard colors={['#00C896', '#50E3C2']} contentStyle={styles.taskCardRow} style={styles.taskCardSpacing}>
                        <View style={styles.taskIconContainer}>
                            <Text style={styles.taskEmoji}>💊</Text>
                        </View>
                        <View style={styles.taskTextContent}>
                            <Text style={styles.taskTitleHi}>{t('take_supps_hi')}</Text>
                            {isBilingual && <Text style={styles.taskTitleEn}>Take Supplements</Text>}
                            <Text style={styles.taskStatus}>
                                {t('taken_today', { taken: supplementCount, target: supplementTarget })}
                            </Text>
                        </View>
                        <Text style={styles.taskArrow}>→</Text>
                    </GradientCard>
                </TouchableOpacity>

                {nextANC && (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Health')}>
                        <GradientCard colors={['#4FACFE', '#6EC6FF']} contentStyle={styles.taskCardRow} style={styles.taskCardSpacing}>
                            <View style={styles.taskIconContainer}>
                                <Text style={styles.taskEmoji}>🏥</Text>
                            </View>
                            <View style={styles.taskTextContent}>
                                <Text style={styles.taskTitleHi}>{t('next_anc_hi')}</Text>
                                {isBilingual && <Text style={styles.taskTitleEn}>Next Doctor Visit</Text>}
                                <Text style={styles.taskStatus}>
                                    {t('view_tests', { week: nextANC.recommended_week })}
                                </Text>
                            </View>
                            <Text style={styles.taskArrow}>→</Text>
                        </GradientCard>
                    </TouchableOpacity>
                )}

                {/* Status Tracking Grid */}
                <Text style={styles.sectionTitle}>{t('status_tracking')}</Text>
                <View style={styles.statusGrid}>
                    <StatusCard
                        emoji="🥗"
                        labelHi="पोषण"
                        labelEn="Nutrition"
                        value={nutritionGaps?.calories ? `${Math.round(nutritionGaps.calories.percentage)}%` : '0%'}
                        percentage={nutritionGaps?.calories?.percentage || 0}
                        status={overallNutrition}
                        onPress={() => navigation.navigate('Food')}
                    />
                    <StatusCard
                        emoji="💧"
                        labelHi="पानी"
                        labelEn="Water"
                        value={`${waterGlasses}/${waterTarget}`}
                        percentage={(waterGlasses / waterTarget) * 100}
                        status={waterGlasses >= 8 ? 'good' : waterGlasses >= 5 ? 'medium' : 'low'}
                        onPress={handleLogWater}
                    />
                </View>

                {/* Daily Wisdom Section */}
                {dailyTip && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('daily_wisdom')}</Text>
                        <TouchableOpacity
                            style={styles.wisdomCard}
                            onPress={() => navigation.navigate('Learn')}
                        >
                            <View style={styles.wisdomEmojiContainer}>
                                <Text style={styles.wisdomEmoji}>{dailyTip.emoji}</Text>
                            </View>
                            <View style={styles.wisdomContent}>
                                <Text style={styles.wisdomTitle}>{isHindi || isBilingual ? dailyTip.titleHi : dailyTip.titleEn}</Text>
                                <Text style={styles.wisdomText}>{isHindi || isBilingual ? dailyTip.bodyHi : dailyTip.bodyEn}</Text>
                                <Text style={styles.readMoreText}>{t('read_more')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('recommended')}</Text>
                        <View style={styles.recContainer}>
                            {recommendations.slice(0, 2).map((item, index) => (
                                <View key={index} style={[styles.recItem, item.priority === 'high' ? styles.recItemHigh : null]}>
                                    <Text style={styles.recBullet}>{item.priority === 'high' ? '⚠️' : '💡'}</Text>
                                    <Text style={styles.recText}>{isBilingual ? `${item.hi}\n${item.en}` : (isHindi ? item.hi : item.en)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* AI Chatbot */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✦ {t('ai_companion') || 'AI Companion'}</Text>
                    <TouchableOpacity
                        style={styles.aiChatCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('AIChatbot')}
                        accessibilityRole="button"
                        accessibilityLabel="Open Janani AI Chatbot"
                    >
                        <View style={styles.aiChatGlow} />
                        <View style={styles.aiChatRow}>
                            <View style={styles.aiChatIconWrap}>
                                <Text style={{ fontSize: 26 }}>🤱</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.aiChatTitle}>Ask Janani AI</Text>
                                <Text style={styles.aiChatSub}>
                                    Pregnancy nutrition, health tips, gov. schemes & more — available 24/7
                                </Text>
                            </View>
                            <Text style={styles.aiChatArrow}>→</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Help / Contact Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('need_help')}</Text>
                    <View style={styles.helpRow}>
                        <TouchableOpacity
                            style={styles.helpCard}
                            onPress={() => {
                                if (profile?.asha_contact) {
                                    Linking.openURL(`tel:${profile.asha_contact}`);
                                } else {
                                    Alert.alert('Contact Missing', 'Add ASHA contact in your profile.');
                                }
                            }}
                        >
                            <Text style={styles.helpEmoji}>👩‍⚕️</Text>
                            <Text style={styles.helpLabel}>{t('asha')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.helpCard, { borderLeftColor: Colors.danger }]}
                            onPress={handleEmergency}
                        >
                            <Text style={styles.helpEmoji}>🚑</Text>
                            <Text style={styles.helpLabel}>{t('help')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
            <FloatingAIButton onPress={() => navigation.navigate('AIChatbot')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Dimensions.screenPadding, paddingTop: 50 },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 24,
    },
    stateText: {
        marginTop: 15,
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    headerLeft: { flex: 1 },
    greeting: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
    subGreeting: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
    emergencyBtn: {
        backgroundColor: Colors.danger,
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    emergencyText: { fontSize: 22 },
    emergencyLabel: { fontSize: 9, color: Colors.white, fontWeight: '900', marginTop: -2 },

    progressCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 2,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    weekInfo: { flex: 1 },
    weekLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
    weekValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
    progressSeparator: { width: 1, height: 30, backgroundColor: Colors.border, marginHorizontal: 16 },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '800' },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 12,
        marginTop: 8
    },

    taskCardSpacing: {
        marginBottom: 0,
        marginTop: 4,
    },
    taskCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    taskCard: {
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    taskIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    taskEmoji: { fontSize: 28 },
    taskTextContent: { flex: 1 },
    taskTitleHi: { fontSize: 18, fontWeight: '800', color: Colors.white },
    taskTitleEn: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    taskStatus: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '700' },
    taskArrow: { fontSize: 20, color: Colors.white, fontWeight: '800' },

    statusGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginHorizontal: -4
    },

    section: { marginBottom: 24 },

    wisdomCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    wisdomEmojiContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        elevation: 2,
    },
    wisdomEmoji: { fontSize: 32 },
    wisdomContent: { flex: 1 },
    wisdomTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
    wisdomText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
    readMoreText: { fontSize: 12, color: Colors.primary, fontWeight: '800' },

    recContainer: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 12,
    },
    recItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    recItemHigh: {
        backgroundColor: Colors.danger + '05',
    },
    recBullet: { fontSize: 16, marginRight: 10, marginTop: 2 },
    recText: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20, fontWeight: '600' },

    helpRow: { flexDirection: 'row', justifyContent: 'space-between' },
    helpCard: {
        width: '48%',
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 16,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: Colors.success,
        elevation: 2,
    },
    helpEmoji: { fontSize: 32, marginBottom: 8 },
    helpLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },

    // Error Banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.danger + '12',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: Colors.danger,
    },
    errorBannerEmoji: { fontSize: 20, marginRight: 10 },
    errorBannerText: { flex: 1, fontSize: 14, color: Colors.danger, fontWeight: '600', lineHeight: 20 },

    // AI Chat card
    aiChatCard: {
        borderRadius: 20,
        backgroundColor: '#0d0b1e',
        overflow: 'hidden',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.3)',
        elevation: 4,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    aiChatGlow: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,92,138,0.12)',
    },
    aiChatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    aiChatIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(124,58,237,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiChatTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 3,
    },
    aiChatSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 17,
    },
    aiChatArrow: {
        fontSize: 20,
        color: '#FF5C8A',
        fontWeight: '800',
    },
});
