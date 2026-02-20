import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    Animated,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

export default function QrScannerRegister({ navigation }) {
    const { language } = useLanguage();
    const isHindi = language === 'hi';

    const [scanning, setScanning] = useState(true);
    const [scannedData, setScannedData] = useState(null);
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (scanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                ])
            ).start();

            // Simulate a successful scan after 3 seconds
            const timer = setTimeout(() => {
                handleScan();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [scanning]);

    const handleScan = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScanning(false);
        setScannedData({
            name: 'Priya Sharma',
            id: 'ABHA-1234-5678',
            scheme: 'PMMVY (Pradhan Mantri Matru Vandana Yojana)',
            status: 'Verified from Aadhaar',
            benefit: '₹5,000 Installment 2',
        });
    };

    const resetScan = () => {
        setScanning(true);
        setScannedData(null);
    };

    return (
        <SafeAreaView style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={st.headerTitle}>{isHindi ? 'जीरो-टाइपिंग रजिस्टर' : 'Zero-Typing Register'}</Text>
            </View>

            {scanning ? (
                <View style={st.scannerContainer}>
                    <View style={st.scannerFrame}>
                        <View style={[st.corner, st.topLeft]} />
                        <View style={[st.corner, st.topRight]} />
                        <View style={[st.corner, st.bottomLeft]} />
                        <View style={[st.corner, st.bottomRight]} />

                        <Animated.View
                            style={[
                                st.scanLine,
                                {
                                    transform: [{
                                        translateY: scanLineAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [10, 240]
                                        })
                                    }]
                                }
                            ]}
                        />
                    </View>
                    <Text style={st.scanningText}>
                        {isHindi ? 'मरीज का QR कोड या पोर्टल फॉर्म स्कैन करें' : 'Scan patient QR or Portal Form'}
                    </Text>
                    <View style={st.overlayInfo}>
                        <MaterialCommunityIcons name="flash" size={20} color="#FFF" />
                        <Text style={st.overlayText}>{isHindi ? 'ऑटो-फिल सक्रिय है' : 'Auto-fill Active'}</Text>
                    </View>
                </View>
            ) : (
                <View style={st.resultContainer}>
                    <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={st.resultCard}>
                        <View style={st.successHeader}>
                            <View style={st.successCircle}>
                                <MaterialCommunityIcons name="check-decagram" size={40} color="#10B981" />
                            </View>
                            <Text style={st.successTitle}>{isHindi ? 'सफलतापूर्वक सत्यापित' : 'Verified Successfully'}</Text>
                            <Text style={st.successSubtitle}>{isHindi ? 'फॉर्म अपने आप भर गया है' : 'Form has been auto-filled'}</Text>
                        </View>

                        <View style={st.detailsList}>
                            <DetailItem label={isHindi ? 'नाम' : 'Name'} value={scannedData?.name} />
                            <DetailItem label={isHindi ? 'ABHA आईडी' : 'ABHA ID'} value={scannedData?.id} />
                            <DetailItem label={isHindi ? 'योजना' : 'Scheme'} value={scannedData?.scheme} />
                            <DetailItem label={isHindi ? 'स्थिति' : 'Status'} value={scannedData?.status} />
                            <DetailItem label={isHindi ? 'लाभ' : 'Benefit'} value={scannedData?.benefit} />
                        </View>

                        <TouchableOpacity style={st.submitBtn}>
                            <Text style={st.submitBtnText}>{isHindi ? 'फॉर्म जमा करें' : 'Submit Form'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={resetScan} style={st.reScanBtn}>
                            <Text style={st.reScanText}>{isHindi ? 'दोबारा स्कैन करें' : 'Scan Another'}</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            )}
        </SafeAreaView>
    );
}

function DetailItem({ label, value }) {
    return (
        <View style={st.detailItem}>
            <Text style={st.detailLabel}>{label}</Text>
            <Text style={st.detailValue}>{value}</Text>
        </View>
    );
}

const st = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
    },
    backBtn: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
    },
    scannerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: 260,
        height: 260,
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#10B981',
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderBottomWidth: 0,
        borderRightWidth: 0,
        borderTopLeftRadius: 24,
    },
    topRight: {
        top: 0,
        right: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopRightRadius: 24,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomLeftRadius: 24,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomRightRadius: 24,
    },
    scanLine: {
        height: 3,
        width: '90%',
        backgroundColor: '#10B981',
        alignSelf: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    scanningText: {
        color: '#94A3B8',
        marginTop: 40,
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    overlayInfo: {
        position: 'absolute',
        bottom: 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    overlayText: {
        color: '#10B981',
        fontWeight: '700',
        fontSize: 12,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    resultCard: {
        flex: 1,
        padding: 24,
    },
    successHeader: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 32,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10B98115',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    successSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    detailsList: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        gap: 20,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'right',
        maxWidth: '65%',
    },
    submitBtn: {
        backgroundColor: '#10B981',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 4,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    reScanBtn: {
        marginTop: 20,
        paddingVertical: 12,
        alignItems: 'center',
    },
    reScanText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    }
});
