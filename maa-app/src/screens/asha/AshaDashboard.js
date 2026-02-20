import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

const { width: W } = Dimensions.get('window');

function StatCard({ label, value, icon, color }) {
    return (
        <View style={st.statCard}>
            <View style={[st.statIconContainer, { backgroundColor: color + '15' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={st.statValue}>{value}</Text>
                <Text style={st.statLabel}>{label}</Text>
            </View>
        </View>
    );
}

function ActionCard({ title, subtitle, icon, color, onPress }) {
    return (
        <TouchableOpacity style={st.actionCard} onPress={onPress} activeOpacity={0.9}>
            <LinearGradient
                colors={[color, color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.actionGradient}
            >
                <View style={st.actionIconRow}>
                    <View style={st.actionIconCircle}>
                        <MaterialCommunityIcons name={icon} size={28} color={color} />
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </View>
                <View style={{ marginTop: 12 }}>
                    <Text style={st.actionTitle}>{title}</Text>
                    <Text style={st.actionSubtitle}>{subtitle}</Text>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

export default function AshaDashboard({ navigation }) {
    const { language } = useLanguage();
    const { user, logout } = useUser();

    const isHindi = language === 'hi';

    return (
        <SafeAreaView style={st.container}>
            <ScrollView contentContainerStyle={st.scrollContent}>
                {/* Header */}
                <View style={st.header}>
                    <View>
                        <Text style={st.welcome}>
                            {isHindi ? 'नमस्ते, आशा कार्यकर्ता' : 'Namaste, ASHA Worker'} 👋
                        </Text>
                        <Text style={st.userName}>{user?.id}</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={st.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={st.statsRow}>
                    <StatCard
                        label={isHindi ? 'आज की विज़िट' : 'Today\'s Visits'}
                        value="8"
                        icon="home-account"
                        color="#4F46E5"
                    />
                    <StatCard
                        label={isHindi ? 'उच्च जोखिम' : 'High Risk'}
                        value="3"
                        icon="alert-decagram"
                        color="#EF4444"
                    />
                </View>

                {/* Main Actions */}
                <View style={st.actionsContainer}>
                    <Text style={st.sectionTitle}>{isHindi ? 'मुख्य सुविधाएँ' : 'Core Features'}</Text>

                    <ActionCard
                        title={isHindi ? 'स्मार्ट रूट मैप' : 'Smart Route Map'}
                        subtitle={isHindi ? 'उच्च जोखिम वाले मरीजों को प्राथमिकता दें' : 'Prioritize high-risk patient visits'}
                        icon="map-marker-path"
                        color="#6366F1"
                        onPress={() => navigation.navigate('SmartRouteMap')}
                    />

                    <ActionCard
                        title={isHindi ? 'जीरो-टाइपिंग रजिस्टर' : 'Zero-Typing Register'}
                        subtitle={isHindi ? 'QR कोड स्कैन करें' : 'Scan QR for instant form verification'}
                        icon="qrcode-scan"
                        color="#10B981"
                        onPress={() => navigation.navigate('QrRegister')}
                    />

                    <ActionCard
                        title={isHindi ? 'दवा पालन ट्रैकर' : 'Medication Adherence'}
                        subtitle={isHindi ? 'दवाओं की कमी और छूटने की जाँच करें' : 'Check pill counts & missed refills'}
                        icon="pill"
                        color="#F59E0B"
                        onPress={() => navigation.navigate('MedicationTracker')}
                    />
                </View>

                {/* Recent Patients */}
                <View style={st.recentPatients}>
                    <Text style={st.sectionTitle}>{isHindi ? 'हाल के मरीज' : 'Recent Patients'}</Text>
                    {[
                        { id: 'user_001', name: 'Anjali Sharma', initial: 'AS' },
                        { id: 'user_002', name: 'Sunita Devi', initial: 'SD', risk: 'High' },
                        { id: 'user_003', name: 'Meena Kumari', initial: 'MK' }
                    ].map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={st.patientItem}
                            onPress={() => navigation.navigate('PatientHistory', { patientId: item.id })}
                        >
                            <View style={st.patientAvatar}>
                                <Text style={st.avatarText}>{item.initial}</Text>
                            </View>
                            <View style={st.patientInfo}>
                                <Text style={st.patientName}>{item.name}</Text>
                                <Text style={st.lastVisit}>{isHindi ? 'अंतिम जांच: 2 दिन पहले' : 'Last visit: 2 days ago'}</Text>
                            </View>
                            {item.risk === 'High' && (
                                <View style={st.riskBadge}>
                                    <Text style={st.riskText}>{isHindi ? 'उच्च जोखिम' : 'High Risk'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    welcome: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    logoutBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
        marginTop: 8,
    },
    actionsContainer: {
        marginBottom: 24,
    },
    actionCard: {
        height: 145,
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    actionGradient: {
        flex: 1,
        padding: 20,
    },
    actionIconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFF',
    },
    actionSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    recentPatients: {
        marginBottom: 20,
    },
    patientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 14,
        borderRadius: 18,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    patientAvatar: {
        width: 44,
        height: 44,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontWeight: '700',
        color: '#64748B',
    },
    patientName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    patientDetails: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    riskBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    riskText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    }
});
