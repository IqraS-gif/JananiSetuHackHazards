import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    Dimensions,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants';
import { extractMedicineInfoFromImage } from '../../services/ai/GeminiService';

const { width, height } = Dimensions.get('window');

const PATIENT_IMAGES = {
    'user_001': require('../../../assets/images/anjali_sharma.jpg'),
    'user_002': require('../../../assets/images/sunita_devi.jpg'),
};

const INITIAL_DATA = [
    {
        id: 'user_002',
        name: 'Sunita Devi',
        image: PATIENT_IMAGES['user_002'],
        adherence: 68,
        status: 'Critical',
        lastTaken: 'Yesterday',
        medicines: [
            { name: 'Fefol-Z (Iron+Zinc)', count: 4, total: 30, dose: '1 od', refillDays: 4 },
            { name: 'Folvite (Folic Acid)', count: 12, total: 30, dose: '1 od', refillDays: 12 },
            { name: 'Shelcal 500 (Calcium)', count: 2, total: 30, dose: '1 bd', refillDays: 1 },
        ]
    },
    {
        id: 'user_003',
        name: 'Meena Kumari',
        image: null,
        adherence: 92,
        status: 'Good',
        lastTaken: 'Today, 8:00 AM',
        medicines: [
            { name: 'Calcium Sandoz', count: 18, total: 30, dose: '1 od', refillDays: 18 },
            { name: 'Orofer XT (Iron)', count: 22, total: 30, dose: '1 od', refillDays: 22 },
        ]
    },
    {
        id: 'user_001',
        name: 'Anjali Sharma',
        image: PATIENT_IMAGES['user_001'],
        adherence: 42,
        status: 'Refill Needed',
        lastTaken: '3 days ago',
        medicines: [
            { name: 'Autrin (Iron)', count: 0, total: 30, dose: '1 od', refillDays: 0 },
            { name: 'Shelcal 250', count: 5, total: 30, dose: '1 bd', refillDays: 2 },
        ]
    }
];

