/**
 * EyeHealthScreen.js
 * Maa App - Eye Health Risk Assessment tab.
 * Uses the Risk-Radar ML service for AI-powered eye risk screening.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { predictEyeRisk, checkMLServiceHealth } from '../../services/RiskRadarService';
import { saveEyeAssessment } from '../../services/database/DatabaseService';

// ── Bilingual Labels ────────────────────────────────────────────────────────
const L = {
    title: { en: '👁️ Eye Health Screen', hi: '👁️ आंख की जांच' },
    subtitle: { en: 'AI-powered eye risk assessment', hi: 'AI आधारित दृष्टि जोखिम मूल्यांकन' },
    age: { en: 'Age (years)', hi: 'उम्र (वर्ष)' },
    familyHistory: { en: 'Family History of Eye Disease', hi: 'परिवार में आंख की बीमारी' },
    logMAR: { en: 'Visual Acuity – LogMAR (0.0 – 2.0)', hi: 'दृष्टि तीक्ष्णता (0.0 – 2.0)' },
    logCS: { en: 'Contrast Sensitivity – LogCS (0.0 – 2.2)', hi: 'कंट्रास्ट संवेदनशीलता (0.0 – 2.2)' },
    vfi: { en: 'Visual Field Index – VFI (0 – 100)', hi: 'दृश्य क्षेत्र सूचकांक (0 – 100)' },
    amsler: { en: 'Amsler Grid Distortion Detected?', hi: 'अम्सलर ग्रिड में विकृति?' },
    runTest: { en: 'Run Eye Health Test', hi: 'जांच शुरू करें' },
    result: { en: 'Risk Assessment Result', hi: 'जोखिम मूल्यांकन परिणाम' },
    riskLevel: { en: 'Risk Level', hi: 'जोखिम स्तर' },
    score: { en: 'Risk Score', hi: 'जोखिम स्कोर' },
    confidence: { en: 'Confidence', hi: 'विश्वसनीयता' },
    recommendations: { en: 'Recommendations', hi: 'सुझाव' },
    offline: { en: '⚠️ ML Service Offline', hi: '⚠️ ML सेवा उपलब्ध नहीं' },
    offlineMsg: { en: 'Start the Risk-Radar ML service on your computer (python app.py) then try again.', hi: 'अपने कंप्यूटर पर Risk-Radar ML सेवा शुरू करें, फिर दोबारा कोशिश करें।' },
    reset: { en: 'Start New Test', hi: 'नई जांच शुरू करें' },
    yes: { en: 'Yes', hi: 'हाँ' },
    no: { en: 'No', hi: 'नहीं' },
    fillAll: { en: 'Please fill in all fields.', hi: 'कृपया सभी जानकारी भरें।' },
    method: { en: 'Method', hi: 'विधि' },
};

// ── Risk Badge Colours ────────────────────────────────────────────────────────
const RISK_CONFIG = {
    Low: { color: Colors.success, bg: '#E8F5E9', emoji: '🟢' },
    Moderate: { color: Colors.warning, bg: '#FFF8E1', emoji: '🟡' },
    High: { color: Colors.danger, bg: '#FFEBEE', emoji: '🔴' },
};

export default function EyeHealthScreen() {
    const { language } = useLanguage();
    const navigation = useNavigation();
    const route = useRoute();
    const { eyeScores, updateEyeScore, resetEyeScores } = useUser();
    const t = key => L[key]?.[language] ?? L[key]?.en ?? key;

    // Form states — seeded from context so they survive navigation
    const [age, setAge] = useState(eyeScores.age || '');
    const [familyHistory, setFamilyHistory] = useState(eyeScores.familyHistory || false);
    const [logMAR, setLogMAR] = useState(eyeScores.logMAR || '');
    const [logCS, setLogCS] = useState(eyeScores.logCS || '');
    const [vfi, setVfi] = useState(eyeScores.vfi || '');
    const [amsler, setAmsler] = useState(eyeScores.amsler || false);

    // Result state
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);    // Risk result from API
    const [offline, setOffline] = useState(false); // ML service offline flag

    // Handle incoming results from test screens
    useEffect(() => {
        if (route.params?.acuityResult) {
            const val = route.params.acuityResult.logMAR.toString();
            setLogMAR(val);
            updateEyeScore('logMAR', val);
            navigation.setParams({ acuityResult: undefined });
        }
        if (route.params?.contrastResult) {
            const val = route.params.contrastResult.logCS.toString();
            setLogCS(val);
            updateEyeScore('logCS', val);
            navigation.setParams({ contrastResult: undefined });
        }
        if (route.params?.amslerResult) {
            const val = route.params.amslerResult.hasDistortion;
            setAmsler(val);
            updateEyeScore('amsler', val);
            navigation.setParams({ amslerResult: undefined });
        }
        if (route.params?.peripheralResult) {
            const val = route.params.peripheralResult.vfi.toString();
            setVfi(val);
            updateEyeScore('vfi', val);
            navigation.setParams({ peripheralResult: undefined });
        }
    }, [route.params]);

    const handleReset = useCallback(() => {
        setAge('');
        setFamilyHistory(false);
        setLogMAR('');
        setLogCS('');
        setVfi('');
        setAmsler(false);
        setResult(null);
        setOffline(false);
        resetEyeScores();
    }, [resetEyeScores]);

    const handleSubmit = useCallback(async () => {
        if (!age || !logMAR || !logCS || !vfi) {
            Alert.alert('⚠️', t('fillAll'));
            return;
        }

        const ageNum = parseFloat(age);
        const logMARNum = parseFloat(logMAR);
        const logCSNum = parseFloat(logCS);
        const vfiNum = parseFloat(vfi);

        if (isNaN(ageNum) || isNaN(logMARNum) || isNaN(logCSNum) || isNaN(vfiNum)) {
            Alert.alert('⚠️', t('fillAll'));
            return;
        }

        setLoading(true);
        setOffline(false);
        setResult(null);

        const response = await predictEyeRisk({
            age: ageNum,
            familyHistory: familyHistory ? 1 : 0,
            logMAR: logMARNum,
            logCS: logCSNum,
            vfi: vfiNum,
            amslerDistortion: amsler ? 1 : 0,
        });

        setLoading(false);

        if (response.success) {
            setResult(response.data);
            // Save to SQLite history (fire-and-forget, don't block UI)
            saveEyeAssessment({
                riskLevel: response.data.riskLevel,
                riskScore: response.data.riskScore,
                confidence: response.data.confidence,
                method: response.data.method,
                age: ageNum,
                familyHistory,
                logMAR: logMARNum,
                logCS: logCSNum,
                vfi: vfiNum,
                amslerDistortion: amsler,
                recommendations: response.data.recommendations,
            }).catch(e => console.warn('[EyeScreen] Failed to save assessment:', e));
        } else if (response.error === 'offline') {
            setOffline(true);
        } else {
            Alert.alert('Error', response.message);
        }
    }, [age, familyHistory, logMAR, logCS, vfi, amsler, language]);

    const riskConfig = result ? RISK_CONFIG[result.riskLevel] ?? RISK_CONFIG.Low : null;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{t('title')}</Text>
                <Text style={styles.subtitle}>{t('subtitle')}</Text>
            </View>

            {/* ── Offline Banner ── */}
            {offline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineTitle}>{t('offline')}</Text>
                    <Text style={styles.offlineMsg}>{t('offlineMsg')}</Text>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetText}>{t('reset')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Result Card ── */}
            {result && riskConfig && (
                <View style={[styles.resultCard, { backgroundColor: riskConfig.bg, borderColor: riskConfig.color }]}>
                    <Text style={styles.resultTitle}>{t('result')}</Text>

                    <View style={styles.riskBadge}>
                        <Text style={[styles.riskEmoji]}>{riskConfig.emoji}</Text>
                        <Text style={[styles.riskLevel, { color: riskConfig.color }]}>{result.riskLevel}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{t('score')}</Text>
                            <Text style={[styles.statValue, { color: riskConfig.color }]}>{result.riskScore}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{t('confidence')}</Text>
                            <Text style={[styles.statValue, { color: Colors.textPrimary }]}>{Math.round(result.confidence * 100)}%</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{t('method')}</Text>
                            <Text style={[styles.statValue, { color: Colors.textSecondary, fontSize: 13 }]}>{result.method}</Text>
                        </View>
                    </View>

                    {result.recommendations?.length > 0 && (
                        <View style={styles.recommendationsBox}>
                            <Text style={styles.recHead}>{t('recommendations')}</Text>
                            {result.recommendations.map((rec, i) => (
                                <Text key={i} style={styles.recItem}>• {rec}</Text>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                        <Text style={styles.resetText}>{t('reset')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Input Form (hide when result shown) ── */}
            {!result && !offline && (
                <View style={styles.formCard}>
                    {/* Age */}
                    <Text style={styles.label}>{t('age')}</Text>
                    <TextInput
                        style={styles.input}
                        value={age}
                        onChangeText={(v) => { setAge(v); updateEyeScore('age', v); }}
                        keyboardType="numeric"
                        placeholder="e.g. 45"
                        placeholderTextColor={Colors.textLight}
                        color={Colors.textPrimary}
                        maxLength={3}
                    />

                    {/* LogMAR */}
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>{t('logMAR')}</Text>
                        <TouchableOpacity
                            style={styles.inlineTestBtn}
                            onPress={() => navigation.navigate('AcuityTest')}
                        >
                            <Text style={styles.inlineTestBtnTxt}>🔬 {language === 'hi' ? 'टेस्ट करें' : 'Run Test'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.input, logMAR ? styles.inputFilled : null]}
                        value={logMAR}
                        onChangeText={(v) => { setLogMAR(v); updateEyeScore('logMAR', v); }}
                        keyboardType="numeric"
                        placeholder="e.g. 0.1  (0=perfect, 2=severe)"
                        placeholderTextColor={Colors.textLight}
                        color={Colors.textPrimary}
                    />

                    {/* LogCS */}
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>{t('logCS')}</Text>
                        <TouchableOpacity
                            style={styles.inlineTestBtn}
                            onPress={() => navigation.navigate('ContrastTest')}
                        >
                            <Text style={styles.inlineTestBtnTxt}>🔬 {language === 'hi' ? 'टेस्ट करें' : 'Run Test'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.input, logCS ? styles.inputFilled : null]}
                        value={logCS}
                        onChangeText={(v) => { setLogCS(v); updateEyeScore('logCS', v); }}
                        keyboardType="numeric"
                        placeholder="e.g. 1.7  (2.2=excellent, 0=no contrast)"
                        placeholderTextColor={Colors.textLight}
                        color={Colors.textPrimary}
                    />

                    {/* VFI */}
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>{t('vfi')}</Text>
                        <TouchableOpacity
                            style={styles.inlineTestBtn}
                            onPress={() => navigation.navigate('PeripheralTest')}
                        >
                            <Text style={styles.inlineTestBtnTxt}>🔬 {language === 'hi' ? 'टेस्ट करें' : 'Run Test'}</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.input, vfi ? styles.inputFilled : null]}
                        value={vfi}
                        onChangeText={(v) => { setVfi(v); updateEyeScore('vfi', v); }}
                        keyboardType="numeric"
                        placeholder="e.g. 98  (100=normal, 0=no field)"
                        placeholderTextColor={Colors.textLight}
                        color={Colors.textPrimary}
                    />

                    {/* Family History Toggle */}
                    <View style={styles.toggleRow}>
                        <Text style={styles.label}>{t('familyHistory')}</Text>
                        <View style={styles.toggleControl}>
                            <Text style={styles.toggleLabel}>{familyHistory ? t('yes') : t('no')}</Text>
                            <Switch
                                value={familyHistory}
                                onValueChange={(v) => { setFamilyHistory(v); updateEyeScore('familyHistory', v); }}
                                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                                thumbColor={familyHistory ? Colors.primary : Colors.white}
                            />
                        </View>
                    </View>

                    {/* Amsler Distortion Toggle */}
                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('amsler')}</Text>
                            <TouchableOpacity
                                style={[styles.inlineTestBtn, { alignSelf: 'flex-start', marginTop: 4 }]}
                                onPress={() => navigation.navigate('AmslerTest')}
                            >
                                <Text style={styles.inlineTestBtnTxt}>🔬 {language === 'hi' ? 'ग्रिड टेस्ट' : 'Grid Test'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.toggleControl}>
                            <Text style={styles.toggleLabel}>{amsler ? t('yes') : t('no')}</Text>
                            <Switch
                                value={amsler}
                                onValueChange={(v) => { setAmsler(v); updateEyeScore('amsler', v); }}
                                trackColor={{ false: Colors.border, true: Colors.dangerLight }}
                                thumbColor={amsler ? Colors.danger : Colors.white}
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.submitText}>{t('runTest')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        padding: Dimensions.screenPadding,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
        marginTop: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.textPrimary,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
    },

    // ── Offline Banner
    offlineBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: Dimensions.borderRadius,
        padding: 18,
        borderLeftWidth: 4,
        borderLeftColor: Colors.warning,
        marginBottom: 16,
    },
    offlineTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.warning,
        marginBottom: 6,
    },
    offlineMsg: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 22,
    },

    // ── Result Card
    resultCard: {
        borderRadius: Dimensions.borderRadius,
        padding: 20,
        borderWidth: 2,
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    riskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    riskEmoji: {
        fontSize: 36,
    },
    riskLevel: {
        fontSize: 32,
        fontWeight: '900',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textLight,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    recommendationsBox: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    recHead: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    recItem: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 22,
        marginBottom: 2,
    },

    // ── Form
    formCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        padding: 18,
        elevation: 2,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 6,
        marginTop: 14,
        lineHeight: 24,
    },
    input: {
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: Colors.background,
        color: Colors.textPrimary,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    toggleControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: Colors.info,
        borderRadius: 12,
        height: Dimensions.buttonHeight,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitText: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 0.5,
    },
    resetButton: {
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 4,
    },
    resetText: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 14,
        marginBottom: 6,
    },
    inlineTestBtn: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    inlineTestBtnTxt: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB',
    },
    inputFilled: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
});
