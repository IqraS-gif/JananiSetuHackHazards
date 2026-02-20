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
import { useLanguage } from '../../context/LanguageContext';
import {
    getVisitHistory,
    getDoctorInstructions,
    saveDoctorInstruction
} from '../../services/database/DatabaseService';
import { useUser } from '../../context/UserContext';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { transcribeAudio } from '../../services/ai/GeminiService';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Components ─────────────────────────────────────────────────────────────

const CircularRiskGauge = ({ score = 0, size = 90, strokeWidth = 8, label, level, isHindi }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const animatedProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedProgress, { toValue: score, duration: 1500, useNativeDriver: true }).start();
    }, [score]);

    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    const getLocalizedLevel = (lvl) => {
        if (!isHindi) return lvl;
        return lvl === 'HIGH' ? 'उच्च' : 'सामान्य';
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
                    <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#FEE6EA" strokeWidth={strokeWidth} fill="none" />
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
                <Text style={st.gaugeLabelText}>{isHindi ? (label === 'BP Risk' ? 'बीपी जोखिम' : 'शुगर जोखिम') : label}</Text>
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
    const animatedValuesRef = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
    const animatedValues = animatedValuesRef.current;

    useEffect(() => {
        const baseValues = riskLevel > 0.5 ? [0.2, 0.35, 0.5, 0.7, 0.85] : [0.15, 0.12, 0.18, 0.14, 0.16];
        animatedValues.forEach((val, i) => Animated.timing(val, { toValue: baseValues[i], duration: 1000 + (i * 200), useNativeDriver: false }).start());
    }, [riskLevel]);

    return (
        <View style={[st.chartContainer, dark && st.chartContainerDark]}>
            <View style={st.yAxis}>
                <Text style={st.axisText}>{isHindi ? 'उच्च' : 'High'}</Text>
                <Text style={st.axisText}>{isHindi ? 'कम' : 'Low'}</Text>
            </View>
            <View style={st.graphArea}>
                {animatedValues.map((val, i) => (
                    <View key={i} style={st.barGroup}>
                        <Animated.View style={[st.graphBar, { height: val.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: color }]} />
                        <Text style={st.barLabel}>T-{40 - (i * 10)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// ─── Patient Data ──────────────────────────────────────────────────────────

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
            bp: { risk: 0.84, level: 'HIGH', label: 'BP Risk', reasoning: { en: ['BP increased 25% over last 40 days.', 'Dietary salt intake is 2.5x higher than recommended.'], hi: ['पिछले 40 दिनों में बीपी में 25% की वृद्धि हुई है।', 'नमक का सेवन अनुशंसित स्तर से 2.5 गुना अधिक है।'] } },
            diabetes: { risk: 0.91, level: 'HIGH', label: 'Diabetes Risk', reasoning: { en: ['Direct correlation between high sugar intake and spikes.', 'Lack of physical activity detected recently.'], hi: ['चीनी का अधिक सेवन और शुगर बढ़ने के बीच सीधा संबंध है।', 'हाल ही में शारीरिक गतिविधि में कमी पाई गई है।'] } },
        },
        alerts: { en: ['High Blood Pressure detected', 'Blood Sugar above safe range', 'Hemoglobin is low'], hi: ['उच्च रक्तचाप का पता चला है', 'ब्लड शुगर सुरक्षित सीमा से ऊपर है', 'हीमोग्लोबिन कम है'] }
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
            bp: { risk: 0.08, level: 'LOW', label: 'BP Risk', reasoning: { en: ['BP stable at average 118/78.', 'Dietary sodium is well-balanced.'], hi: ['बीपी औसत 118/78 पर स्थिर है।', 'आहार में सोडियम संतुलित है।'] } },
            diabetes: { risk: 0.06, level: 'LOW', label: 'Diabetes Risk', reasoning: { en: ['Blood sugar remains within safe bounds.', 'Excellent fiber content.'], hi: ['ब्लड शुगर सुरक्षित सीमा के भीतर है।', 'भोजन में फाइबर की मात्रा बहुत अच्छी है।'] } },
        },
        alerts: { en: ['All indicators within normal range'], hi: ['सभी संकेतक सामान्य सीमा के भीतर हैं'] }
    },
    'user_003': {
        name: 'Meena Kumari',
        age: 29,
        week: 14,
        risk: 'Normal',
        vitals: [
            { label: 'BP', value: '122/80', status: 'normal', unit: 'mmHg', icon: 'heart-pulse' },
            { label: 'Hb', value: '10.8', status: 'normal', unit: 'g/dL', icon: 'water' },
            { label: 'Weight', value: '58', status: 'normal', unit: 'kg', icon: 'scale-bathroom' },
            { label: 'Sugar', value: '110', status: 'normal', unit: 'mg/dL', icon: 'cup-water' },
        ],
        predictions: {
            bp: { risk: 0.12, level: 'LOW', reasoning: { en: ['Stable trends'], hi: ['स्थिर रुझान'] } },
            diabetes: { risk: 0.15, level: 'LOW', reasoning: { en: ['Normal trends'], hi: ['सामान्य रुझान'] } }
        },
        alerts: { en: ['Watch iron intake'], hi: ['आयरन के सेवन पर ध्यान दें'] }
    }
};

export default function DoctorPatientDetail({ route, navigation }) {
    const { language } = useLanguage();
    const { user } = useUser();
    const isHindi = language === 'hi';
    const { patientId } = route.params || { patientId: 'user_002' };
    const patient = PATIENT_DATA[patientId] || PATIENT_DATA['user_002'];

    const [isAnalysisVisible, setAnalysisVisible] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState(null);
    const [visitHistory, setVisitHistory] = useState([]);
    const [viewingVisit, setViewingVisit] = useState(null);
    const [doctorInstructions, setDoctorInstructions] = useState([]);

    // Instructions State
    const [newInstruction, setNewInstruction] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Audio Monitoring
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef(null);

    useEffect(() => {
        loadVisitHistory();
        loadDoctorInstructions();
    }, [patientId]);

    useEffect(() => {
        if (isRecording) {
            Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])).start();
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } else {
            pulseAnim.setValue(1);
            if (timerRef.current) clearInterval(timerRef.current);
            setRecordingTime(0);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    const loadVisitHistory = async () => {
        try {
            const history = await getVisitHistory(patientId);
            setVisitHistory(history);
        } catch (e) { console.error(e); }
    };

    const loadDoctorInstructions = async () => {
        try {
            const data = await getDoctorInstructions(patientId);
            setDoctorInstructions(data);
        } catch (e) { console.error(e); }
    };

    const handleSaveInstruction = async () => {
        if (!newInstruction.trim()) return;
        setIsSaving(true);
        try {
            await saveDoctorInstruction(patientId, user.id, newInstruction);
            setNewInstruction('');
            await loadDoctorInstructions();
            Alert.alert(isHindi ? "सफल" : "Success", isHindi ? "निर्देश सहेजा गया" : "Instruction saved successfully");
        } catch (e) { Alert.alert("Error", "Failed to save"); }
        finally { setIsSaving(false); }
    };

    async function startRecording() {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setIsRecording(true);
        } catch (e) { console.error(e); }
    }

    async function stopRecording() {
        if (!recording) return;
        setIsRecording(false);
        setIsTranscribing(true);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            // Read file as base64 for Gemini
            const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Transcribe using Gemini
            const transcript = await transcribeAudio(base64Audio, language);

            if (transcript && transcript !== 'NO_SPEECH') {
                setNewInstruction(prev => prev + (prev.length > 0 ? " " : "") + transcript);
            } else {
                Alert.alert(isHindi ? "धुंधली आवाज़" : "Unclear Audio", isHindi ? "कृपया स्पष्ट बोलें।" : "Please speak more clearly.");
            }

            setRecording(null);
        } catch (e) {
            console.error('Stop recording error:', e);
            Alert.alert("Error", "Transcription failed");
        } finally {
            setIsTranscribing(false);
        }
    }

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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

                {/* Profile Card (EXACT CLONE) */}
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
                                    <Text style={st.riskTagText}>{isHindi ? (patient.risk === 'High' ? 'उच्च जोखिम' : 'सामान्य') : `${patient.risk.toUpperCase()} RISK`}</Text>
                                </View>
                            </View>
                            <Text style={st.patientSub}>{patient.age} yrs • Week {patient.week}</Text>
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
                        <TouchableOpacity style={st.riskGaugeCard} onPress={() => { setSelectedRisk('Hypertension'); setAnalysisVisible(true); }}>
                            <CircularRiskGauge score={patient.predictions.bp.risk * 100} label="BP Risk" level={patient.predictions.bp.level} isHindi={isHindi} />
                        </TouchableOpacity>
                        <TouchableOpacity style={st.riskGaugeCard} onPress={() => { setSelectedRisk('Diabetes'); setAnalysisVisible(true); }}>
                            <CircularRiskGauge score={patient.predictions.diabetes.risk * 100} label="Diabetes Risk" level={patient.predictions.diabetes.level} isHindi={isHindi} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Health Alerts */}
                {patient.alerts && (
                    <View style={st.section}>
                        <View style={st.sectionTitleRow}>
                            <MaterialCommunityIcons name="alert" size={20} color="#FFB020" />
                            <Text style={st.sectionTitle}>{isHindi ? 'स्वास्थ्य चेतावनी' : 'Health Alerts'}</Text>
                        </View>
                        <View style={st.alertsBox}>
                            {(isHindi ? patient.alerts.hi : patient.alerts.en).map((alert, i) => (
                                <View key={i} style={st.alertLine}>
                                    <View style={[st.bullet, { backgroundColor: '#FF4B6C' }]} />
                                    <Text style={st.alertText}>{alert}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Latest Vitals */}
                <View style={st.section}>
                    <View style={st.sectionTitleRow}>
                        <MaterialCommunityIcons name="pulse" size={20} color="#FF718B" />
                        <Text style={st.sectionTitle}>{isHindi ? 'नवीनतम महत्वपूर्ण संकेत' : 'Latest Vitals'}</Text>
                    </View>
                    <View style={st.vitalsGrid}>
                        {patient.vitals.map((v, i) => (
                            <View key={i} style={st.vitalCard}>
                                <View style={st.vitalTop}>
                                    <MaterialCommunityIcons name={v.icon} size={20} color={v.status === 'high' ? '#FF4B6C' : '#4CAF50'} />
                                    <Text style={st.vitalName}>{v.label}</Text>
                                    <View style={[st.statusPill, { backgroundColor: (v.status === 'high' ? '#FF4B6C' : '#4CAF50') + '15' }]}>
                                        <Text style={[st.statusPillText, { color: (v.status === 'high' ? '#FF4B6C' : '#4CAF50') }]}>{isHindi ? (v.status === 'high' ? 'उच्च' : 'सामान्य') : v.status}</Text>
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

                {/* --- DOCTOR NOTES SECTION (THE ADDITION) --- */}
                <View style={st.section}>
                    <View style={st.sectionTitleRow}>
                        <MaterialCommunityIcons name="comment-edit-outline" size={20} color="#10B981" />
                        <Text style={st.sectionTitle}>{isHindi ? 'आशा कार्यकर्ता के लिए निर्देश' : 'Instructions for ASHA'}</Text>
                    </View>
                    <View style={st.instructionBox}>
                        <TextInput
                            style={st.instructionInput}
                            placeholder={isHindi ? 'आज के निर्देश यहाँ लिखें...' : 'Type instructions for next visit...'}
                            multiline
                            value={newInstruction}
                            onChangeText={setNewInstruction}
                        />
                        <View style={st.instructionActions}>
                            <TouchableOpacity
                                style={[st.voiceBtn, isRecording && st.voiceBtnActive]}
                                onPress={isRecording ? stopRecording : startRecording}
                            >
                                <Animated.View style={[st.voicePulse, { transform: [{ scale: pulseAnim }], opacity: isRecording ? 0.3 : 0 }]} />
                                <MaterialCommunityIcons name={isRecording ? "stop" : "microphone"} size={22} color="#FFF" />
                                <Text style={st.voiceBtnText}>{isRecording ? formatTime(recordingTime) : (isHindi ? 'बोलें' : 'Speak')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.saveBtn, (!newInstruction.trim() || isSaving || isTranscribing) && st.btnDisabled]}
                                onPress={handleSaveInstruction}
                                disabled={!newInstruction.trim() || isSaving || isTranscribing}
                            >
                                {isSaving || isTranscribing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={st.saveBtnText}>{isHindi ? 'सहेजें' : 'Save Note'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Past Instructions */}
                {doctorInstructions.length > 0 && (
                    <View style={st.section}>
                        <Text style={st.reportLabel}>{isHindi ? 'पिछले निर्देश' : 'Past Instructions'}</Text>
                        <View style={st.instructionsList}>
                            {doctorInstructions.map((inst, idx) => (
                                <View key={idx} style={st.instructionLine}>
                                    <Text style={st.instructionText}>• {inst.instruction}</Text>
                                    <Text style={st.instructionDate}>{new Date(inst.created_at).toLocaleDateString()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Visit History */}
                <View style={st.section}>
                    <View style={st.sectionTitleRow}>
                        <MaterialCommunityIcons name="calendar-check" size={20} color="#6366F1" />
                        <Text style={st.sectionTitle}>{isHindi ? 'विज़िट इतिहास' : 'Visit History'}</Text>
                    </View>
                    {visitHistory.map((visit) => (
                        <TouchableOpacity key={visit.id} style={st.visitHistoryCard} onPress={() => setViewingVisit(visit)}>
                            <View style={st.visitCardHeader}>
                                <View style={st.visitDateBadge}>
                                    <MaterialCommunityIcons name="calendar" size={14} color="#6366F1" />
                                    <Text style={st.visitDate}>{visit.date}</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                            </View>
                            <Text style={st.visitSnippet} numberOfLines={2}>{isHindi ? visit.summary.summary_hi.observations : visit.summary.summary_en.observations}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            {/* Visit Details Modal */}
            <Modal visible={viewingVisit !== null} transparent={true} animationType="fade">
                <View style={st.overlay}>
                    <View style={st.modalBody}>
                        <View style={st.modalHead}>
                            <Text style={st.modalTitle}>{isHindi ? 'विज़िट विवरण' : 'Visit Details'}</Text>
                            <TouchableOpacity onPress={() => setViewingVisit(null)}><MaterialCommunityIcons name="close" size={24} color="#666" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text style={st.reportLabel}>{isHindi ? 'अवलोकन' : 'Observations'}</Text>
                            <Text style={st.reportText}>{isHindi ? viewingVisit?.summary.summary_hi.observations : viewingVisit?.summary.summary_en.observations}</Text>
                            <Text style={[st.reportLabel, { marginTop: 15 }]}>{isHindi ? 'दी गई सलाह' : 'Advice'}</Text>
                            {(isHindi ? viewingVisit?.summary.summary_hi.advice : viewingVisit?.summary.summary_en.advice)?.map((a, i) => (
                                <Text key={i} style={st.listItem}>• {a}</Text>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* AI Deep Analysis Modal */}
            <Modal visible={isAnalysisVisible} animationType="slide" transparent={true}>
                <View style={st.overlay}>
                    <View style={[st.modalBody, { height: '70%', marginTop: 'auto' }]}>
                        <View style={st.modalHead}>
                            <Text style={st.modalTitle}>{isHindi ? 'गहन एआई विश्लेषण' : 'Advanced AI Analysis'}</Text>
                            <TouchableOpacity onPress={() => setAnalysisVisible(false)}><MaterialCommunityIcons name="close" size={24} color="#666" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            <VisualTrendGraph riskLevel={selectedRisk === 'Hypertension' ? patient.predictions.bp.risk : patient.predictions.diabetes.risk} color={selectedRisk === 'Hypertension' ? "#FF4B6C" : "#FFB020"} dark={true} isHindi={isHindi} />
                            <View style={st.reasoningBox}>
                                <Text style={st.reasoningTitle}>📈 Reasoning</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#4A4A4A' },
    backBtn: { padding: 4 },
    scroll: { paddingHorizontal: 20, paddingBottom: 50 },
    profileCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 15, marginBottom: 20, elevation: 5, shadowColor: '#FF718B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    profileTop: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { marginRight: 15 },
    avatarBorder: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#FF718B20', alignItems: 'center', justifyContent: 'center' },
    avatarInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE6EA', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    patientAvatarImg: { width: 80, height: 80, borderRadius: 40 },
    profileHeaderInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    patientName: { fontSize: 22, fontWeight: '800', color: '#333' },
    riskTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    riskTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    patientSub: { fontSize: 13, color: '#999', marginTop: 4 },
    progressSection: { marginTop: 12 },
    progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    progressLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
    progressValue: { fontSize: 11, color: '#999' },
    progressTrack: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#FF718B' },
    section: { marginBottom: 25 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#4A4A4A' },
    predictionCardsRow: { flexDirection: 'row', gap: 12 },
    riskGaugeCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 25, padding: 15, alignItems: 'center', elevation: 3 },
    gaugeWrapper: { alignItems: 'center' },
    gaugeCenter: { position: 'absolute', alignItems: 'center' },
    gaugeValueText: { fontSize: 22, fontWeight: '800', color: '#FF4B6C' },
    gaugePercentSign: { fontSize: 12, color: '#FF4B6C' },
    gaugeInfoContainer: { marginTop: 8, alignItems: 'center' },
    gaugeLabelText: { fontSize: 12, color: '#666' },
    gaugeLevelText: { fontSize: 14, fontWeight: '800', color: '#333' },
    miniBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE6EA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
    miniDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 5 },
    miniBadgeText: { fontSize: 9, fontWeight: '800', color: '#FF4B6C' },
    alertsBox: { backgroundColor: '#FFF', borderRadius: 25, padding: 18, elevation: 3 },
    alertLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    bullet: { width: 5, height: 5, borderRadius: 2.5, marginRight: 10 },
    alertText: { fontSize: 13, color: '#666', fontWeight: '500' },
    vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    vitalCard: { width: (width - 52) / 2, backgroundColor: '#FFF', borderRadius: 25, padding: 15, elevation: 3 },
    vitalTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    vitalName: { fontSize: 13, fontWeight: '700', color: '#999', flex: 1 },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    statusPillText: { fontSize: 9, fontWeight: '800' },
    vitalMainRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    vitalValue: { fontSize: 20, fontWeight: '800', color: '#333' },
    vitalUnit: { fontSize: 11, color: '#999' },
    instructionBox: { backgroundColor: '#F0FDFA', borderRadius: 25, padding: 15, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    instructionInput: { backgroundColor: '#FFF', borderRadius: 15, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
    instructionActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
    voiceBtn: { backgroundColor: '#6366F1', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    voiceBtnActive: { backgroundColor: '#FF4B6C' },
    voiceBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    voicePulse: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', left: 10 },
    saveBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    btnDisabled: { opacity: 0.5 },
    instructionsList: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, elevation: 3 },
    instructionLine: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 8 },
    instructionText: { fontSize: 14, color: '#444' },
    instructionDate: { fontSize: 10, color: '#AAA', textAlign: 'right', marginTop: 4 },
    visitHistoryCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
    visitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    visitDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    visitDate: { fontSize: 12, fontWeight: '800', color: '#6366F1' },
    visitSnippet: { fontSize: 12, color: '#666' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalBody: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, maxHeight: '80%' },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    reportLabel: { fontSize: 11, fontWeight: '900', color: '#FF718B', textTransform: 'uppercase', marginBottom: 5 },
    reportText: { fontSize: 14, color: '#444', lineHeight: 20 },
    listItem: { fontSize: 13, color: '#444', marginBottom: 3 },
    chartContainer: { height: 160, backgroundColor: '#FEE6EA20', borderRadius: 20, padding: 15, flexDirection: 'row', marginBottom: 20 },
    chartContainerDark: { backgroundColor: '#F8F9FE' },
    yAxis: { justifyContent: 'space-between', paddingRight: 10, borderRightWidth: 1, borderRightColor: '#EEE' },
    axisText: { fontSize: 9, color: '#999', fontWeight: '600' },
    graphArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingLeft: 10 },
    barGroup: { alignItems: 'center' },
    graphBar: { width: 10, borderRadius: 5 },
    barLabel: { fontSize: 8, color: '#999', marginTop: 4 },
    reasoningBox: { padding: 15, backgroundColor: '#FFF', borderRadius: 15, marginTop: 10 },
    reasoningTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
    reasoningText: { fontSize: 13, color: '#666', marginBottom: 4 },
});
