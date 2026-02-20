import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Animated, Dimensions, Modal } from 'react-native';
import { Colors } from '../../constants';
import GradientCard from '../../components/ui/GradientCard';
import HealthScoreRing from '../../components/ui/HealthScoreRing';
import AnimatedRiskBar from '../../components/ui/AnimatedRiskBar';
import ScanLoadingAnimation from '../../components/ui/ScanLoadingAnimation';
import designSystem from '../../theme/designSystem';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { predictEyeRisk, predictDiabetesRisk } from '../../services/RiskRadarService';
import { getDiabetesFeatures, getVitalsHistory, getUserProfile } from '../../services/database/DatabaseService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const RiskGauge = ({ label, value, color, description, onPress }) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: value,
            duration: 1500,
            useNativeDriver: false,
        }).start();
    }, [value]);

    return (
        <TouchableOpacity style={styles.gaugeContainer} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.gaugeHeader}>
                <Text style={styles.gaugeLabel}>{label} ⓘ</Text>
                <Text style={[styles.gaugeValue, { color }]}>{Math.round(value * 100)}% Risk</Text>
            </View>
            <View style={styles.gaugeTrack}>
                <Animated.View
                    style={[
                        styles.gaugeFill,
                        {
                            width: animatedWidth.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%']
                            }),
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
            <Text style={styles.gaugeDesc}>{description}</Text>
        </TouchableOpacity>
    );
};

