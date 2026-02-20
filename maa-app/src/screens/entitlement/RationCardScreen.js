/**
 * RationCardScreen.js
 * Visual representation of the Entitlement Gap Report.
 */

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { generateGapReport } from '../../services/EntitlementEngine';
import { generateEntitlementExplanation } from '../../services/ai/GeminiService';
import {
    getDailySummary,
    getNutritionRequirements,
    getUserProfile,
} from '../../services/database/DatabaseService';
import { playTextToSpeech, stopTextToSpeech } from '../../services/TextToSpeechService';

export default function RationCardScreen({ navigation }) {
    const { language } = useLanguage();
    const hi = language === 'hi';

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [profile, setProfile] = useState(null);
    const [explanationText, setExplanationText] = useState(null);
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);

    useEffect(() => {
        loadData();
        return () => {
            stopTextToSpeech();
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const userProfile = await getUserProfile();
            setProfile(userProfile);
            
            if (!userProfile) {
                setLoading(false);
                return;
            }

            const daily = await getDailySummary();
            const week = userProfile.pregnancy_week || 1;
            const req = await getNutritionRequirements(week);

            const gapReport = generateGapReport(userProfile, daily, req);
            setReport(gapReport);

            // Pre-fetch explanation in background
            fetchExplanation(userProfile, gapReport);
        } catch (error) {
            console.error('[RationCard] Error loadData:', error);
            Alert.alert(hi ? 'त्रुटि' : 'Error', hi ? 'डेटा लोड करने में विफल' : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchExplanation = async (userProfile, gapReport) => {
        try {
            setIsExplanationLoading(true);
            const text = await generateEntitlementExplanation(userProfile, gapReport, language);
            setExplanationText(text);
        } catch (error) {
            console.error('[RationCard] Pre-fetch explanation error:', error);
        } finally {
            setIsExplanationLoading(false);
        }
    };

    const handleExplain = async () => {
        if (isSpeaking) {
            stopTextToSpeech();
            setIsSpeaking(false);
            return;
        }

        if (isExplanationLoading) {
            Alert.alert(
                hi ? 'कृपया प्रतीक्षा करें' : 'Please wait',
                hi ? 'जननी आपकी रिपोर्ट पढ़ रही है...' : 'Janani is reading your report...'
            );
            return;
        }

        if (!explanationText) {
             Alert.alert(hi ? 'त्रुटि' : 'Error', hi ? 'जननी व्याख्या नहीं कर सकी।' : 'Janani could not explain right now.');
             return;
        }

        try {
            setIsSpeaking(true);
            await playTextToSpeech(explanationText, language);
        } catch (error) {
            console.error('[RationCard] Play error:', error);
        } finally {
            setIsSpeaking(false);
        }
    };

    const handleAction = (scheme) => {
        if (scheme.type === 'cash') {
            Alert.alert(
                hi ? 'कार्रवाई करें' : 'Take Action',
                hi ? scheme.action_hi : scheme.action_en,
                [{ text: 'OK', style: 'default' }]
            );
        } else {
            Alert.alert(
                hi ? 'कार्रवाई करें' : 'Take Action',
                hi ? scheme.action_hi : scheme.action_en,
                [{ text: 'OK', style: 'default' }]
            );
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    {hi ? 'कृपया पहले अपनी प्रोफाइल पूरी करें।' : 'Please complete your profile first.'}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← {hi ? 'वापस' : 'Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.pageTitle}>
                    {hi ? 'आपका हक रिपोर्ट' : 'Entitlement Report'}
                </Text>
            </View>

            {/* Total Benefit Card */}
            <View style={styles.heroCard}>
                <Text style={styles.heroSub}>
                    {hi ? 'आपका अनक्लेम्ड सरकारी लाभ:' : 'Your Unclaimed Government Benefits:'}
                </Text>
                <Text style={styles.heroAmount}>
                    ₹ {report?.totalPotentialBenefit?.toLocaleString() || '0'}
                </Text>
                
                <TouchableOpacity 
                    style={[styles.ttsBtn, (isSpeaking || isExplanationLoading) && styles.ttsBtnActive]}
                    onPress={handleExplain}
                >
                    {isExplanationLoading ? (
                        <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 8 }} />
                    ) : null}
                    <Text style={[styles.ttsText, (isSpeaking || isExplanationLoading) && styles.ttsTextActive]}>
                        {isSpeaking 
                            ? (hi ? '⏹️ बोल रही है...' : '⏹️ Speaking...') 
                            : isExplanationLoading
                                ? (hi ? '⏳ जननी सोच रही है...' : '⏳ Janani is thinking...')
                                : (hi ? '🎙️ जननी, मुझे समझाओ' : '🎙️ Janani, explain this')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Scheme List */}
            <Text style={styles.sectionTitle}>
                {hi ? 'आपकी योजनाएं' : 'Your Schemes'}
            </Text>

            {report?.schemes.map((scheme, index) => (
                <View key={index} style={[styles.schemeCard, scheme.urgency === 'HIGH' && styles.schemeCardHigh]}>
                    <View style={styles.schemeHeader}>
                        <Text style={styles.schemeName}>
                            {hi ? scheme.name_hi : scheme.name_en}
                        </Text>
                        <Text style={[
                            styles.urgencyBadge, 
                            scheme.urgency === 'HIGH' ? styles.urgencyHigh : styles.urgencyLow
                        ]}>
                            {scheme.urgency}
                        </Text>
                    </View>

                    {scheme.unclaimed_amount > 0 && (
                        <Text style={styles.schemeAmount}>
                            ⚠️ {hi ? 'बाकी राशि:' : 'Pending Amount:'} ₹ {scheme.unclaimed_amount}
                        </Text>
                    )}

                    {(scheme.reason_hi || scheme.reason_en) && (
                        <Text style={styles.schemeReason}>
                            {hi ? scheme.reason_hi : scheme.reason_en}
                        </Text>
                    )}

                    {(scheme.nutrition_insight_hi || scheme.nutrition_insight_en) && (
                        <View style={styles.insightBox}>
                            <Text style={styles.insightText}>
                                💡 {hi ? scheme.nutrition_insight_hi : scheme.nutrition_insight_en}
                            </Text>
                        </View>
                    )}

                    {scheme.urgency !== 'LOW' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(scheme)}>
                            <Text style={styles.actionText}>
                                {hi ? 'क्या करें? →' : 'What to do? →'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Dimensions.screenPadding, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    errorText: { fontSize: 16, color: Colors.textSecondary },
    
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { padding: 8, marginRight: 10 },
    backBtnText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
    pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },

    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: Dimensions.borderRadius,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        elevation: 6,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 8 },
    heroAmount: { fontSize: 42, color: Colors.white, fontWeight: '900', marginBottom: 20 },
    
    ttsBtn: {
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ttsBtnActive: { backgroundColor: Colors.accent },
    ttsText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
    ttsTextActive: { color: Colors.white },

    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },

    schemeCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 2,
    },
    schemeCardHigh: {
        borderColor: Colors.warning,
        borderWidth: 1.5,
    },
    schemeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    schemeName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
    
    urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '800' },
    urgencyHigh: { backgroundColor: `${Colors.warning}20`, color: Colors.warning },
    urgencyLow: { backgroundColor: `${Colors.success}20`, color: Colors.success },

    schemeAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
    schemeReason: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12, lineHeight: 20 },
    
    insightBox: { backgroundColor: `${Colors.secondary}15`, padding: 12, borderRadius: 8, marginBottom: 12 },
    insightText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', lineHeight: 20 },

    actionBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
    actionText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
