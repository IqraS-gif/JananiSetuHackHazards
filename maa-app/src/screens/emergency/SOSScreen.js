import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Alert
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '../../constants';
import { triggerSOS, getEmergencyContacts, EMERGENCY_NUMBERS, callNumber } from '../../services/emergency/EmergencyService';
import { useT } from '../../i18n/useT';

export default function SOSScreen({ route, navigation }) {
    const { t, isHindi, isBilingual } = useT();
    const { profile } = route.params || {};
    
    // Countdown State
    const [countdown, setCountdown] = useState(5);
    const [isCancelled, setIsCancelled] = useState(false);
    
    // Network State
    const [isOffline, setIsOffline] = useState(false);
    
    // Processing State
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState(null); // { success, method, error }
    
    // Animations
    const pulseAnim = new Animated.Value(1);

    useEffect(() => {
        // Network check
        const unsubscribeNet = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                })
            ])
        ).start();

        return () => {
            unsubscribeNet();
            pulseAnim.stopAnimation();
        };
    }, []);

    // Countdown Logic
    useEffect(() => {
        if (isCancelled || isSending || result) return;

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            fireSOS();
        }
    }, [countdown, isCancelled, isSending, result]);

    const fireSOS = useCallback(async () => {
        if (isCancelled) return;
        
        setIsSending(true);
        const sosResult = await triggerSOS(profile);
        setResult(sosResult);
        setIsSending(false);
        
        if (sosResult.success && sosResult.method.includes('queued')) {
            Alert.alert(
                t('offline_sos_title'), 
                t('offline_sos_msg')
            );
        }
    }, [isCancelled, profile]);

    const handleCancel = () => {
        setIsCancelled(true);
        navigation.goBack();
    };

    const contacts = getEmergencyContacts(profile);

    // Render Success/Fail State
    if (result) {
        return (
            <View style={[styles.container, { backgroundColor: result.success ? Colors.success + '15' : Colors.danger + '15' }]}>
                <Text style={styles.resultIcon}>{result.success ? '✅' : '❌'}</Text>
                <Text style={styles.resultTitle}>
                    {result.success ? t('sos_success') : t('sos_failed')}
                </Text>
                {result.error && (
                    <Text style={styles.errorText}>{result.error}</Text>
                )}
                
                <Text style={styles.helperText}>
                    {t('what_to_do_next')}
                </Text>
                
                <TouchableOpacity 
                    style={[styles.callBtn, { backgroundColor: Colors.danger }]}
                    onPress={() => callNumber(EMERGENCY_NUMBERS.ambulance)}
                >
                    <Text style={styles.callBtnText}>{t('call_ambulance')}</Text>
                </TouchableOpacity>

                {profile?.asha_contact && (
                    <TouchableOpacity 
                        style={[styles.callBtn, { backgroundColor: Colors.primary, marginTop: 12 }]}
                        onPress={() => callNumber(profile.asha_contact)}
                    >
                        <Text style={styles.callBtnText}>{t('call_asha')}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.homeBtnText}>{t('back_to_home')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Render Countdown State
    return (
        <View style={styles.container}>
            {isOffline && (
                <View style={styles.offlineBadge}>
                    <Text style={styles.offlineText}>{t('offline_badge')}</Text>
                </View>
            )}

            <Text style={styles.headerTitle}>{t('emergency_title')}</Text>
            
            <View style={styles.centerStage}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <View style={styles.innerCircle}>
                        {isSending ? (
                            <ActivityIndicator size="large" color={Colors.white} />
                        ) : (
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                        )}
                        <Text style={styles.sendingText}>
                            {isSending ? t('sending_status') : t('sending_in_status')}
                        </Text>
                    </View>
                </Animated.View>
            </View>

            <View style={styles.contactsCard}>
                <Text style={styles.contactsTitle}>{t('notifying_contacts', { count: contacts.length })}</Text>
                {contacts.length === 0 ? (
                    <Text style={styles.noContacts}>{t('no_contacts_saved')}</Text>
                ) : (
                    contacts.map((c, i) => (
                        <Text key={i} style={styles.contactItem}>📞 {c.replace(/.(?=.{4})/g, '*')}</Text>
                    ))
                )}
            </View>

            <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancel}
                disabled={isSending}
            >
                <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    offlineBadge: {
        position: 'absolute',
        top: 50,
        backgroundColor: Colors.danger + '20',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.danger,
    },
    offlineText: {
        color: Colors.danger,
        fontWeight: '800',
        fontSize: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.danger,
        marginBottom: 40,
        marginTop: 60,
        textAlign: 'center'
    },
    centerStage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseCircle: {
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: Colors.danger + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: Colors.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    countdownNumber: {
        fontSize: 80,
        fontWeight: '900',
        color: Colors.white,
        includeFontPadding: false,
    },
    sendingText: {
        fontSize: 16,
        color: Colors.white,
        fontWeight: '700',
        marginTop: -10,
    },
    contactsCard: {
        width: '100%',
        backgroundColor: Colors.surfaceLight,
        padding: 16,
        borderRadius: 16,
        marginBottom: 30,
    },
    contactsTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    contactItem: {
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: '600',
        paddingVertical: 4,
    },
    noContacts: {
        color: Colors.danger,
        fontWeight: '700',
    },
    cancelBtn: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        backgroundColor: Colors.surfaceExtraLight,
        borderWidth: 2,
        borderColor: Colors.textLight,
        alignItems: 'center',
        marginBottom: 20,
    },
    cancelText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.textPrimary,
    },

    // Results state
    resultIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 10,
    },
    errorText: {
        fontSize: 14,
        color: Colors.danger,
        textAlign: 'center',
        marginBottom: 20,
    },
    helperText: {
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginTop: 30,
        marginBottom: 16,
    },
    callBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 2,
    },
    callBtnText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '800',
    },
    homeBtn: {
        paddingVertical: 16,
        marginTop: 20,
    },
    homeBtnText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '800',
    }
});
