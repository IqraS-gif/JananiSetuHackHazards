import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Dimensions,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VoiceRecognitionService } from '../../services/VoiceRecognitionService';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Colors } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { getPatientsList } from '../../services/database/DatabaseService';
import { parseVoiceNavigation } from '../../services/ai/GeminiService';
import { playTextToSpeech } from '../../services/TextToSpeechService';

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

const STATIC_PATIENTS = [
    { id: 'user_001', name: 'Anjali Sharma', initial: 'AS', week: 32, bp: '118/78', risk: 'Low' },
    { id: 'user_002', name: 'Sunita Devi', initial: 'SD', risk: 'High', week: 28, bp: '145/95' },
    { id: 'user_003', name: 'Meena Kumari', initial: 'MK', week: 14, bp: '122/80', risk: 'Normal' },
    { id: 'user_004', name: 'Pooja Varma', initial: 'PV', week: 20, bp: '116/76', risk: 'Low' }
];

export default function AshaDashboard({ navigation }) {
    const { language } = useLanguage();
    const { user, logout } = useUser();
    const [patients, setPatients] = useState([]);

    // Command recording state (used only AFTER wake word fires)
    const [isListening, setIsListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [voiceTranscript, setVoiceTranscript] = useState('');

    // Wake word mode state — uses on-device expo-speech-recognition (zero API cost)
    const [wakeWordActive, setWakeWordActive] = useState(true);
    const [wakeWordStatus, setWakeWordStatus] = useState('');
    const wakeWordEnabledRef = useRef(true);
    const isCommandRecordingRef = useRef(false); // true only when Sarvam is recording

    // ── Wake words (on-device detection, no API) ─────────────────────────────
    const WAKE_WORDS = [
        'janani setu', 'जननी सेतु', 'janani', 'जननी', 'setu', 'सेतु',
        'janani set', 'hey janani', 'jannani setu', 'jananisetu',
    ];

    function detectWakeWord(text) {
        const lower = (text || '').toLowerCase().trim();
        return WAKE_WORDS.some(w => lower.includes(w.toLowerCase()));
    }

    function extractCommandAfterWakeWord(text) {
        const lower = (text || '').toLowerCase().trim();
        for (const w of WAKE_WORDS) {
            const idx = lower.indexOf(w.toLowerCase());
            if (idx !== -1) {
                return text.slice(idx + w.length).replace(/^[,\s]+/, '').trim();
            }
        }
        return text;
    }

    // ── Start on-device continuous listening (FREE — uses Google/Apple STT, no API cost) ──
    const startWakeWordListening = useCallback(async () => {
        if (!wakeWordEnabledRef.current || isCommandRecordingRef.current) return;
        try {
            const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!perm.granted) {
                setWakeWordStatus(language === 'hi' ? '🔴 अनुमति नहीं है' : '🔴 Microphone Permission Required');
                return;
            }
            setWakeWordStatus(language === 'hi' ? '🟢 जागृत — "जननी सेतु" कहें' : '🟢 Awake — Say "Janani Setu"');
            ExpoSpeechRecognitionModule.start({
                lang: language === 'hi' ? 'hi-IN' : 'en-IN',
                interimResults: true,   // catch wake word mid-sentence
                continuous: true,       // keep listening indefinitely
                requiresOnDeviceRecognition: false,
            });
        } catch (e) {
            console.warn('[WakeWord] start error:', e.message || e);
        }
    }, [language]);

    const stopWakeWordListening = useCallback(() => {
        try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    }, []);

    // ── on-device wake word events (expo-speech-recognition, ZERO API cost) ──
    useSpeechRecognitionEvent('result', async (event) => {
        if (isCommandRecordingRef.current) return; // command mode handled by VoiceRecognitionService
        if (!wakeWordEnabledRef.current) return;
        const text = event.results?.[0]?.transcript ?? '';
        if (!text) return;
        console.log('[WakeWord on-device]', text);

        if (detectWakeWord(text)) {
            stopWakeWordListening(); // stop free listener immediately
            const inlineCommand = extractCommandAfterWakeWord(text);
            console.log('[WakeWord] Fired! inlineCommand:', inlineCommand);
            setWakeWordStatus(language === 'hi' ? '✅ जननी सेतु सुना!' : '✅ Janani Setu heard!');

            if (inlineCommand && inlineCommand.length > 2) {
                // Full command in one breath — no Sarvam call needed at all
                setVoiceTranscript(inlineCommand);
                setVoiceStatus(language === 'hi' ? 'प्रोसेस हो रहा है...' : 'Processing...');
                setIsListening(true);
                isCommandRecordingRef.current = true;
                await handleNavigate(inlineCommand);
            } else {
                // Only wake word said — NOW make ONE Sarvam call for the command
                setVoiceTranscript('');
                setVoiceStatus(language === 'hi' ? 'बोलें...' : 'Speak now...');
                setIsListening(true);
                isCommandRecordingRef.current = true;
                try { await playTextToSpeech(language === 'hi' ? 'हाँ, बोलिए' : 'Yes, go ahead', language); } catch (_) {}
                
                // Wait for speech recognition to fully stop and release the microphone
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    const granted = await VoiceRecognitionService.requestPermissions();
                    if (!granted) throw new Error("Permission not granted");
                    await VoiceRecognitionService.start(language, 10000);
                } catch (e) {
                    setIsListening(false);
                    isCommandRecordingRef.current = false;
                    if (wakeWordEnabledRef.current) startWakeWordListening();
                }
            }
        }
        // not a wake word — continuous listener keeps running silently, no action
    });

    useSpeechRecognitionEvent('end', () => {
        // on-device recognizer stopped (e.g. timeout) — restart it
        if (wakeWordEnabledRef.current && !isCommandRecordingRef.current) {
            setTimeout(startWakeWordListening, 300);
        }
    });

    useSpeechRecognitionEvent('error', (e) => {
        console.warn('[WakeWord error]', e?.message);
        if (wakeWordEnabledRef.current && !isCommandRecordingRef.current) {
            setTimeout(startWakeWordListening, 2000);
        }
    });

    // ── Sarvam STT subscriber — only active AFTER wake word fires ──
    useEffect(() => {
        const onResult = async (evt) => {
            if (!isCommandRecordingRef.current) return;
            const text = evt.results?.[0]?.transcript ?? '';
            console.log('[Command Sarvam STT]', text);
            if (text) {
                setVoiceTranscript(text);
                setVoiceStatus(language === 'hi' ? 'प्रोसेस हो रहा है...' : 'Processing...');
                await handleNavigate(text);
            } else {
                setVoiceStatus(language === 'hi' ? 'सुनाई नहीं दिया।' : 'Could not hear.');
                setTimeout(() => {
                    setIsListening(false);
                    isCommandRecordingRef.current = false;
                    if (wakeWordEnabledRef.current) startWakeWordListening();
                }, 2000);
            }
        };
        const onError = () => {
            if (!isCommandRecordingRef.current) return;
            setVoiceStatus(language === 'hi' ? 'त्रुटि हुई।' : 'Error.');
            setTimeout(() => {
                setIsListening(false);
                isCommandRecordingRef.current = false;
                if (wakeWordEnabledRef.current) startWakeWordListening();
            }, 2000);
        };
        VoiceRecognitionService.subscribe('result', onResult);
        VoiceRecognitionService.subscribe('error', onError);
        return () => {
            VoiceRecognitionService.unsubscribe('result', onResult);
            VoiceRecognitionService.unsubscribe('error', onError);
        };
    }, [language, startWakeWordListening]);

    // Shared navigation executor
    const handleNavigate = async (command) => {
        try {
            const result = await parseVoiceNavigation(command, language);
            console.log('[Asha Voice Nav] Result:', result);

            if (result && result.route) {
                setVoiceStatus(language === 'hi' ? 'खोली जा रही है...' : 'Navigating...');
                if (result.message) {
                    try { await playTextToSpeech(result.message, language); } catch (e) {}
                }
                setIsListening(false);
                isCommandRecordingRef.current = false;
                setTimeout(() => {
                    if (result.route === 'PatientHistory' && result.patientId) {
                        navigation.navigate('PatientHistory', { patientId: result.patientId });
                    } else {
                        navigation.navigate(result.route);
                    }
                    if (wakeWordEnabledRef.current) setTimeout(startWakeWordListening, 1500);
                }, 1200);
            } else {
                setVoiceStatus(language === 'hi' ? 'कमांड समझ नहीं आया।' : 'Not recognized.');
                if (result && result.message) {
                    try { await playTextToSpeech(result.message, language); } catch (e) {}
                }
                setTimeout(() => {
                    setIsListening(false);
                    isCommandRecordingRef.current = false;
                    if (wakeWordEnabledRef.current) startWakeWordListening();
                }, 2500);
            }
        } catch (err) {
            console.error('[Asha Voice Nav] handleNavigate error:', err);
            setVoiceStatus(language === 'hi' ? 'त्रुटि हुई।' : 'An error occurred.');
            setTimeout(() => {
                setIsListening(false);
                isCommandRecordingRef.current = false;
                if (wakeWordEnabledRef.current) startWakeWordListening();
            }, 2000);
        }
    };

    // ── Manual mic button (fallback if hands-free off) ───────────────────────
    const handleVoiceCommandStart = async () => {
        stopWakeWordListening();
        isCommandRecordingRef.current = true;
        
        // Wait for speech recognition to release microphone
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            const granted = await VoiceRecognitionService.requestPermissions();
            if (!granted) {
                Alert.alert(
                    language === 'hi' ? 'अनुमति आवश्यक है' : 'Permission Required',
                    language === 'hi' ? 'माइक्रोफ़ोन की अनुमति की आवश्यकता है।' : 'Microphone permission is required.',
                    [{ text: language === 'hi' ? 'ठीक है' : 'OK' }]
                );
                isCommandRecordingRef.current = false;
                return;
            }
            setVoiceTranscript('');
            setVoiceStatus(language === 'hi' ? 'सुन रहा हूँ... बोलें' : 'Listening... Speak now');
            setIsListening(true);
            await VoiceRecognitionService.start(language);
        } catch (e) {
            console.error('[Asha Voice Nav] Manual start failed:', e);
            isCommandRecordingRef.current = false;
            setIsListening(false);
        }
    };

    const handleVoiceCommandCancel = async () => {
        setIsListening(false);
        isCommandRecordingRef.current = false;
        try { await VoiceRecognitionService.cancel(); } catch (e) {}
        stopWakeWordListening();
        if (wakeWordEnabledRef.current) setTimeout(startWakeWordListening, 600);
    };

    const toggleWakeWord = async (value) => {
        wakeWordEnabledRef.current = value;
        setWakeWordActive(value);
        if (value) {
            const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (perm.granted) {
                setWakeWordStatus(language === 'hi' ? '🟢 जागृत — "जननी सेतु" कहें' : '🟢 Awake — Say "Janani Setu"');
                setTimeout(startWakeWordListening, 500);
            } else {
                setWakeWordStatus(language === 'hi' ? '🔴 अनुमति नहीं है' : '🔴 Microphone Permission Required');
                wakeWordEnabledRef.current = false;
                setWakeWordActive(false);
                Alert.alert(
                    language === 'hi' ? 'अनुमति आवश्यक है' : 'Permission Required',
                    language === 'hi' ? 'हैंड्स-फ्री उपयोग करने के लिए कृपया माइक्रोफ़ोन अनुमति प्रदान करें।' : 'Please grant microphone permissions to use hands-free mode.'
                );
            }
        } else {
            setWakeWordStatus(language === 'hi' ? '🔴 हैंड्स-फ्री बंद' : '🔴 Hands-free Off');
            stopWakeWordListening();
        }
    };

    const isHindi = language === 'hi';

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const fetchPatients = async () => {
                try {
                    const list = await getPatientsList();
                    if (active) {
                        const map = new Map();
                        STATIC_PATIENTS.forEach(p => map.set(p.id, p));
                        list.forEach(p => map.set(p.id, p));
                        const merged = Array.from(map.values());
                        const priority = { 'High': 3, 'Normal': 2, 'Low': 1 };
                        const sorted = merged.sort((a, b) => priority[b.risk] - priority[a.risk]);
                        setPatients(sorted);
                    }
                } catch (e) {
                    console.error("[AshaDashboard] Error fetching patients:", e);
                }
            };
            fetchPatients();

            // Start on-device wake word listening when screen is focused
            if (wakeWordEnabledRef.current) {
                setWakeWordStatus(language === 'hi' ? '🟢 जागृत — "जननी सेतु" कहें' : '🟢 Awake — Say "Janani Setu"');
                setTimeout(startWakeWordListening, 1000);
            }

            return () => {
                active = false;
                wakeWordEnabledRef.current = false;
                isCommandRecordingRef.current = false;
                stopWakeWordListening();
                VoiceRecognitionService.cancel().catch(() => {});
                setTimeout(() => {
                    wakeWordEnabledRef.current = wakeWordActive;
                }, 200);
            };
        }, [startWakeWordListening, stopWakeWordListening, wakeWordActive, language])
    );

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
                    <View style={st.headerRight}>
                        {/* Hands-free Toggle */}
                        <TouchableOpacity
                            style={[st.wakeToggleBtn, wakeWordActive && st.wakeToggleBtnOn]}
                            onPress={() => toggleWakeWord(!wakeWordActive)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name={wakeWordActive ? 'ear-hearing' : 'ear-hearing-off'}
                                size={18}
                                color={wakeWordActive ? '#FFF' : '#94A3B8'}
                            />
                            <Text style={[st.wakeToggleText, wakeWordActive && st.wakeToggleTextOn]}>
                                {wakeWordActive
                                    ? (isHindi ? 'हैंड्स-फ्री' : 'Hands-free')
                                    : (isHindi ? 'बंद' : 'Off')
                                }
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={logout} style={st.logoutBtn}>
                            <MaterialCommunityIcons name="logout" size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Wake word status bar */}
                {wakeWordActive && (
                    <View style={st.wakeStatusBar}>
                        <MaterialCommunityIcons name="waveform" size={16} color="#10B981" />
                        <Text style={st.wakeStatusText}>{wakeWordStatus || (isHindi ? '"जननी सेतु" कहें...' : 'Say "Janani Setu"...')}</Text>
                    </View>
                )}

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
                        value={patients.filter(p => p.risk === 'High').length.toString()}
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
                    {patients.map((item) => (
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
                                <Text style={st.lastVisit}>
                                    {isHindi 
                                        ? `गर्भावस्था: ${item.week} सप्ताह • बीपी: ${item.bp}` 
                                        : `Pregnancy: ${item.week} weeks • BP: ${item.bp}`}
                                </Text>
                            </View>
                            {item.risk === 'High' && (
                                <View style={st.riskBadge}>
                                    <Text style={st.riskText}>{isHindi ? 'उच्च जोखिम' : 'High Risk'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    {patients.length === 0 && (
                        <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 10, fontSize: 14 }}>
                            {isHindi ? 'कोई मरीज पंजीकृत नहीं है' : 'No patients registered'}
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* Floating Mic Button */}
            <TouchableOpacity 
                style={[st.floatingMicBtn, isListening && st.floatingMicBtnActive]} 
                onPress={isListening ? handleVoiceCommandCancel : handleVoiceCommandStart}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={isListening ? ['#EF4444', '#B91C1C'] : [Colors.primary, '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={st.floatingMicGradient}
                >
                    <MaterialCommunityIcons
                        name={isListening ? 'microphone-off' : 'microphone'}
                        size={26}
                        color="#FFF"
                    />
                </LinearGradient>
            </TouchableOpacity>

            {/* Voice Command Overlay */}
            <Modal
                visible={isListening}
                transparent={true}
                animationType="fade"
                onRequestClose={handleVoiceCommandCancel}
            >
                <View style={st.modalOverlay}>
                    <View style={st.modalContent}>
                        <View style={st.micPulseOutline}>
                            <View style={st.micPulseInner}>
                                <MaterialCommunityIcons name="microphone" size={40} color="#FFF" />
                            </View>
                        </View>

                        <Text style={st.voiceStatusText}>{voiceStatus}</Text>
                        
                        {voiceTranscript ? (
                            <Text style={st.voiceTranscriptText}>"{voiceTranscript}"</Text>
                        ) : null}

                        {/* Suggestions panel */}
                        <View style={st.suggestionsContainer}>
                            <Text style={st.suggestionsTitle}>
                                {language === 'hi' ? 'आप कह सकते हैं:' : 'You can say:'}
                            </Text>
                            <View style={st.suggestionChips}>
                                <View style={st.chip}>
                                    <Text style={st.chipText}>
                                        {language === 'hi' ? '“सुनीता देवी की प्रोफाइल खोलो”' : '“Open Sunita Devi\'s profile”'}
                                    </Text>
                                </View>
                                <View style={st.chip}>
                                    <Text style={st.chipText}>
                                        {language === 'hi' ? '“स्मार्ट रूट मैप दिखाओ”' : '“Show smart route map”'}
                                    </Text>
                                </View>
                                <View style={st.chip}>
                                    <Text style={st.chipText}>
                                        {language === 'hi' ? '“दवा पालन ट्रैकर खोलो”' : '“Open medication tracker”'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={st.cancelVoiceBtn} 
                            onPress={handleVoiceCommandCancel}
                        >
                            <Text style={st.cancelVoiceText}>
                                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    lastVisit: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    patientInfo: {
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    wakeToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    wakeToggleBtnOn: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    wakeToggleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
    },
    wakeToggleTextOn: {
        color: '#FFF',
    },
    wakeStatusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },
    wakeStatusText: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
        flex: 1,
    },
    floatingMicBtnActive: {
        elevation: 12,
    },
    riskText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },
    floatingMicBtn: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        overflow: 'hidden',
    },
    floatingMicGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
    },
    micPulseOutline: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FCE7F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    micPulseInner: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#EC4899',
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceStatusText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 10,
    },
    voiceTranscriptText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: '#4F46E5',
        textAlign: 'center',
        backgroundColor: '#EEF2F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 15,
        marginBottom: 20,
        width: '100%',
    },
    suggestionsContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 10,
    },
    suggestionChips: {
        gap: 8,
    },
    chip: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    chipText: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '500',
    },
    cancelVoiceBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        width: '100%',
        alignItems: 'center',
    },
    cancelVoiceText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748B',
    }
});