export default function MedicationTracker({ navigation }) {
    const { language } = useLanguage();
    const isHindi = language === 'hi';

    const [patients, setPatients] = useState(INITIAL_DATA);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Refill Modal States
    const [refillModalVisible, setRefillModalVisible] = useState(false);
    const [activeMed, setActiveMed] = useState(null);
    const [customCount, setCustomCount] = useState('30');

    // Add Medicine Modal States
    const [addMedVisible, setAddMedVisible] = useState(false);
    const [newMedName, setNewMedName] = useState('');
    const [newMedCount, setNewMedCount] = useState('30');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Critical': return '#FF4B6C';
            case 'Refill Needed': return '#FFB020';
            case 'Good':
            case 'Healthy': return '#4CAF50';
            default: return '#3B82F6';
        }
    };

    const getStatusText = (status) => {
        if (!isHindi) return status;
        switch (status) {
            case 'Critical': return 'गंभीर स्थिति';
            case 'Refill Needed': return 'रिफिल आवश्यक';
            case 'Good': return 'अच्छा';
            case 'Healthy': return 'स्वस्थ';
            default: return status;
        }
    };

    const handlePatientPress = (patient) => {
        setSelectedPatient(patient);
        setModalVisible(true);
    };

    const calculateRefillDate = (days) => {
        if (days === 0) return isHindi ? 'अभी आवश्यक' : 'DUE NOW';
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString(isHindi ? 'hi-IN' : 'en-GB', { day: 'numeric', month: 'short' });
    };

    const updateMedStock = (pId, medName, addedQty) => {
        const qtyToAt = parseInt(addedQty) || 0;
        const updated = patients.map(p => {
            if (p.id === pId) {
                const updatedMeds = p.medicines.map(m => {
                    if (m.name === medName) {
                        const newCount = m.count + qtyToAt;
                        return {
                            ...m,
                            count: newCount,
                            total: Math.max(m.total, newCount), // Increase total capacity if refill exceeds it
                            refillDays: newCount // Assuming 1 pill per day for refill estimation
                        };
                    }
                    return m;
                });
                return { ...p, medicines: updatedMeds, status: 'Good' };
            }
            return p;
        });
        setPatients(updated);
        setRefillModalVisible(false);
        const currentP = updated.find(p => p.id === pId);
        setSelectedPatient(currentP);

        Alert.alert(
            isHindi ? "स्टॉक अपडेट किया गया" : "Stock Updated",
            isHindi ? `${medName} में ${qtyToAt} गोलियां जोड़ी गईं।` : `${qtyToAt} pills added to ${medName}.`
        );
    };

    const addNewMed = (pId, name, count) => {
        if (!name) return;
        const updated = patients.map(p => {
            if (p.id === pId) {
                const newM = { name, count: parseInt(count), total: parseInt(count), dose: '1 od', refillDays: parseInt(count) };
                return { ...p, medicines: [...p.medicines, newM] };
            }
            return p;
        });
        setPatients(updated);
        setAddMedVisible(false);
        setNewMedName('');
        const currentP = updated.find(p => p.id === pId);
        setSelectedPatient(currentP);
    };

    const handleAIExtraction = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert(isHindi ? "कैमरा एक्सेस की अनुमति आवश्यक है!" : "Permission to access camera is required!");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled) {
                setIsAnalyzing(true);
                const info = await extractMedicineInfoFromImage(result.assets[0].base64);
                setNewMedName(info.name);
                setNewMedCount(info.count.toString());
                setIsAnalyzing(false);
            }
        } catch (error) {
            console.error(error);
            setIsAnalyzing(false);
            Alert.alert(isHindi ? "दवा की पहचान करने में त्रुटि। कृपया मैन्युअल रूप से दर्ज करें।" : "Error identifying medicine. Please enter manually.");
        }
    };

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FF718B" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>{isHindi ? 'दवा पालन ट्रैकर' : 'Medication Tracker'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={st.summaryRow}>
                    <LinearGradient colors={['#FF718B', '#FF4B6C']} style={st.summaryCard}>
                        <MaterialCommunityIcons name="pill" size={24} color="#FFF" />
                        <Text style={st.summaryVal}>2</Text>
                        <Text style={st.summaryLab}>{isHindi ? 'रिफिल आवश्यक' : 'Refills Due'}</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#FFB020', '#FF8E20']} style={st.summaryCard}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FFF" />
                        <Text style={st.summaryVal}>5</Text>
                        <Text style={st.summaryLab}>{isHindi ? 'छूटी हुई खुराक' : 'Missed Doses'}</Text>
                    </LinearGradient>
                </View>

                {patients.map((p) => (
                    <TouchableOpacity
                        key={p.id}
                        style={st.patientCard}
                        activeOpacity={0.9}
                        onPress={() => handlePatientPress(p)}
                    >
                        <View style={st.cardHighlight} />
                        <View style={st.cardContent}>
                            <View style={st.cardTop}>
                                <View style={st.pfpContainer}>
                                    {p.image ? (
                                        <Image source={p.image} style={st.pfp} />
                                    ) : (
                                        <View style={st.pfpPlaceholder}>
                                            <MaterialCommunityIcons name="account" size={24} color="#FF718B" />
                                        </View>
                                    )}
                                    <View style={[st.statusDot, { backgroundColor: getStatusColor(p.status) }]} />
                                </View>
                                <View style={st.pInfo}>
                                    <Text style={st.pName}>{p.name}</Text>
                                    <Text style={st.pMeds} numberOfLines={1}>{p.medicines.map(m => m.name.split(' ')[0]).join(', ')}</Text>
                                </View>
                                <View style={[st.badge, { backgroundColor: getStatusColor(p.status) + '15' }]}>
                                    <Text style={[st.badgeText, { color: getStatusColor(p.status) }]}>{getStatusText(p.status)}</Text>
                                </View>
                            </View>

                            <View style={st.adherenceContainer}>
                                <View style={st.adherenceHeader}>
                                    <Text style={st.adherenceLabel}>{isHindi ? 'पालन दर' : 'Adherence Rate'}</Text>
                                    <Text style={[st.adherenceValue, { color: getStatusColor(p.status) }]}>{p.adherence}%</Text>
                                </View>
                                <View style={st.barTrack}>
                                    <View style={[st.barFill, { width: `${p.adherence}%`, backgroundColor: getStatusColor(p.status) }]} />
                                </View>
                            </View>

                            <View style={st.cardFooter}>
                                <View style={st.footerItem}>
                                    <MaterialCommunityIcons name="pill" size={14} color="#999" />
                                    <Text style={st.footerText}>{p.medicines.reduce((a, b) => a + b.count, 0)} {isHindi ? 'गोलियां बची हैं' : 'pills left'}</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={18} color="#FF718B" />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Drill-down Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <View style={st.modalBackdrop}>
                    <View style={st.modalSheet}>
                        <View style={st.sheetHandle} />
                        <View style={st.modalHeader}>
                            <View style={st.modalTitleRow}>
                                <Text style={st.modalTitle}>{selectedPatient?.name}</Text>
                                <View style={[st.badgeSmall, { backgroundColor: getStatusColor(selectedPatient?.status) + '15' }]}>
                                    <Text style={[st.badgeTextSmall, { color: getStatusColor(selectedPatient?.status) }]}>{getStatusText(selectedPatient?.status)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={st.closeCircle}>
                                <MaterialCommunityIcons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={st.medScroll}>
                            {selectedPatient?.medicines.map((med, i) => (
                                <View key={i} style={st.medCard}>
                                    <View style={st.medTop}>
                                        <View style={st.medIconBox}>
                                            <MaterialCommunityIcons name="pill" size={22} color="#FF4B6C" />
                                        </View>
                                        <View style={st.medInfo}>
                                            <Text style={st.medTitle}>{med.name}</Text>
                                            <Text style={st.medDose}>{isHindi ? 'खुराक' : 'Dosage'}: {med.dose}</Text>
                                        </View>
                                        <View style={st.stockBox}>
                                            <Text style={st.stockVal}>{med.count}<Text style={st.stockSlash}>/{med.total}</Text></Text>
                                            <Text style={st.stockLab}>{isHindi ? 'गोलियां बची हैं' : 'Pills Left'}</Text>
                                        </View>
                                    </View>

                                    <View style={st.medBottom}>
                                        <View style={st.refillRow}>
                                            <MaterialCommunityIcons name="calendar-check" size={16} color="#4CAF50" />
                                            <Text style={st.refillVal}>{calculateRefillDate(med.refillDays)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={st.refillBtn}
                                            onPress={() => {
                                                setActiveMed(med);
                                                setRefillModalVisible(true);
                                            }}
                                        >
                                            <Text style={st.refillBtnText}>{isHindi ? 'स्टॉक अपडेट करें' : 'Update Stock'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={st.addMedBtn}
                                onPress={() => setAddMedVisible(true)}
                            >
                                <MaterialCommunityIcons name="plus" size={20} color="#FF718B" />
                                <Text style={st.addMedBtnText}>{isHindi ? 'अतिरिक्त दवा जोड़ें' : 'Add Extra Medicine'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Refill Popup (Additive) */}
            <Modal transparent={true} visible={refillModalVisible} animationType="fade">
                <View style={st.popupOverlay}>
                    <View style={st.popupCard}>
                        <Text style={st.popupTitle}>{isHindi ? 'रिफिल' : 'Refill'} {activeMed?.name}</Text>
                        <Text style={st.popupDesc}>{isHindi ? 'स्टॉक में जोड़ने के लिए गोलियों की संख्या चुनें' : 'Choose quantity to add to current stock'}</Text>

                        <View style={st.refillInputRow}>
                            <TouchableOpacity style={st.stdCountBtn} onPress={() => setCustomCount('30')}>
                                <Text style={st.stdCountText}>{isHindi ? 'स्टैंडर्ड (30)' : 'Standard (30)'}</Text>
                            </TouchableOpacity>
                            <TextInput
                                style={st.countInput}
                                value={customCount}
                                onChangeText={setCustomCount}
                                keyboardType="numeric"
                                placeholder="Qty"
                            />
                        </View>

                        <View style={st.popupActions}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setRefillModalVisible(false)}>
                                <Text style={st.cancelBtnText}>{isHindi ? 'रद्द करें' : 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={st.confirmBtn}
                                onPress={() => updateMedStock(selectedPatient.id, activeMed.name, customCount)}
                            >
                                <Text style={st.confirmBtnText}>{isHindi ? 'रिफिल की पुष्टि करें' : 'Confirm Refill'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Extra Medicine Modal */}
            <Modal transparent={true} visible={addMedVisible} animationType="fade">
                <View style={st.popupOverlay}>
                    <View style={st.popupCard}>
                        <View style={st.popupHeader}>
                            <Text style={st.popupTitle}>{isHindi ? 'नई दवा जोड़ें' : 'Add New Medicine'}</Text>
                            <TouchableOpacity onPress={() => setAddMedVisible(false)}>
                                <MaterialCommunityIcons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={st.aiPhotoBtn}
                            onPress={handleAIExtraction}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
                                    <Text style={st.aiPhotoText}>{isHindi ? 'फोटो से जोड़ें (बॉक्स स्कैन करें)' : 'Add via Photo (Scan Box)'}</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={st.inputGroup}>
                            <Text style={st.inputLabel}>{isHindi ? 'दवा का नाम' : 'Medicine Name'}</Text>
                            <TextInput
                                style={st.textInput}
                                value={newMedName}
                                onChangeText={setNewMedName}
                                placeholder={isHindi ? 'जैसे: Shelcal 500' : 'e.g. Shelcal 500'}
                            />
                        </View>

                        <View style={st.inputGroup}>
                            <Text style={st.inputLabel}>{isHindi ? 'कुल गोलियों की संख्या' : 'Total Tablet Count'}</Text>
                            <TextInput
                                style={st.textInput}
                                value={newMedCount}
                                onChangeText={setNewMedCount}
                                keyboardType="numeric"
                                placeholder="30"
                            />
                        </View>

                        <TouchableOpacity
                            style={st.saveMedBtn}
                            onPress={() => addNewMed(selectedPatient.id, newMedName, newMedCount)}
                        >
                            <Text style={st.saveMedBtnText}>{isHindi ? 'दवा सहेजें' : 'Save Medication'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7F9' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.white },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
    backBtn: { padding: 4 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    summaryRow: { flexDirection: 'row', gap: 15, marginTop: 20, marginBottom: 25 },
    summaryCard: { flex: 1, borderRadius: 24, padding: 16, alignItems: 'center', shadowColor: '#FF718B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
    summaryVal: { fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 8 },
    summaryLab: { fontSize: 11, fontWeight: '600', color: '#FFF', opacity: 0.9, textAlign: 'center' },
    patientCard: { backgroundColor: Colors.white, borderRadius: 25, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4 },
    cardHighlight: { height: 4, width: '100%', backgroundColor: '#FF718B10' },
    cardContent: { padding: 16 },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    pfpContainer: { position: 'relative', marginRight: 12 },
    pfp: { width: 48, height: 48, borderRadius: 24 },
    pfpPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE6EA', alignItems: 'center', justifyContent: 'center' },
    statusDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#FFF' },
    pInfo: { flex: 1 },
    pName: { fontSize: 16, fontWeight: '800', color: '#333' },
    pMeds: { fontSize: 12, color: '#999', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    adherenceContainer: { marginBottom: 15 },
    adherenceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    adherenceLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
    adherenceValue: { fontSize: 14, fontWeight: '800' },
    barTrack: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 15 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    footerText: { fontSize: 11, color: '#999', fontWeight: '600' },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, height: '85%' },
    sheetHandle: { width: 40, height: 5, backgroundColor: '#EEE', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#333' },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeTextSmall: { fontSize: 9, fontWeight: '800' },
    closeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
    medScroll: { flex: 1, marginTop: 15 },
    medCard: { backgroundColor: '#F8F9FE', borderRadius: 22, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
    medTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
    medIconBox: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FEE6EA', alignItems: 'center', justifyContent: 'center' },
    medInfo: { flex: 1 },
    medTitle: { fontSize: 17, fontWeight: '800', color: '#333' },
    medDose: { fontSize: 13, color: '#666', marginTop: 3 },
    stockBox: { alignItems: 'flex-end' },
    stockVal: { fontSize: 18, fontWeight: '900', color: '#333' },
    stockSlash: { fontSize: 12, color: '#999' },
    stockLab: { fontSize: 9, fontWeight: '700', color: '#AAA', textTransform: 'uppercase' },
    medBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
    refillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    refillVal: { fontSize: 12, fontWeight: '800', color: '#333' },
    refillBtn: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
    refillBtnText: { fontSize: 10, fontWeight: '800', color: '#FF718B' },

    addMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 20, borderWidth: 2, borderColor: '#FF718B', borderStyle: 'dotted', marginTop: 10 },
    addMedBtnText: { fontSize: 15, fontWeight: '800', color: '#FF718B' },

    // Popups
    popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    popupCard: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 30, padding: 25 },
    popupTitle: { fontSize: 20, fontWeight: '900', color: '#333' },
    popupDesc: { fontSize: 12, color: '#999', marginTop: 4, marginBottom: 20 },
    refillInputRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    stdCountBtn: { flex: 1, backgroundColor: '#FEE6EA', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    stdCountText: { fontSize: 11, fontWeight: '800', color: '#FF718B' },
    countInput: { width: 80, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '800', textAlign: 'center' },
    popupActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: 15, backgroundColor: '#F5F5F5', alignItems: 'center' },
    cancelBtnText: { fontWeight: '700', color: '#666' },
    confirmBtn: { flex: 2, padding: 15, borderRadius: 15, backgroundColor: '#FF718B', alignItems: 'center' },
    confirmBtnText: { color: '#FFF', fontWeight: '800' },

    // Add Med Form
    popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    aiPhotoBtn: { backgroundColor: '#6366F1', flexDirection: 'row', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 20 },
    aiPhotoText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 11, fontWeight: '700', color: '#666', marginBottom: 8 },
    textInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 14, color: '#333' },
    saveMedBtn: { backgroundColor: '#FF718B', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10 },
    saveMedBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
