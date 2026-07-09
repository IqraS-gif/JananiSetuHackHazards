import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { checkUserExists, getUserProfile } from '../../services/database/DatabaseService';

export default function LoginScreen({ route, navigation }) {
    const { role } = route.params || { role: 'mother' };
    const { language } = useLanguage();
    const { login } = useUser();
    const [userId, setUserId] = useState('');

    const handleLogin = async () => {
        let isValid = false;
        try {
            const profile = await getUserProfile(userId);
            if (profile) {
                if (profile.role === role) {
                    isValid = true;
                }
            } else {
                // Fallback for default demo IDs
                if (role === 'asha') {
                    isValid = (userId === 'asha_001' || userId === 'asha_002');
                } else if (role === 'doctor') {
                    isValid = (userId === 'dr_001');
                } else {
                    isValid = (userId === 'user_001' || userId === 'user_002');
                }
            }
        } catch (e) {
            console.error('[LoginScreen] Check login error:', e);
        }

        if (isValid) {
            login(userId, role);
            // No need to navigate here, AppNavigator will switch
        } else {
            let hint = '';
            if (role === 'asha') hint = 'asha_001 or your custom ASHA ID';
            else if (role === 'doctor') hint = 'dr_001 or your custom Doctor ID';
            else hint = 'user_001, user_002, or your custom ID';

            alert(language === 'hi' 
                ? `अमान्य आईडी। सही आईडी दर्ज करें (${hint})` 
                : `Invalid ID. Please enter a valid ID (${hint})`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.roleBadge}>{role.toUpperCase()}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={styles.title}>{language === 'hi' ? 'लॉगिन करें' : 'Login'}</Text>
                        <Text style={styles.subtitle}>
                            {language === 'hi' ? 'आगे बढ़ने के लिए अपनी पहचान दर्ज करें' : 'Enter your credentials to continue'}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{language === 'hi' ? 'उपयोगकर्ता आईडी' : 'User ID'}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. user_001"
                                value={userId}
                                onChangeText={setUserId}
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.9}>
                            <Text style={styles.loginButtonText}>{language === 'hi' ? 'लॉगिन करें' : 'Login'}</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {language === 'hi' ? 'नया खाता? ' : "Don't have an account? "}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('SignUp', { role })}>
                                <Text style={styles.signUpText}>
                                    {language === 'hi' ? 'साइन अप करें' : 'Sign Up'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.demoBox}>
                            <Text style={styles.demoTitle}>
                                {language === 'hi' ? '🔑 डेमो अकाउंट से लॉगिन करें:' : '🔑 Tap to sign in as demo user:'}
                            </Text>
                            {role === 'mother' && (
                                <>
                                    <TouchableOpacity
                                        style={styles.demoBtn}
                                        onPress={() => { setUserId('user_001'); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={styles.demoBtnEmoji}>🤰</Text>
                                        <View>
                                            <Text style={styles.demoBtnLabel}>Normal User</Text>
                                            <Text style={styles.demoBtnId}>user_001</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.demoBtn, styles.demoBtnRisk]}
                                        onPress={() => { setUserId('user_002'); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={styles.demoBtnEmoji}>⚠️</Text>
                                        <View>
                                            <Text style={[styles.demoBtnLabel, { color: '#C0392B' }]}>High Risk User</Text>
                                            <Text style={styles.demoBtnId}>user_002</Text>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}
                            {role === 'asha' && (
                                <TouchableOpacity
                                    style={styles.demoBtn}
                                    onPress={() => { setUserId('asha_001'); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.demoBtnEmoji}>👩‍⚕️</Text>
                                    <View>
                                        <Text style={styles.demoBtnLabel}>ASHA Worker</Text>
                                        <Text style={styles.demoBtnId}>asha_001</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {role === 'doctor' && (
                                <TouchableOpacity
                                    style={styles.demoBtn}
                                    onPress={() => { setUserId('dr_001'); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.demoBtnEmoji}>👨‍⚕️</Text>
                                    <View>
                                        <Text style={styles.demoBtnLabel}>Doctor</Text>
                                        <Text style={styles.demoBtnId}>dr_001</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    backButtonText: {
        fontSize: 24,
        color: Colors.text,
    },
    roleBadge: {
        backgroundColor: Colors.primary + '15',
        color: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        fontWeight: '700',
        fontSize: 12,
    },
    formContainer: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.text,
    },
    loginButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    loginButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: Colors.textLight,
        fontSize: 16,
    },
    signUpText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '700',
    },
    demoBox: {
        marginTop: 32,
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 3,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        gap: 10,
    },
    demoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textLight,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    demoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        borderRadius: 14,
        padding: 14,
        gap: 14,
    },
    demoBtnRisk: {
        backgroundColor: '#C0392B10',
        borderColor: '#C0392B30',
    },
    demoBtnEmoji: {
        fontSize: 28,
    },
    demoBtnLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    demoBtnId: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 2,
        fontFamily: 'monospace',
    },
});
