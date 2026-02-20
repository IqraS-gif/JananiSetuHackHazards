import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';

export default function LoginScreen({ route, navigation }) {
    const { role } = route.params || { role: 'mother' };
    const { language } = useLanguage();
    const { login } = useUser();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        // Simple logic for the demo: 
        // user_001, user_002 -> Mother
        // asha_001, asha_002 -> ASHA
        let isValid = false;
        if (role === 'asha') {
            isValid = (userId === 'asha_001' || userId === 'asha_002');
        } else if (role === 'doctor') {
            isValid = (userId === 'dr_001');
        } else {
            isValid = (userId === 'user_001' || userId === 'user_002');
        }

        if (isValid) {
            login(userId, role);
            // No need to navigate here, AppNavigator will switch
        } else {
            let hint = '';
            if (role === 'asha') hint = '(asha_001 or asha_002)';
            else if (role === 'doctor') hint = '(dr_001)';
            else hint = '(user_001 or user_002)';

            alert(language === 'hi' ? `अमान्य आईडी ${hint}` : `Invalid ID ${hint}`);
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{language === 'hi' ? 'पासवर्ड' : 'Password'}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.9}>
                            <Text style={styles.loginButtonText}>{language === 'hi' ? 'लॉगिन' : 'Login'}</Text>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                {language === 'hi' ? 'खाता नहीं है?' : "Don't have an account?"}
                            </Text>
                            <TouchableOpacity>
                                <Text style={styles.signUpText}>{language === 'hi' ? 'रजिस्टर करें' : ' Sign Up'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.hintBox}>
                            <Text style={styles.hintText}>
                                💡 Tip: Use **{role === 'asha' ? 'asha_001' : (role === 'doctor' ? 'dr_001' : 'user_001')}** for demo simulation.
                            </Text>
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
    hintBox: {
        marginTop: 40,
        backgroundColor: Colors.info + '10',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: Colors.info,
    },
    hintText: {
        fontSize: 12,
        color: Colors.textLight,
        lineHeight: 18,
    }
});
