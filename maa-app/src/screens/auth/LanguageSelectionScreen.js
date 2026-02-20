/**
 * LanguageSelectionScreen.js
 * First-launch screen to select language mode.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSelectionScreen() {
    const { setLanguage } = useLanguage();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brandIcon}>🌸</Text>
                <Text style={styles.title}>Welcome / नमस्ते</Text>
                <Text style={styles.subtitle}>Choose how you want to read the app</Text>
                <Text style={styles.subtitleHi}>अपना भाषा मोड चुनें</Text>
            </View>

            <TouchableOpacity 
                style={styles.card} 
                onPress={() => setLanguage('hi')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBubble, { backgroundColor: '#FFEDF2' }]}>
                    <Text style={styles.cardEmoji}>🇮🇳</Text>
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>हिन्दी</Text>
                    <Text style={styles.cardSub}>सिर्फ हिंदी में</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.card} 
                onPress={() => setLanguage('en')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBubble, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.cardEmoji}>🇬🇧</Text>
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>English</Text>
                    <Text style={styles.cardSub}>English only</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.card, styles.bilingualCard]} 
                onPress={() => setLanguage('bilingual')}
                activeOpacity={0.8}
            >
                <View style={[styles.iconBubble, { backgroundColor: '#F3E5F5' }]}>
                    <Text style={styles.cardEmoji}>🔀</Text>
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>द्विभाषी / Bilingual</Text>
                    <Text style={styles.cardSub}>Show both side by side / दोनों भाषाएं एक साथ</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    brandIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
    },
    subtitleHi: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    bilingualCard: {
        borderWidth: 2,
        borderColor: Colors.primary + '30',
    },
    iconBubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardEmoji: { fontSize: 28 },
    cardText: { flex: 1 },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
