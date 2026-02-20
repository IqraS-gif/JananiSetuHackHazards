import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Dimensions,
    RefreshControl,
    Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    FadeInRight,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    withSequence
} from 'react-native-reanimated';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mock data to match ASHA view - Sorted by Risk (High > Normal > Low)
const ALL_PATIENTS = [
    { id: 'user_002', name: 'Sunita Devi', age: 26, week: 28, risk: 'High', bp: '145/95', hb: '9.2', lastSymptom: 'Leg Swelling' },
    { id: 'user_003', name: 'Meena Kumari', age: 29, week: 14, risk: 'Normal', bp: '122/80', hb: '10.8', lastSymptom: 'Mild Nausea' },
    { id: 'user_010', name: 'Rani Devi', age: 24, week: 22, risk: 'Normal', bp: '128/82', hb: '10.5', lastSymptom: 'Back Pain' },
    { id: 'user_001', name: 'Anjali Sharma', age: 23, week: 32, risk: 'Low', bp: '118/78', hb: '11.5', lastSymptom: 'None' },
].sort((a, b) => {
    const priority = { 'High': 3, 'Normal': 2, 'Low': 1 };
    return priority[b.risk] - priority[a.risk];
});

const PatientCard = ({ patient, onPress, isHindi, index }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const onPressIn = () => {
        scale.value = withSpring(0.96, { damping: 10, stiffness: 200 });
    };

    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'High': return '#FF4B6C';
            case 'Normal': return '#F59E0B'; // Slightly enhanced amber
            case 'Low': return '#10B981'; // Slightly enhanced green
            default: return '#94A3B8';
        }
    };

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(index * 100).springify().damping(12).stiffness(100)}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onPress}
            style={[st.card, animatedStyle]}
        >
            <View style={st.cardHeader}>
                <View style={[st.riskBadge, { backgroundColor: getRiskColor(patient.risk) + '1A' }]}>
                    <View style={[st.riskDot, { backgroundColor: getRiskColor(patient.risk) }]} />
                    <Text style={[st.riskText, { color: getRiskColor(patient.risk) }]}>
                        {isHindi ? (patient.risk === 'High' ? 'उच्च जोखिम' : 'सामान्य') : `${patient.risk} Risk`}
                    </Text>
                </View>
                <Text style={st.weekText}>{isHindi ? 'हफ्ता' : 'Week'} {patient.week}</Text>
            </View>

            <View style={st.patientMain}>
                <View style={st.avatar}>
                    <Text style={st.avatarText}>{patient.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={st.patientInfo}>
                    <Text style={st.name}>{patient.name}</Text>
                    <Text style={st.subInfo}>{patient.age} yrs • {isHindi ? 'आईडी' : 'ID'}: {patient.id}</Text>
                </View>
                <View style={st.chevronContainer}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#CBD5E1" />
                </View>
            </View>

            <View style={st.vitalsRow}>
                <View style={st.vitalItem}>
                    <View style={[st.vitalIconWrapper, { backgroundColor: '#FEE2E2' }]}>
                        <MaterialCommunityIcons name="heart-pulse" size={16} color="#EF4444" />
                    </View>
                    <Text style={st.vitalVal}>{patient.bp}</Text>
                    <Text style={st.vitalLabel}>BP</Text>
                </View>
                <View style={st.vitalItem}>
                    <View style={[st.vitalIconWrapper, { backgroundColor: '#DBEAFE' }]}>
                        <MaterialCommunityIcons name="water" size={16} color="#3B82F6" />
                    </View>
                    <Text style={st.vitalVal}>{patient.hb}</Text>
                    <Text style={st.vitalLabel}>Hb</Text>
                </View>
                <View style={[st.vitalItem, { flex: 1.5 }]}>
                    <View style={[st.vitalIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D97706" />
                    </View>
                    <Text style={st.vitalVal} numberOfLines={1}>{patient.lastSymptom}</Text>
                    <Text style={st.vitalLabel}>{isHindi ? 'लक्षण' : 'Symptom'}</Text>
                </View>
            </View>

            {patient.risk === 'High' && (
                <View style={st.alertBox}>
                    <MaterialCommunityIcons name="alert-decagram" size={18} color="#EF4444" />
                    <Text style={st.alertText}>{isHindi ? 'तत्काल ध्यान आवश्यक' : 'Immediate attention required'}</Text>
                </View>
            )}
        </AnimatedPressable>
    );
};

export default function DoctorDashboard({ navigation }) {
    const { language } = useLanguage();
    const { user, logout } = useUser();
    const isHindi = language === 'hi';
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const filteredPatients = ALL_PATIENTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    return (
        <SafeAreaView style={st.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={st.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B6C" />}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={st.header}>
                    <View>
                        <Text style={st.greeting}>{isHindi ? 'नमस्ते, डॉक्टर' : 'Namaste, Doctor'} 👋</Text>
                        <Text style={st.drName}>{user?.id}</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={st.logoutBtn} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="logout" size={22} color={Colors.error} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Stats Summary */}
                <View style={st.statsContainer}>
                    <Animated.View entering={FadeInRight.delay(200).springify()} style={{ flex: 1 }}>
                        <LinearGradient colors={['#FF718B', '#FF4B6C']} style={st.statsBox}>
                            <View style={st.statsIconContainer}>
                                <MaterialCommunityIcons name="account-group" size={24} color="rgba(255,255,255,0.8)" />
                            </View>
                            <Text style={st.statsVal}>{ALL_PATIENTS.length}</Text>
                            <Text style={st.statsLabel}>{isHindi ? 'कुल मरीज' : 'Total Patients'}</Text>
                        </LinearGradient>
                    </Animated.View>
                    <Animated.View entering={FadeInRight.delay(300).springify()} style={{ flex: 1 }}>
                        <LinearGradient colors={['#F59E0B', '#D97706']} style={st.statsBox}>
                            <View style={[st.statsIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <MaterialCommunityIcons name="heart-pulse" size={24} color="#FFF" />
                            </View>
                            <Text style={st.statsVal}>{ALL_PATIENTS.filter(p => p.risk === 'High').length}</Text>
                            <Text style={st.statsLabel}>{isHindi ? 'उच्च जोखिम' : 'High Risk'}</Text>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Search Bar */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={st.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={24} color="#94A3B8" />
                    <TextInput
                        style={st.searchInput}
                        placeholder={isHindi ? 'मरीज का नाम या आईडी खोजें...' : 'Search patient name or ID...'}
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </Animated.View>

                {/* Patient List */}
                <View style={st.listSection}>
                    <Text style={st.sectionTitle}>{isHindi ? 'मरीज की सूची' : 'Patient Roster'}</Text>
                    {filteredPatients.map((patient, index) => (
                        <PatientCard
                            key={patient.id}
                            patient={patient}
                            isHindi={isHindi}
                            index={index}
                            onPress={() => navigation.navigate('DoctorPatientDetail', {
                                patientId: patient.id,
                                patientName: patient.name
                            })}
                        />
                    ))}
                    {filteredPatients.length === 0 && (
                        <Text style={st.noResult}>{isHindi ? 'कोई मरीज नहीं मिला' : 'No patients found'}</Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scroll: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
    greeting: { fontSize: 16, color: '#64748B', fontWeight: '500' },
    drName: { fontSize: 26, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
    logoutBtn: { padding: 12, backgroundColor: '#FFF', borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    statsContainer: { flexDirection: 'row', gap: 15, marginBottom: 25 },
    statsBox: { flex: 1, borderRadius: 24, padding: 18, elevation: 6, shadowColor: '#FF4B6C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, overflow: 'hidden' },
    statsIconContainer: { position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    statsVal: { fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 8 },
    statsLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    searchInput: { flex: 1, height: 54, fontSize: 16, color: '#1E293B', marginLeft: 10, fontWeight: '500' },
    listSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: '#1E293B', marginBottom: 15, letterSpacing: -0.3 },
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 18, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    riskBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    riskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    riskText: { fontSize: 12, fontWeight: '800' },
    weekText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
    patientMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 52, height: 52, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    avatarText: { fontSize: 18, fontWeight: '800', color: '#475569' },
    patientInfo: { flex: 1 },
    name: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
    subInfo: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
    chevronContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
    vitalItem: { alignItems: 'flex-start', flex: 1 },
    vitalIconWrapper: { padding: 6, borderRadius: 10, marginBottom: 8 },
    vitalVal: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    vitalLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
    alertBox: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5' },
    alertText: { fontSize: 13, fontWeight: '700', color: '#EF4444', marginLeft: 8 },
    noResult: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 16, fontWeight: '500' }
});
