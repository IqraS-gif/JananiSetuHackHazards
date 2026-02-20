import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { Colors } from '../../constants';

export default function AshaProfile() {
    const { language, setLanguage, isHindi } = useLanguage();
    const { user, logout } = useUser();

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

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <Text style={st.headerTitle}>{isHindi ? 'मेरी प्रोफाइल' : 'My Profile'}</Text>
            </View>

            <ScrollView contentContainerStyle={st.content}>
                {/* Profile Card */}
                <View style={st.profileCard}>
                    <View style={st.avatarContainer}>
                        <MaterialCommunityIcons name="account-tie" size={40} color="#FF718B" />
                    </View>
                    <View style={st.profileInfo}>
                        <Text style={st.ashaName}>{user?.id || 'ASHA Worker'}</Text>
                        <Text style={st.ashaRole}>{isHindi ? 'सामुदायिक स्वास्थ्य कार्यकर्ता' : 'Community Health Worker'}</Text>
                        <View style={st.locationRow}>
                            <MaterialCommunityIcons name="map-marker" size={14} color="#999" />
                            <Text style={st.locationText}>Sector 4, Varanasi District</Text>
                        </View>
                    </View>
                </View>

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
                    <Text style={st.versionText}>Janani Setu ASHA v2.1.0</Text>
                </View>
            </ScrollView>
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
        marginBottom: 25,
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
    versionText: { fontSize: 12, fontWeight: '600' }
});
