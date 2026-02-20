import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

const VISITS_DATA = [
    {
        id: 'user_002',
        name: 'Sunita Devi',
        risk: 'High',
        reason: 'Hypertension detected by AI',
        distance: '0.8 km',
        week: 28,
        urgent: true,
    },
    {
        id: 'user_003',
        name: 'Meena Kumari',
        risk: 'Medium',
        reason: 'Missed last ANC visit',
        distance: '1.5 km',
        week: 14,
        urgent: false,
    },
    {
        id: 'user_001',
        name: 'Anjali Sharma',
        risk: 'Low',
        reason: 'Routine checkup',
        distance: '2.1 km',
        week: 32,
        urgent: false,
    },
    {
        id: 'user_004',
        name: 'Pooja Varma',
        risk: 'Low',
        reason: 'Routine checkup',
        distance: '3.4 km',
        week: 20,
        urgent: false,
    }
];

const getRiskValue = (risk) => {
    switch (risk) {
        case 'High': return 3;
        case 'Medium': return 2;
        default: return 1;
    }
};

const PRIORITIZED_VISITS = [...VISITS_DATA].sort((a, b) => getRiskValue(b.risk) - getRiskValue(a.risk));

export default function SmartRouteMap({ navigation }) {
    const { language } = useLanguage();
    const isHindi = language === 'hi';

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'High': return '#FF4B6C';
            case 'Medium': return '#FFB020';
            default: return '#4CAF50';
        }
    };

    const getRiskLabel = (risk) => {
        if (!isHindi) return risk.toUpperCase();
        switch (risk) {
            case 'High': return 'उच्च';
            case 'Medium': return 'मध्यम';
            default: return 'सामान्य';
        }
    };

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>{isHindi ? 'स्मार्ट रूट मैप' : 'Smart Route Map'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Glassmorphism Info Box */}
                <View style={st.glassInfo}>
                    <LinearGradient
                        colors={['#FEE6EA', '#FFFFFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.glassGradient}
                    >
                        <View style={st.infoIconBox}>
                            <MaterialCommunityIcons name="brain" size={24} color="#FF4B6C" />
                        </View>
                        <View style={st.infoTextBox}>
                            <Text style={st.infoTitle}>{isHindi ? 'एआई रूट अनुकूलन' : 'AI Route Optimization'}</Text>
                            <Text style={st.infoDesc}>
                                {isHindi
                                    ? 'एआई ने उच्च जोखिम वाले मरीजों के आधार पर आपके रूट को फिर से व्यवस्थित किया है।'
                                    : 'AI has reordered your visits based on clinical risk factors.'}
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {PRIORITIZED_VISITS.map((visit, index) => (
                    <View key={visit.id} style={st.timelineItem}>
                        {/* Timeline Side */}
                        <View style={st.timelineSidebar}>
                            <View style={[st.dot, { backgroundColor: getRiskColor(visit.risk) }]}>
                                <View style={[st.dotInner, { backgroundColor: '#FFF' }]} />
                            </View>
                            {index !== PRIORITIZED_VISITS.length - 1 && <View style={st.line} />}
                        </View>

                        {/* Visit Card */}
                        <TouchableOpacity
                            style={st.cardWrapper}
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('PatientHistory', { patientId: visit.id })}
                        >
                            <LinearGradient
                                colors={['#FFFFFF', '#FFFBFB']}
                                style={st.cardGradient}
                            >
                                <View style={st.cardTop}>
                                    <View style={st.patientInfo}>
                                        <Text style={st.patientName}>{visit.name}</Text>
                                        <Text style={st.reasonText}>
                                            {isHindi
                                                ? (visit.reason === 'Hypertension detected by AI' ? 'एआई द्वारा उच्च रक्तचाप मिला' :
                                                    visit.reason === 'Routine checkup' ? 'नियमित जांच' :
                                                        'पिछली एएनसी विज़िट छूट गई')
                                                : visit.reason}
                                        </Text>
                                    </View>
                                    <View style={[st.riskBadge, { backgroundColor: getRiskColor(visit.risk) + '15' }]}>
                                        <Text style={[st.riskText, { color: getRiskColor(visit.risk) }]}>{getRiskLabel(visit.risk)}</Text>
                                    </View>
                                </View>

                                <View style={st.divider} />

                                <View style={st.cardBot}>
                                    <View style={st.metaGroup}>
                                        <View style={st.metaItem}>
                                            <MaterialCommunityIcons name="map-marker-distance" size={14} color="#999" />
                                            <Text style={st.metaText}>{visit.distance}</Text>
                                        </View>
                                        <View style={st.metaItem}>
                                            <MaterialCommunityIcons name="calendar-month" size={14} color="#999" />
                                            <Text style={st.metaText}>{isHindi ? 'हफ्ता' : 'Week'} {visit.week}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={st.navBtn}>
                                        <Text style={st.navBtnText}>{isHindi ? 'रास्ता देखें' : 'Get Directions'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {visit.urgent && (
                                    <LinearGradient
                                        colors={['#FF4B6C', '#FF718B']}
                                        style={st.urgentBadge}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFF" />
                                        <Text style={st.urgentText}>{isHindi ? 'तत्काल' : 'URGENT'}</Text>
                                    </LinearGradient>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7F9' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#333' },
    backBtn: { padding: 4 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    // Glass Info Box
    glassInfo: { marginBottom: 30, borderRadius: 25, overflow: 'hidden', elevation: 5, shadowColor: '#FF718B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
    glassGradient: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    infoIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    infoTextBox: { flex: 1 },
    infoTitle: { fontSize: 16, fontWeight: '900', color: '#FF4B6C', marginBottom: 2 },
    infoDesc: { fontSize: 13, color: '#666', lineHeight: 18, fontWeight: '500' },

    // Timeline Items
    timelineItem: { flexDirection: 'row', gap: 20 },
    timelineSidebar: { alignItems: 'center', width: 24 },
    dot: { width: 20, height: 20, borderRadius: 10, marginTop: 24, padding: 4, zIndex: 1 },
    dotInner: { flex: 1, borderRadius: 10 },
    line: { flex: 1, width: 2, backgroundColor: '#FFDCE2', marginVertical: -10 },

    // Visit Card
    cardWrapper: { flex: 1, marginBottom: 25, borderRadius: 24, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10 },
    cardGradient: { padding: 18, paddingRight: 20 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    patientInfo: { flex: 1 },
    patientName: { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 4 },
    reasonText: { fontSize: 12, color: '#999', fontWeight: '500' },
    riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    riskText: { fontSize: 11, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 15 },
    cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaGroup: { flexDirection: 'row', gap: 15 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#999', fontWeight: '600' },
    navBtn: { backgroundColor: '#6366F1', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    navBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

    // Urgent Label
    urgentBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 4 },
    urgentText: { fontSize: 10, fontWeight: '900', color: '#FFF' }
});
