import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { Colors } from '../../constants';
import { saveUserProfile, logVitals, checkUserExists, getUserProfile } from '../../services/database/DatabaseService';

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

export default function AshaProfile() {
    const { language, setLanguage, isHindi } = useLanguage();
    const { user, logout } = useUser();

    // Profile Metadata state
    const [profile, setProfile] = useState(null);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [patientId, setPatientId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [pregnancyWeek, setPregnancyWeekInput] = useState('');
    const [lmpDate, setLmpDate] = useState('');
    const [husbandContact, setHusbandContact] = useState('');

    useEffect(() => {
        if (user?.id) {
            getUserProfile(user.id)
                .then(prof => {
                    if (prof) setProfile(prof);
                })
                .catch(e => console.error("Error loading profile:", e));
        }
    }, [user?.id]);

    useEffect(() => {
        if (lmpDate.length === 10) {
            const week = weekFromLMP(lmpDate);
            if (week) setPregnancyWeekInput(String(week));
        }
    }, [lmpDate]);

    const toggleLanguage = (lang) => {
        setLanguage(lang);
    };

    const handleLogout = () => {
        Alert.alert(
            isHindi ? 'लॉगआउट' : 'Logout',
            isHindi ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
            [
                { text: isHindi ? 'नहीं' : 'Cancel', style: 'cancel' },
                { text: isHindi ? 'हाँ' : 'Yes', onPress: logout, style: 'destructive' }
            ]
        );
    };

    const handleAddPatient = async () => {
        if (!patientId.trim()) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया मरीज आईडी / मोबाइल नंबर दर्ज करें।' : 'Please enter Patient ID / Mobile number.');
            return;
        }
        if (patientId.length !== 10 && !patientId.startsWith('user_')) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही 10-अंकीय फोन नंबर या आईडी दर्ज करें।' : 'Please enter a valid 10-digit phone number or user ID.');
            return;
        }
        if (!patientName.trim()) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया नाम दर्ज करें।' : 'Please enter name.');
            return;
        }
        const ageNum = parseInt(patientAge);
        if (isNaN(ageNum) || ageNum < 12 || ageNum > 60) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही उम्र (12-60) दर्ज करें।' : 'Please enter a valid age (12-60).');
            return;
        }
        if (lmpDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(lmpDate)) {
            Alert.alert(
                isHindi ? 'त्रुटि' : 'Error',
                isHindi 
                    ? 'कृपया सही तिथि प्रारूप दर्ज करें (YYYY-MM-DD)। उदाहरण: 2026-01-15' 
                    : 'Please enter LMP date in YYYY-MM-DD format. E.g. 2026-01-15'
            );
            return;
        }
        const weekNum = parseInt(pregnancyWeek);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 42) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सही गर्भावस्था सप्ताह (1-42) दर्ज करें।' : 'Please enter a valid pregnancy week (1-42).');
            return;
        }
        if (!husbandContact.trim() || husbandContact.length !== 10) {
            Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया पति का सही 10-अंकीय संपर्क नंबर दर्ज करें।' : "Please enter a valid 10-digit husband's contact.");
            return;
        }

        try {
            const exists = await checkUserExists(patientId);
            if (exists) {
                Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'यह आईडी पहले से मौजूद है।' : 'This patient ID already exists.');
                return;
            }

            const calculatedDueDate = lmpDate ? dueDateFromLMP(lmpDate) : '';

            // Save user profile for mother
            const profileData = {
                name: patientName.trim(),
                age: ageNum,
                lmp_date: lmpDate || null,
                due_date: calculatedDueDate || null,
                pregnancy_week: weekNum,
                height_cm: 158.0, // defaults
                start_weight_kg: 60.0,
                current_weight_kg: 60.0,
                asha_contact: user?.role === 'asha' ? user.id : 'asha_001',
                emergency_contact: husbandContact,
                husband_contact: husbandContact,
                phc_contact: '9876543210',
                language: 'hi',
                role: 'mother',
            };

            await saveUserProfile(profileData, patientId);

            // Log baseline vitals (BP: 120/80, BS: 90 mg/dL)
            await logVitals({
                patientId: patientId,
                systolic: 120,
                diastolic: 80,
                bloodSugar: 90,
                pulse: 78,
                notes: 'Initial registration by ASHA/Doctor',
            });

            Alert.alert(
                isHindi ? 'सफलतापूर्वक जुड़ा' : 'Success', 
                isHindi ? 'नया मरीज सफलतापूर्वक जोड़ दिया गया है!' : 'New patient registered successfully!'
            );

            // Reset form
            setPatientId('');
            setPatientName('');
            setPatientAge('');
            setPregnancyWeekInput('');
            setLmpDate('');
            setHusbandContact('');
            setShowAddModal(false);
        } catch (e) {
            console.error("Error adding patient:", e);
            Alert.alert('Error', 'Failed to register patient in SQLite.');
        }
    };

    // Role calculations
    const isDr = user?.role === 'doctor';
    const profileRole = isDr 
        ? (profile?.ration_category || (isHindi ? 'चिकित्सक' : 'Doctor'))
        : (isHindi ? 'सामुदायिक स्वास्थ्य कार्यकर्ता' : 'Community Health Worker');
    const profileLoc = isDr
        ? (profile?.state || 'City Maternal Hospital')
        : (profile?.state || 'Sector 4, Varanasi District');
    const avatarIcon = isDr ? 'doctor' : 'account-tie';

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <Text style={st.headerTitle}>{isHindi ? 'मेरी प्रोफाइल' : 'My Profile'}</Text>
            </View>

            <ScrollView contentContainerStyle={st.content}>
                {/* Profile Card */}
                <View style={st.profileCard}>
                    <View style={st.avatarContainer}>
                        <MaterialCommunityIcons name={avatarIcon} size={40} color="#FF718B" />
                    </View>
                    <View style={st.profileInfo}>
                        <Text style={st.ashaName}>{profile?.name || user?.id || 'ASHA Worker'}</Text>
                        <Text style={st.ashaRole}>{profileRole}</Text>
                        <View style={st.locationRow}>
                            <MaterialCommunityIcons name="map-marker" size={14} color="#999" />
                            <Text style={st.locationText}>{profileLoc}</Text>
                        </View>
                    </View>
                </View>

                {/* Add Patient Section */}
                <TouchableOpacity style={st.addPatientBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.95}>
                    <LinearGradient
                        colors={['#FF718B', '#FF4B6C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.addPatientGradient}
                    >
                        <View style={st.addPatientIconCircle}>
                            <MaterialCommunityIcons name="account-plus" size={24} color="#FF4B6C" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={st.addPatientTitle}>
                                {isHindi ? 'नया मरीज जोड़ें' : 'Add New Patient'}
                            </Text>
                            <Text style={st.addPatientSub}>
                                {isHindi ? 'गर्भवती महिला का तुरंत पंजीकरण करें' : 'Instantly register a pregnant mother'}
                            </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Language Section */}
                <View style={st.section}>
                    <Text style={st.sectionTitle}>{isHindi ? 'भाषा चुनें' : 'Choose Language'}</Text>
                    <View style={st.langRow}>
                        <TouchableOpacity
                            style={[st.langBtn, language === 'en' && st.langBtnActive]}
                            onPress={() => toggleLanguage('en')}
                        >
                            <Text style={[st.langText, language === 'en' && st.langTextActive]}>English</Text>
                            {language === 'en' && <MaterialCommunityIcons name="check-circle" size={18} color="#FF718B" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[st.langBtn, language === 'hi' && st.langBtnActive]}
                            onPress={() => toggleLanguage('hi')}
                        >
                            <Text style={[st.langText, language === 'hi' && st.langTextActive]}>हिंदी (Hindi)</Text>
                            {language === 'hi' && <MaterialCommunityIcons name="check-circle" size={18} color="#FF718B" />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Other Settings */}
                <View style={[st.section, { borderBottomWidth: 0 }]}>
                    <Text style={st.sectionTitle}>{isHindi ? 'खाता सेटिंग' : 'Account Settings'}</Text>

                    <TouchableOpacity style={st.settingItem}>
                        <View style={[st.iconBox, { backgroundColor: '#F0F9FF' }]}>
                            <MaterialCommunityIcons name="bell-outline" size={20} color="#0EA5E9" />
                        </View>
                        <Text style={st.settingLabel}>{isHindi ? 'सूचनाएं' : 'Notifications'}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={st.settingItem}>
                        <View style={[st.iconBox, { backgroundColor: '#F0FDF4' }]}>
                            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#22C55E" />
                        </View>
                        <Text style={st.settingLabel}>{isHindi ? 'गोपनीयता' : 'Privacy & Security'}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={st.settingItem} onPress={handleLogout}>
                        <View style={[st.iconBox, { backgroundColor: '#FEF2F2' }]}>
                            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                        </View>
                        <Text style={[st.settingLabel, { color: '#EF4444' }]}>{isHindi ? 'लॉगआउट' : 'Logout'}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
                    </TouchableOpacity>
                </View>

                <View style={st.versionBox}>
                    <Text style={st.versionText}>Janani Setu v2.1.0</Text>
                </View>
            </ScrollView>

            {/* ADD PATIENT MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAddModal}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={st.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={st.modalContainer}
                    >
                        <View style={st.modalHeader}>
                            <Text style={st.modalHeaderTitle}>{isHindi ? '➕ मरीज का पंजीकरण करें' : '➕ Register Mother'}</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={st.closeBtn}>
                                <MaterialCommunityIcons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={st.modalScroll} contentContainerStyle={st.modalScrollContent}>
                            <View style={st.inputGroup}>
                                <Text style={st.label}>{isHindi ? 'मरीज आईडी / मोबाइल नंबर' : 'Patient ID / Mobile Number'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder={isHindi ? 'उदा. 9876543210 या user_005' : 'e.g. 9876543210 or user_005'}
                                    value={patientId}
                                    onChangeText={setPatientId}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>{isHindi ? 'पूरा नाम' : 'Full Name'}</Text>
                                <TextInput
                                    style={st.input}
                                    placeholder={isHindi ? 'उदा. रीता सिंह' : 'e.g. Rita Singh'}
                                    value={patientName}
                                    onChangeText={setPatientName}
                                />
                            </View>

                            <View style={st.row}>
                                <View style={[st.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={st.label}>{isHindi ? 'उम्र' : 'Age'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 26"
                                        keyboardType="numeric"
                                        maxLength={2}
                                        value={patientAge}
                                        onChangeText={setPatientAge}
                                    />
                                </View>
                                <View style={[st.inputGroup, { flex: 1.5, marginLeft: 8 }]}>
                                    <Text style={st.label}>{isHindi ? 'गर्भावस्था सप्ताह' : 'Pregnancy Week'}</Text>
                                    <TextInput
                                        style={st.input}
                                        placeholder="e.g. 14"
                                        keyboardType="numeric"
                                        maxLength={2}
                                        value={pregnancyWeek}
                                        onChangeText={setPregnancyWeekInput}
                                    />
                                </View>
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>
                                    {isHindi ? 'LMP तारीख (वैकल्पिक)' : 'LMP Date (Optional)'}
                                </Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="YYYY-MM-DD"
                                    value={lmpDate}
                                    onChangeText={setLmpDate}
                                />
                            </View>

                            <View style={st.inputGroup}>
                                <Text style={st.label}>
                                    {isHindi ? 'पति का फोन नंबर (10 अंक)' : 'Husband\'s Contact (10 digits)'}
                                </Text>
                                <TextInput
                                    style={st.input}
                                    placeholder="e.g. 9876543210"
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    value={husbandContact}
                                    onChangeText={(txt) => setHusbandContact(txt.replace(/[^0-9]/g, ''))}
                                />
                            </View>

                            <TouchableOpacity style={st.submitBtn} onPress={handleAddPatient} activeOpacity={0.9}>
                                <Text style={st.submitBtnText}>{isHindi ? 'मरीज सुरक्षित करें' : 'Save Patient Profile'}</Text>
                                <MaterialCommunityIcons name="check-bold" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7F9' },
    header: { padding: 20, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
    content: { padding: 20 },
    profileCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: '#FEE6EA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    profileInfo: { flex: 1 },
    ashaName: { fontSize: 20, fontWeight: '800', color: '#333' },
    ashaRole: { fontSize: 13, color: '#FF718B', fontWeight: '600', marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    locationText: { fontSize: 11, color: '#999', fontWeight: '500' },

    addPatientBtn: {
        marginBottom: 25,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#FF4B6C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    addPatientGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    addPatientIconCircle: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPatientTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
    },
    addPatientSub: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
    },

    section: { marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 15 },
    langRow: { flexDirection: 'row', gap: 12 },
    langBtn: {
        flex: 1,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    langBtnActive: { borderColor: '#FF718B', backgroundColor: '#FFF7F9' },
    langText: { fontSize: 14, fontWeight: '600', color: '#666' },
    langTextActive: { color: '#FF718B', fontWeight: '800' },

    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    settingLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#444' },

    versionBox: { alignItems: 'center', marginTop: 10, opacity: 0.3 },
    versionText: { fontSize: 12, fontWeight: '600' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        paddingHorizontal: 24,
    },
    modalScrollContent: {
        paddingVertical: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        color: '#1E293B',
    },
    row: {
        flexDirection: 'row',
    },
    submitBtn: {
        backgroundColor: '#FF4B6C',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
        marginTop: 10,
        elevation: 4,
        shadowColor: '#FF4B6C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
