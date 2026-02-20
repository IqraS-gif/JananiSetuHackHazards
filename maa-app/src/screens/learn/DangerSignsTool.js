/**
 * DangerSignsTool.js
 * Interactive SOS checklist for emergency situations.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '../../constants';
import {
    confirmAndCallAmbulance,
    EMERGENCY_NUMBERS,
} from '../../services/emergency/EmergencyService';

const DANGER_SIGNS = [
    { id: 'ds1', text: 'तेज़ पेट दर्द / Severe abdominal pain', critical: true },
    { id: 'ds2', text: 'योनि से रक्तस्राव / Vaginal bleeding', critical: true },
    { id: 'ds3', text: 'तेज़ सिरदर्द या धुंधला दिखना / Severe headache or blurred vision', critical: true },
    { id: 'ds4', text: 'चेहरे या हाथों में अचानक सूजन / Sudden swelling of face or hands', critical: true },
    { id: 'ds5', text: 'शिशु की हलचल कम होना / Reduced baby movement', critical: true },
    { id: 'ds6', text: 'तेज़ बुखार / High fever', critical: false },
    { id: 'ds7', text: 'पानी की थैली फटना / Water breaking (Leaking fluid)', critical: true },
];

export default function DangerSignsTool() {
    const [checkedItems, setCheckedItems] = useState({});

    const toggleItem = (id) => {
        setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const hasCritical = Object.keys(checkedItems).some(
        (id) => checkedItems[id] && DANGER_SIGNS.find((ds) => ds.id === id)?.critical
    );

    const callEmergency = () => {
        confirmAndCallAmbulance();
    };

    return (
        <View style={styles.container}>
            <View style={styles.banner}>
                <Text style={styles.bannerEmoji}>📢</Text>
                <View style={styles.bannerTextContent}>
                    <Text style={styles.bannerTitle}>आपातकालीन जाँच / Emergency Checklist</Text>
                    <Text style={styles.bannerDesc}>
                        यदि इनमें से कोई भी लक्षण है, तो तुरंत डॉक्टर से संपर्क करें।
                    </Text>
                </View>
            </View>

            {DANGER_SIGNS.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.item, checkedItems[item.id] && styles.itemChecked]}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, checkedItems[item.id] && styles.checkboxChecked]}>
                        {checkedItems[item.id] && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemText, checkedItems[item.id] && styles.itemTextChecked]}>
                        {item.text}
                    </Text>
                </TouchableOpacity>
            ))}

            {hasCritical && (
                <View style={styles.warningBox}>
                    <Text style={styles.warningTitle}>
                        ⚠️ तुरंत कार्रवाई की ज़रूरत / Immediate Action Needed
                    </Text>
                    <Text style={styles.warningText}>
                        यह गंभीर संकेत हैं। कृपया तुरंत ANM, ASHA worker या नज़दीकी अस्पताल जाएँ।
                    </Text>
                </View>
            )}

            <TouchableOpacity style={styles.sosButton} onPress={callEmergency}>
                <Text style={styles.sosEmoji}>📞</Text>
                <Text style={styles.sosText}>
                    Call {EMERGENCY_NUMBERS.ambulance} (Ambulance)
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 4 },
    banner: {
        flexDirection: 'row',
        backgroundColor: `${Colors.danger}10`,
        padding: 16,
        borderRadius: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: Colors.danger,
    },
    bannerEmoji: { fontSize: 24, marginRight: 12 },
    bannerTextContent: { flex: 1 },
    bannerTitle: { fontSize: 16, fontWeight: '700', color: Colors.danger },
    bannerDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemChecked: { borderColor: Colors.danger, backgroundColor: `${Colors.danger}05` },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.border,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: { backgroundColor: Colors.danger, borderColor: Colors.danger },
    checkMark: { color: Colors.white, fontWeight: 'bold' },
    itemText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
    itemTextChecked: { fontWeight: '600', color: Colors.danger },

    warningBox: {
        backgroundColor: Colors.danger,
        padding: 16,
        borderRadius: 12,
        marginTop: 15,
        marginBottom: 20,
    },
    warningTitle: { color: Colors.white, fontWeight: '800', fontSize: 16, marginBottom: 5 },
    warningText: { color: Colors.white, fontSize: 14, lineHeight: 20 },

    sosButton: {
        flexDirection: 'row',
        backgroundColor: Colors.danger,
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    sosEmoji: { fontSize: 24, marginRight: 10 },
    sosText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
});
