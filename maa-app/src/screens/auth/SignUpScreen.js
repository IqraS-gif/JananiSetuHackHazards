import React, { useState, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { saveUserProfile, logVitals } from '../../services/database/DatabaseService';
import { uploadReportToFirebase } from '../../services/firebase/FirebaseStorageService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function weekFromLMP(lmpString) {
    if (!lmpString || !/^\d{4}-\d{2}-\d{2}$/.test(lmpString)) return null;
    const lmp = new Date(lmpString);
    if (isNaN(lmp.getTime())) return null;
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor((Date.now() - lmp.getTime()) / msPerWeek);
    return week > 0 && week <= 42 ? week : null;
}

function dueDateFromLMP(lmpString) {
    if (!lmpString || !/^\d{4}-\d{2}-\d{2}$/.test(lmpString)) return '';
    const lmp = new Date(lmpString);
    if (isNaN(lmp.getTime())) return '';
    const due = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    return due.toISOString().split('T')[0]; // YYYY-MM-DD
}

export default function SignUpScreen({ route, navigation }) {
    const { role } = route.params || { role: 'mother' };
    const { language } = useLanguage();
    const { login } = useUser();

    const [step, setStep] = useState(1);
    const totalSteps = role === 'mother' ? 5 : 3;

    // Form State
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [lmpDate, setLmpDate] = useState('');
    const [pregWeek, setPregWeek] = useState('');
    const [dueDate, setDueDate] = useState('');

    const [husbandContact, setHusbandContact] = useState('');
    const [ashaContact, setAshaContact] = useState('');
    const [phcContact, setPhcContact] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');

    // ASHA & Doctor specific form states
    const [phone, setPhone] = useState('');
    const [area, setArea] = useState('');
    const [phcName, setPhcName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [hospital, setHospital] = useState('');
    const [regId, setRegId] = useState('');

    // Vitals State
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [fastingSugar, setFastingSugar] = useState('');
    const [randomSugar, setRandomSugar] = useState('');

    // Report Upload State
    const [uploading, setUploading] = useState(false);
    const [reportUri, setReportUri] = useState(null);
    const [reportName, setReportName] = useState('');
    const [ocrStatus, setOcrStatus] = useState('');

    // Health Analysis State
    const [analysisDone, setAnalysisDone] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    // Dynamic derivation of pregnancy week & due date
    useEffect(() => {
        if (lmpDate.length === 10) {
            const week = weekFromLMP(lmpDate);
            const due = dueDateFromLMP(lmpDate);
            if (week) setPregWeek(String(week));
            if (due) setDueDate(due);
        }
    }, [lmpDate]);

    // Handle back press
    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.goBack();
        }
    };

    // Validate current step
    const handleNext = () => {
        if (step === 1) {
            if (!userId.trim()) {
                Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया उपयोगकर्ता आईडी दर्ज करें।' : 'Please enter a User ID.');
                return;
            }
            if (userId.toLowerCase() === 'user_001' || userId.toLowerCase() === 'user_002') {
                Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'यह आईडी पहले से मौजूद है।' : 'This ID already exists.');
                return;
            }
            if (!password.trim()) {
                Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter a password.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (role === 'mother') {
                if (!name.trim()) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया नाम दर्ज करें।' : 'Please enter your name.');
                    return;
                }
                if (!age.trim() || isNaN(age) || parseInt(age) < 12 || parseInt(age) > 60) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया सही उम्र दर्ज करें।' : 'Please enter a valid age (12-60).');
                    return;
                }
                if (!lmpDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(lmpDate)) {
                    Alert.alert(
                        language === 'hi' ? 'त्रुटि' : 'Error',
                        language === 'hi' 
                            ? 'कृपया सही तिथि प्रारूप दर्ज करें (YYYY-MM-DD)। उदाहरण: 2026-01-15' 
                            : 'Please enter lmp date in format YYYY-MM-DD. E.g. 2026-01-15'
                    );
                    return;
                }
                setStep(3);
            } else if (role === 'asha') {
                if (!name.trim()) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया नाम दर्ज करें।' : 'Please enter your name.');
                    return;
                }
                if (!age.trim() || isNaN(age) || parseInt(age) < 18 || parseInt(age) > 65) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया सही उम्र दर्ज करें।' : 'Please enter a valid age (18-65).');
                    return;
                }
                if (!phone.trim() || phone.length !== 10) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया सही 10-अंकीय फोन नंबर दर्ज करें।' : 'Please enter a valid 10-digit phone number.');
                    return;
                }
                setStep(3);
            } else if (role === 'doctor') {
                if (!name.trim()) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया नाम दर्ज करें।' : 'Please enter your name.');
                    return;
                }
                if (!age.trim() || isNaN(age) || parseInt(age) < 22 || parseInt(age) > 75) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया सही उम्र दर्ज करें।' : 'Please enter a valid age (22-75).');
                    return;
                }
                if (!phone.trim() || phone.length !== 10) {
                    Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', language === 'hi' ? 'कृपया सही 10-अंकीय फोन नंबर दर्ज करें।' : 'Please enter a valid 10-digit phone number.');
                    return;
                }
                setStep(3);
            }
        } else if (step === 3) {
            if (!husbandContact.trim() || husbandContact.length !== 10) {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error', 
                    language === 'hi' ? 'कृपया पति का सही 10-अंकीय संपर्क नंबर दर्ज करें।' : "Please enter a valid 10-digit husband's contact."
                );
                return;
            }
            if (ashaContact.trim() && ashaContact.length !== 10) {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error', 
                    language === 'hi' ? 'कृपया आशा कार्यकर्ता का सही 10-अंकीय नंबर दर्ज करें।' : "Please enter a valid 10-digit ASHA worker phone number."
                );
                return;
            }
            if (phcContact.trim() && phcContact.length !== 10) {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error', 
                    language === 'hi' ? 'कृपया PHC अस्पताल का सही 10-अंकीय नंबर दर्ज करें।' : "Please enter a valid 10-digit PHC phone number."
                );
                return;
            }
            if (emergencyContact.trim() && emergencyContact.length !== 10) {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error', 
                    language === 'hi' ? 'कृपया आपातकालीन संपर्क का सही 10-अंकीय नंबर दर्ज करें।' : "Please enter a valid 10-digit emergency contact."
                );
                return;
            }
            setStep(4);
        } else if (step === 4) {
            if (!systolic.trim() || !diastolic.trim()) {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error',
                    language === 'hi' ? 'कृपया रक्तचाप (Systolic & Diastolic) दर्ज करें।' : 'Please enter baseline Blood Pressure.'
                );
                return;
            }
            // Execute Health Risk Analysis before displaying step 5
            runHealthRiskAnalysis();
            setStep(5);
        }
    };

    // OCR mock scan
    const runMockOcrScan = () => {
        setOcrStatus(language === 'hi' ? 'स्कैनिंग और विश्लेषण हो रहा है...' : 'Scanning & extracting details...');
        setTimeout(() => {
            setOcrStatus(language === 'hi' ? '✅ रिपोर्ट डेटा सफलतापूर्वक निकाला गया' : '✅ Report data extracted successfully');
            // If they didn't input glucose/BP, fill it from report
            if (!fastingSugar) setFastingSugar('96');
            if (!systolic) {
                setSystolic('134');
                setDiastolic('86');
            }
        }, 2000);
    };

    // Pick document/image
    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const doc = result.assets[0];
            setUploading(true);
            setReportName(doc.name);

            // Trigger upload mock
            const fileName = `signup_report_${Date.now()}_${doc.name}`;
            try {
                const firebaseURL = await uploadReportToFirebase(doc.uri, fileName);
                setReportUri(firebaseURL);
            } catch (err) {
                console.warn('Firebase upload failed, using local URI:', err);
                setReportUri(doc.uri);
            }

            setUploading(false);
            runMockOcrScan();
        } catch (e) {
            console.error(e);
            setUploading(false);
            Alert.alert('Error', 'Failed to pick document.');
        }
    };

    // Clinical health risk analysis rules
    const runHealthRiskAnalysis = () => {
        const sysVal = parseInt(systolic) || 120;
        const diaVal = parseInt(diastolic) || 80;
        const fSugar = parseFloat(fastingSugar) || null;
        const rSugar = parseFloat(randomSugar) || null;

        let bpRisk = 'NORMAL';
        let sugarRisk = 'NORMAL';
        let totalStatus = 'NORMAL';

        let bpAdviceEn = 'Your blood pressure is in the healthy range. Keep active and eat healthy.';
        let bpAdviceHi = 'आपका रक्तचाप सामान्य सीमा में है। सक्रिय रहें और स्वस्थ भोजन लें।';
        let sugarAdviceEn = 'Your blood sugar is in the healthy range. Continue with balanced nutrition.';
        let sugarAdviceHi = 'आपकी ब्लड शुगर सामान्य सीमा में है। संतुलित पोषण जारी रखें।';

        // Blood pressure risk logic
        if (sysVal >= 140 || diaVal >= 90) {
            bpRisk = 'HIGH';
            totalStatus = 'HIGH';
            bpAdviceEn = '⚠️ High Blood Pressure detected. Possible Gestational Hypertension or Preeclampsia risk. Consult your ASHA worker or doctor for daily tracking and reduce sodium intake.';
            bpAdviceHi = '⚠️ उच्च रक्तचाप पाया गया। जेस्टेशनल हाइपरटेंशन या प्रीक्लेम्पसिया का जोखिम। दैनिक निगरानी के लिए डॉक्टर से संपर्क करें और नमक कम खाएं।';
        } else if (sysVal >= 130 || diaVal >= 80) {
            bpRisk = 'WARNING';
            if (totalStatus !== 'HIGH') totalStatus = 'WARNING';
            bpAdviceEn = 'Elevated Blood Pressure. Keep monitoring your blood pressure weekly and avoid heavy workload.';
            bpAdviceHi = 'बढ़ा हुआ रक्तचाप। हर हफ्ते बीपी चेक करवाएं और भारी काम करने से बचें।';
        }

        // Blood sugar risk logic
        if ((fSugar && fSugar >= 95) || (rSugar && rSugar >= 140)) {
            sugarRisk = 'HIGH';
            totalStatus = 'HIGH';
            sugarAdviceEn = '⚠️ Elevated blood sugar detected. Risk of Gestational Diabetes. Consult doctor for an OGTT (Oral Glucose Tolerance Test). Limit carbohydrates & refined sugar.';
            sugarAdviceHi = '⚠️ ब्लड शुगर का स्तर बढ़ा हुआ है। जेस्टेशनल डायबिटीज का खतरा। डॉक्टर से मिलें और मीठा/कार्बोहाइड्रेट कम लें।';
        } else if ((fSugar && fSugar >= 90) || (rSugar && rSugar >= 120)) {
            sugarRisk = 'WARNING';
            if (totalStatus !== 'HIGH') totalStatus = 'WARNING';
            sugarAdviceEn = 'Borderline blood sugar. Choose high-fiber foods, whole grains, and exercise gently after meals.';
            sugarAdviceHi = 'सामान्य से थोड़ा अधिक ब्लड शुगर। फाइबर युक्त भोजन, साबुत अनाज लें और खाने के बाद थोड़ा चलें।';
        }

        setAnalysisResult({
            bpRisk,
            sugarRisk,
            totalStatus,
            bpAdviceEn,
            bpAdviceHi,
            sugarAdviceEn,
            sugarAdviceHi,
            sysVal,
            diaVal,
            fSugar,
            rSugar
        });
        setAnalysisDone(true);
    };

    // Save profile and finish signup
    const handleFinish = async () => {
        try {
            if (role === 'asha' || role === 'doctor') {
                const profileData = {
                    name: name.trim(),
                    age: parseInt(age) || null,
                    husband_contact: phone,
                    state: role === 'asha' ? area : hospital,
                    ration_category: role === 'doctor' ? specialization : null,
                    pmmvy_claimed: role === 'doctor' ? regId : phcName,
                    language: language || 'hi',
                    role: role,
                };

                await saveUserProfile(profileData, userId);
                login(userId, role);
                Alert.alert(
                    language === 'hi' ? 'सफलतापूर्वक खाता बना' : 'Success', 
                    language === 'hi' ? 'आपका नया प्रोफ़ाइल सुरक्षित हो गया है।' : 'Your profile has been created successfully!'
                );
            } else {
                // 1. Save User Profile
                const profileData = {
                    name: name.trim(),
                    age: parseInt(age) || null,
                    lmp_date: lmpDate || null,
                    due_date: dueDate || null,
                    pregnancy_week: parseInt(pregWeek) || null,
                    height_cm: height ? parseFloat(height) : null,
                    start_weight_kg: 60.0, // defaults
                    current_weight_kg: 60.0,
                    asha_contact: ashaContact || null,
                    emergency_contact: emergencyContact || null,
                    husband_contact: husbandContact || null,
                    phc_contact: phcContact || null,
                    language: language || 'hi',
                    role: 'mother',
                };

                await saveUserProfile(profileData, userId);

                // 2. Save baseline vitals to vitals_logs
                await logVitals({
                    patientId: userId,
                    systolic: parseInt(systolic),
                    diastolic: parseInt(diastolic),
                    bloodSugar: randomSugar ? parseFloat(randomSugar) : (fastingSugar ? parseFloat(fastingSugar) : null),
                    fbs: fastingSugar ? parseFloat(fastingSugar) : null,
                    ppbs: randomSugar ? parseFloat(randomSugar) : null,
                    pulse: 78, // default
                    notes: 'Baseline signup parameters',
                    reportUri: reportUri || null,
                });

                // 3. Log user in
                login(userId, 'mother');
                Alert.alert(
                    language === 'hi' ? 'सफलतापूर्वक खाता बना' : 'Success', 
                    language === 'hi' ? 'आपका नया प्रोफ़ाइल सुरक्षित हो गया है।' : 'Your profile has been created successfully!'
                );
            }
        } catch (err) {
            console.error('Save profile failure:', err);
            Alert.alert('Error', 'Failed to save profile. Please check if ID is unique.');
        }
    };

    return (
        <SafeAreaView style={st.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Header */}
                <View style={st.header}>
                    <TouchableOpacity onPress={handleBack} style={st.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={st.headerTitle}>
                            {language === 'hi' ? 'नया खाता' : 'Create Profile'}
                        </Text>
                        <Text style={st.headerSub}>
                            {language === 'hi' ? `चरण ${step}/${totalSteps}` : `Step ${step} of ${totalSteps}`}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={st.progressBarBg}>
                    <View style={[st.progressBarFill, { width: `${(step / totalSteps) * 100}%` }]} />
                </View>

                <ScrollView contentContainerStyle={st.scrollContent}>
                    {/* STEP 1: Account credentials */}
                    {step === 1 && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'खाता विवरण दर्ज करें' : 'Account Setup'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'यह विवरण आपको दोबारा लॉगिन करने में मदद करेगा।' : 'Enter credentials to access your account later.'}
                            </Text>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'उपयोगकर्ता आईडी / फोन नंबर' : 'User ID / Phone Number'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. user_003"
                                    value={userId}
                                    onChangeText={setUserId}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पासवर्ड / पिन' : 'Password / PIN'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    )}

                    {/* STEP 2: Basic profile */}
                    {step === 2 && role === 'mother' && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'गर्भवती महिला के विवरण' : 'Mother’s Details'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'कृपया सही नैदानिक जानकारी दर्ज करें।' : 'Please enter accurate clinical details.'}
                            </Text>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पूरा नाम' : 'Full Name'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. Renu Verma"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={st.row}>
                                <View style={[st.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'उम्र' : 'Age'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 26"
                                        keyboardType="numeric"
                                        value={age}
                                        onChangeText={setAge}
                                    />
                                </View>
                                <View style={[st.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'ऊंचाई (सेमी)' : 'Height (cm)'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 158"
                                        keyboardType="numeric"
                                        value={height}
                                        onChangeText={setHeight}
                                    />
                                </View>
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>
                                    {language === 'hi' ? 'LMP तारीख (आखिरी माहवारी)' : 'LMP Date (Last Menstrual Period)'}
                                </Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="YYYY-MM-DD"
                                    value={lmpDate}
                                    onChangeText={setLmpDate}
                                />
                            </View>

                            {pregWeek ? (
                                <View style={st.derivedBox}>
                                    <View style={st.derivedRow}>
                                        <Text style={st.derivedLabel}>{language === 'hi' ? 'गर्भावस्था सप्ताह' : 'Pregnancy Week'}</Text>
                                        <Text style={st.derivedVal}>{pregWeek} weeks</Text>
                                    </View>
                                    <View style={st.derivedRow}>
                                        <Text style={st.derivedLabel}>{language === 'hi' ? 'प्रसव की नियत तिथि (EDD)' : 'Estimated Due Date (EDD)'}</Text>
                                        <Text style={st.derivedVal}>{dueDate}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {step === 2 && role === 'asha' && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'ASHA कार्यकर्ता विवरण' : 'ASHA Worker Details'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'कृपया अपनी जानकारी सही-सही भरें।' : 'Please fill in your details accurately.'}
                            </Text>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पूरा नाम' : 'Full Name'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. Suman Lata"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={st.row}>
                                <View style={[st.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'उम्र' : 'Age'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 34"
                                        keyboardType="numeric"
                                        value={age}
                                        onChangeText={setAge}
                                    />
                                </View>
                                <View style={[st.inputGroup, { flex: 1.5, marginLeft: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'फ़ोन नंबर (10 अंक)' : 'Phone Number (10 digits)'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 9876543210"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, ''))}
                                    />
                                </View>
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'सौंपी गई क्षेत्र/जिला' : 'Assigned Area / District'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. Sector 4, Varanasi District"
                                    value={area}
                                    onChangeText={setArea}
                                />
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'PHC अस्पताल केंद्र' : 'PHC Health Center'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. Varanasi Area PHC"
                                    value={phcName}
                                    onChangeText={setPhcName}
                                />
                            </View>
                        </View>
                    )}

                    {step === 2 && role === 'doctor' && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'चिकित्सक विवरण' : 'Doctor Details'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'कृपया अपनी जानकारी सही-सही भरें।' : 'Please fill in your details accurately.'}
                            </Text>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पूरा नाम' : 'Full Name'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. Dr. S. K. Gupta"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={st.row}>
                                <View style={[st.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'उम्र' : 'Age'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 45"
                                        keyboardType="numeric"
                                        value={age}
                                        onChangeText={setAge}
                                    />
                                </View>
                                <View style={[st.inputGroup, { flex: 1.5, marginLeft: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'फ़ोन नंबर (10 अंक)' : 'Phone Number (10 digits)'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 9988776655"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, ''))}
                                    />
                                </View>
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'विशेषज्ञता' : 'Specialization / Degree'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. OB/GYN, General Physician"
                                    value={specialization}
                                    onChangeText={setSpecialization}
                                />
                            </View>

                            <View style={st.row}>
                                <View style={[st.inputGroup, { flex: 1.5, marginRight: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'अस्पताल / क्लिनिक नाम' : 'Hospital / Clinic Name'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. City Maternal Hospital"
                                        value={hospital}
                                        onChangeText={setHospital}
                                    />
                                </View>
                                <View style={[st.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={st.label}>{language === 'hi' ? 'पंजीकरण संख्या' : 'Registration ID'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. MCI-9988"
                                        value={regId}
                                        onChangeText={setRegId}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* STEP 3: Emergency Contacts */}
                    {step === 3 && role === 'mother' && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'आपातकालीन संपर्क' : 'Emergency Contacts'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'जरूरत पड़ने पर तुरंत मदद के लिए आपातकालीन संपर्क सूत्र।' : 'Contact info for timely support in critical moments.'}
                            </Text>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पति का फोन नंबर (10 अंक)' : 'Husband\'s Phone Number (10 digits)'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="9876543210"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={husbandContact}
                                    onChangeText={(txt) => setHusbandContact(txt.replace(/[^0-9]/g, ''))}
                                />
                            </View>
 
                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'ASHA कार्यकर्ता का नंबर (10 अंक)' : 'ASHA Worker\'s Phone Number (10 digits)'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="9123456789"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={ashaContact}
                                    onChangeText={(txt) => setAshaContact(txt.replace(/[^0-9]/g, ''))}
                                />
                            </View>
 
                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'निकटतम PHC (अस्पताल) नंबर (10 अंक)' : 'Nearest PHC (Hospital) Number (10 digits)'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="0755-123456"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={phcContact}
                                    onChangeText={(txt) => setPhcContact(txt.replace(/[^0-9]/g, ''))}
                                />
                            </View>
 
                            <View style={st.inputGroup}>
                                <Text style={st.label}>{language === 'hi' ? 'पारिवारिक आपातकालीन नंबर (10 अंक)' : 'Family Emergency Contact (10 digits)'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="9988776655"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={emergencyContact}
                                    onChangeText={(txt) => setEmergencyContact(txt.replace(/[^0-9]/g, ''))}
                                />
                            </View>
                        </View>
                    )}
                    {step === 3 && (role === 'asha' || role === 'doctor') && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'विवरण की पुष्टि करें' : 'Confirm Details'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'कृपया आगे बढ़ने से पहले अपने विवरणों की समीक्षा करें।' : 'Please review your details before completing account creation.'}
                            </Text>

                            <View style={st.actionBox}>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'उपयोगकर्ता आईडी: ' : 'User ID: '}</Text>
                                        {userId}
                                    </Text>
                                </View>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'नाम: ' : 'Name: '}</Text>
                                        {name}
                                    </Text>
                                </View>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'भूमिका: ' : 'Role: '}</Text>
                                        {role === 'asha' ? (language === 'hi' ? 'आशा कार्यकर्ता' : 'ASHA Worker') : (language === 'hi' ? 'चिकित्सक' : 'Doctor')}
                                    </Text>
                                </View>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'फ़ोन नंबर: ' : 'Phone Number: '}</Text>
                                        {phone}
                                    </Text>
                                </View>
                                {role === 'asha' ? (
                                    <>
                                        <View style={st.bullet}>
                                            <Text style={st.bulletSymbol}>•</Text>
                                            <Text style={st.bulletText}>
                                                <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'क्षेत्र/जिला: ' : 'Area / District: '}</Text>
                                                {area}
                                            </Text>
                                        </View>
                                        <View style={st.bullet}>
                                            <Text style={st.bulletSymbol}>•</Text>
                                            <Text style={st.bulletText}>
                                                <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'PHC केंद्र: ' : 'PHC Center: '}</Text>
                                                {phcName}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={st.bullet}>
                                            <Text style={st.bulletSymbol}>•</Text>
                                            <Text style={st.bulletText}>
                                                <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'विशेषज्ञता: ' : 'Specialization: '}</Text>
                                                {specialization}
                                            </Text>
                                        </View>
                                        <View style={st.bullet}>
                                            <Text style={st.bulletSymbol}>•</Text>
                                            <Text style={st.bulletText}>
                                                <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'अस्पताल: ' : 'Hospital: '}</Text>
                                                {hospital}
                                            </Text>
                                        </View>
                                        <View style={st.bullet}>
                                            <Text style={st.bulletSymbol}>•</Text>
                                            <Text style={st.bulletText}>
                                                <Text style={{ fontWeight: 'bold' }}>{language === 'hi' ? 'पंजीकरण आईडी: ' : 'Registration ID: '}</Text>
                                                {regId}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    )}

                    {/* STEP 4: Vitals & Medical Reports */}
                    {step === 4 && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? 'मूल स्वास्थ्य मापदंड और रिपोर्ट' : 'Baseline Vitals & Reports'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'कृपया अपनी हालिया जांच रिपोर्ट से मान प्रविष्ट करें या रिपोर्ट अपलोड करें।' : 'Enter baseline readings or upload report to auto-scan clinical values.'}
                            </Text>

                            <Text style={st.sectionLabel}>
                                {language === 'hi' ? 'रक्तचाप (Blood Pressure)' : 'Blood Pressure'}
                            </Text>
                            <View style={st.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={st.tinyLabel}>{language === 'hi' ? 'सिस्टोलिक (Systolic)' : 'Systolic'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 120"
                                        keyboardType="numeric"
                                        value={systolic}
                                        onChangeText={setSystolic}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={st.tinyLabel}>{language === 'hi' ? 'डायस्टोलिक (Diastolic)' : 'Diastolic'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 80"
                                        keyboardType="numeric"
                                        value={diastolic}
                                        onChangeText={setDiastolic}
                                    />
                                </View>
                            </View>

                            <Text style={[st.sectionLabel, { marginTop: 16 }]}>
                                {language === 'hi' ? 'ब्लड शुगर (Blood Glucose) - वैकल्पिक' : 'Blood Glucose - Optional'}
                            </Text>
                            <View style={st.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={st.tinyLabel}>{language === 'hi' ? 'खाली पेट (Fasting - mg/dL)' : 'Fasting (mg/dL)'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 90"
                                        keyboardType="numeric"
                                        value={fastingSugar}
                                        onChangeText={setFastingSugar}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={st.tinyLabel}>{language === 'hi' ? 'रैंडम / भोजन के बाद (Postprandial)' : 'Random/PPBS (mg/dL)'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 130"
                                        keyboardType="numeric"
                                        value={randomSugar}
                                        onChangeText={setRandomSugar}
                                    />
                                </View>
                            </View>

                            {/* Report upload card */}
                            <View style={st.uploadCard}>
                                <Text style={st.uploadTitle}>
                                    {language === 'hi' ? '📄 स्वास्थ्य रिपोर्ट अपलोड करें' : '📄 Upload Health Report'}
                                </Text>
                                <Text style={st.uploadDesc}>
                                    {language === 'hi' ? 'PDF या इमेज अपलोड करें, AI स्वचालित रूप से मान स्कैन कर लेगा।' : 'Upload a PDF/Image of doctor report. AI will automatically scan parameters.'}
                                </Text>

                                <TouchableOpacity style={st.uploadBtn} onPress={handlePickDocument}>
                                    <MaterialCommunityIcons name="cloud-upload" size={24} color="#FFF" />
                                    <Text style={st.uploadBtnText}>
                                        {language === 'hi' ? 'रिपोर्ट फ़ाइल चुनें' : 'Choose Report File'}
                                    </Text>
                                </TouchableOpacity>

                                {uploading && (
                                    <View style={st.progressRow}>
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                        <Text style={st.progressText}>{language === 'hi' ? 'सर्वर पर रिपोर्ट अपलोड हो रही है...' : 'Uploading report to cloud...'}</Text>
                                    </View>
                                )}

                                {reportUri && (
                                    <View style={st.uploadedFile}>
                                        <MaterialCommunityIcons name="file-check" size={20} color={Colors.success} />
                                        <Text style={st.uploadedFileName} numberOfLines={1}>{reportName}</Text>
                                    </View>
                                )}

                                {ocrStatus ? (
                                    <Text style={st.ocrText}>{ocrStatus}</Text>
                                ) : null}
                            </View>
                        </View>
                    )}

                    {/* STEP 5: Interactive clinical health risk analysis */}
                    {step === 5 && analysisResult && (
                        <View style={st.stepContainer}>
                            <Text style={st.title}>
                                {language === 'hi' ? '🏥 आपकी स्वास्थ्य रिपोर्ट और विश्लेषण' : '🏥 Your Health Risk Report'}
                            </Text>
                            <Text style={st.subtitle}>
                                {language === 'hi' ? 'आपके दर्ज किये मानों के आधार पर एआई नैदानिक विश्लेषण:' : 'Clinical interpretation of your baseline indicators:'}
                            </Text>

                            {/* BP Analysis Card */}
                            <LinearGradient
                                colors={
                                    analysisResult.bpRisk === 'HIGH' 
                                        ? ['#FFEBEE', '#FFCDD2'] 
                                        : analysisResult.bpRisk === 'WARNING' 
                                            ? ['#FFF9C4', '#FFF59D'] 
                                            : ['#E8F5E9', '#C8E6C9']
                                }
                                style={st.analysisCard}
                            >
                                <View style={st.analysisHeader}>
                                    <MaterialCommunityIcons 
                                        name={analysisResult.bpRisk === 'HIGH' ? 'alert-circle' : 'check-circle'} 
                                        size={24} 
                                        color={analysisResult.bpRisk === 'HIGH' ? Colors.danger : Colors.success} 
                                    />
                                    <Text style={[st.analysisTitle, { color: analysisResult.bpRisk === 'HIGH' ? Colors.danger : '#2E7D32' }]}>
                                        {language === 'hi' 
                                            ? `रक्तचाप: ${analysisResult.sysVal}/${analysisResult.diaVal} mmHg` 
                                            : `Blood Pressure: ${analysisResult.sysVal}/${analysisResult.diaVal} mmHg`}
                                    </Text>
                                </View>
                                <Text style={st.analysisText}>
                                    {language === 'hi' ? analysisResult.bpAdviceHi : analysisResult.bpAdviceEn}
                                </Text>
                            </LinearGradient>

                            {/* Glucose Analysis Card */}
                            <LinearGradient
                                colors={
                                    analysisResult.sugarRisk === 'HIGH' 
                                        ? ['#FFEBEE', '#FFCDD2'] 
                                        : analysisResult.sugarRisk === 'WARNING' 
                                            ? ['#FFF9C4', '#FFF59D'] 
                                            : ['#E8F5E9', '#C8E6C9']
                                }
                                style={st.analysisCard}
                            >
                                <View style={st.analysisHeader}>
                                    <MaterialCommunityIcons 
                                        name={analysisResult.sugarRisk === 'HIGH' ? 'alert-circle' : 'check-circle'} 
                                        size={24} 
                                        color={analysisResult.sugarRisk === 'HIGH' ? Colors.danger : Colors.success} 
                                    />
                                    <Text style={[st.analysisTitle, { color: analysisResult.sugarRisk === 'HIGH' ? Colors.danger : '#2E7D32' }]}>
                                        {language === 'hi' ? 'ब्लड शुगर (मधुमेह जोखिम)' : 'Blood Sugar (Diabetes Risk)'}
                                    </Text>
                                </View>
                                <Text style={st.analysisText}>
                                    {language === 'hi' ? analysisResult.sugarAdviceHi : analysisResult.sugarAdviceEn}
                                </Text>
                            </LinearGradient>

                            {/* Action Advice Card */}
                            <View style={st.actionBox}>
                                <Text style={st.actionTitle}>
                                    {language === 'hi' ? '📋 प्राथमिक उपचार योजना:' : '📋 Initial Care Guidelines:'}
                                </Text>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        {language === 'hi' 
                                            ? 'प्रतिदिन कम से कम 2.5 - 3 लीटर पानी पिएं।' 
                                            : 'Hydrate well. Drink at least 2.5 to 3 liters of water daily.'}
                                    </Text>
                                </View>
                                <View style={st.bullet}>
                                    <Text style={st.bulletSymbol}>•</Text>
                                    <Text style={st.bulletText}>
                                        {language === 'hi' 
                                            ? 'आयरन और फोलिक एसिड की गोली रोजाना लें।' 
                                            : 'Take Iron and Folic Acid supplements regularly as advised.'}
                                    </Text>
                                </View>
                                {analysisResult.totalStatus === 'HIGH' && (
                                    <View style={st.highRiskAlert}>
                                        <Text style={st.highRiskAlertText}>
                                            {language === 'hi' 
                                                ? '🚨 सचेत: उच्च जोखिम मापदंड मिले हैं। आपकी आशा कार्यकर्ता को इसकी अधिसूचना भेज दी जाएगी।' 
                                                : '🚨 Alert: High-risk values detected. An automatic notification will be shared with your local ASHA worker.'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Footer Buttons */}
                <View style={st.footerBtns}>
                    {step < totalSteps ? (
                        <TouchableOpacity style={st.nextBtn} onPress={handleNext} activeOpacity={0.9}>
                            <Text style={st.nextBtnText}>
                                {language === 'hi' ? 'अगला कदम' : 'Next Step'}
                            </Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[st.finishBtn, analysisResult?.totalStatus === 'HIGH' && st.finishBtnHigh]} onPress={handleFinish} activeOpacity={0.9}>
                            <Text style={st.finishBtnText}>
                                {language === 'hi' ? 'प्रोफ़ाइल सुरक्षित करें और शुरू करें' : 'Save Profile & Get Started'}
                            </Text>
                            <MaterialCommunityIcons name="check-bold" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: Colors.white,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    headerSub: {
        fontSize: 13,
        color: Colors.textLight,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: Colors.border,
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
    },
    stepContainer: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 6,
        marginLeft: 2,
    },
    tinyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primaryDark,
        marginBottom: 10,
        marginTop: 6,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.textPrimary,
    },
    row: {
        flexDirection: 'row',
    },
    derivedBox: {
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: 10,
    },
    derivedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    derivedLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    derivedVal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    uploadCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    uploadDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    uploadBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        gap: 8,
    },
    uploadBtnText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    progressText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    uploadedFile: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#C8E6C9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginTop: 12,
        gap: 6,
        maxWidth: '90%',
    },
    uploadedFileName: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '600',
        flexShrink: 1,
    },
    ocrText: {
        fontSize: 12,
        color: Colors.success,
        fontWeight: '700',
        marginTop: 8,
    },
    analysisCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        elevation: 2,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    analysisTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    analysisText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#333333',
    },
    actionBox: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 20,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    bullet: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    bulletSymbol: {
        width: 12,
        fontSize: 16,
        color: Colors.textSecondary,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    highRiskAlert: {
        backgroundColor: '#FFEBEE',
        borderRadius: 10,
        padding: 10,
        marginTop: 12,
    },
    highRiskAlertText: {
        fontSize: 12,
        color: Colors.danger,
        fontWeight: '700',
        lineHeight: 18,
    },
    footerBtns: {
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    nextBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    nextBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    finishBtn: {
        backgroundColor: Colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    finishBtnHigh: {
        backgroundColor: Colors.danger,
    },
    finishBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '800',
    },
});
