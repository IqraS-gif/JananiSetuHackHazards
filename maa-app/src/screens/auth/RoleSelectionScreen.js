import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

const ROLES = [
    { id: 'mother', icon: '🤰', en: 'Mother', hi: 'माँ / गर्भवती महिला' },
    { id: 'asha', icon: '👩‍⚕️', en: 'ASHA Worker', hi: 'आशा कार्यकर्ता' },
    { id: 'doctor', icon: '👨‍⚕️', en: 'Doctor', hi: 'डॉक्टर' },
];

export default function RoleSelectionScreen({ navigation }) {
    const { language } = useLanguage();

    const handleRoleSelect = (role) => {
        navigation.navigate('Login', { role });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>
                    {language === 'hi' ? 'अपनी भूमिका चुनें' : 'Choose Your Role'}
                </Text>
                <Text style={styles.subtitle}>
                    {language === 'hi' ? 'जननीसेतु में आपका स्वागत है' : 'Welcome to JananiSetu'}
                </Text>

                <View style={styles.roleGrid}>
                    {ROLES.map((role) => (
                        <TouchableOpacity
                            key={role.id}
                            style={styles.roleCard}
                            onPress={() => handleRoleSelect(role.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconCircle}>
                                <Text style={styles.roleIcon}>{role.icon}</Text>
                            </View>
                            <Text style={styles.roleTextEn}>{role.en}</Text>
                            <Text style={styles.roleTextHi}>{role.hi}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.textLight,
        textAlign: 'center',
        marginBottom: 48,
        fontWeight: '500',
    },
    roleGrid: {
        width: '100%',
        gap: 20,
    },
    roleCard: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 8,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border + '50',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    roleIcon: {
        fontSize: 30,
    },
    roleTextEn: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        flex: 1,
    },
    roleTextHi: {
        fontSize: 14,
        color: Colors.textLight,
        position: 'absolute',
        bottom: 12,
        left: 100,
    },
});
