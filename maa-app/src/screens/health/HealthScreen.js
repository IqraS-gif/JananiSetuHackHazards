/**
 * HealthScreen.js 
 * Maa App - Health tracking tab (weight, ANC, supplements).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Svg, Circle } from 'react-native-svg';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Colors, Dimensions, SupplementTypes } from '../../constants';
import GradientCard from '../../components/ui/GradientCard';
import ScanLoadingAnimation from '../../components/ui/ScanLoadingAnimation';
import designSystem from '../../theme/designSystem';
import WeightGainChart from '../../components/widgets/WeightGainChart';

import * as FileSystem from 'expo-file-system/legacy';
import {
    getANCSchedule,
    getSupplementAdherence,
    getUserProfile,
    getWeightHistory,
    logWeight,
    markANCCompleted,
    attachReportToVisit,
    getKickHistory,
    getSymptomHistory,
    getVitalsHistory,
    getSwellingHistory,
    logKicks,
    logSymptom,
    getDailySummary,
    getNutritionRequirements,
    logVitals,
    saveSwellingScan,
    saveUserProfile,
} from '../../services/database/DatabaseService';
import { analyzeSwellingFromImage, assessSwellingOffline, extractHealthDataFromPDF } from '../../services/ai/GeminiService';
import { extractHealthDataFromReport } from '../../services/ai/GroqService';
import { useT } from '../../i18n/useT';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { uploadReportToFirebase } from '../../services/firebase/FirebaseStorageService';


const KICK_SESSION_DURATION = 60 * 60; // 1 hour in seconds

const COMMON_SYMPTOMS = [
    { id: 'swelling', en: 'Swelling', hi: 'सूजन', emoji: '🦵' },
    { id: 'headache', en: 'Headache', hi: 'सिरदर्द', emoji: '🤕' },
    { id: 'nausea', en: 'Nausea', hi: 'जी मिचलाना', emoji: '🤢' },
    { id: 'dizziness', en: 'Dizziness', hi: 'चक्कर आना', emoji: '😵' },
    { id: 'blurred_vision', en: 'Blurred Vision', hi: 'धुंधली दृष्टि', emoji: '👓' },
    { id: 'pain', en: 'Abdominal Pain', hi: 'पेट दर्द', emoji: '😣' },
];

const SEVERITY_LEVELS = [
    { id: 'mild', label: 'हल्का (Mild)', color: '#4FC3F7' },
    { id: 'moderate', label: 'सामान्य (Mod)', color: '#FFB74D' },
    { id: 'severe', label: 'गंभीर (Severe)', color: '#E57373' },
];

export default function HealthScreen() {
    const { t, isHindi, isBilingual, isEnglish } = useT();
    const [profile, setProfile] = useState(null);
    const [weights, setWeights] = useState([]);
    const [anc, setAnc] = useState([]);
    const [suppHistory, setSuppHistory] = useState([]);

    // New States
    const [kickHistory, setKickHistory] = useState([]);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [symptomHistory, setSymptomHistory] = useState([]);

    // Swelling Scan States
    const [swellingHistory, setSwellingHistory] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [swellingScanResult, setSwellingScanResult] = useState(null);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [capturedImageUri, setCapturedImageUri] = useState(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');

    // Kick Counter Specifics
    const [isCountingKicks, setIsCountingKicks] = useState(false);
    const [kickCount, setKickCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(KICK_SESSION_DURATION);

    // Form States
    const [showWeightInput, setShowWeightInput] = useState(false);
    const [weightInput, setWeightInput] = useState('');

    const [showVitalsInput, setShowVitalsInput] = useState(false);
    const [vitalsInput, setVitalsInput] = useState({ systolic: '', diastolic: '', bloodSugar: '' });

    const [showSymptomInput, setShowSymptomInput] = useState(false);
    const [selectedSymp, setSelectedSymp] = useState(null);
    const [selectedSev, setSelectedSev] = useState('mild');

    // Add Record States
    const [showAddRecordOptions, setShowAddRecordOptions] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [showExtractedReview, setShowExtractedReview] = useState(false);
    const [reportPreviewUri, setReportPreviewUri] = useState(null);

    // Offline Swelling Questionnaire States
    const [showOfflineQuestionnaire, setShowOfflineQuestionnaire] = useState(false);
    const [offlineQ, setOfflineQ] = useState({ location: 'both_feet', skin: 'normal', timing: 'evening_only', symptoms: [] });

    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            const userProfile = await getUserProfile();
            setProfile(userProfile);
            setWeights(await getWeightHistory());
            setAnc(await getANCSchedule());
            setSuppHistory(await getSupplementAdherence(7));

            // New health data
            setKickHistory(await getKickHistory('user_001', 5));
            setVitalsHistory(await getVitalsHistory('user_001'));
            setSymptomHistory(await getSymptomHistory('user_001', 5));
            setSwellingHistory(await getSwellingHistory(5));
        } catch (error) {
            console.error('[HealthScreen] load error:', error);
            setLoadError('Unable to load health data. Pull to refresh or retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Timer Logic for Kicks
    useEffect(() => {
        let interval = null;
        if (isCountingKicks && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);
        } else if (timeLeft === 0 && isCountingKicks) {
            handleCompleteKickSession();
        }
        return () => clearInterval(interval);
    }, [isCountingKicks, timeLeft]);

    const startKickSession = () => {
        setKickCount(0);
        setTimeLeft(KICK_SESSION_DURATION);
        setIsCountingKicks(true);
    };

    const handleCompleteKickSession = async () => {
        setIsCountingKicks(false);
        try {
            const durationUsed = Math.round((KICK_SESSION_DURATION - timeLeft) / 60);
            await logKicks(kickCount, durationUsed || 1);
            loadData();
            if (kickCount < 10) {
                Alert.alert('Alert / सचेत', 'Low kick count recorded (<10). If you still feel reduced movement, contact your doctor or ASHA worker.\n\nकम किक दर्ज की गई। यदि आप अभी भी कम हलचल महसूस करती हैं, तो डॉक्टर या आशा कार्यकर्ता से संपर्क करें।');
            } else {
                Alert.alert('Success', `Session complete. recorded ${kickCount} kicks.`);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to save session.');
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleLogWeight = async () => {
        const value = parseFloat(weightInput);
        if (Number.isNaN(value) || value < 20 || value > 200) {
            Alert.alert('Validation', 'Please enter a valid weight between 20 and 200 kg.');
            return;
        }

        try {
            await logWeight(value, profile?.pregnancy_week || 0);
            setWeightInput('');
            setShowWeightInput(false);
            loadData();
            Alert.alert('Saved', `Weight ${value} kg logged.`);
        } catch (error) {
            console.error('[HealthScreen] logWeight error:', error);
            Alert.alert('Error', 'Unable to save weight.');
        }
    };

    const handleLogVitals = async () => {
        const { systolic, diastolic, bloodSugar } = vitalsInput;
        if (!systolic || !diastolic) {
            Alert.alert('Validation', 'Please enter at least Blood Pressure (Systolic/Diastolic).');
            return;
        }
        try {
            await logVitals({
                systolic: parseInt(systolic),
                diastolic: parseInt(diastolic),
                bloodSugar: bloodSugar ? parseFloat(bloodSugar) : null,
            });
            setVitalsInput({ systolic: '', diastolic: '', bloodSugar: '' });
            setShowVitalsInput(false);
            loadData();
            Alert.alert('Saved', 'Vitals logged successfully.');
        } catch (err) {
            Alert.alert('Error', 'Failed to save vitals.');
        }
    };

    // ─── Swelling Scan Handler ─────────────────────────────────────────────────
    const handleSwellingScan = async (sourceType) => {
        setShowInstructionsModal(false);
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required / अनुमति आवश्यक',
                    'Camera access is needed to take a photo of your ankle.\nकैमरा उपयोग की अनुमति दें।'
                );
                return;
            }

            let pickerResult;
            if (sourceType === 'camera') {
                pickerResult = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                    base64: true,
                });
            } else {
                pickerResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                    base64: true,
                });
            }

            if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

            const asset = pickerResult.assets[0];
            setCapturedImageUri(asset.uri);
            setIsScanning(true);
            setSwellingScanResult(null);

            const base64 = asset.base64;
            if (!base64) throw new Error('Could not read image data.');

            try {
                const result = await analyzeSwellingFromImage(base64);
                setSwellingScanResult(result);

                // Save to SQLite
                await saveSwellingScan(result);
                const updated = await getSwellingHistory(5);
                setSwellingHistory(updated);

                // Alert for HIGH risk
                if (result.risk_level === 'HIGH') {
                    Alert.alert(
                        '🚨 High Risk Detected / उच्च जोखिम',
                        'Possible preeclampsia signs detected. Please contact your ASHA worker or doctor immediately.\n\nप्रीक्लेम्पसिया के लक्षण हो सकते हैं। अभी अपने आशा कार्यकर्ता या डॉक्टर से संपर्क करें।',
                        [{ text: 'Understood / समझ गई', style: 'destructive' }]
                    );
                }
            } catch (apiErr) {
                console.log('[HealthScreen] API Analysis failed, falling back to questionnaire:', apiErr);
                // If API fails (usually network), show offline questionnaire
                setIsScanning(false);
                setShowOfflineQuestionnaire(true);
            }
        } catch (err) {
            console.error('[HealthScreen] Swelling scan error:', err);
            Alert.alert(
                'Selection Failed / चयन विफल',
                'Could not select image. Please try again.\n\nछवि का चयन नहीं किया जा सका। कृपया पुनः प्रयास करें।'
            );
        } finally {
            setIsScanning(false);
        }
    };

    const handleOfflineSwellingSubmit = async () => {
        try {
            setIsScanning(true);
            setShowOfflineQuestionnaire(false);

            // Give it a tiny delay for feeling of "processing"
            await new Promise(resolve => setTimeout(resolve, 800));

            const result = assessSwellingOffline(offlineQ);
            setSwellingScanResult(result);

            // Save to SQLite
            await saveSwellingScan(result);
            const updated = await getSwellingHistory(5);
            setSwellingHistory(updated);

            // Alert for HIGH risk
            if (result.risk_level === 'HIGH') {
                Alert.alert(
                    '🚨 High Risk Detected / उच्च जोखिम',
                    'Possible preeclampsia signs detected based on your answers. Please contact your ASHA worker or doctor immediately.\n\nआपके उत्तरों के आधार पर संभावित प्रीक्लेम्पसिया के लक्षण। अभी डॉक्टर से संपर्क करें।',
                    [{ text: 'Understood / समझ गई', style: 'destructive' }]
                );
            }
        } catch (err) {
            console.error('[HealthScreen] Offline submit error:', err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleLogSymptom = async () => {
        if (!selectedSymp) {
            Alert.alert('Validation', 'Please select a symptom.');
            return;
        }
        try {
            await logSymptom(selectedSymp.id, selectedSev);
            setSelectedSymp(null);
            setSelectedSev('mild');
            setShowSymptomInput(false);
            loadData();
            Alert.alert('Saved', 'Symptom logged.');
        } catch (err) {
            Alert.alert('Error', 'Failed to save symptom.');
        }
    };

    const handleReportExtraction = async () => {
        setShowAddRecordOptions(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setIsExtracting(true);

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(file.uri, {
                encoding: 'base64',
            });

            let extracted;
            if (file.mimeType === 'application/pdf') {
                // Use Gemini for PDF extraction
                extracted = await extractHealthDataFromPDF(base64);
            } else {
                // Use Groq for Image extraction
                extracted = await extractHealthDataFromReport(base64);
            }

            if (extracted) {
                setExtractedData({ ...extracted, report_uri: file.uri });
                setShowExtractedReview(true);
            }
        } catch (err) {
            console.error('[HealthScreen] Extraction error:', err);
            Alert.alert('Extraction Failed', 'Unable to read the report. Please try manual entry.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSaveExtractedData = async () => {
        try {
            const {
                systolic, diastolic, blood_sugar, height_cm, weight_kg,
                hba1c, fbs, ppbs, age, gender
            } = extractedData;

            let finalReportUri = extractedData.report_uri;
            if (extractedData.report_uri && !extractedData.report_uri.startsWith('http')) {
                const fileName = `extracted_report_${Date.now()}.jpg`;
                try {
                    console.log('Uploading extracted report to Firebase...');
                    finalReportUri = await uploadReportToFirebase(extractedData.report_uri, fileName);
                } catch (e) {
                    console.error('Firebase upload failed, using local URI', e);
                }
            }

            // 1. Log Vitals if ANY vital parameter is present
            if (systolic || diastolic || blood_sugar || hba1c || fbs || ppbs) {
                await logVitals({
                    systolic: systolic ? parseInt(systolic) : null,
                    diastolic: diastolic ? parseInt(diastolic) : null,
                    bloodSugar: blood_sugar ? parseFloat(blood_sugar) : null,
                    reportUri: finalReportUri,
                    hba1c: hba1c ? parseFloat(hba1c) : null,
                    fbs: fbs ? parseFloat(fbs) : null,
                    ppbs: ppbs ? parseFloat(ppbs) : null,
                    age: age ? parseInt(age) : null,
                    gender: gender || null,
                });
            }

            // 2. Log Weight if present
            if (weight_kg) {
                await logWeight(parseFloat(weight_kg), profile?.pregnancy_week || 0, '', finalReportUri);
            }

            // 3. Update Height in profile if present
            if (height_cm) {
                const updatedProfile = { ...profile, height_cm: parseFloat(height_cm) };
                await saveUserProfile(updatedProfile);
            }

            Alert.alert('Success', 'Health data saved successfully!');
            setShowExtractedReview(false);
            setExtractedData(null);
            loadData();
        } catch (err) {
            console.error('[HealthScreen] Save extracted error:', err);
            Alert.alert('Error', 'Failed to save some parameters.');
        }
    };

    const handleMarkANC = (visitNumber) => {
        Alert.alert('Mark ANC Visit', 'Mark this ANC visit as completed?', [
            {
                text: 'Yes',
                onPress: async () => {
                    await markANCCompleted(visitNumber);
                    loadData();
                },
            },
            { text: 'No', style: 'cancel' },
        ]);
    };

    const handleUploadReport = async (visitNumber) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const doc = result.assets[0];
            const fileName = `report_anc_${visitNumber}_${Date.now()}.pdf`;
            const destUri = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.copyAsync({
                from: doc.uri,
                to: destUri
            });

            let finalUri = destUri;
            try {
                console.log('Uploading ANC report to Firebase...');
                finalUri = await uploadReportToFirebase(doc.uri, fileName);
            } catch (e) {
                console.error('Firebase upload failed, using local URI', e);
            }

            await attachReportToVisit(visitNumber, finalUri);
            loadData();
            Alert.alert('Success', 'Report uploaded successfully.');
        } catch (err) {
            console.error('Report upload error:', err);
            Alert.alert('Error', 'Unable to upload report.');
        }
    };

    const handleRemoveReport = (visitNumber) => {
        Alert.alert('Remove Report', 'Are you sure you want to remove this report?', [
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    await attachReportToVisit(visitNumber, null);
                    loadData();
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleViewReport = async (uri) => {
        if (!uri) return;

        const isPdf = uri.toLowerCase().includes('.pdf');

        if (uri.startsWith('http')) {
            if (isPdf) {
                try {
                    const fileUri = `${FileSystem.cacheDirectory}temp_report_${Date.now()}.pdf`;
                    const { uri: localUri } = await FileSystem.downloadAsync(uri, fileUri);
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                        await Sharing.shareAsync(localUri, {
                            mimeType: 'application/pdf',
                            dialogTitle: 'View Medical Report',
                            UTI: 'com.adobe.pdf'
                        });
                    } else {
                        Alert.alert('Error', 'Sharing is not available on this device.');
                    }
                } catch (e) {
                    console.error('Failed to download PDF:', e);
                    Linking.openURL(uri); // Fallback
                }
            } else {
                setReportPreviewUri(uri);
            }
            return;
        }

        // Ensure file exists locally
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            Alert.alert('Error', 'File not found. It may have been moved or deleted.');
            return;
        }

        if (isPdf) {
            try {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'View Medical Report',
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    Alert.alert('Error', 'Sharing is not available on this device.');
                }
            } catch (err) {
                console.error('Failed to open PDF:', err);
                Alert.alert('Error', 'Unable to open PDF.');
            }
        } else {
            setReportPreviewUri(uri);
        }
    };

    const nextVisit = anc.find(v => !v.is_completed);

    const calculateAdherence = () => {
        if (suppHistory.length === 0) return 0;
        const totalTaken = suppHistory.reduce((acc, curr) => acc + curr.count, 0);
        const totalExpected = suppHistory.length * 3; // 3 doses per day
        return Math.round((totalTaken / totalExpected) * 100);
    };

    const adherenceScore = calculateAdherence();

    // Simple streak logic: consecutive days with 3/3 count
    const calculateStreak = () => {
        let streak = 0;
        const reversedHistory = [...suppHistory].reverse();
        for (const day of reversedHistory) {
            if (day.count === 3) streak++;
            else break;
        }
        return streak;
    };

    const streakDays = calculateStreak();

    if (loading) {
        return <ScanLoadingAnimation title={isHindi ? 'हेल्थ डेटा लोड हो रहा है...' : 'Loading health data...'} source={null} />;
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        colors={[Colors.primary]}
                    />
                }
            >
                {loadError ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{loadError}</Text>
                    </View>
                ) : null}

                <View style={styles.headerRow}><Text style={styles.pageTitle}>{t('health_title')}</Text></View>
                {/* Fetal Kick Counter Card */}
                <View style={[styles.section, { marginBottom: 20 }]}>
                    <GradientCard colors={['#FFFFFF', '#FFF7FA']} style={styles.kickCardSpacing}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.sectionTitle}>{t('fetal_kick_counter')}</Text>
                        </View>

                        {!isCountingKicks ? (
                            <View style={styles.kickStart}>
                                <Text style={styles.kickHintHi}>
                                    {isBilingual ? t('kick_hint_start') : t('kick_hint_start')}
                                </Text>
                                <TouchableOpacity style={styles.kickMainBtn} onPress={startKickSession}>
                                    <Text style={styles.kickMainBtnText}>{t('start_counting')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.kickActive}>
                                <View style={styles.kickHeader}>
                                    <Text style={styles.kickTimer}>
                                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                    </Text>
                                    <TouchableOpacity style={styles.kickStopBtn} onPress={handleCompleteKickSession}>
                                        <Text style={styles.kickStopBtnText}>{t('kick_stop')}</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={styles.kickCircle} onPress={() => setKickCount(c => c + 1)}>
                                    <Text style={styles.kickCircleTextHi}>{t('felt_it')}</Text>
                                    <Text style={styles.kickBigNumber}>{kickCount}</Text>
                                </TouchableOpacity>

                                <Text style={[styles.kickHintHi, { marginTop: 15 }]}>
                                    {t('kicks_felt_so_far', { count: kickCount })}
                                </Text>
                            </View>
                        )}

                        {!!kickHistory.length && !isCountingKicks ? (
                            <View style={styles.historyList}>
                                <Text style={styles.historyTitle}>{t('recent_checks')}</Text>
                                {kickHistory.slice(0, 3).map((s, i) => (
                                    <View key={i} style={styles.historyRow}>
                                        <Text style={styles.historyDate}>{s.date}</Text>
                                        <View style={styles.historyInfo}>
                                            <Text style={styles.historyValue}>{t('kicks_duration', { count: s.count, min: Math.round(s.duration_min) })}</Text>
                                            <Text style={styles.historySub}>{s.count >= 10 ? t('healthy_movement') : t('low_movement')}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </GradientCard>
                </View>

                {/* Vital Signs Section (Simplified for Rural Users) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('bp_sugar_check')}</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddRecordOptions(true)}>
                            <Text style={styles.addBtnText}>+ {t('add_record') || 'Add Record'}</Text>
                        </TouchableOpacity>
                    </View>

                    {showVitalsInput ? (
                        <View style={styles.vitalInputBox}>
                            <Text style={styles.inputHint}>{t('bp_example')}</Text>
                            <View style={styles.inputRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.tinyLabel}>{t('high_num')}</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        placeholder="120"
                                        placeholderTextColor={Colors.textLight}
                                        keyboardType="numeric"
                                        value={vitalsInput.systolic}
                                        onChangeText={(t) => setVitalsInput({ ...vitalsInput, systolic: t })}
                                        cursorColor={Colors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.tinyLabel}>{t('low_num')}</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        placeholder="80"
                                        placeholderTextColor={Colors.textLight}
                                        keyboardType="numeric"
                                        value={vitalsInput.diastolic}
                                        onChangeText={(t) => setVitalsInput({ ...vitalsInput, diastolic: t })}
                                        cursorColor={Colors.primary}
                                    />
                                </View>
                            </View>
                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.tinyLabel}>{t('sugar_optional')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: 95"
                                    placeholderTextColor={Colors.textLight}
                                    keyboardType="numeric"
                                    value={vitalsInput.bloodSugar}
                                    onChangeText={(t) => setVitalsInput({ ...vitalsInput, bloodSugar: t })}
                                    cursorColor={Colors.primary}
                                />
                            </View>
                            <TouchableOpacity style={styles.saveBtnFull} onPress={handleLogVitals}>
                                <Text style={styles.saveBtnText}>{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {vitalsHistory.length > 0 ? (
                        vitalsHistory.map((v, i) => {
                            const isHighBP = v.systolic >= 140 || v.diastolic >= 90;
                            return (
                                <View key={i} style={[styles.vitalRow, isHighBP && styles.vitalHigh]}>
                                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                                        <View style={styles.vitalMain}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.vitalLabel}>B.P.</Text>
                                                {isHighBP && <Text style={styles.alertText}> (HIGH)</Text>}
                                            </View>
                                            <Text style={styles.vitalVal}>
                                                {v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : (v.systolic || v.diastolic || '--')}
                                            </Text>
                                        </View>
                                        {v.blood_sugar ? (
                                            <View style={styles.vitalMain}>
                                                <Text style={styles.vitalLabel}>Sugar</Text>
                                                <Text style={styles.vitalVal}>{v.blood_sugar}</Text>
                                            </View>
                                        ) : null}
                                        {v.hba1c ? (
                                            <View style={styles.vitalMain}>
                                                <Text style={styles.vitalLabel}>HbA1c</Text>
                                                <Text style={styles.vitalVal}>{v.hba1c}%</Text>
                                            </View>
                                        ) : null}
                                        {v.fbs ? (
                                            <View style={styles.vitalMain}>
                                                <Text style={styles.vitalLabel}>FBS</Text>
                                                <Text style={styles.vitalVal}>{v.fbs}</Text>
                                            </View>
                                        ) : null}
                                        {v.ppbs ? (
                                            <View style={styles.vitalMain}>
                                                <Text style={styles.vitalLabel}>PPBS</Text>
                                                <Text style={styles.vitalVal}>{v.ppbs}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={{ marginLeft: 'auto', alignItems: 'flex-end', flexDirection: 'row' }}>
                                        <View style={{ marginRight: 10, alignItems: 'flex-end' }}>
                                            <Text style={styles.vitalDate}>{v.date}</Text>
                                            <Text style={styles.vitalTime}>{v.time}</Text>
                                            {v.age || v.gender ? (
                                                <Text style={{ fontSize: 9, color: Colors.textSecondary, marginTop: 2 }}>
                                                    {v.age ? `${v.age}y ` : ''}{v.gender || ''}
                                                </Text>
                                            ) : null}
                                        </View>
                                        {v.report_uri ? (
                                            <TouchableOpacity
                                                style={styles.previewBtnSmall}
                                                onPress={() => handleViewReport(v.report_uri)}
                                            >
                                                <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.primary} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>{t('no_bp_sugar')}</Text>
                    )}
                </View>

                {/* Symptoms Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('symptom_tracker')}</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowSymptomInput(prev => !prev)}>
                            <Text style={styles.addBtnText}>{showSymptomInput ? t('close') : t('write_here')}</Text>
                        </TouchableOpacity>
                    </View>

                    {showSymptomInput && (
                        <View style={styles.sympInputBox}>
                            <Text style={styles.label}>{t('select_symptom')}</Text>
                            <View style={styles.sympGrid}>
                                {COMMON_SYMPTOMS.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.sympItem, selectedSymp?.id === s.id && styles.sympItemSelected]}
                                        onPress={() => setSelectedSymp(s)}
                                    >
                                        <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
                                        <Text style={styles.sympItemLabel}>{isBilingual || isHindi ? s.hi : s.en}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.label}>{t('severity')}</Text>
                            <View style={styles.sevRow}>
                                {SEVERITY_LEVELS.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[
                                            styles.sevBtn,
                                            selectedSev === s.id && { backgroundColor: s.color, borderColor: s.color }
                                        ]}
                                        onPress={() => setSelectedSev(s.id)}
                                    >
                                        <Text style={[styles.sevBtnText, selectedSev === s.id && { color: '#fff' }]}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.saveBtnFull} onPress={handleLogSymptom}>
                                <Text style={styles.saveBtnText}>{t('log_symptom')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {symptomHistory.length > 0 ? (
                        symptomHistory.map((s, i) => {
                            const symp = COMMON_SYMPTOMS.find(cs => cs.id === s.symptom_id);
                            const sev = SEVERITY_LEVELS.find(sl => sl.id === s.severity);
                            return (
                                <View key={i} style={styles.historyRow}>
                                    <Text style={styles.historyDate}>{s.date}</Text>
                                    <View style={styles.historyInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.historyValue}>{symp?.emoji} {isHindi || isBilingual ? (symp?.hi || s.symptom_id) : (symp?.en || s.symptom_id)}</Text>
                                            <View style={[styles.sevBadge, { backgroundColor: sev?.color || '#eee', marginLeft: 8 }]}>
                                                <Text style={styles.sevBadgeText}>{sev?.label}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>{t('no_symptoms')}</Text>
                    )}
                </View>

                {/* ─── Swelling Scan Section ─────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('swelling_scan_title')}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
                            onPress={() => setShowInstructionsModal(true)}
                            disabled={isScanning}
                        >
                            <Text style={[styles.addBtnText, { color: Colors.primary }]}>
                                {isScanning ? t('scanning_btn') : t('scan_btn')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Scanning Loader */}
                    {isScanning && (
                        <View style={styles.scanLoadingBox}>
                            <ScanLoadingAnimation title={t('ai_analyzing')} source={null} />
                        </View>
                    )}

                    {/* Latest Result Card */}
                    {!isScanning && swellingScanResult && (() => {
                        const r = swellingScanResult;
                        const riskColor = r.risk_level === 'HIGH' ? Colors.danger
                            : r.risk_level === 'MEDIUM' ? Colors.warning
                                : r.risk_level === 'UNCLEAR' ? '#9E9E9E'
                                    : Colors.success;
                        const riskEmoji = r.risk_level === 'HIGH' ? '🔴'
                            : r.risk_level === 'MEDIUM' ? '🟡'
                                : r.risk_level === 'UNCLEAR' ? '⚪'
                                    : '🟢';
                        return (
                            <GradientCard style={{ borderLeftWidth: 5, borderLeftColor: riskColor, marginTop: 10 }} colors={['#FFFFFF', '#FDFDFD']}>
                                {capturedImageUri && (
                                    <Image
                                        source={{ uri: capturedImageUri }}
                                        style={styles.swellingThumb}
                                        resizeMode="cover"
                                    />
                                )}
                                <View style={[styles.riskBadge, { backgroundColor: riskColor + '20', borderColor: riskColor }]}>
                                    <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                                        {riskEmoji} {r.risk_level} — {r.swelling_level}
                                    </Text>
                                </View>

                                {r.preeclampsia_flag && (
                                    <View style={styles.preeclampsiaAlert}>
                                        <Text style={styles.preeclampsiaText}>
                                            {t('preeclampsia_alert')}
                                        </Text>
                                    </View>
                                )}

                                <Text style={styles.obsTitle}>{t('ai_observations')}</Text>
                                {(isHindi || isBilingual ? (r.observations_hi || r.observations?.hi || []) : (r.observations_en || r.observations?.en || r.observations?.hi || [])).map((ob, i) => (
                                    <Text key={i} style={styles.obsItem}>• {ob}</Text>
                                ))}

                                <View style={styles.recBox}>
                                    <Text style={styles.recText}>{isHindi || isBilingual ? r.recommendation_hi : r.recommendation_en || r.recommendation_hi}</Text>
                                    <Text style={styles.recSubtext}>{isBilingual ? r.recommendation_en : ''}</Text>
                                </View>

                                <Text style={styles.disclaimerText}>
                                    {t('ai_disclaimer')}
                                </Text>
                            </GradientCard>
                        );
                    })()}

                    {/* Scan History */}
                    {!!swellingHistory.length && !isScanning ? (
                        <View style={styles.historyList}>
                            <Text style={styles.historyTitle}>{t('recent_scans')}</Text>
                            {swellingHistory.map((s, i) => {
                                const col = s.risk_level === 'HIGH' ? Colors.danger
                                    : s.risk_level === 'MEDIUM' ? Colors.warning
                                        : Colors.success;
                                return (
                                    <View key={i} style={styles.historyRow}>
                                        <Text style={styles.historyDate}>
                                            {s.scanned_at ? s.scanned_at.split(' ')[0] : '—'}
                                        </Text>
                                        <View style={styles.historyInfo}>
                                            <View style={[styles.riskPill, { backgroundColor: col + '20', borderColor: col }]}>
                                                <Text style={[styles.riskPillText, { color: col }]}>
                                                    {s.risk_level}
                                                </Text>
                                            </View>
                                            <Text style={styles.historySub}>
                                                {s.swelling_level} {s.preeclampsia_flag ? '🚨' : ''}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : null}
                </View>

                {/* Weight Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('weight_progress')}</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowWeightInput((prev) => !prev)}>
                            <Text style={styles.addBtnText}>{showWeightInput ? t('close') : t('write_here')}</Text>
                        </TouchableOpacity>
                    </View>

                    {showWeightInput ? (
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Weight (kg)"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="numeric"
                                value={weightInput}
                                onChangeText={setWeightInput}
                                cursorColor={Colors.primary}
                            />
                            <TouchableOpacity style={styles.saveBtn} onPress={handleLogWeight}>
                                <Text style={styles.saveBtnText}>{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {weights.length > 0 ? (
                        <View>
                            <WeightGainChart
                                weights={weights}
                                startWeight={profile?.start_weight_kg}
                                heightCm={profile?.height_cm}
                            />
                            <View style={styles.weightHistoryList}>
                                {weights.slice(0, 3).map((w, i) => (
                                    <View key={i} style={styles.weightHistoryRow}>
                                        <View>
                                            <Text style={styles.weightHistoryVal}>{w.weight_kg} kg</Text>
                                            <Text style={styles.weightHistoryDate}>{w.date}</Text>
                                        </View>
                                        {w.report_uri ? (
                                            <TouchableOpacity
                                                style={styles.previewBtnSmall}
                                                onPress={() => handleViewReport(w.report_uri)}
                                            >
                                                <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.primary} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>{t('no_weight')}</Text>
                    )}
                </View>

                {/* ANC Schedule Section - Upgraded to Vertical Timeline */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('anc_timeline')}</Text>
                        </View>
                    </View>

                    {nextVisit ? (
                        <GradientCard style={{ marginBottom: 25 }} colors={designSystem.colors.cardGradientBlue}>
                            <View style={styles.nextVisitBadge}>
                                <Text style={styles.nextVisitBadgeText}>{t('next_visit')}</Text>
                            </View>
                            <Text style={styles.nextVisitTitle}>{t('visit_num', { num: nextVisit.visit_number })}</Text>
                            <Text style={styles.nextVisitWeek}>{t('week_at', { week: nextVisit.recommended_week })}</Text>
                            <Text style={styles.nextVisitDesc}>{isHindi || isBilingual ? nextVisit.description_hi : nextVisit.description_en || nextVisit.description_hi}</Text>
                        </GradientCard>
                    ) : null}

                    <View style={styles.timelineContainer}>
                        {anc.map((visit, idx) => {
                            const isLast = idx === anc.length - 1;
                            return (
                                <View key={visit.visit_number} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[
                                            styles.timelineDot,
                                            visit.is_completed ? styles.dotCompleted : styles.dotPending
                                        ]}>
                                            {visit.is_completed ? <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text> : null}
                                        </View>
                                        {!isLast ? <View style={styles.timelineLine} /> : null}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <View style={styles.ancCard}>
                                            <View style={styles.ancCardTop}>
                                                <View>
                                                    <Text style={styles.ancCardTitle}>{t('visit_num', { num: visit.visit_number })}</Text>
                                                    <Text style={styles.ancCardWeek}>{t('pregnancy_week')} {visit.recommended_week}</Text>
                                                </View>
                                                {!visit.is_completed ? (
                                                    <TouchableOpacity
                                                        style={styles.checkDoneBtn}
                                                        onPress={() => handleMarkANC(visit.visit_number)}
                                                    >
                                                        <Text style={styles.checkDoneBtnText}>{t('mark_done')}</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>

                                            <Text style={styles.ancCardDesc}>{isHindi || isBilingual ? visit.description_hi : visit.description_en || visit.description_hi}</Text>

                                            <View style={styles.ancActions}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, visit.report_uri ? styles.actionBtnActive : null]}
                                                    onPress={() => handleUploadReport(visit.visit_number)}
                                                >
                                                    <Text style={[styles.actionBtnText, visit.report_uri ? styles.actionBtnTextActive : null]}>
                                                        {visit.report_uri ? t('change_report') : t('add_report')}
                                                    </Text>
                                                </TouchableOpacity>

                                                {visit.report_uri ? (
                                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                                        <TouchableOpacity
                                                            style={styles.viewReportBtn}
                                                            onPress={() => handleViewReport(visit.report_uri)}
                                                        >
                                                            <Text style={styles.viewReportBtnText}>{t('view') || 'View'}</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.removeReportBtn}
                                                            onPress={() => handleRemoveReport(visit.visit_number)}
                                                        >
                                                            <Text style={styles.removeReportBtnText}>{t('remove')}</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : null}

                                                {visit.report_uri ? (
                                                    <Text style={styles.reportAttachedBadge}>{t('attached')}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Supplement Section - Upgraded */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('supplement_title')}</Text>
                        </View>
                    </View>

                    {/* Score Card with Circular Gauge */}
                    <View style={styles.scoreCard}>
                        <View style={styles.scoreRow}>
                            <View style={styles.gaugeContainer}>
                                <Svg width="80" height="80" viewBox="0 0 80 80">
                                    <Circle
                                        cx="40"
                                        cy="40"
                                        r="35"
                                        stroke="#E0E0E0"
                                        strokeWidth="8"
                                        fill="transparent"
                                    />
                                    <Circle
                                        cx="40"
                                        cy="40"
                                        r="35"
                                        stroke={adherenceScore >= 80 ? Colors.success : Colors.warning}
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={`${2 * Math.PI * 35}`}
                                        strokeDashoffset={`${2 * Math.PI * 35 * (1 - adherenceScore / 100)}`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 40 40)"
                                    />
                                </Svg>
                                <View style={styles.scoreTextContainer}>
                                    <Text style={styles.scorePercent}>{adherenceScore}%</Text>
                                </View>
                            </View>
                            <View style={styles.scoreInfo}>
                                <Text style={styles.scoreTitle}>
                                    {adherenceScore >= 80 ? t('adherence_great') : t('adherence_action')}
                                </Text>
                                <Text style={styles.scoreDesc}>
                                    {adherenceScore >= 80
                                        ? t('adherence_great_desc')
                                        : t('adherence_action_desc')
                                    }
                                </Text>
                                {streakDays > 0 ? (
                                    <View style={styles.streakBadge}>
                                        <Text style={styles.streakText}>{t('streak', { days: streakDays })}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>

                    {/* Medicine Strip History */}
                    <View style={styles.medicineStripContainer}>
                        <Text style={styles.historyTitle}>{t('past_7_days')}</Text>
                        {suppHistory.length > 0 ? (
                            suppHistory.map((day, idx) => (
                                <View key={idx} style={styles.medicineRow}>
                                    <View style={styles.medicineDate}>
                                        <Text style={styles.dayText}>{day.date.split('-')[2]}</Text>
                                        <Text style={styles.monthText}>{new Date(day.date).toLocaleString(isHindi ? 'hi-IN' : 'en-US', { month: 'short' })}</Text>
                                    </View>
                                    <View style={styles.pileStrip}>
                                        {(() => {
                                            const takenTypes = day.types ? day.types.split(',') : [];
                                            // We'll show up to 4 slots (1 Iron, 2 Calcium, 1 Folic)
                                            // Simplified for the UI: just show the taken ones first, then empty slots
                                            const slots = [1, 2, 3, 4];
                                            return slots.map(pos => {
                                                const typeId = takenTypes[pos - 1];
                                                const supplement = SupplementTypes.find(s => s.id === typeId);
                                                const taken = !!supplement;

                                                return (
                                                    <View key={pos} style={[styles.pillSlot, taken && { backgroundColor: `${supplement.color}15`, borderColor: supplement.color, borderWidth: 1 }]}>
                                                        <Text style={[styles.pillIcon, !taken && { opacity: 0.2 }]}>
                                                            {taken ? supplement.emoji : '💊'}
                                                        </Text>
                                                        {taken ? (
                                                            <View style={[styles.pillCheck, { backgroundColor: supplement.color }]}>
                                                                <Text style={styles.pillCheckText}>✓</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                );
                                            });
                                        })()}
                                    </View>
                                    <Text style={styles.dailyTakenText}>{day.count}/3+</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>{t('no_records')}</Text>
                        )}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ─── Swelling Scan Instructions Modal ─────────────────────────── */}
            <Modal
                visible={showInstructionsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowInstructionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.instrModal}>
                        <Text style={styles.instrTitle}>{t('swelling_instr_title')}</Text>
                        <Text style={styles.instrSubtitle}>
                            {t('swelling_instr_sub')}
                        </Text>

                        <View style={styles.instrSteps}>
                            {[
                                { icon: '👣', hi: 'दोनों टखने / पैर फोटो में दिखने चाहिए', en: 'Both ankles must be clearly visible' },
                                { icon: '💡', hi: 'अच्छी और प्राकृतिक रोशनी में फोटो लें', en: 'Take photo in good natural lighting' },
                                { icon: '📐', hi: 'कैमरा 45° के कोण पर रखें', en: 'Hold camera at ~45° angle' },
                                { icon: '🖐️', hi: 'चेहरा, हाथ या पेट भी दिखे तो और अच्छा', en: 'Include hands/face if they appear swollen too' },
                            ].map((step, i) => (
                                <View key={i} style={styles.instrStep}>
                                    <Text style={styles.instrIcon}>{step.icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.instrStepHi}>{isBilingual || isHindi ? step.hi : step.en}</Text>
                                        <Text style={styles.instrStepEn}>{isBilingual ? step.en : ''}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.instrBtns}>
                            <TouchableOpacity
                                style={[styles.instrBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => handleSwellingScan('camera')}
                            >
                                <Text style={styles.instrBtnText}>{t('camera')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.instrBtn, { backgroundColor: Colors.secondary || '#5C6BC0' }]}
                                onPress={() => handleSwellingScan('gallery')}
                            >
                                <Text style={styles.instrBtnText}>{t('gallery')}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.instrClose}
                            onPress={() => setShowInstructionsModal(false)}
                        >
                            <Text style={styles.instrCloseText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Add Record Options Modal */}
            <Modal
                visible={showAddRecordOptions}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddRecordOptions(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAddRecordOptions(false)}
                >
                    <View style={styles.optionsContainer}>
                        <Text style={styles.optionsTitle}>{isHindi ? 'नया रिकॉर्ड जोड़ें' : 'Add New Record'}</Text>
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                                setShowAddRecordOptions(false);
                                setShowVitalsInput(true);
                            }}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#E3F2FD' }]}>
                                <MaterialCommunityIcons name="pencil" size={24} color="#1976D2" />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>{isHindi ? 'मैन्युअल एंट्री' : 'Manual Entry'}</Text>
                                <Text style={styles.optionSub}>{isHindi ? 'खुद से डेटा भरें' : 'Input health data yourself'}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={handleReportExtraction}
                        >
                            <View style={[styles.optionIcon, { backgroundColor: '#F3E5F5' }]}>
                                <MaterialCommunityIcons name="file-upload" size={24} color="#7B1FA2" />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>{isHindi ? 'रिपोर्ट अपलोड करें' : 'Upload Test Report'}</Text>
                                <Text style={styles.optionSub}>{isHindi ? 'फोटो से डेटा खुद निकल जाएगा' : 'Auto-extract from lab reports'}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            {/* Extraction Loader */}
            {isExtracting ? (
                <View style={styles.fullLoader}>
                    <ScanLoadingAnimation title={isHindi ? 'रिपोर्ट पढ़ी जा रही है...' : 'Extracting data from report...'} source={null} />
                </View>
            ) : null}
            {/* Extracted Data Review Modal */}
            <Modal
                visible={showExtractedReview}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.reviewContainer}>
                        <Text style={styles.optionsTitle}>{isHindi ? 'डेटा की जांच करें' : 'Review Extracted Data'}</Text>
                        <Text style={styles.reviewHint}>{isHindi ? 'कृपया सुनिश्चित करें कि नीचे दिया गया डेटा सही है।' : 'Please verify the extracted parameters.'}</Text>
                        <ScrollView style={styles.reviewScroll}>
                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Blood Pressure (Systolic / Diastolic)</Text>
                                <View style={styles.reviewInputRow}>
                                    <TextInput
                                        style={styles.reviewInput}
                                        value={extractedData?.systolic?.toString() || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, systolic: v })}
                                        keyboardType="numeric"
                                    />
                                    <Text style={{ fontSize: 20, marginHorizontal: 10 }}>/</Text>
                                    <TextInput
                                        style={styles.reviewInput}
                                        value={extractedData?.diastolic?.toString() || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, diastolic: v })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Blood Sugar (mg/dL)</Text>
                                <TextInput
                                    style={styles.reviewInputFull}
                                    value={extractedData?.blood_sugar?.toString() || ''}
                                    onChangeText={(v) => setExtractedData({ ...extractedData, blood_sugar: v })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>HbA1c (%)</Text>
                                <TextInput
                                    style={styles.reviewInputFull}
                                    value={extractedData?.hba1c?.toString() || ''}
                                    onChangeText={(v) => setExtractedData({ ...extractedData, hba1c: v })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={[styles.reviewRow, { flex: 1 }]}>
                                    <Text style={styles.reviewLabel}>FBS (mg/dL)</Text>
                                    <TextInput
                                        style={styles.reviewInputFull}
                                        value={extractedData?.fbs?.toString() || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, fbs: v })}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.reviewRow, { flex: 1 }]}>
                                    <Text style={styles.reviewLabel}>PPBS (mg/dL)</Text>
                                    <TextInput
                                        style={styles.reviewInputFull}
                                        value={extractedData?.ppbs?.toString() || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, ppbs: v })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={[styles.reviewRow, { flex: 1 }]}>
                                    <Text style={styles.reviewLabel}>Age</Text>
                                    <TextInput
                                        style={styles.reviewInputFull}
                                        value={extractedData?.age?.toString() || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, age: v })}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.reviewRow, { flex: 1 }]}>
                                    <Text style={styles.reviewLabel}>Gender</Text>
                                    <TextInput
                                        style={styles.reviewInputFull}
                                        value={extractedData?.gender || ''}
                                        onChangeText={(v) => setExtractedData({ ...extractedData, gender: v })}
                                    />
                                </View>
                            </View>

                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.reviewInputFull}
                                    value={extractedData?.weight_kg?.toString() || ''}
                                    onChangeText={(v) => setExtractedData({ ...extractedData, weight_kg: v })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Height (cm)</Text>
                                <TextInput
                                    style={styles.reviewInputFull}
                                    value={extractedData?.height_cm?.toString() || ''}
                                    onChangeText={(v) => setExtractedData({ ...extractedData, height_cm: v })}
                                    keyboardType="numeric"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.reviewActions}>
                            <TouchableOpacity
                                style={[styles.reviewBtn, styles.cancelBtn]}
                                onPress={() => setShowExtractedReview(false)}
                            >
                                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.reviewBtn, styles.saveBtnPrimary]}
                                onPress={handleSaveExtractedData}
                            >
                                <Text style={styles.saveBtnText}>{t('save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Offline Swelling Questionnaire Modal ────────────────────── */}
            <Modal
                visible={showOfflineQuestionnaire}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowOfflineQuestionnaire(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.offlineModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.instrTitle}>{t('offline_swelling_title')}</Text>
                            <TouchableOpacity onPress={() => setShowOfflineQuestionnaire(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.instrSubtitle}>{t('offline_swelling_subtitle')}</Text>

                        <ScrollView style={styles.offlineScroll} showsVerticalScrollIndicator={false}>
                            {/* Q1: Location */}
                            <Text style={styles.qLabel}>{t('q_swelling_location')}</Text>
                            <View style={styles.qBtnRow}>
                                {[
                                    { id: 'both_feet', label: t('q_opt_both_feet') },
                                    { id: 'one_foot', label: t('q_opt_one_foot') },
                                    { id: 'face_hands', label: t('q_opt_face_hands') }
                                ].map(opt => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.qBtn, offlineQ.location === opt.id && styles.qBtnSelected]}
                                        onPress={() => setOfflineQ({ ...offlineQ, location: opt.id })}
                                    >
                                        <Text style={[styles.qBtnText, offlineQ.location === opt.id && styles.qBtnTextSelected]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Q2: Skin */}
                            <Text style={styles.qLabel}>{t('q_skin_appearance')}</Text>
                            <View style={styles.qBtnRow}>
                                {[
                                    { id: 'normal', label: t('q_opt_normal_skin') },
                                    { id: 'shiny_tight', label: t('q_opt_shiny_tight') },
                                    { id: 'pitting', label: t('q_opt_pitting') }
                                ].map(opt => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.qBtn, offlineQ.skin === opt.id && styles.qBtnSelected]}
                                        onPress={() => setOfflineQ({ ...offlineQ, skin: opt.id })}
                                    >
                                        <Text style={[styles.qBtnText, offlineQ.skin === opt.id && styles.qBtnTextSelected]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Q3: Timing */}
                            <Text style={styles.qLabel}>{t('q_swelling_timing')}</Text>
                            <View style={styles.qBtnRow}>
                                {[
                                    { id: 'evening_only', label: t('q_opt_evening_only') },
                                    { id: 'all_day', label: t('q_opt_all_day') },
                                    { id: 'sudden', label: t('q_opt_sudden') }
                                ].map(opt => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.qBtn, offlineQ.timing === opt.id && styles.qBtnSelected]}
                                        onPress={() => setOfflineQ({ ...offlineQ, timing: opt.id })}
                                    >
                                        <Text style={[styles.qBtnText, offlineQ.timing === opt.id && styles.qBtnTextSelected]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Q4: Symptoms */}
                            <Text style={styles.qLabel}>{t('q_other_symptoms')}</Text>
                            <View style={styles.qGrid}>
                                {[
                                    { id: 'headache', label: t('q_opt_headache') },
                                    { id: 'blurred_vision', label: t('q_opt_blurred_vision') },
                                    { id: 'abdominal_pain', label: t('q_opt_abdominal_pain') }
                                ].map(opt => {
                                    const isSelected = offlineQ.symptoms.includes(opt.id);
                                    return (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={[styles.qPill, isSelected && styles.qPillSelected]}
                                            onPress={() => {
                                                const news = isSelected 
                                                    ? offlineQ.symptoms.filter(s => s !== opt.id)
                                                    : [...offlineQ.symptoms, opt.id];
                                                setOfflineQ({ ...offlineQ, symptoms: news });
                                            }}
                                        >
                                            <MaterialCommunityIcons 
                                                name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} 
                                                size={18} 
                                                color={isSelected ? Colors.primary : Colors.textLight} 
                                            />
                                            <Text style={[styles.qPillText, isSelected && styles.qPillTextSelected]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity style={styles.qSubmitBtn} onPress={handleOfflineSwellingSubmit}>
                                <Text style={styles.qSubmitBtnText}>{t('q_submit_assessment')}</Text>
                            </TouchableOpacity>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Report Preview Modal */}
            <Modal
                visible={!!reportPreviewUri}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setReportPreviewUri(null)}
            >
                <View style={styles.previewOverlay}>
                    <TouchableOpacity
                        style={styles.previewCloseArea}
                        activeOpacity={1}
                        onPress={() => setReportPreviewUri(null)}
                    />
                    <View style={styles.previewContent}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>{isHindi ? 'रिपोर्ट देखें' : 'View Report'}</Text>
                            <TouchableOpacity onPress={() => setReportPreviewUri(null)}>
                                <MaterialCommunityIcons name="close" size={28} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {reportPreviewUri && (
                            <Image
                                source={{ uri: reportPreviewUri }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </Modal>
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
    stateText: { marginTop: 10, fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
    errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.danger, marginBottom: 6 },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.primary,
    },
    retryButtonText: { color: Colors.white, fontWeight: '700' },
    errorBanner: {
        backgroundColor: `${Colors.danger}15`,
        borderColor: `${Colors.danger}50`,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
    },
    errorBannerText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
    pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },
    smallEn: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary },
    section: { marginBottom: 30 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    sectionSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, marginTop: -4 },
    cardHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 15 },

    // Kick Counter Styles
    kickCardSpacing: {
        marginBottom: 0,
    },
    kickCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
    },
    kickStart: { alignItems: 'center', paddingVertical: 10 },
    kickHintHi: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, lineHeight: 22 },
    kickHintEn: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginBottom: 20 },
    kickMainBtn: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center' },
    kickMainBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
    btnSubEn: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.8)' },
    kickActive: { alignItems: 'center' },
    kickHeader: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    kickTimer: { fontSize: 32, fontWeight: '800', color: Colors.warning, fontFamily: 'monospace' },
    kickStopBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: `${Colors.danger}15` },
    kickStopBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
    kickBigNumber: { fontSize: 70, fontWeight: '900', color: Colors.white, marginTop: -5 },
    kickCircle: {
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10,
    },
    kickCircleTextHi: { color: Colors.white, fontSize: 22, fontWeight: '900', marginBottom: 0 },
    kickCircleTextEn: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
    historyList: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
    historyTitle: { fontSize: 14, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 12 },
    historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    historyDate: { fontSize: 13, color: Colors.textLight, width: 80 },
    historyInfo: { flex: 1 },
    historyValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    historySub: { fontSize: 12, color: Colors.textSecondary },

    // Vitals Styles
    vitalInputBox: { backgroundColor: Colors.white, padding: 16, borderRadius: 15, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
    inputHint: { fontSize: 12, color: Colors.textLight, marginBottom: 10, fontStyle: 'italic' },
    tinyLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4, marginLeft: 4 },
    smallInput: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        marginRight: 8,
        fontSize: 16,
        color: Colors.textPrimary,
        textAlignVertical: 'center',
    },
    vitalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 14, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: Colors.success, justifyContent: 'space-between' },
    vitalHigh: { borderLeftColor: Colors.danger, backgroundColor: `${Colors.danger}05` },
    vitalMain: { marginRight: 16 },
    vitalLabel: { fontSize: 11, color: Colors.textLight, textTransform: 'uppercase', fontWeight: '700' },
    alertText: { fontSize: 10, color: Colors.danger, fontWeight: '900' },
    vitalVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
    vitalDate: { fontSize: 12, color: Colors.textLight },
    vitalTime: { fontSize: 10, color: Colors.textLight, textAlign: 'right' },

    // Symptom Styles
    sympInputBox: { backgroundColor: Colors.white, padding: 16, borderRadius: 15, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
    label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    sympGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    sympItem: { width: '30%', aspectRatio: 1, backgroundColor: '#f9f9f9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
    sympItemSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}10` },
    sympItemLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
    sevRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    sevBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    sevBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
    sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    sevBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800', textTransform: 'uppercase' },
    saveBtnFull: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },

    addBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
    inputRow: { flexDirection: 'row', marginBottom: 12 },
    input: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 14,
        fontSize: 18,
        marginRight: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.textPrimary,
        textAlignVertical: 'center',
    },
    saveBtn: { backgroundColor: Colors.success, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
    saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
    weightTrendCard: {
        backgroundColor: `${Colors.primary}10`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: `${Colors.primary}30`,
    },
    trendLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
    trendValue: { fontSize: 22, fontWeight: '900', color: Colors.primary },
    weightRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.white, padding: 12, borderRadius: 10, marginBottom: 8 },
    weightDate: { fontSize: 14, color: Colors.textSecondary },
    weightValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
    weightWeek: { fontSize: 14, color: Colors.info },
    ancCompleted: { borderLeftColor: Colors.success, opacity: 0.7 },
    emptyText: { fontSize: 14, color: Colors.textLight, textAlign: 'center', padding: 20 },

    // Supplement Score Card & Gauge
    scoreCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    gaugeContainer: { position: 'relative', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
    scoreTextContainer: { position: 'absolute', width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
    scorePercent: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
    scoreInfo: { flex: 1, marginLeft: 20 },
    scoreTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    scoreDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
    streakBadge: { backgroundColor: `${Colors.warning}15`, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    streakText: { color: Colors.warning, fontSize: 11, fontWeight: '800' },

    // Medicine Strip Styles
    medicineStripContainer: { marginTop: 10 },
    medicineRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 10, elevation: 1 },
    medicineDate: { width: 45, alignItems: 'center' },
    dayText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
    monthText: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase' },
    pileStrip: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 15 },
    pillSlot: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    pillSlotTaken: { backgroundColor: `${Colors.success}15`, borderWidth: 1, borderColor: Colors.success },
    pillIcon: { fontSize: 20 },
    pillCheck: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.success, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    pillCheckText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    dailyTakenText: { width: 40, textAlign: 'right', fontSize: 14, fontWeight: '800', color: Colors.textPrimary },

    // Next Visit Highlight
    nextVisitHighlight: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        elevation: 6,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    nextVisitBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10
    },
    nextVisitBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    nextVisitTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
    nextVisitWeek: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700', marginTop: 2 },
    nextVisitDesc: { color: '#fff', fontSize: 14, marginTop: 8, lineHeight: 20 },

    // Timeline Styles
    timelineContainer: { paddingLeft: 10 },
    timelineItem: { flexDirection: 'row', marginBottom: 20 },
    timelineLeft: { width: 40, alignItems: 'center' },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 2
    },
    dotCompleted: { backgroundColor: Colors.success },
    dotPending: { backgroundColor: '#E0E0E0' },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: -5,
        zIndex: 1
    },
    timelineContent: { flex: 1, paddingLeft: 10 },

    // ANC Card Styles
    ancCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    ancCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    ancCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
    ancCardWeek: { fontSize: 12, color: Colors.info, fontWeight: '700' },
    ancCardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 15 },

    ancActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkDoneBtn: { backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    checkDoneBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    actionBtnActive: { backgroundColor: `${Colors.primary}10`, borderColor: Colors.primaryLight },
    actionBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
    actionBtnTextActive: { color: Colors.primary },
    reportAttachedBadge: { fontSize: 11, color: Colors.success, fontWeight: '800' },
    removeReportBtn: {
        backgroundColor: `${Colors.danger}10`,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${Colors.danger}20`
    },
    removeReportBtnText: { color: Colors.danger, fontSize: 11, fontWeight: '700' },

    // ── Swelling Scan ────────────────────────────────────────────────────────
    scanLoadingBox: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginTop: 8,
    },
    scanLoadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    scanLoadingSubtext: {
        marginTop: 4,
        fontSize: 13,
        color: Colors.textLight,
    },
    swellingResultCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 18,
        marginTop: 10,
        borderLeftWidth: 5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    swellingThumb: {
        width: '100%',
        height: 160,
        borderRadius: 14,
        marginBottom: 14,
    },
    riskBadge: {
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    riskBadgeText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    preeclampsiaAlert: {
        backgroundColor: `${Colors.danger}15`,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: `${Colors.danger}40`,
    },
    preeclampsiaText: {
        color: Colors.danger,
        fontWeight: '700',
        fontSize: 13,
        lineHeight: 18,
    },
    obsTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    obsItem: {
        fontSize: 14,
        color: Colors.textPrimary,
        marginBottom: 4,
        lineHeight: 20,
    },
    recBox: {
        backgroundColor: Colors.surfaceLight || '#F5F5F5',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginBottom: 8,
    },
    recText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 22,
        marginBottom: 4,
    },
    recSubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    disclaimerText: {
        fontSize: 11,
        color: Colors.textLight,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    riskPill: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginRight: 8,
    },
    riskPillText: {
        fontSize: 12,
        fontWeight: '800',
    },

    // ── Instructions Modal ───────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    instrModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 36,
    },
    instrTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    instrSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 18,
        lineHeight: 20,
    },
    instrSteps: {
        marginBottom: 20,
    },
    instrStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
        gap: 12,
    },
    instrIcon: {
        fontSize: 22,
        width: 32,
        textAlign: 'center',
    },
    instrStepHi: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 20,
    },
    instrStepEn: {
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    instrBtns: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    instrBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    instrBtnText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 15,
    },
    instrClose: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    instrCloseText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    mainAddBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    mainAddBtnText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 6,
        fontSize: 14,
    },
    optionsContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    optionsTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    optionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    optionSub: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    fullLoader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    reviewContainer: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        height: '80%',
    },
    reviewHint: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    reviewScroll: {
        flex: 1,
    },
    reviewRow: {
        marginBottom: 20,
    },
    reviewLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    reviewInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewImage: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
    },
    weightHistoryList: { marginTop: 15 },
    weightHistoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    weightHistoryVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
    weightHistoryDate: { fontSize: 12, color: Colors.textLight },
    reviewInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        textAlign: 'center',
    },
    reviewInputFull: {
        height: 50,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
    },
    reviewActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    reviewBtn: {
        flex: 1,
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F1F3F5',
    },
    cancelBtnText: {
        color: Colors.textSecondary,
        fontWeight: '700',
    },
    saveBtnPrimary: {
        backgroundColor: Colors.primary,
    },
    // ── Offline Questionnaire Styles ──────────────────────────────────────────
    offlineModal: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    offlineScroll: {
        marginTop: 10,
    },
    qLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginTop: 18,
        marginBottom: 10,
    },
    qBtnRow: {
        flexDirection: 'column',
        gap: 8,
    },
    qBtn: {
        backgroundColor: '#F8F9FA',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    qBtnSelected: {
        borderColor: Colors.primary,
        backgroundColor: `${Colors.primary}10`,
    },
    qBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    qBtnTextSelected: {
        color: Colors.primary,
        fontWeight: '700',
    },
    qGrid: {
        flexDirection: 'column',
        gap: 8,
    },
    qPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        gap: 10,
    },
    qPillSelected: {
        borderColor: Colors.primary,
        backgroundColor: `${Colors.primary}05`,
    },
    qPillText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    qPillTextSelected: {
        color: Colors.primary,
        fontWeight: '700',
    },
    qSubmitBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 30,
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    qSubmitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
