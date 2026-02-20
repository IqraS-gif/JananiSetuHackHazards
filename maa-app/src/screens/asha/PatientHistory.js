import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    Modal,
    Animated,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, LinearGradient as SvgGradient, Stop, Defs } from 'react-native-svg';
import { Colors } from '../../constants';
import designSystem from '../../theme/designSystem';
import { useLanguage } from '../../context/LanguageContext';
import { summarizeVisit } from '../../services/ai/GeminiService';
import * as FileSystem from 'expo-file-system/legacy';
import {
    saveVisitSummary,
    getVisitHistory,
    getDoctorInstructions
} from '../../services/database/DatabaseService';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Reusable Components ────────────────────────────────────────────────────

const CircularRiskGauge = ({ score = 0, size = 90, strokeWidth = 8, label, level, isHindi }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const animatedProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: score,
            duration: 1500,
            useNativeDriver: true,
        }).start();
    }, [score]);

    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    const getLocalizedLevel = (lvl) => {
        if (!isHindi) return lvl;
        if (lvl === 'HIGH') return 'उच्च';
        if (lvl === 'LOW') return 'सामान्य';
        return lvl;
    };

    const getLocalizedLabel = (lbl) => {
        if (!isHindi) return lbl;
        if (lbl === 'BP Risk') return 'बीपी जोखिम';
        if (lbl === 'Diabetes Risk') return 'शुगर जोखिम';
        return lbl;
    };

    return (
        <View style={st.gaugeWrapper}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size}>
                    <Defs>
                        <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <Stop offset="0%" stopColor="#FF718B" />
                            <Stop offset="100%" stopColor="#FF4B6C" />
                        </SvgGradient>
                    </Defs>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#FEE6EA"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="url(#grad)"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>
                <View style={st.gaugeCenter}>
                    <View style={st.gaugeValueRow}>
                        <Text style={st.gaugeValueText}>{Math.round(score)}</Text>
                        <Text style={st.gaugePercentSign}>%</Text>
                    </View>
                </View>
            </View>
            <View style={st.gaugeInfoContainer}>
                <Text style={st.gaugeLabelText}>{getLocalizedLabel(label)}</Text>
                <Text style={st.gaugeLevelText}>{getLocalizedLevel(level)}</Text>
                <View style={st.miniBadge}>
                    <View style={[st.miniDot, { backgroundColor: '#FF4B6C' }]} />
                    <Text style={st.miniBadgeText}>{getLocalizedLevel(level)}</Text>
                </View>
            </View>
        </View>
    );
};

