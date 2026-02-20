/**
 * AnimatedHeroIcons.js
 * Rich animated storytelling scenes with image support.
 * Images render inside the animated circle with pulse rings & orbiting particles.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, Image, StyleSheet, Easing } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

/* ─── Shared: Pulsing sonar ring ───────────────────────────────────────────── */
const PulseRing = ({ color, size, delay = 0, duration = 2200 }) => {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(pulse, { toValue: 1, duration, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: size,
                borderWidth: 2,
                borderColor: color,
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
                opacity: pulse.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 0.25, 0] }),
            }}
        />
    );
};

/* ─── Shared: Floating wrapper ─────────────────────────────────────────────── */
const Float = ({ children, range = 10, duration = 2800, delay = 0 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={{ transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -range] }) }] }}>
            {children}
        </Animated.View>
    );
};

/* ─── Shared: Heartbeat scaling ────────────────────────────────────────────── */
const Heartbeat = ({ children }) => {
    const beat = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(beat, { toValue: 1.06, duration: 300, useNativeDriver: true }),
                Animated.timing(beat, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(beat, { toValue: 1.06, duration: 300, useNativeDriver: true }),
                Animated.timing(beat, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1200),
            ])
        ).start();
    }, []);
    return <Animated.View style={{ transform: [{ scale: beat }] }}>{children}</Animated.View>;
};

/* ─── Shared: Orbiting particle ────────────────────────────────────────────── */
const Orbiter = ({ color, size = 8, radius = 95, duration = 4000, delay = 0 }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate }] }]}>
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, marginTop: -radius + 85 }} />
        </Animated.View>
    );
};

const CIRCLE_SIZE = 160;

/* ══════════════════════════════════════════════════════════════════════════════
   SCENE 1 — Maternal Care (pink)
   ══════════════════════════════════════════════════════════════════════════════ */
