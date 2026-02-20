/**
 * LandingScreen.js
 * Emotional, narrative-driven onboarding for JananiSetu 2.0.
 * Features: carousel, voice narration, animated counters, haptics, video bg, Made-in-India.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
let Audio;
try { Audio = require('expo-av').Audio; } catch (e) { Audio = null; }
import { useT } from '../../i18n/useT';
import designSystem from '../../theme/designSystem';
import { MaternityHero, AiHealthHero, GovSchemesHero } from '../../components/ui/AnimatedHeroIcons';

const { width: W, height: H } = Dimensions.get('window');

// ─── Voice narration scripts ────────────────────────────────────────────────
const NARRATION = {
    en: [
        'Every year, forty four thousand mothers in India die during childbirth. Most of these deaths happen in rural areas, where a pregnant woman has no access to timely medical care. She waits alone, hoping everything will be alright. JananiSetu was built for her.',
        'What if technology could predict danger before it strikes? JananiSetu uses clinical grade artificial intelligence to detect hypertension and diabetes risks weeks in advance, with ninety four percent accuracy. It puts the power of early intervention into the hands of ASHA workers and doctors.',
        'Did you know that every eligible mother in India can receive over eleven thousand rupees in government benefits? Yet millions miss out, simply because no one tells them. JananiSetu automatically identifies every scheme she qualifies for, and guides her step by step to claim what is rightfully hers.',
        'This is your moment to make a difference. Whether you are a mother seeking care, an ASHA worker serving your community, or a doctor saving lives, choose your role and join the JananiSetu mission.',
    ],
    hi: [
        'हर साल भारत में चवालीस हज़ार माताएँ प्रसव के दौरान अपनी जान गँवा देती हैं। इनमें से ज़्यादातर मौतें ग्रामीण इलाकों में होती हैं, जहाँ गर्भवती महिला को समय पर चिकित्सा सहायता नहीं मिल पाती। वो अकेली इंतज़ार करती है। जननीसेतु उसी के लिए बना है।',
        'अगर तकनीक ख़तरे को पहले ही भाँप ले तो? जननीसेतु क्लिनिकल ग्रेड एआई का उपयोग करके हफ़्तों पहले उच्च रक्तचाप और मधुमेह के जोखिमों का पता लगाता है, चौरानवे प्रतिशत सटीकता के साथ।',
        'क्या आप जानते हैं कि भारत में हर पात्र माँ को ग्यारह हज़ार रुपये से अधिक की सरकारी सहायता मिल सकती है? फिर भी लाखों माताएँ इससे वंचित रह जाती हैं।',
        'यह आपका बदलाव लाने का समय है। अपनी भूमिका चुनें और जननीसेतु मिशन से जुड़ें।',
    ],
};

// ─── Animated Counter Component ─────────────────────────────────────────────
function AnimatedCounter({ target, prefix, suffix, color, duration = 2000 }) {
    const [display, setDisplay] = useState('0');
    const animVal = useRef(new Animated.Value(0)).current;

    const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
    const hasDecimal = target.includes('.');

    useEffect(() => {
        animVal.setValue(0);
        Animated.timing(animVal, {
            toValue: numericTarget,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();

        const listener = animVal.addListener(({ value }) => {
            if (hasDecimal) {
                setDisplay(value.toFixed(1));
            } else {
                setDisplay(Math.round(value).toLocaleString('en-IN'));
            }
        });

        return () => animVal.removeListener(listener);
    }, [target]);

    return (
        <Text style={[st.statNumber, { color }]}>
            {prefix}{display}{suffix}
        </Text>
    );
}

// ─── Onboarding Data ────────────────────────────────────────────────────────
const ONBOARDING_DATA = [
    {
        id: '1',
        hero: <MaternityHero image={require('../../../assets/images/slide1.png')} />,
        statTarget: '44000', statPrefix: '', statSuffix: '',
        statLabel: {
            en: 'mothers we lose every year in India',
            hi: 'माताएँ भारत में हर साल हम खो देते हैं',
        },
        headline: {
            en: 'Every Mother\nDeserves \nCare',
            hi: 'हर माँ को\nजीवित रहने का\nहक़ है',
        },
        body: {
            en: 'In rural India, a pregnant woman faces her most vulnerable moments without timely medical help. Most of these deaths are preventable.',
            hi: 'ग्रामीण भारत में, एक गर्भवती महिला को समय पर चिकित्सा सहायता नहीं मिलती। इनमें से अधिकांश मौतें रोकी जा सकती हैं।',
        },
        colors: ['#FFF0F5', '#FFE8EE', '#FFF5F8'],
        accent: '#FF5C8A',
        accentLight: '#FFE1ED',
        hasVideo: true,
    },
    {
        id: '2',
        hero: <AiHealthHero image={require('../../../assets/images/slide2.png')} />,
        statTarget: '94.2', statPrefix: '', statSuffix: '%',
        statLabel: {
            en: 'accuracy in early risk prediction',
            hi: 'शुरुआती जोखिम भविष्यवाणी में सटीकता',
        },
        headline: {
            en: 'AI That Cares\nBefore It\'s\nToo Late',
            hi: 'एआई जो समय\nरहते आपकी\nदेखभाल करे',
        },
        body: {
            en: 'JananiSetu uses clinical-grade AI to predict hypertension & diabetes risks weeks in advance — giving ASHA workers and doctors the power to intervene early.',
            hi: 'जननीसेतु क्लिनिकल-ग्रेड एआई का उपयोग करके हफ्तों पहले उच्च रक्तचाप और मधुमेह के जोखिमों की भविष्यवाणी करता है।',
        },
        colors: ['#F0EEFF', '#EBE6FF', '#F5F3FF'],
        accent: '#6C63FF',
        accentLight: '#EBE6FF',
    },
    {
        id: '3',
        hero: <GovSchemesHero image={require('../../../assets/images/slide3.png')} />,
        statTarget: '11000', statPrefix: '₹', statSuffix: '+',
        statLabel: {
            en: 'in unclaimed benefits per mother',
            hi: 'प्रति माता अनावश्यक रूप से छूटी सहायता',
        },
        headline: {
            en: 'Rights She\nDoesn\'t Know\nShe Has',
            hi: 'अधिकार जो\nउसे पता ही\nनहीं हैं',
        },
        body: {
            en: 'Millions of mothers miss vital government schemes like JSY, PMMVY, and JSSK simply because no one tells them. JananiSetu bridges this gap.',
            hi: 'लाखों माताएँ JSY, PMMVY, और JSSK जैसी महत्वपूर्ण सरकारी योजनाओं से वंचित रह जाती हैं क्योंकि कोई उन्हें बताता नहीं।',
        },
        colors: ['#EDFBF4', '#E0FAEE', '#F0FFF8'],
        accent: '#00C896',
        accentLight: '#E0FAEE',
    },
    {
        id: '4',
        isRoleSelection: true,
        headline: { en: 'Be the Change', hi: 'बदलाव बनिए' },
        body: {
            en: 'Choose your role and join the mission to protect every mother, every child.',
            hi: 'अपनी भूमिका चुनें और हर माँ, हर बच्चे की रक्षा के मिशन में शामिल हों।',
        },
        colors: ['#FFF8E1', '#FFFDF2', '#FFFFFF'],
        accent: '#FFB020',
    },
];

// ─── Role Card ──────────────────────────────────────────────────────────────
function RoleCard({ icon, enKey, hiKey, subKey, bgColors, onPress }) {
    const { t, isBilingual } = useT();
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };
    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.88} style={{ width: '100%', alignItems: 'center' }}>
            <LinearGradient colors={bgColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.roleCard}>
                <View style={st.iconBubble}>
                    <Text style={{ fontSize: 28 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={st.roleEn}>{isBilingual ? t(enKey) : t(hiKey)}</Text>
                    {isBilingual ? <Text style={st.roleHi}>{t(subKey)}</Text> : null}
                </View>
                <View style={st.arrowCircle}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
}

// ─── Made in India Badge ────────────────────────────────────────────────────
function MadeInIndiaBadge() {
    return (
        <View style={st.indiaBadge}>
            <View style={st.tricolor}>
                <View style={[st.triStripe, { backgroundColor: '#FF9933' }]} />
                <View style={[st.triStripe, { backgroundColor: '#FFFFFF' }]} />
                <View style={[st.triStripe, { backgroundColor: '#138808' }]} />
            </View>
            <Text style={st.indiaText}>Made in India</Text>
        </View>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function LandingScreen({ navigation }) {
    const { t, isHindi, isBilingual } = useT();
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isNarrating, setIsNarrating] = useState(false);
    const currentIndexRef = useRef(0);
    const narrationPulse = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // Animated shimmer for slide 1 background
    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const lang = isHindi || isBilingual ? 'hi' : 'en';

    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { return () => { Speech.stop(); }; }, []);

    // Auto-start narration when screen mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsNarrating(true);
            speakSlide(0);
        }, 1200); // slight delay so indianVoice ref can populate
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Find the best Indian English voice on this device
    const indianVoice = useRef(null);
    useEffect(() => {
        (async () => {
            try {
                const voices = await Speech.getAvailableVoicesAsync();
                const inVoice = voices.find(v =>
                    v.language === 'en-IN' ||
                    v.identifier?.includes('en-in') ||
                    v.identifier?.includes('en_IN')
                );
                if (inVoice) {
                    indianVoice.current = inVoice.identifier;
                }
            } catch (e) {
                // silently ignore if voice listing fails
            }
        })();
    }, []);

    // Pulse animation for narration icon
    useEffect(() => {
        if (isNarrating) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(narrationPulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(narrationPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            narrationPulse.setValue(1);
        }
    }, [isNarrating]);

    // Voice narration
    const speakSlide = useCallback(async (slideIndex) => {
        const script = NARRATION[lang][slideIndex];
        if (!script) return;

        // Ensure audio session is active
        if (Audio) {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    staysActiveInBackground: false,
                    playThroughEarpieceAndroid: false,
                });
            } catch (e) { }
        }

        // Cleanup previous speech with a generous delay
        try {
            await Speech.stop();
            await new Promise(r => setTimeout(r, 600));
        } catch (e) { }

        const onAdvance = () => {
            const nextIdx = currentIndexRef.current + 1;
            if (nextIdx < ONBOARDING_DATA.length) {
                setTimeout(() => {
                    slidesRef.current?.scrollToIndex({ index: nextIdx });
                    setTimeout(() => speakSlide(nextIdx), 800);
                }, 500);
            } else {
                setIsNarrating(false);
            }
        };

        const runSpeak = (languageToUse, stage = 0) => {
            Speech.speak(script, {
                language: languageToUse,
                pitch: 1.0,
                rate: 0.85,
                onDone: onAdvance,
                onStopped: () => setIsNarrating(false),
                onError: (err) => {
                    console.warn(`[LandingScreen] Speech Fail Stage ${stage} (${languageToUse}):`, err);

                    if (stage === 0) {
                        // Stage 1: Try broader language code
                        const secondary = lang === 'hi' ? 'hi' : 'en';
                        setTimeout(() => runSpeak(secondary, 1), 400);
                    } else if (stage === 1) {
                        // Stage 2: Ultimate fallback (system default)
                        console.log('[LandingScreen] Attempting system default speech...');
                        setTimeout(() => runSpeak(undefined, 2), 400);
                    } else {
                        setIsNarrating(false);
                    }
                },
            });
        };

        const primaryLangCode = lang === 'hi' ? 'hi-IN' : 'en-IN';
        runSpeak(primaryLangCode, 0);
    }, [lang]);


    const toggleNarration = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isNarrating) {
            Speech.stop();
            setIsNarrating(false);
        } else {
            setIsNarrating(true);
            speakSlide(currentIndexRef.current);
        }
    }, [isNarrating, speakSlide]);

    const handleRole = useCallback((roleId) => {
        Speech.stop();
        navigation.navigate('Login', { role: roleId });
    }, [navigation]);

    const ROLES = [
        { id: 'mother', icon: '🤰', enKey: 'role_mother', hiKey: 'role_mother', subKey: 'role_mother_sub', colors: designSystem.colors.cardGradientPink },
        { id: 'asha', icon: '👩‍⚕️', enKey: 'role_asha', hiKey: 'role_asha', subKey: 'role_asha_sub', colors: designSystem.colors.cardGradientBlue },
        { id: 'doctor', icon: '👨‍⚕️', enKey: 'role_doctor', hiKey: 'role_doctor', subKey: 'role_doctor_sub', colors: designSystem.colors.cardGradientPurple },
    ];

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems[0]) setCurrentIndex(viewableItems[0].index);
    }).current;
    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollToNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        }
    };

    const renderItem = ({ item }) => {
        if (item.isRoleSelection) {
            return (
                <View style={st.slide}>
                    <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} />
                    <View style={[st.slideInner, { justifyContent: 'flex-start', paddingTop: 70 }]}>
                        <View style={st.brandRow}>
                            <View style={st.logoBubble}>
                                <Text style={{ fontSize: 36 }}>🌸</Text>
                            </View>
                        </View>
                        <Text style={st.brandName}>
                            Janani<Text style={{ color: designSystem.colors.primary }}>Setu</Text>
                        </Text>
                        <Text style={st.brandTagline}>{item.headline[lang]}</Text>
                        <Text style={[st.bodyText, { marginBottom: 28 }]}>{item.body[lang]}</Text>

                        <Text style={st.selectLabel}>{t('select_role')}</Text>
                        {ROLES.map((role) => (
                            <RoleCard key={role.id} {...role} bgColors={role.colors} onPress={() => handleRole(role.id)} />
                        ))}

                        <MadeInIndiaBadge />
                    </View>
                </View>
            );
        }

        return (
            <View style={st.slide}>
                <LinearGradient colors={item.colors} style={StyleSheet.absoluteFill} locations={[0, 0.45, 1]} />

                {/* Animated shimmer background for slide 1 */}
                {item.hasVideo && (
                    <View style={st.videoBg}>
                        <Animated.View
                            style={[
                                StyleSheet.absoluteFill,
                                {
                                    backgroundColor: item.accentLight,
                                    opacity: shimmerAnim.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [0.3, 0.6, 0.3],
                                    }),
                                    transform: [{
                                        scale: shimmerAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [1, 1.1, 1],
                                        }),
                                    }],
                                },
                            ]}
                        />
                        <LinearGradient
                            colors={[item.colors[0], 'transparent', item.colors[2]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                )}

                <View style={st.slideInner}>
                    {/* Animated Counter Stat */}
                    <View style={st.statContainer}>
                        <View style={[st.statPill, { backgroundColor: item.accentLight }]}>
                            <AnimatedCounter
                                target={item.statTarget}
                                prefix={item.statPrefix}
                                suffix={item.statSuffix}
                                color={item.accent}
                            />
                            <Text style={[st.statLabel, { color: item.accent }]}>{item.statLabel[lang]}</Text>
                        </View>
                    </View>

                    {/* Hero */}
                    {item.hero}

                    {/* Headline */}
                    <Text style={[st.headline, { color: item.accent }]}>
                        {item.headline[lang]}
                    </Text>

                    {/* Body */}
                    <Text style={st.bodyText}>{item.body[lang]}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={st.container}>
            <FlatList
                data={ONBOARDING_DATA}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                scrollEventThrottle={32}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                ref={slidesRef}
            />

            {/* Bottom controls */}
            <View style={st.bottom}>
                <View style={st.paginator}>
                    {ONBOARDING_DATA.map((_, i) => {
                        const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
                        const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
                        const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
                        const dotColor = scrollX.interpolate({
                            inputRange,
                            outputRange: ['#CCC', ONBOARDING_DATA[i].accent, '#CCC'],
                            extrapolate: 'clamp',
                        });
                        return <Animated.View key={i} style={[st.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: dotColor }]} />;
                    })}
                </View>

                {currentIndex < ONBOARDING_DATA.length - 1 && (
                    <View style={st.btnRow}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                slidesRef.current.scrollToIndex({ index: ONBOARDING_DATA.length - 1 });
                            }}
                            style={st.skipBtn}
                        >
                            <Text style={st.skipText}>{lang === 'hi' ? 'छोड़ें' : 'Skip'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={scrollToNext} activeOpacity={0.85}>
                            <LinearGradient
                                colors={[ONBOARDING_DATA[currentIndex].accent, ONBOARDING_DATA[currentIndex].accent + 'CC']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={st.nextBtn}
                            >
                                <Text style={st.nextBtnText}>{lang === 'hi' ? 'आगे बढ़ें' : 'Next'}</Text>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Floating narration icon — top right */}
            <Animated.View style={[st.narrateBtn, { transform: [{ scale: narrationPulse }] }]}>
                <TouchableOpacity onPress={toggleNarration} activeOpacity={0.85}>
                    <LinearGradient
                        colors={isNarrating ? ['#FF5C8A', '#FF8FB1'] : ['#6C63FF', '#9A95FF']}
                        style={st.narrateBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MaterialCommunityIcons
                            name={isNarrating ? 'pause' : 'volume-high'}
                            size={20}
                            color="#FFF"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    slide: { width: W, height: H },
    slideInner: {
        flex: 1,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 120,
    },

    /* Animated shimmer background */
    videoBg: {
        ...StyleSheet.absoluteFillObject,
    },

    /* Animated counter stat */
    statContainer: { marginBottom: 24 },
    statPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 50,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        textAlign: 'center',
    },

    /* Headline */
    headline: {
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: 16,
        letterSpacing: -0.5,
    },

    /* Body */
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#4B5563',
        textAlign: 'center',
        paddingHorizontal: 10,
    },

    /* Bottom */
    bottom: {
        position: 'absolute',
        bottom: 0,
        width: W,
        paddingBottom: 36,
        paddingHorizontal: 28,
    },
    paginator: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipBtn: { paddingVertical: 12, paddingHorizontal: 8 },
    skipText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 50,
        gap: 8,
    },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    /* Narration button */
    narrateBtn: {
        position: 'absolute',
        top: 48,
        right: 16,
        zIndex: 100,
    },
    narrateBtnGradient: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    /* Role selection slide */
    brandRow: { marginBottom: 12 },
    logoBubble: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#FF5C8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    brandName: {
        fontSize: 34,
        fontWeight: '900',
        color: '#1F2937',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    brandTagline: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFB020',
        textAlign: 'center',
        marginBottom: 8,
    },
    selectLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        alignSelf: 'flex-start',
        marginBottom: 14,
        marginLeft: 4,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 14,
        width: W - 56,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },
    iconBubble: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    roleEn: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 2 },
    roleHi: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
    arrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* Made in India badge */
    indiaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 8,
    },
    tricolor: {
        flexDirection: 'row',
        width: 24,
        height: 16,
        borderRadius: 3,
        overflow: 'hidden',
    },
    triStripe: {
        flex: 1,
    },
    indiaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        letterSpacing: 0.5,
    },
});