const VisualTrendGraph = ({ riskLevel, color, dark = false, isHindi }) => {
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
        const baseValues = riskLevel > 0.5
            ? [0.2, 0.35, 0.5, 0.7, 0.85]
            : [0.15, 0.12, 0.18, 0.14, 0.16];

        const animations = animatedValues.map((val, i) =>
            Animated.timing(val, {
                toValue: baseValues[i],
                duration: 1000 + (i * 200),
                useNativeDriver: false,
            })
        );
        Animated.parallel(animations).start();
    }, [riskLevel]);

    return (
        <View style={[st.chartContainer, dark && st.chartContainerDark]}>
            <View style={[st.yAxis, dark && st.yAxisDark]}>
                <Text style={[st.axisText, dark && st.axisTextDark]}>{isHindi ? 'उच्च' : 'High'}</Text>
                <Text style={[st.axisText, dark && st.axisTextDark]}>{isHindi ? 'कम' : 'Low'}</Text>
            </View>
            <View style={st.graphArea}>
                {animatedValues.map((val, i) => (
                    <View key={i} style={st.barGroup}>
                        <Animated.View
                            style={[
                                st.graphBar,
                                {
                                    height: val.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%']
                                    }),
                                    backgroundColor: color,
                                }
                            ]}
                        />
                        <Text style={[st.barLabel, dark && st.barLabelDark]}>T-{40 - (i * 10)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const PATIENT_IMAGES = {
    'user_001': require('../../../assets/images/anjali_sharma.jpg'),
    'user_002': require('../../../assets/images/sunita_devi.jpg'),
};

const PATIENT_DATA = {
    'user_002': {
        name: 'Sunita Devi',
        image: PATIENT_IMAGES['user_002'],
        age: 26,
        week: 28,
        risk: 'High',
        vitals: [
            { label: 'BP', value: '145/95', status: 'high', unit: 'mmHg', icon: 'heart-pulse' },
            { label: 'Hb', value: '9.2', status: 'low', unit: 'g/dL', icon: 'water' },
            { label: 'Weight', value: '68', status: 'normal', unit: 'kg', icon: 'scale-bathroom' },
            { label: 'Sugar', value: '188', status: 'high', unit: 'mg/dL', icon: 'cup-water' },
        ],
        predictions: {
            bp: {
                risk: 0.84,
                level: 'HIGH',
                label: 'BP Risk',
                reasoning: {
                    en: [
                        'BP increased 25% over last 40 days.',
                        'Dietary salt intake is 2.5x higher than recommended.',
                        'Preeclampsia screening strongly advised.'
                    ],
                    hi: [
                        'पिछले 40 दिनों में बीपी में 25% की वृद्धि हुई है।',
                        'नमक का सेवन अनुशंसित स्तर से 2.5 गुना अधिक है।',
                        'प्री-एक्लेम्पसिया जांच की सख्त सलाह दी जाती है।'
                    ]
                },
                recs: {
                    en: [
                        'Consult doctor immediately about Hypertension.',
                        'Reduce salt intake to less than 2g/day.',
                        'Monitor BP every 4 hours.'
                    ],
                    hi: [
                        'उच्च रक्तचाप के बारे में तुरंत डॉक्टर से सलाह लें।',
                        'नमक का सेवन रोजाना 2 ग्राम से कम करें।',
                        'हर 4 घंटे में बीपी की निगरानी करें।'
                    ]
                }
            },
            diabetes: {
                risk: 0.91,
                level: 'HIGH',
                label: 'Diabetes Risk',
                glucose: 188,
                reasoning: {
                    en: [
                        'Direct correlation between high sugar intake and spikes.',
                        'Lack of physical activity detected recently.',
                        'Family history exacerbates detected risk.'
                    ],
                    hi: [
                        'चीनी का अधिक सेवन और शुगर बढ़ने के बीच सीधा संबंध है।',
                        'हाल ही में शारीरिक गतिविधि में कमी पाई गई है।',
                        'पारिवारिक इतिहास जोखिम को और बढ़ाता है।'
                    ]
                },
                recs: {
                    en: [
                        '⚠️ Consult doctor about Gestational Diabetes.',
                        'Reduce carbs intake. Avoid white rice.',
                        'Walk for 20 minutes after every meal.'
                    ],
                    hi: [
                        '⚠️ गर्भकालीन मधुमेह के बारे में डॉक्टर से सलाह लें।',
                        'कार्बोहाइड्रेट कम करें। सफेद चावल से बचें।',
                        'हर भोजन के बाद 20 मिनट तक टहलें।'
                    ]
                }
            },
        },
        nutrition: {
            avgDailyCalories: 2450,
            targetCalories: 2200,
            recommendations: [
                { label: 'Reduce salt intake', labelHi: 'नमक का सेवन कम करें', value: 65, color: '#FF718B' },
                { label: 'Monitor BP twice daily', labelHi: 'बीपी की दिन में दो बार जांच', value: 15, color: '#FFB020' },
                { label: 'Iron rich diet recommended', labelHi: 'आयरन युक्त आहार लें', value: 20, color: '#4CAF50' },
                { label: 'Schedule doctor visit', labelHi: 'डॉक्टर से मिलें', value: 0, color: '#FF718B', isCheck: true },
            ],
            intake: [
                { nutrient: 'Iron', nutrientHi: 'आयरन', consumed: 12, required: 27, status: 'low' },
                { nutrient: 'Calcium', nutrientHi: 'कैल्शियम', consumed: 800, required: 1200, status: 'medium' },
                { nutrient: 'Protein', nutrientHi: 'प्रोटीन', consumed: 45, required: 75, status: 'low' },
                { nutrient: 'Folic Acid', nutrientHi: 'फॉलिक एसिड', consumed: 250, required: 400, status: 'low' },
                { nutrient: 'Sodium', nutrientHi: 'सोडियम', consumed: 4500, required: 2300, status: 'high' },
            ]
        },
        alerts: {
            en: [
                'High Blood Pressure detected',
                'Blood Sugar above safe range',
                'Hemoglobin is low (risk of anemia)'
            ],
            hi: [
                'उच्च रक्तचाप का पता चला है',
                'ब्लड शुगर सुरक्षित सीमा से ऊपर है',
                'हीमोग्लोबिन कम है (एनीमिया का जोखिम)'
            ]
        }
    },
    'user_001': {
        name: 'Anjali Sharma',
        image: PATIENT_IMAGES['user_001'],
        age: 23,
        week: 32,
        risk: 'Low',
        vitals: [
            { label: 'BP', value: '118/78', status: 'normal', unit: 'mmHg', icon: 'heart-pulse' },
            { label: 'Hb', value: '11.5', status: 'normal', unit: 'g/dL', icon: 'water' },
            { label: 'Weight', value: '62', status: 'normal', unit: 'kg', icon: 'scale-bathroom' },
            { label: 'Sugar', value: '98', status: 'normal', unit: 'mg/dL', icon: 'cup-water' },
        ],
        predictions: {
            bp: {
                risk: 0.08,
                level: 'LOW',
                label: 'BP Risk',
                reasoning: {
                    en: [
                        'BP stable at average 118/78.',
                        'Dietary sodium is well-balanced.',
                        'No adverse symptoms recorded.'
                    ],
                    hi: [
                        'बीपी औसत 118/78 पर स्थिर है।',
                        'आहार में सोडियम संतुलित है।',
                        'कोई प्रतिकूल लक्षण दर्ज नहीं किए गए।'
                    ]
                },
                recs: {
                    en: [
                        'Keep up your healthy routine.',
                        'Next checkup recommended in 2 weeks.',
                        'Continue iron supplements.'
                    ],
                    hi: [
                        'अपनी स्वस्थ दिनचर्या जारी रखें।',
                        'अगली जांच 2 सप्ताह में करने की सलाह दी जाती है।',
                        'आयरन सप्लीमेंट लेना जारी रखें।'
                    ]
                }
            },
            diabetes: {
                risk: 0.06,
                level: 'LOW',
                label: 'Diabetes Risk',
                glucose: 98,
                reasoning: {
                    en: [
                        'Blood sugar remains within safe bounds.',
                        'Excellent fiber content in recent logs.',
                        'Glucose levels optimal even after meals.'
                    ],
                    hi: [
                        'ब्लड शुगर सुरक्षित सीमा के भीतर है।',
                        'हाल के भोजन में फाइबर की मात्रा बहुत अच्छी है।',
                        'भोजन के बाद भी शुगर का स्तर सामान्य है।'
                    ]
                },
                recs: {
                    en: [
                        'Great work! Glucose levels are optimal.',
                        'Continue balanced meals and walks.',
                        'Stay hydrated with 8+ glasses of water.'
                    ],
                    hi: [
                        'बहुत बढ़िया! शुगर का स्तर सामान्य है।',
                        'संतुलित आहार और टहलना जारी रखें।',
                        'दिन में 8+ गिलास पानी पिएं।'
                    ]
                }
            },
        },
        nutrition: {
            avgDailyCalories: 2150,
            targetCalories: 2200,
            recommendations: [
                { label: 'Continue balanced diet', labelHi: 'संतुलित आहार जारी रखें', value: 85, color: '#4CAF50' },
                { label: 'Hydration: 8 glasses daily', labelHi: 'दिन में 8 गिलास पानी पिएं', value: 90, color: '#4CAF50' },
                { label: 'Iron rich diet recommended', labelHi: 'आयरन युक्त आहार लें', value: 75, color: '#4CAF50' },
            ],
            intake: [
                { nutrient: 'Iron', nutrientHi: 'आयरन', consumed: 25, required: 27, status: 'good' },
                { nutrient: 'Calcium', nutrientHi: 'कैल्शियम', consumed: 1100, required: 1200, status: 'good' },
                { nutrient: 'Protein', nutrientHi: 'प्रोटीन', consumed: 70, required: 75, status: 'good' },
                { nutrient: 'Folic Acid', nutrientHi: 'फॉलिक एसिड', consumed: 380, required: 400, status: 'good' },
                { nutrient: 'Sodium', nutrientHi: 'सोडियम', consumed: 1800, required: 2300, status: 'good' },
            ]
        },
        alerts: {
            en: [
                'All indicators within normal range'
            ],
            hi: [
                'सभी संकेतक सामान्य सीमा के भीतर हैं'
            ]
        }
    },
};

export default function PatientHistory({ route, navigation }) {
    const { language } = useLanguage();
    const isHindi = language === 'hi';
    const { patientId } = route.params || { patientId: 'user_002' };
    const patient = PATIENT_DATA[patientId] || PATIENT_DATA['user_002'];

    const [isAnalysisVisible, setAnalysisVisible] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState(null);

    // Visit Recording States
    const [visitModalVisible, setVisitModalVisible] = useState(false);
    const [visitNote, setVisitNote] = useState('');
    const [isSavingVisit, setIsSavingVisit] = useState(false);
    const [visitHistory, setVisitHistory] = useState([]);
    const [viewingVisit, setViewingVisit] = useState(null);

    // Audio Recording States
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUri, setRecordingUri] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef(null);

    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        } else {
            pulseAnim.setValue(1);
            if (timerRef.current) clearInterval(timerRef.current);
            setRecordingTime(0);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    const [doctorInstructions, setDoctorInstructions] = useState([]);

    useEffect(() => {
        loadVisitHistory();
        loadDoctorInstructions();
    }, [patientId]);

    const loadVisitHistory = async () => {
        try {
            const history = await getVisitHistory(patientId);
            setVisitHistory(history);
        } catch (error) {
            console.error("Failed to load visit history:", error);
        }
    };

    const loadDoctorInstructions = async () => {
        try {
            const data = await getDoctorInstructions(patientId);
            setDoctorInstructions(data);
        } catch (error) {
            console.error("Failed to load doctor instructions:", error);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    async function startRecording() {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(isHindi ? "अनुमति आवश्यक" : "Permission Denied", isHindi ? "रिकॉर्डिंग के लिए माइक्रोफ़ोन अनुमति चाहिए" : "Microphone permission is required for recording.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert(isHindi ? "त्रुटि" : "Error", isHindi ? "रिकॉर्डिंग शुरू करने में विफल" : "Failed to start recording.");
        }
    }

    async function stopRecording() {
        if (!recording) return;
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecordingUri(uri);
            setRecording(null);

            // Process immediately if audio is detected
            processAudio(uri);
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    }

    const processAudio = async (uri) => {
        setIsSavingVisit(true);
        try {
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            // Call Gemini with actual audio data
            const summary = await summarizeVisit(base64Audio, true, 'audio/m4a');

            // Save to database
            await saveVisitSummary(patientId, "[Audio Content Processed]", summary);

            // Reload history
            await loadVisitHistory();

            setVisitModalVisible(false);
            setVisitNote('');
            setRecordingUri(null);
            Alert.alert(isHindi ? "विज़िट सहेजी गई" : "Visit Saved", isHindi ? "एआई ने आपके ऑडियो को प्रोसेस और समराइज कर लिया है।" : "AI has successfully processed and summarized your audio recording.");
        } catch (error) {
            console.error(error);
            Alert.alert(isHindi ? "त्रुटि" : "Error", isHindi ? "ऑडियो प्रोसेस करने में विफल।" : "Failed to process audio recording.");
        } finally {
            setIsSavingVisit(false);
        }
    };

    const handleSaveTextVisit = async () => {
        if (!visitNote.trim()) return;
        setIsSavingVisit(true);
        try {
            const summary = await summarizeVisit(visitNote);

            // Save to database
            await saveVisitSummary(patientId, visitNote, summary);

            // Reload history
            await loadVisitHistory();

            setVisitModalVisible(false);
            setVisitNote('');
            Alert.alert(isHindi ? "विज़िट सहेजी गई" : "Visit Saved", isHindi ? "एआई ने विज़िट का सारांश तैयार कर लिया है।" : "AI has generated a structured summary of your visit.");
        } catch (error) {
            console.error(error);
            Alert.alert(isHindi ? "त्रुटि" : "Error", isHindi ? "विज़िट सहेजने में विफल।" : "Failed to process visit notes.");
        } finally {
            setIsSavingVisit(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'high': return '#FF4B6C';
            case 'low': return '#FFB020';
            case 'normal':
            case 'good': return '#4CAF50';
            default: return Colors.textLight;
        }
    };

    const getStatusText = (status) => {
        if (!isHindi) return status.charAt(0).toUpperCase() + status.slice(1);
        switch (status) {
            case 'high': return 'उच्च';
            case 'low': return 'कम';
            case 'medium': return 'मध्यम';
            case 'normal': return 'सामान्य';
            case 'good': return 'अच्छा';
            default: return status;
        }
    };

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FF4B6C" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>{isHindi ? 'मरीज का इतिहास' : 'Patient History'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

                {/* Patient Profile Card */}
                <View style={st.profileCard}>
                    <View style={st.profileTop}>
                        <View style={st.avatarContainer}>
                            <View style={st.avatarBorder}>
                                <View style={st.avatarInner}>
                                    {patient.image ? (
                                        <Image source={patient.image} style={st.patientAvatarImg} />
                                    ) : (
                                        <MaterialCommunityIcons name="account" size={50} color="#FF718B" />
                                    )}
                                </View>
                            </View>
                        </View>
                        <View style={st.profileHeaderInfo}>
                            <View style={st.nameRow}>
                                <Text style={st.patientName}>{patient.name}</Text>
                                <View style={[st.riskTag, { backgroundColor: patient.risk === 'High' ? '#FF718B' : '#4CAF50' }]}>
                                    <Text style={st.riskTagText}>
                                        {isHindi
                                            ? (patient.risk === 'High' ? 'उच्च जोखिम' : 'सामान्य स्थिति')
                                            : `${patient.risk.toUpperCase()} RISK`}
                                    </Text>
                                </View>
                            </View>
                            <Text style={st.patientSub}>{patient.age} {isHindi ? 'साल' : 'yrs'} • {isHindi ? 'हफ्ता' : 'Week'} {patient.week}</Text>

                            <View style={st.progressSection}>
                                <View style={st.progressTextRow}>
                                    <Text style={st.progressLabel}>{isHindi ? 'गर्भावस्था की प्रगति' : 'Pregnancy Progress'}</Text>
                                    <Text style={st.progressValue}>{isHindi ? 'हफ्ता' : 'Week'} {patient.week} / 40</Text>
                                </View>
                                <View style={st.progressTrack}>
                                    <View style={[st.progressFill, { width: `${(patient.week / 40) * 100}%` }]} />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Health Predictions */}
                <View style={st.section}>
                    <View style={st.sectionTitleRow}>
                        <MaterialCommunityIcons name="robot" size={20} color="#FF4B6C" />
                        <Text style={st.sectionTitle}>{isHindi ? 'एआई स्वास्थ्य भविष्यवाणी' : 'AI Health Predictions'}</Text>
                    </View>
                    <View style={st.predictionCardsRow}>
                        <TouchableOpacity
                            style={st.riskGaugeCard}
                            activeOpacity={0.8}
                            onPress={() => { setSelectedRisk('Hypertension'); setAnalysisVisible(true); }}
                        >
                            <CircularRiskGauge
                                score={patient.predictions.bp.risk * 100}
                                label="BP Risk"
                                level={patient.predictions.bp.level}
                                isHindi={isHindi}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={st.riskGaugeCard}
                            activeOpacity={0.8}
                            onPress={() => { setSelectedRisk('Diabetes'); setAnalysisVisible(true); }}
                        >
                            <CircularRiskGauge
                                score={patient.predictions.diabetes.risk * 100}
                                label="Diabetes Risk"
                                level={patient.predictions.diabetes.level}
                                isHindi={isHindi}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Health Alerts */}
                {patient.alerts && (isHindi ? patient.alerts.hi : patient.alerts.en).length > 0 && (
                    <View style={st.section}>
                        <View style={st.sectionTitleRow}>
                            <MaterialCommunityIcons name="alert" size={20} color="#FFB020" />
                            <Text style={st.sectionTitle}>{isHindi ? 'स्वास्थ्य चेतावनी' : 'Health Alerts'}</Text>
                        </View>
                        <View style={st.alertsBox}>
                            {(isHindi ? patient.alerts.hi : patient.alerts.en).map((alert, idx) => (
                                <View key={idx} style={st.alertLine}>
                                    <View style={[st.bullet, { backgroundColor: patient.risk === 'High' ? '#FF4B6C' : '#4CAF50' }]} />
                                    <Text style={st.alertText}>{alert}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Instructions from Doctor (NEW) */}
                {doctorInstructions.length > 0 && (
                    <View style={st.section}>
                        <View style={st.sectionTitleRow}>
                            <MaterialCommunityIcons name="comment-text-outline" size={20} color="#10B981" />
                            <Text style={st.sectionTitle}>{isHindi ? 'डॉक्टर के निर्देश' : 'Doctor\'s Instructions'}</Text>
                        </View>
                        <View style={st.instructionsBox}>
                            {doctorInstructions.map((inst, idx) => (
                                <View key={idx} style={st.instructionLine}>
                                    <Text style={st.instructionText}>• {inst.instruction}</Text>
                                    <Text style={st.instructionDate}>{new Date(inst.created_at).toLocaleDateString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Latest Vitals Grid */}
                <View style={st.section}>
                    <View style={st.sectionTitleRow}>
                        <Text style={st.sectionTitle}>{isHindi ? 'नवीनतम महत्वपूर्ण संकेत' : 'Latest Vitals'}</Text>
                    </View>
                    <View style={st.vitalsGrid}>
                        {patient.vitals.map((v, i) => (
                            <View key={i} style={st.vitalCard}>
                                <View style={st.vitalTop}>
                                    <MaterialCommunityIcons name={v.icon} size={20} color={getStatusColor(v.status)} />
                                    <Text style={st.vitalName}>{v.label}</Text>
                                    <View style={[st.statusPill, { backgroundColor: getStatusColor(v.status) + '20' }]}>
                                        <Text style={[st.statusPillText, { color: getStatusColor(v.status) }]}>{getStatusText(v.status)}</Text>
                                    </View>
                                </View>
                                <View style={st.vitalMainRow}>
                                    <Text style={st.vitalValue}>{v.value}</Text>
                                    <Text style={st.vitalUnit}>{v.unit}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Visit History Timeline */}
                {visitHistory.length > 0 && (
                    <View style={st.section}>
                        <View style={st.sectionTitleRow}>
                            <MaterialCommunityIcons name="history" size={20} color="#6366F1" />
                            <Text style={st.sectionTitle}>{isHindi ? 'विज़िट इतिहास' : 'Visit History'}</Text>
                        </View>
                        {visitHistory.map((visit) => (
                            <TouchableOpacity
                                key={visit.id}
                                style={st.visitHistoryCard}
                                onPress={() => setViewingVisit(visit)}
                            >
                                <View style={st.visitCardHeader}>
                                    <View style={st.visitDateBadge}>
                                        <MaterialCommunityIcons name="calendar" size={14} color="#6366F1" />
                                        <Text style={st.visitDate}>{visit.date}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                                </View>
                                <Text style={st.visitSnippet} numberOfLines={2}>
                                    {isHindi ? visit.summary.summary_hi.observations : visit.summary.summary_en.observations}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={st.primaryBtn}
                    activeOpacity={0.8}
                    onPress={() => setVisitModalVisible(true)}
                >
                    <MaterialCommunityIcons name="microphone-outline" size={22} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={st.primaryBtnText}>{isHindi ? 'विज़िट रिकॉर्ड करें' : 'Record Home Visit'}</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* AI Visit Recording Modal with RELIABLE AUDIO INPUT */}
            <Modal visible={visitModalVisible} animationType="slide" transparent={true}>
                <View style={st.modalOverlay}>
                    <View style={st.modalContent}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{isHindi ? 'विज़िट रिकॉर्डिंग' : 'Visit Recording'}</Text>
                            <TouchableOpacity onPress={() => { setVisitModalVisible(false); if (isRecording) stopRecording(); }}>
                                <MaterialCommunityIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {isSavingVisit ? (
                            <View style={st.loaderContainer}>
                                <ActivityIndicator size="large" color="#6366F1" />
                                <Text style={st.loaderText}>{isHindi ? 'एआई ऑडियो को प्रोसेस कर रहा है...' : 'AI is processing your audio...'}</Text>
                            </View>
                        ) : (
                            <View style={st.inputContainer}>
                                <TextInput
                                    style={st.visitInput}
                                    placeholder={isHindi ? 'विवरण यहाँ लिखें या बोलें...' : 'Type details here or use the mic...'}
                                    multiline
                                    value={visitNote}
                                    onChangeText={setVisitNote}
                                />

                                <View style={st.voiceActionWrapper}>
                                    {isRecording && (
                                        <Text style={st.recordingTimer}>{formatTime(recordingTime)}</Text>
                                    )}
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[st.micButton, isRecording && st.micButtonActive]}
                                        onPress={isRecording ? stopRecording : startRecording}
                                    >
                                        <Animated.View style={[st.micPulse, { transform: [{ scale: pulseAnim }], opacity: isRecording ? 0.3 : 0 }]} />
                                        <MaterialCommunityIcons
                                            name={isRecording ? "stop" : "microphone"}
                                            size={35}
                                            color="#FFF"
                                        />
                                    </TouchableOpacity>
                                    <Text style={st.voiceHintText}>
                                        {isRecording
                                            ? (isHindi ? 'बोलना जारी रखें...' : 'Keep speaking...')
                                            : (isHindi ? 'बोलने के लिए टैप करें' : 'Tap to speak')}
                                    </Text>
                                </View>

                                {visitNote.trim().length > 0 && !isRecording && (
                                    <TouchableOpacity
                                        style={st.saveVisitBtn}
                                        onPress={handleSaveTextVisit}
                                    >
                                        <MaterialCommunityIcons name="auto-fix" size={20} color="#FFF" />
                                        <Text style={st.saveVisitText}>{isHindi ? 'लिखा हुआ सहेजें' : 'Save Typed Notes'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Summary View Modal */}
            <Modal visible={viewingVisit !== null} animationType="fade" transparent={true}>
                <View style={st.summaryOverlay}>
                    <View style={st.summaryModal}>
                        <View style={st.summaryHeader}>
                            <Text style={st.summaryTitle}>{isHindi ? 'विज़िट रिपोर्ट' : 'Visit Report'}</Text>
                            <TouchableOpacity onPress={() => setViewingVisit(null)}>
                                <MaterialCommunityIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={st.reportSection}>
                                <Text style={st.reportLabel}>{isHindi ? 'अवलोकन' : 'Observations'}</Text>
                                <Text style={st.reportText}>
                                    {isHindi ? viewingVisit?.summary.summary_hi.observations : viewingVisit?.summary.summary_en.observations}
                                </Text>
                            </View>

                            <View style={st.reportSection}>
                                <Text style={st.reportLabel}>{isHindi ? 'संकेतक' : 'Indicators'}</Text>
                                {(isHindi ? viewingVisit?.summary.summary_hi.indicators : viewingVisit?.summary.summary_en.indicators)?.map((item, i) => (
                                    <Text key={i} style={st.listItem}>• {item}</Text>
                                ))}
                            </View>

                            <View style={st.reportSection}>
                                <Text style={st.reportLabel}>{isHindi ? 'दी गई सलाह' : 'Advice'}</Text>
                                {(isHindi ? viewingVisit?.summary.summary_hi.advice : viewingVisit?.summary.summary_en.advice)?.map((item, i) => (
                                    <Text key={i} style={st.listItem}>• {item}</Text>
                                ))}
                            </View>

                            {viewingVisit?.summary.summary_en.emergency !== "None" && (
                                <View style={st.emergencyBox}>
                                    <MaterialCommunityIcons name="alert-decagram" size={20} color="#FFF" />
                                    <Text style={st.emergencyText}>
                                        {isHindi ? viewingVisit?.summary.summary_hi.emergency : viewingVisit?.summary.summary_en.emergency}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Analysis Modal */}
            <Modal visible={isAnalysisVisible} animationType="slide" transparent={true}>
                <View style={st.modalOverlay}>
                    <View style={st.modalContent}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{isHindi ? 'विस्तृत एआई विश्लेषण' : 'Detailed AI Analysis'}</Text>
                            <TouchableOpacity onPress={() => setAnalysisVisible(false)}>
                                <Text style={st.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <VisualTrendGraph
                                riskLevel={selectedRisk === 'Hypertension' ? patient.predictions.bp.risk : patient.predictions.diabetes.risk}
                                color={selectedRisk === 'Hypertension' ? "#FF4B6C" : "#FFB020"}
                                dark={true}
                                isHindi={isHindi}
                            />
                            <View style={st.reasoningBox}>
                                <Text style={st.reasoningTitle}>📈 {isHindi ? 'निष्कर्ष और सुझाव' : 'Conclusion & Suggestions'}</Text>
                                {((selectedRisk === 'Hypertension' ? patient.predictions.bp : patient.predictions.diabetes)?.reasoning[isHindi ? 'hi' : 'en'] || []).map((r, i) => (
                                    <Text key={i} style={st.reasoningText}>• {r}</Text>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7F9' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'transparent' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#4A4A4A' },
    backBtn: { padding: 4 },
    scroll: { paddingHorizontal: 20, paddingBottom: 50 },
    profileCard: { backgroundColor: Colors.white, borderRadius: 30, padding: 15, marginBottom: 20, shadowColor: '#FF718B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    profileTop: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { marginRight: 20 },
    avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: '#FF718B20', padding: 4, alignItems: 'center', justifyContent: 'center' },
    avatarInner: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FEE6EA', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    patientAvatarImg: { width: 90, height: 90, borderRadius: 45 },
    profileHeaderInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    patientName: { fontSize: 24, fontWeight: '800', color: '#333' },
    riskTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    riskTagText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
    patientSub: { fontSize: 14, color: '#999', fontWeight: '500' },
    progressSection: { marginTop: 15 },
    progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 12, color: '#666', fontWeight: '600' },
    progressValue: { fontSize: 12, color: '#999', fontWeight: '500' },
    progressTrack: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FF718B', borderRadius: 4 },
    section: { marginBottom: 25 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#4A4A4A' },
    predictionCardsRow: { flexDirection: 'row', gap: 15 },
    riskGaugeCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 25, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
    gaugeWrapper: { alignItems: 'center' },
    gaugeCenter: { position: 'absolute', alignItems: 'center' },
    gaugeValueRow: { flexDirection: 'row', alignItems: 'flex-start' },
    gaugeValueText: { fontSize: 24, fontWeight: '800', color: '#FF4B6C' },
    gaugePercentSign: { fontSize: 14, fontWeight: '700', color: '#FF4B6C', marginTop: 4 },
    gaugeInfoContainer: { marginTop: 10, alignItems: 'center' },
    gaugeLabelText: { fontSize: 14, fontWeight: '700', color: '#666' },
    gaugeLevelText: { fontSize: 16, fontWeight: '800', color: '#333' },
    miniBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE6EA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, marginTop: 5 },
    miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    miniBadgeText: { fontSize: 10, fontWeight: '800', color: '#FF4B6C' },
    alertsBox: { backgroundColor: Colors.white, borderRadius: 25, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
    alertLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    bullet: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
    alertText: { fontSize: 14, fontWeight: '600', color: '#666' },
    vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    vitalCard: { width: (width - 40 - 15) / 2, backgroundColor: Colors.white, borderRadius: 25, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
    vitalTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    vitalName: { fontSize: 14, fontWeight: '700', color: '#999', flex: 1 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusPillText: { fontSize: 10, fontWeight: '800' },
    vitalMainRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    vitalValue: { fontSize: 22, fontWeight: '900', color: '#333' },
    vitalUnit: { fontSize: 12, fontWeight: '600', color: '#999' },
    primaryBtn: { backgroundColor: '#FF718B', borderRadius: 25, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: '#FF718B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, flexDirection: 'row', justifyContent: 'center' },
    primaryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' },

    // Visit History
    visitHistoryCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 18, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#6366F1', elevation: 2 },
    visitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    visitDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    visitDate: { fontSize: 13, fontWeight: '800', color: '#6366F1' },
    visitSnippet: { fontSize: 13, color: '#666', lineHeight: 18 },

    // Recording Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#333' },
    inputContainer: { flex: 1 },
    visitInput: { flex: 0.5, backgroundColor: '#F8F9FE', borderRadius: 25, padding: 20, fontSize: 16, color: '#333', textAlignVertical: 'top', borderWidth: 1, borderColor: '#EEE', marginBottom: 20 },
    voiceActionWrapper: { flex: 0.5, alignItems: 'center', justifyContent: 'center' },
    micButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', elevation: 15 },
    micButtonActive: { backgroundColor: '#FF4B6C' },
    micPulse: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: '#FF4B6C' },
    recordingTimer: { fontSize: 32, fontWeight: '900', color: '#FF4B6C', marginBottom: 20, letterSpacing: 2 },
    voiceHintText: { marginTop: 15, fontSize: 15, color: '#666', fontWeight: '700' },
    saveVisitBtn: { backgroundColor: '#6366F1', borderRadius: 22, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10 },
    saveVisitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
    loaderText: { fontSize: 16, color: '#6366F1', fontWeight: '700' },

    // Summary View
    summaryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    summaryModal: { backgroundColor: '#FFF', borderRadius: 30, padding: 25, height: '85%' },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    summaryTitle: { fontSize: 24, fontWeight: '900', color: '#333' },
    reportSection: { marginBottom: 20 },
    reportLabel: { fontSize: 11, fontWeight: '900', color: '#FF718B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    reportText: { fontSize: 15, color: '#444', lineHeight: 22 },
    listItem: { fontSize: 14, color: '#444', marginBottom: 5 },
    emergencyBox: { backgroundColor: '#FF4B6C', padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
    emergencyText: { color: '#FFF', fontWeight: '800', flex: 1, fontSize: 14 },
    closeText: { fontSize: 24, color: '#BBB' },
    reasoningBox: { marginTop: 20 },
    reasoningTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
    reasoningText: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 5 },
    chartContainer: { height: 180, backgroundColor: '#FEE6EA30', borderRadius: 20, padding: 16, marginBottom: 24, flexDirection: 'row' },
    chartContainerDark: { backgroundColor: '#F8F9FE' },
    yAxis: { justifyContent: 'space-between', paddingRight: 10, borderRightWidth: 1, borderRightColor: '#EEE' },
    axisText: { fontSize: 10, color: '#999', fontWeight: '600' },
    graphArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingLeft: 10 },
    barGroup: { alignItems: 'center', flex: 1 },
    graphBar: { width: 12, borderRadius: 6 },
    barLabel: { fontSize: 8, color: '#999', marginTop: 4 },
    instructionsBox: { backgroundColor: '#F0FDFA', borderRadius: 25, padding: 20, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    instructionLine: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#CCFBF1', paddingBottom: 8 },
    instructionText: { fontSize: 14, color: '#0F766E', fontWeight: '600', lineHeight: 20 },
    instructionDate: { fontSize: 10, color: '#5EEAD4', textAlign: 'right', marginTop: 4 },
});