export const MaternityHero = ({ image }) => {
    return (
        <View style={scenes.container}>
            <View style={[scenes.glow, { backgroundColor: '#FF5C8A18' }]} />
            <PulseRing color="#FF5C8A50" size={CIRCLE_SIZE} />
            <PulseRing color="#FF5C8A25" size={CIRCLE_SIZE} delay={1100} />

            <Heartbeat>
                <View style={[scenes.mainCircle, { backgroundColor: '#FF5C8A', shadowColor: '#FF5C8A' }]}>
                    {image ? (
                        <Image source={image} style={scenes.circleImage} resizeMode="cover" />
                    ) : (
                        <MaterialCommunityIcons name="mother-heart" size={56} color="#FFF" />
                    )}
                </View>
            </Heartbeat>

            <Orbiter color="#FF5C8A" size={10} radius={100} duration={5000} />
            <Orbiter color="#FFB6C8" size={7} radius={100} duration={5000} delay={2500} />

            <View style={scenes.satellites}>
                <Float range={8}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#FFEBF1', top: -20, left: -35 }]}>
                        <MaterialCommunityIcons name="heart-pulse" size={18} color="#FF5C8A" />
                    </View>
                </Float>
                <Float range={8} delay={600}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#FFEBF1', top: 50, right: -45 }]}>
                        <MaterialCommunityIcons name="baby-face-outline" size={18} color="#FF5C8A" />
                    </View>
                </Float>
                <Float range={6} delay={1200}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#FFEBF1', bottom: -15, left: -25 }]}>
                        <MaterialCommunityIcons name="hand-heart" size={18} color="#FF5C8A" />
                    </View>
                </Float>
            </View>
        </View>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   SCENE 2 — AI + ASHA (purple)
   ══════════════════════════════════════════════════════════════════════════════ */
export const AiHealthHero = ({ image }) => {
    const scanLine = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLine, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(scanLine, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={scenes.container}>
            <View style={[scenes.glow, { backgroundColor: '#6C63FF12' }]} />
            <PulseRing color="#6C63FF45" size={CIRCLE_SIZE} />
            <PulseRing color="#6C63FF20" size={CIRCLE_SIZE} delay={1100} />

            <View style={[scenes.mainCircle, { backgroundColor: '#6C63FF', shadowColor: '#6C63FF' }]}>
                {image ? (
                    <Image source={image} style={scenes.circleImage} resizeMode="cover" />
                ) : (
                    <Float range={6}>
                        <MaterialCommunityIcons name="brain" size={50} color="#FFF" />
                    </Float>
                )}
                {/* Scanning line overlay */}
                <Animated.View
                    style={[
                        scenes.scanLine,
                        {
                            transform: [{
                                translateY: scanLine.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-50, 50],
                                }),
                            }],
                        },
                    ]}
                />
            </View>

            <Orbiter color="#6C63FF" size={10} radius={100} duration={4000} />
            <Orbiter color="#9A95FF" size={7} radius={100} duration={4000} delay={2000} />

            <View style={scenes.satellites}>
                <Float range={8}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#EEEAFF', top: -25, right: -40 }]}>
                        <FontAwesome5 name="user-nurse" size={16} color="#6C63FF" />
                    </View>
                </Float>
                <Float range={7} delay={500}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#EEEAFF', bottom: -15, left: -30 }]}>
                        <MaterialCommunityIcons name="cellphone" size={18} color="#6C63FF" />
                    </View>
                </Float>
                <Float range={6} delay={900}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#EEEAFF', top: 45, left: -45 }]}>
                        <MaterialCommunityIcons name="stethoscope" size={18} color="#6C63FF" />
                    </View>
                </Float>
            </View>
        </View>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   SCENE 3 — Government Schemes (green)
   ══════════════════════════════════════════════════════════════════════════════ */
export const GovSchemesHero = ({ image }) => {
    const checkScale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.spring(checkScale, { toValue: 1, friction: 3, tension: 80, useNativeDriver: true }),
                Animated.delay(3000),
                Animated.timing(checkScale, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.delay(500),
            ])
        ).start();
    }, []);

    return (
        <View style={scenes.container}>
            <View style={[scenes.glow, { backgroundColor: '#00C89612' }]} />
            <PulseRing color="#00C89645" size={CIRCLE_SIZE} />
            <PulseRing color="#00C89620" size={CIRCLE_SIZE} delay={1100} />

            <View style={[scenes.mainCircle, { backgroundColor: '#00C896', shadowColor: '#00C896' }]}>
                {image ? (
                    <Image source={image} style={scenes.circleImage} resizeMode="cover" />
                ) : (
                    <Float range={5}>
                        <FontAwesome5 name="hands-helping" size={44} color="#FFF" />
                    </Float>
                )}
                <Animated.View style={[scenes.badge, { transform: [{ scale: checkScale }] }]}>
                    <Ionicons name="checkmark-circle" size={28} color="#00C896" />
                </Animated.View>
            </View>

            <Orbiter color="#00C896" size={10} radius={100} duration={4500} />
            <Orbiter color="#80E4CB" size={7} radius={100} duration={4500} delay={2250} />

            <View style={scenes.satellites}>
                <Float range={8}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#E0FAEE', top: -20, left: -40 }]}>
                        <MaterialCommunityIcons name="shield-check" size={18} color="#00C896" />
                    </View>
                </Float>
                <Float range={7} delay={600}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#E0FAEE', bottom: -12, right: -38 }]}>
                        <FontAwesome5 name="rupee-sign" size={16} color="#00C896" />
                    </View>
                </Float>
                <Float range={6} delay={1100}>
                    <View style={[scenes.smallBubble, { backgroundColor: '#E0FAEE', top: 48, right: -44 }]}>
                        <MaterialCommunityIcons name="file-document-outline" size={18} color="#00C896" />
                    </View>
                </Float>
            </View>
        </View>
    );
};

/* ──────────────────────────────────────────────────────────────────────────── */
const scenes = StyleSheet.create({
    container: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    glow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 120,
        transform: [{ scale: 1.6 }],
    },
    mainCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.7)',
        overflow: 'hidden',
    },
    circleImage: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
    },
    satellites: {
        ...StyleSheet.absoluteFillObject,
    },
    smallBubble: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    scanLine: {
        position: 'absolute',
        width: '80%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 1,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FFF',
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
});
