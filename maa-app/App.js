/**
 * App.js — Production
 * Initialises the database, seeds default profile, and hands off to
 * AppNavigator wrapped in the global LanguageProvider.
 */

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
    initDatabase,
    getUserProfile,
    saveUserProfile,
} from './src/services/database/DatabaseService';

// ── Startup States ────────────────────────────────────────────────

function SplashScreen() {
    return (
        <View style={styles.center}>
            <Text style={styles.logo}>🤰</Text>
            <Text style={styles.appName}>माँ App</Text>
            <ActivityIndicator size="large" color="#FF6B9D" style={{ marginTop: 24 }} />
            <Text style={styles.startupText}>तैयार हो रहा है… / Starting up…</Text>
        </View>
    );
}

function ErrorScreen({ message, onRetry }) {
    return (
        <View style={styles.center}>
            <Text style={styles.errorEmoji}>😔</Text>
            <Text style={styles.errorTitle}>कुछ गलत हुआ / Something went wrong</Text>
            <Text style={styles.errorMessage}>{message}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryText}>दोबारा कोशिश करें / Retry</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Root Component ─────────────────────────────────────────────────

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { 
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';

export default function App() {
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    const [fontsLoaded] = useFonts({
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
        Outfit_800ExtraBold,
    });

    const initialise = async () => {
        setStatus('loading');
        setErrorMsg('');
        try {
            await initDatabase();

            const profile = await getUserProfile();
            if (!profile) {
                await saveUserProfile({
                    name: 'माँ',
                    age: 26,
                    pregnancy_week: 20,
                    language: 'hi',
                });
            }

            setStatus('ready');
        } catch (err) {
            console.error('[App] Init error:', err);
            setErrorMsg(err?.message || String(err));
            setStatus('error');
        }
    };

    useEffect(() => {
        initialise();
    }, []);

    if (status === 'loading' || !fontsLoaded) return <SplashScreen />;
    if (status === 'error') {
        return <ErrorScreen message={errorMsg} onRetry={initialise} />;
    }

    return (
        <SafeAreaProvider>
            <LanguageProvider>
                <UserProvider>
                    <AppNavigator />
                </UserProvider>
            </LanguageProvider>
        </SafeAreaProvider>
    );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF5F7',
        paddingHorizontal: 32,
    },
    logo: { fontSize: 72 },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: '#1A1A2E',
        marginTop: 12,
    },
    startupText: {
        marginTop: 14,
        fontSize: 15,
        color: '#888888',
    },
    errorEmoji: { fontSize: 56 },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A2E',
        marginTop: 16,
        textAlign: 'center',
    },
    errorMessage: {
        marginTop: 8,
        fontSize: 13,
        color: '#555555',
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 24,
        backgroundColor: '#FF6B9D',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 16,
    },
    retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