const VisualTrendGraph = ({ riskLevel, color, dark = false }) => {
    const animatedValuesRef = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]);
    const animatedValues = animatedValuesRef.current;

    useEffect(() => {
        if (!animatedValues) return;
        // Create a trend based on risk level
        const baseValues = riskLevel > 0.5
            ? [0.2, 0.35, 0.5, 0.7, 0.85] // Upward trend
            : [0.15, 0.12, 0.18, 0.14, 0.16]; // Stable low trend

        const animations = animatedValues.map((val, i) =>
            Animated.timing(val, {
                toValue: baseValues[i],
                duration: 1000 + (i * 200),
                useNativeDriver: false,
            })
        );
        Animated.parallel(animations).start();
    }, [riskLevel, animatedValues]);

    return (
        <View style={[styles.chartContainer, dark && styles.chartContainerDark]}>
            <View style={[styles.yAxis, dark && styles.yAxisDark]}>
                <Text style={[styles.axisText, dark && styles.axisTextDark]}>High</Text>
                <Text style={[styles.axisText, dark && styles.axisTextDark]}>Low</Text>
            </View>
            <View style={styles.graphArea}>
                {animatedValues && animatedValues.map((val, i) => (
                    <View key={i} style={styles.barGroup}>
                        <Animated.View
                            style={[
                                styles.graphBar,
                                {
                                    height: val.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%']
                                    }),
                                    backgroundColor: color,
                                    shadowColor: color,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 4,
                                }
                            ]}
                        />
                        <Text style={[styles.barLabel, dark && styles.barLabelDark]}>T-{40 - (i * 10)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default function SetuScreen() {
    const { language } = useLanguage();
    const { user } = useUser();
    const [isAnalysisVisible, setAnalysisVisible] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState(null);
    const [loading, setLoading] = useState(true);

    // Prediction States
    const [bpRisk, setBpRisk] = useState(0.12);
    const [diabetesData, setDiabetesData] = useState({
        riskProbability: 0.08,
        predictedGlucose: 105,
        riskLevel: 'Low',
        recommendations: []
    });
    const [isHighRisk, setIsHighRisk] = useState(false);
    const [bpInsightLines, setBpInsightLines] = useState([]);
    const [bpLabelText, setBpLabelText] = useState({ en: 'Your BP level is safe', hi: 'आपका बीपी स्तर सुरक्षित है' });

    // ─── User-specific demo profiles ────────────────────────────────────────────
    const USER_PROFILES = {
        'user_001': {
            isHighRisk: false,
            bpRisk: 0.08,
            bpLabel: { en: 'Your BP is perfectly stable', hi: 'आपका बीपी बिल्कुल सामान्य है' },
            diabetesData: {
                riskProbability: 0.06,
                predictedGlucose: 98,
                riskLevel: 'Low',
                recommendations: {
                    en: [
                        'Great work! Your glucose levels are optimal.',
                        'Continue balanced meals and daily walks.',
                        'Stay hydrated with 8+ glasses of water daily.',
                    ],
                    hi: [
                        'शाबाश! आपके ग्लूकोज का स्तर बेहतरीन है।',
                        'संतुलित भोजन और प्रतिदिन सैर जारी रखें।',
                        'प्रतिदिन 8+ गिलास पानी पिएं।',
                    ]
                }
            },
            bpInsights: {
                en: [
                    'Blood pressure within normal range (120/80 mmHg).',
                    'No signs of preeclampsia. Keep up your healthy routine.',
                    'Next BP checkup recommended in 2 weeks.',
                ],
                hi: [
                    'रक्तचाप सामान्य सीमा में है (120/80 mmHg)।',
                    'प्रीक्लेम्पसिया का कोई संकेत नहीं। अपनी स्वस्थ दिनचर्या जारी रखें।',
                    'अगली बीपी जांच 2 सप्ताह में करवाएं।',
                ]
            },
        },
        'user_002': {
            isHighRisk: true,
            bpRisk: 0.84,
            bpLabel: { en: 'High BP trend detected – consult doctor', hi: 'उच्च बीपी का रुझान – डॉक्टर से मिलें' },
            diabetesData: {
                riskProbability: 0.91,
                predictedGlucose: 188,
                riskLevel: 'High',
                recommendations: {
                    en: [
                        '⚠️ High Risk: Consult your doctor about Gestational Diabetes.',
                        'Reduce carbohydrate intake. Avoid white rice, sugary foods.',
                        'Monitor glucose levels after every meal.',
                        'Walk for 20 minutes after lunch and dinner.',
                    ],
                    hi: [
                        '⚠️ उच्च जोखिम: गर्भकालीन मधुमेह के बारे में तुरंत डॉक्टर से मिलें।',
                        'कार्बोहाइड्रेट कम करें। सफेद चावल और मीठे खाद्य पदार्थ न खाएं।',
                        'हर भोजन के बाद ग्लूकोज का स्तर जांचें।',
                        'दोपहर और रात के भोजन के बाद 20 मिनट टहलें।',
                    ]
                }
            },
            bpInsights: {
                en: [
                    '⚠️ BP increased 25% over last 40 days.',
                    'Preeclampsia screening strongly advised.',
                    'Reduce salt intake to less than 2g/day immediately.',
                    'Monitor BP every 4 hours and log readings.',
                ],
                hi: [
                    '⚠️ पिछले 40 दिनों में बीपी 25% बढ़ा है।',
                    'प्रीक्लेम्पसिया जांच तुरंत करवाना आवश्यक है।',
                    'नमक का सेवन तुरंत 2 ग्राम/दिन से कम करें।',
                    'हर 4 घंटे में बीपी मापें और रिकॉर्ड करें।',
                ]
            },
        },
    };

    useEffect(() => {
        loadProfileData();
    }, [user, language]);

    const loadProfileData = () => {
        const userId = user?.id || 'user_001';
        const profile = USER_PROFILES[userId] || USER_PROFILES['user_001'];
        const lang = language === 'hi' ? 'hi' : 'en';

        setBpRisk(profile.bpRisk);
        setDiabetesData({
            ...profile.diabetesData,
            recommendations: profile.diabetesData.recommendations[lang],
        });
        setIsHighRisk(profile.isHighRisk);
        setBpInsightLines(profile.bpInsights[lang]);
        setBpLabelText(profile.bpLabel);
        setLoading(false);
    };

    const openAnalysis = (type) => {
        setSelectedRisk(type);
        setAnalysisVisible(true);
    };

    const getAnalogy = (type) => {
        if (type === 'Hypertension') {
            return {
                en: "Think of your blood pressure like water flowing through a pipe. If the pressure is too high, the pipe gets strained. We want to keep it smooth and steady.",
                hi: "अपने रक्तचाप को एक पाइप में बहने वाले पानी की तरह समझें। यदि दबाव बहुत अधिक है, तो पाइप पर तनाव बढ़ जाता है। हम इसे शांत और स्थिर रखना चाहते हैं।"
            };
        }
        if (type === 'Diabetes') {
            return {
                en: "Your body is like a car that needs fuel (sugar). If the engine can't process the fuel properly, it builds up and can cause smoke. We need to balance the fuel for a smooth ride.",
                hi: "आपका शरीर एक कार की तरह है जिसे ईंधन (चीनी) की आवश्यकता होती है। यदि इंजन ईंधन को ठीक से संसाधित नहीं कर पाता है, तो यह जमा हो जाता है और परेशानी पैदा कर सकता है। हमें सुचारू यात्रा के लिए ईंधन को संतुलित करने की आवश्यकता है।"
            };
        }
        return null;
    };

    if (loading) {
        return <ScanLoadingAnimation title={language === 'hi' ? 'एआई डेटा का विश्लेषण कर रहा है...' : 'AI is analyzing data...'} source={null} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>JananiSetu AI</Text>
                    <Text style={styles.subtitle}>
                        {language === 'hi' ? 'एआई-संचालित जोखिम भविष्यवाणी' : 'AI-Powered Risk Prediction'}
                    </Text>
                </View>

                <View style={styles.statusCard}>
                    <View style={[styles.statusIndicator, { backgroundColor: isHighRisk ? Colors.danger : Colors.success }]} />
                    <View>
                        <Text style={styles.statusTitle}>
                            {isHighRisk
                                ? (language === 'hi' ? 'उच्च जोखिम चेतावनी' : 'High Risk Warning')
                                : (language === 'hi' ? 'सामान्य गर्भावस्था' : 'Normal Pregnancy status')
                            }
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {language === 'hi' ? 'नवीनतम डेटा विश्लेषण के आधार पर' : 'Based on latest data analysis'}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="heart-pulse" size={24} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>{language === 'hi' ? 'उच्च रक्तचाप अंतर्दृष्टि' : 'Hypertension Insights'}</Text>
                    </View>

                    <TouchableOpacity activeOpacity={0.9} onPress={() => openAnalysis('Hypertension')}>
                        <GradientCard colors={designSystem.colors.cardGradientBlue}>
                            <View style={styles.cardContentRow}>
                                <HealthScoreRing score={(1 - bpRisk) * 100} size={100} textColor="rgba(255,255,255,0.7)" />
                                <View style={styles.cardRightCol}>
                                    <Text style={styles.cardContentTitle}>
                                        {language === 'hi' ? 'रक्तचाप जोखिम' : 'BP Risk Level'}
                                    </Text>
                                    <AnimatedRiskBar
                                        riskLevel={bpRisk > 0.6 ? 'High' : bpRisk > 0.3 ? 'Medium' : 'Low'}
                                        percentage={bpRisk * 100}
                                        textColor="rgba(255,255,255,0.9)"
                                    />
                                    <Text style={styles.cardContentDesc}>
                                        {language === 'hi' ? bpLabelText.hi : bpLabelText.en}
                                    </Text>
                                </View>
                            </View>
                            <VisualTrendGraph riskLevel={bpRisk} color={designSystem.colors.white} />
                        </GradientCard>
                    </TouchableOpacity>
                    {bpInsightLines && bpInsightLines.length > 0 && (
                        <View style={[styles.insightList, isHighRisk && styles.insightListDanger]}>
                            {bpInsightLines.map((line, i) => (
                                <Text key={i} style={[styles.insightItem, isHighRisk && styles.insightItemDanger]}>{line}</Text>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="water" size={24} color={Colors.warning} />
                        <Text style={styles.sectionTitle}>{language === 'hi' ? 'मधुमेह अंतर्दृष्टि' : 'Diabetes Insights'}</Text>
                    </View>

                    <TouchableOpacity activeOpacity={0.9} onPress={() => openAnalysis('Diabetes')}>
                        <GradientCard colors={designSystem.colors.cardGradientPink}>
                            <View style={styles.cardContentRow}>
                                <HealthScoreRing score={(1 - diabetesData.riskProbability) * 100} size={100} textColor="rgba(255,255,255,0.7)" />
                                <View style={styles.cardRightCol}>
                                    <Text style={styles.cardContentTitle}>
                                        {language === 'hi' ? 'मधुमेह जोखिम' : 'Diabetes Risk'}
                                    </Text>
                                    <AnimatedRiskBar
                                        riskLevel={diabetesData.riskLevel}
                                        percentage={diabetesData.riskProbability * 100}
                                        textColor="rgba(255,255,255,0.9)"
                                    />
                                    <Text style={styles.cardContentDesc}>
                                        {language === 'hi' ? 'अनुमानित ग्लूकोज' : 'Predicted Glucose'}: {diabetesData.predictedGlucose} mg/dL
                                    </Text>
                                </View>
                            </View>
                        </GradientCard>
                    </TouchableOpacity>
                </View>

                {diabetesData?.recommendations && diabetesData.recommendations.length > 0 && (
                    <View style={[styles.recommendationContainer, isHighRisk && styles.recContainerDanger]}>
                        <Text style={styles.recTitle}>{language === 'hi' ? 'एआई सिफारिशें:' : 'AI Recommendations:'}</Text>
                        {diabetesData.recommendations.map((rec, i) => (
                            <Text key={i} style={[styles.recItem, isHighRisk && styles.recItemDanger]}>{rec}</Text>
                        ))}
                    </View>
                )}

                {/* Overall status alert */}
                <View style={[styles.alertCard, isHighRisk ? styles.errorBorder : styles.successBorder]}>
                    <Text style={styles.alertIcon}>{isHighRisk ? '⚠️' : '✅'}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>
                            {isHighRisk
                                ? (language === 'hi' ? 'चिकित्सा ध्यान आवश्यक' : 'Medical Attention Required')
                                : (language === 'hi' ? 'सभी संकेतक सामान्य' : 'All Indicators Normal')
                            }
                        </Text>
                        <Text style={styles.alertText}>
                            {isHighRisk
                                ? (language === 'hi' ? 'आपके बीपी और ग्लूकोज दोनों उच्च जोखिम में हैं। कृपया अपने डॉक्टर से तुरंत संपर्क करें।' : 'Both your BP and glucose are in the high-risk zone. Please contact your doctor immediately.')
                                : (language === 'hi' ? 'आपकी गर्भावस्था स्वस्थ रूप से आगे बढ़ रही है। अगली जांच 2 हफ्ते में।' : 'Your pregnancy is progressing healthily. Next checkup in 2 weeks.')
                            }
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={isAnalysisVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{language === 'hi' ? 'विस्तृत एआई विश्लेषण' : 'Detailed AI Analysis'}</Text>
                            <TouchableOpacity onPress={() => setAnalysisVisible(false)}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.analysisModuleTitle}>
                                {selectedRisk === 'Hypertension' ? (language === 'hi' ? 'उच्च रक्तचाप मॉडल विश्लेषण' : 'Hypertension Model Analysis') :
                                    selectedRisk === 'Diabetes' ? (language === 'hi' ? 'मधुमेह मॉडल विश्लेषण' : 'Diabetes Model Analysis') :
                                        (language === 'hi' ? 'स्वास्थ्य स्थिति विश्लेषण' : 'Health Status Analysis')}
                            </Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{selectedRisk === 'Diabetes' ? 'XGBoost' : 'LSTM'}</Text>
                                    <Text style={styles.statLab}>{language === 'hi' ? 'मॉडल प्रकार' : 'Model Type'}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statVal}>{isHighRisk ? '94.2%' : '98.1%'}</Text>
                                    <Text style={styles.statLab}>{language === 'hi' ? 'सटीकता' : 'Accuracy'}</Text>
                                </View>
                            </View>

                            <VisualTrendGraph
                                riskLevel={selectedRisk === 'Hypertension' ? bpRisk : selectedRisk === 'Diabetes' ? diabetesData.riskProbability : 0.15}
                                color={selectedRisk === 'Diabetes' ? Colors.warning : Colors.primary}
                                dark={true}
                            />

                            <View style={styles.analogyBox}>
                                <Text style={styles.analogyTitle}>
                                    {language === 'hi' ? '💡 सरल शब्दों में इसका क्या अर्थ है?' : '💡 What does this mean in simple terms?'}
                                </Text>
                                <Text style={styles.analogyText}>
                                    {language === 'hi' ? getAnalogy(selectedRisk)?.hi : getAnalogy(selectedRisk)?.en}
                                </Text>
                            </View>

                            <Text style={styles.reasoningTitle}>
                                {language === 'hi' ? '📈 यह निष्कर्ष क्यों निकाला गया है?' : '📈 Why was this conclusion made?'}
                            </Text>

                            <Text style={styles.analysisText}>
                                {selectedRisk === 'Hypertension' && isHighRisk && (
                                    language === 'hi' ?
                                        "• पिछले 14 दिनों में रक्तचाप में लगातार 15% की वृद्धि दर्ज की गई है।\n• आहार में नमक की मात्रा सामान्य से 2.5 गुना अधिक है।\n• पैरों में सूजन और सिरदर्द के आवर्ती लक्षणों का संयोजन उच्चतम जोखिम की ओर इशारा करता है।" :
                                        "• Consistent 15% increase in blood pressure recorded over the last 14 days.\n• Dietary salt intake is 2.5x higher than the recommended limit.\n• Combination of recurring symptoms like swelling and headaches points to elevated risk."
                                )}
                                {selectedRisk === 'Hypertension' && !isHighRisk && (
                                    language === 'hi' ?
                                        "• आपका बीपी औसत 118/78 पर स्थिर है।\n• आहार में सोडियम की मात्रा संतुलित है।\n• कोई प्रतिकूल लक्षण दर्ज नहीं किए गए हैं।" :
                                        "• Your BP is stable at an average of 118/78.\n• Dietary sodium intake is well-balanced.\n• No adverse symptoms have been recorded in your history."
                                )}
                                {selectedRisk === 'Diabetes' && isHighRisk && (
                                    language === 'hi' ?
                                        "• भोजन में उच्च चीनी की मात्रा और ग्लूकोज के उतार-चढ़ाव में सीधा संबंध देखा गया है।\n• व्यायाम की कमी और पारिवारिक इतिहास जोखिम को बढ़ाते हैं।" :
                                        "• Direct correlation observed between high sugar intake and frequent glucose spikes.\n• Lack of physical activity and family history exacerbate the detected risk."
                                )}
                                {selectedRisk === 'Diabetes' && !isHighRisk && (
                                    language === 'hi' ?
                                        "• रक्त शर्करा का स्तर भोजन के बाद भी सुरक्षित सीमा में रहता है।\n• आपके आहार में फाइबर की मात्रा बहुत अच्छी है।" :
                                        "• Blood sugar levels remain within safe bounds even after meals.\n• Excellent fiber content recorded in your recent dietary logs."
                                )}
                                {selectedRisk === 'Normal Status' && (
                                    language === 'hi' ?
                                        "• सभी 12 डेटा पॉइंट (बीपी, शुगर, वजन, आदि) एक स्वस्थ पैटर्न दिखाते हैं।\n• आपका दैनिक दिनचर्या और आहार पूरी तरह से अनुकूल है।" :
                                        "• All 12 key data points (BP, Sugar, Weight, etc.) show a healthy, stable pattern.\n• Your daily routine and nutrition logs are perfectly optimized for your current week."
                                )}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardRightCol: {
        flex: 1,
        marginLeft: 16,
    },
    cardContentTitle: {
        ...designSystem.typography.headingM,
        color: designSystem.colors.white,
        marginBottom: 8,
    },
    cardContentDesc: {
        ...designSystem.typography.bodyS,
        color: designSystem.colors.white,
        marginTop: 8,
        opacity: 0.9,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        fontWeight: '500',
    },
    statusCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 6,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    statusSubtitle: {
        fontSize: 12,
        color: Colors.textLight,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        elevation: 4,
    },
    gaugeContainer: {
        marginBottom: 8,
    },
    gaugeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    gaugeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    gaugeValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    gaugeTrack: {
        height: 12,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 10,
    },
    gaugeFill: {
        height: '100%',
        borderRadius: 6,
    },
    gaugeDesc: {
        fontSize: 12,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 24,
    },
    alertCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    errorBorder: {
        borderColor: Colors.danger + '40',
        backgroundColor: Colors.danger + '05',
    },
    successBorder: {
        borderColor: Colors.success + '40',
        backgroundColor: Colors.success + '05',
    },
    alertIcon: {
        fontSize: 28,
        marginRight: 16,
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    alertText: {
        fontSize: 14,
        color: Colors.textLight,
        lineHeight: 20,
    },
    insightList: {
        backgroundColor: Colors.success + '10',
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
        borderLeftWidth: 3,
        borderLeftColor: Colors.success,
    },
    insightListDanger: {
        backgroundColor: Colors.danger + '10',
        borderLeftColor: Colors.danger,
    },
    insightItem: {
        fontSize: 13,
        color: Colors.textLight,
        lineHeight: 20,
        marginBottom: 4,
    },
    insightItemDanger: {
        color: Colors.danger,
        fontWeight: '600',
    },
    recContainerDanger: {
        backgroundColor: Colors.warning + '12',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.warning + '40',
    },
    recItemDanger: {
        color: Colors.text,
        fontWeight: '600',
    },
    predictionHighlight: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    highlightLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textLight,
    },
    highlightValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    recommendationContainer: {
        backgroundColor: Colors.primary + '10',
        borderRadius: 20,
        padding: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    recTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 12,
    },
    recItem: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
    },
    closeText: {
        fontSize: 24,
        color: Colors.textLight,
        fontWeight: '300',
    },
    analysisModuleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
    },
    statLab: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 4,
    },
    analysisText: {
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
        marginBottom: 24,
    },
    chartPlaceholder: {
        height: 200,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: Colors.border,
    },
    chartText: {
        color: Colors.textLight,
        fontWeight: '600',
    },
    chartContainer: {
        height: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        flexDirection: 'row',
    },
    chartContainerDark: {
        backgroundColor: Colors.surfaceLight,
    },
    yAxis: {
        justifyContent: 'space-between',
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.2)',
    },
    yAxisDark: {
        borderRightColor: Colors.border,
    },
    axisText: {
        fontSize: 10,
        color: Colors.white,
        fontWeight: '600',
    },
    axisTextDark: {
        color: Colors.textLight,
    },
    graphArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingLeft: 10,
    },
    barGroup: {
        alignItems: 'center',
        flex: 1,
    },
    graphBar: {
        width: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    barLabel: {
        fontSize: 8,
        color: Colors.white,
        fontWeight: '700',
        opacity: 0.8,
    },
    barLabelDark: {
        color: Colors.textLight,
    },
    analogyBox: {
        backgroundColor: Colors.primary + '08',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: Colors.primary + '20',
    },
    analogyTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 8,
    },
    analogyText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    reasoningTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 12,
    },
});
