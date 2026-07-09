/**
 * ProfileScreen.js
 * User profile editor with:
 * - LMP → auto-calculates Pregnancy Week + Due Date
 * - Language toggle (Hindi / English)
 * - All clinical inputs in one scrollable form
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors, Dimensions } from '../../constants';
import { useUser } from '../../context/UserContext';
import { useT } from '../../i18n/useT';
import { getUserProfile, saveUserProfile } from '../../services/database/DatabaseService';
import * as Location from 'expo-location';

// ── Clinical Helpers ──────────────────────────────────────────────

/** Derive pregnancy week from LMP date string (YYYY-MM-DD) */
function weekFromLMP(lmpString) {
    if (!lmpString || !/^\d{4}-\d{2}-\d{2}$/.test(lmpString)) return null;
    const lmp = new Date(lmpString);
    if (isNaN(lmp.getTime())) return null;
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.floor((Date.now() - lmp.getTime()) / msPerWeek);
    return week > 0 && week <= 42 ? week : null;
}

/** Derive due date from LMP date string (LMP + 280 days) */
function dueDateFromLMP(lmpString) {
    if (!lmpString || !/^\d{4}-\d{2}-\d{2}$/.test(lmpString)) return '';
    const lmp = new Date(lmpString);
    if (isNaN(lmp.getTime())) return '';
    const due = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    return due.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Main Component ─────────────────────────────────────────────────

const Field = ({ label, value, field, keyboardType = 'default', placeholder, onChange, setForm }) => (
    <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
            style={styles.input}
            value={value}
            placeholder={placeholder || label}
            placeholderTextColor={Colors.textLight}
            keyboardType={keyboardType}
            onChangeText={onChange || ((text) => setForm((prev) => ({ ...prev, [field]: text })))}
            cursorColor={Colors.primary}
            textAlignVertical="center"
        />
    </View>
);

const OptionGroup = ({ label, options, value, field, setForm }) => (
    <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map((opt) => (
                <TouchableOpacity
                    key={String(opt.val)}
                    style={[
                        styles.langBtn,
                        value === opt.val && styles.langBtnActive,
                        { marginBottom: 4 }
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, [field]: opt.val }))}
                >
                    <Text style={[
                        styles.langBtnText,
                        value === opt.val && styles.langBtnTextActive
                    ]}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const SARVAM_LANGUAGES = [
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
    { code: 'en', label: 'English', sub: 'English' },
    { code: 'bilingual', label: 'हिन्दी + English', sub: 'Bilingual Hinglish' },
    { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
    { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
    { code: 'mr', label: 'मराठी', sub: 'Marathi' },
    { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
    { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
    { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
    { code: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
    { code: 'or', label: 'ଓଡ଼ିଆ', sub: 'Odia' }
];

export default function ProfileScreen() {
    const { t, language, setLanguage } = useT();
    const { user, logout } = useUser();

    const [form, setForm] = useState({
        name: '',
        age: '',
        lmp_date: '',
        due_date: '',
        pregnancy_week: '',
        height_cm: '',
        start_weight_kg: '',
        current_weight_kg: '',
        asha_contact: '',
        emergency_contact: '',
        husband_contact: '',
        phc_contact: '',
        ration_category: '',
        nfsa_status: false,
        state: '',
        district: '',
        jdy_bank: false,
        aadhaar_linked: false,
        pmmvy_claimed: '',
        jsy_registered: false,
        dialect: 'standard',
    });
    const [saving, setSaving] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const profile = await getUserProfile(user?.id || 'user_001');
                if (profile) {
                    setForm({
                        name: profile.name || '',
                        age: profile.age?.toString() || '',
                        lmp_date: profile.lmp_date || '',
                        due_date: profile.due_date || '',
                        pregnancy_week: profile.pregnancy_week?.toString() || '',
                        height_cm: profile.height_cm?.toString() || '',
                        start_weight_kg: profile.start_weight_kg?.toString() || '',
                        current_weight_kg: profile.current_weight_kg?.toString() || '',
                        asha_contact: profile.asha_contact || '',
                        emergency_contact: profile.emergency_contact || '',
                        husband_contact: profile.husband_contact || '',
                        phc_contact: profile.phc_contact || '',
                        ration_category: profile.ration_category || '',
                        nfsa_status: !!profile.nfsa_status,
                        state: profile.state || '',
                        district: profile.district || '',
                        jdy_bank: !!profile.jdy_bank,
                        aadhaar_linked: !!profile.aadhaar_linked,
                        pmmvy_claimed: profile.pmmvy_claimed || '',
                        jsy_registered: !!profile.jsy_registered,
                        dialect: profile.dialect || 'standard',
                    });
                }
            } catch (e) {
                console.error('[ProfileScreen] Load error:', e);
            }
        })();
    }, [user?.id]);

    /** When LMP changes, auto-derive week and due date */
    const handleLMPChange = useCallback((lmp) => {
        const week = weekFromLMP(lmp);
        const due = dueDateFromLMP(lmp);
        setForm((prev) => ({
            ...prev,
            lmp_date: lmp,
            pregnancy_week: week ? String(week) : prev.pregnancy_week,
            due_date: due || prev.due_date,
        }));
    }, []);

    const [locating, setLocating] = useState(false);

    const handlePinLocation = async () => {
        setLocating(true);
        try {
            console.log('[GPS Pin] Requesting permission...');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    language === 'hi' ? 'अनुमति अस्वीकृत' : 'Permission Denied',
                    language === 'hi'
                        ? 'कृपया स्थान का पता लगाने के लिए स्थान अनुमति प्रदान करें।'
                        : 'Please grant location permissions to auto-detect your region.'
                );
                return;
            }

            console.log('[GPS Pin] Fetching coordinates...');
            
            // 1. Try last known position first (instant, doesn't hang in emulators/offline)
            let location = await Location.getLastKnownPositionAsync({});
            
            if (!location) {
                console.log('[GPS Pin] No last known position. Requesting fresh position with 6-second timeout...');
                const positionPromise = Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                
                // Timeout after 6 seconds to avoid hanging indefinitely if GPS services or satellites fail
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('GPS_TIMEOUT')), 6000)
                );
                
                location = await Promise.race([positionPromise, timeoutPromise]);
            }

            console.log('[GPS Pin] Reverse geocoding coordinates...', location.coords);
            const reverse = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverse && reverse.length > 0) {
                const address = reverse[0];
                const state = address.region || '';
                const district = address.subregion || address.district || address.city || '';
                
                console.log('[GPS Pin] Geocoded location:', { state, district });

                // Map state to dialect and language
                let resolvedDialect = 'standard';
                let resolvedLanguage = language;
                const lowerState = state.toLowerCase();
                if (lowerState.includes('bihar')) {
                    resolvedDialect = 'bihari';
                    resolvedLanguage = 'hi';
                } else if (lowerState.includes('haryan')) {
                    resolvedDialect = 'haryanvi';
                    resolvedLanguage = 'hi';
                } else if (lowerState.includes('uttar pradesh') || lowerState.includes('up')) {
                    resolvedDialect = 'bihari'; // Eastern UP / Bihar matches Bihari dialect prompt
                    resolvedLanguage = 'hi';
                } else if (lowerState.includes('maharashtra')) {
                    resolvedLanguage = 'mr'; // Marathi
                } else if (lowerState.includes('gujarat')) {
                    resolvedLanguage = 'gu'; // Gujarati
                } else if (lowerState.includes('bengal')) {
                    resolvedLanguage = 'bn'; // Bengali
                } else if (lowerState.includes('karnataka')) {
                    resolvedLanguage = 'kn'; // Kannada
                } else if (lowerState.includes('kerala')) {
                    resolvedLanguage = 'ml'; // Malayalam
                } else if (lowerState.includes('tamil')) {
                    resolvedLanguage = 'ta'; // Tamil
                } else if (lowerState.includes('andhra') || lowerState.includes('telangana')) {
                    resolvedLanguage = 'te'; // Telugu
                } else if (lowerState.includes('punjab')) {
                    resolvedLanguage = 'pa'; // Punjabi
                } else if (lowerState.includes('odia') || lowerState.includes('orissa') || lowerState.includes('odisha')) {
                    resolvedLanguage = 'or'; // Odia
                } else if (lowerState.includes('delhi') || lowerState.includes('madhya pradesh') || lowerState.includes('mp') || lowerState.includes('rajasthan')) {
                    resolvedLanguage = 'hi';
                }

                if (resolvedLanguage && resolvedLanguage !== language) {
                    await setLanguage(resolvedLanguage);
                }

                setForm(prev => ({
                    ...prev,
                    state: state || prev.state,
                    district: district || prev.district,
                    dialect: resolvedDialect,
                }));

                const alertTitle = language === 'hi' ? 'सफलतापूर्वक पिन किया गया!' : 'Location Pinned Successfully!';
                const alertMsg = language === 'hi'
                    ? `स्थान: ${district}, ${state}\nक्षेत्रीय बोली: ${
                        resolvedDialect === 'bihari' ? 'बिहारी' : resolvedDialect === 'haryanvi' ? 'हरियाणवी' : 'मानक हिन्दी'
                      }`
                    : `Location: ${district}, ${state}\nDialect Accent: ${
                        resolvedDialect === 'bihari' ? 'Bihari' : resolvedDialect === 'haryanvi' ? 'Haryanvi' : 'Standard'
                      }`;

                Alert.alert(alertTitle, alertMsg);
            } else {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error',
                    language === 'hi' ? 'स्थान का पता नहीं चल पाया।' : 'Could not resolve physical address from coordinates.'
                );
            }
        } catch (e) {
            console.error('[GPS Pin] Error:', e);
            if (e.message === 'GPS_TIMEOUT') {
                Alert.alert(
                    language === 'hi' ? 'जीपीएस टाइमआउट (GPS Timeout)' : 'GPS Timeout',
                    language === 'hi'
                        ? 'ताज़ा जीपीएस स्थान नहीं मिल पाया। कृपया सुनिश्चित करें कि स्थान सेवाएँ चालू हैं, या हाथ से अपना राज्य और ज़िला भरें।'
                        : 'Could not get a fresh GPS lock. Please make sure location services are enabled on your device, or manually enter your State & District.'
                );
            } else {
                Alert.alert(
                    language === 'hi' ? 'त्रुटि' : 'Error',
                    language === 'hi' ? 'जीपीएस से स्थान प्राप्त करने में समस्या आई।' : 'Failed to retrieve location via GPS.'
                );
            }
        } finally {
            setLocating(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            Alert.alert(
                t('req_title'),
                t('req_name')
            );
            return;
        }

        if (form.husband_contact && form.husband_contact.length !== 10) {
            Alert.alert(t('error_title'), language === 'hi' ? 'पति का नंबर 10 अंकों का होना चाहिए।' : "Husband's phone number must be exactly 10 digits.");
            return;
        }
        if (form.asha_contact && form.asha_contact.length !== 10) {
            Alert.alert(t('error_title'), language === 'hi' ? 'आशा कार्यकर्ता का नंबर 10 अंकों का होना चाहिए।' : "ASHA worker's phone number must be exactly 10 digits.");
            return;
        }
        if (form.phc_contact && form.phc_contact.length !== 10) {
            Alert.alert(t('error_title'), language === 'hi' ? 'PHC नंबर 10 अंकों का होना चाहिए।' : "PHC phone number must be exactly 10 digits.");
            return;
        }
        if (form.emergency_contact && form.emergency_contact.length !== 10) {
            Alert.alert(t('error_title'), language === 'hi' ? 'आपातकालीन नंबर 10 अंकों का होना चाहिए।' : "Emergency contact number must be exactly 10 digits.");
            return;
        }

        setSaving(true);
        try {
            await saveUserProfile({
                name: form.name.trim(),
                age: parseInt(form.age, 10) || null,
                lmp_date: form.lmp_date || null,
                due_date: form.due_date || null,
                pregnancy_week: parseInt(form.pregnancy_week, 10) || null,
                height_cm: parseFloat(form.height_cm) || null,
                start_weight_kg: parseFloat(form.start_weight_kg) || null,
                current_weight_kg: parseFloat(form.current_weight_kg) || null,
                asha_contact: form.asha_contact || null,
                emergency_contact: form.emergency_contact || null,
                husband_contact: form.husband_contact || null,
                phc_contact: form.phc_contact || null,
                ration_category: form.ration_category,
                nfsa_status: form.nfsa_status,
                state: form.state,
                district: form.district,
                jdy_bank: form.jdy_bank,
                aadhaar_linked: form.aadhaar_linked,
                pmmvy_claimed: form.pmmvy_claimed,
                jsy_registered: form.jsy_registered,
                dialect: form.dialect || 'standard',
                language,
            }, user?.id || 'user_001');
            Alert.alert(
                t('saved_title'),
                t('profile_saved')
            );
        } catch (e) {
            console.error('[ProfileScreen] Save error:', e);
            Alert.alert(t('error_title'), t('something_wrong'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.pageTitle}>
                {t('profile')}
            </Text>

            {/* ── Language Selector ── */}
            <TouchableOpacity 
                style={styles.languageSelectRow} 
                onPress={() => setLangModalVisible(true)}
                activeOpacity={0.8}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.languageSelectLabel}>
                        {language === 'hi' ? "ऐप की भाषा / Language" : "App Language"}
                    </Text>
                    <Text style={styles.languageSelectValue}>
                        {SARVAM_LANGUAGES.find(l => l.code === language)?.label || 'Bilingual'} ({SARVAM_LANGUAGES.find(l => l.code === language)?.sub || 'Bilingual Hinglish'})
                    </Text>
                </View>
                <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Language Modal */}
            <Modal
                visible={langModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setLangModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Language / भाषा चुनें</Text>
                            <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.langGrid}>
                            {SARVAM_LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.langGridItem,
                                        language === lang.code && styles.langGridItemActive
                                    ]}
                                    onPress={async () => {
                                        await setLanguage(lang.code);
                                        setLangModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.langGridLabel,
                                        language === lang.code && styles.langGridLabelActive
                                    ]}>
                                        {lang.label}
                                    </Text>
                                    <Text style={[
                                        styles.langGridSub,
                                        language === lang.code && styles.langGridSubActive
                                    ]}>
                                        {lang.sub}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Dialect Selector ── */}
            {language === 'hi' || language === 'bilingual' ? (
                <OptionGroup
                    setForm={setForm}
                    value={form.dialect}
                    field="dialect"
                    label={language === 'hi' ? "क्षेत्रीय बोली / लहजा (Regional Dialect)" : "Regional Dialect / Accent"}
                    options={[
                        { val: 'standard', label: language === 'hi' ? 'मानक हिन्दी (Standard)' : 'Standard Hindi' },
                        { val: 'bihari', label: language === 'hi' ? 'बिहारी लहजा (Bihari)' : 'Bihari Accent' },
                        { val: 'haryanvi', label: language === 'hi' ? 'हरियाणवी लहजा (Haryanvi)' : 'Haryanvi Accent' }
                    ]}
                />
            ) : null}

            {/* ── Personal Info ── */}
            <Text style={styles.sectionTitle}>
                {t('personal_info')}
            </Text>
            <Field setForm={setForm}
                label={t('label_name')}
                value={form.name} field="name"
                placeholder={t('ph_name')}
            />
            <Field setForm={setForm}
                label={t('label_age')}
                value={form.age} field="age" keyboardType="numeric"
            />
            <Field setForm={setForm}
                label={t('label_height')}
                value={form.height_cm} field="height_cm" keyboardType="numeric"
            />

            {/* ── Pregnancy Details ── */}
            <Text style={styles.sectionTitle}>
                {t('preg_details')}
            </Text>

            <Field setForm={setForm}
                label={t('label_lmp')}
                value={form.lmp_date}
                placeholder="YYYY-MM-DD"
                onChange={handleLMPChange}
            />

            {/* Auto-derived read-only display */}
            {form.pregnancy_week ? (
                <View style={styles.derivedRow}>
                    <Text style={styles.derivedLabel}>
                        {t('auto_preg_week')}
                    </Text>
                    <Text style={styles.derivedValue}>
                        {t('auto_preg_week_val', { week: form.pregnancy_week })}
                    </Text>
                </View>
            ) : null}
            {form.due_date ? (
                <View style={styles.derivedRow}>
                    <Text style={styles.derivedLabel}>
                        {t('auto_due_date')}
                    </Text>
                    <Text style={styles.derivedValue}>{form.due_date}</Text>
                </View>
            ) : null}

            <Field setForm={setForm}
                label={t('label_start_weight')}
                value={form.start_weight_kg} field="start_weight_kg" keyboardType="numeric"
            />
            <Field setForm={setForm}
                label={t('label_current_weight')}
                value={form.current_weight_kg} field="current_weight_kg" keyboardType="numeric"
            />

            {/* ── Household & Entitlements ── */}
            <Text style={styles.sectionTitle}>
                {t('entitlements')}
            </Text>

            <OptionGroup setForm={setForm} value={form.ration_category} field="ration_category"
                label={t('label_ration')}
                options={[
                    { val: 'APL', label: t('opt_apl') },
                    { val: 'BPL', label: t('opt_bpl') },
                    { val: 'AAY', label: t('opt_aay') },
                    { val: 'None', label: t('opt_none') }
                ]}
            />

            <OptionGroup setForm={setForm} value={form.nfsa_status} field="nfsa_status"
                label={t('label_nfsa')}
                options={[{ val: true, label: t('opt_yes') }, { val: false, label: t('opt_no') }]}
            />

            {/* ── Location Details ── */}
            <Text style={styles.sectionTitle}>
                📍 {language === 'hi' ? "स्थान एवं जीपीएस (Location & GPS)" : "Location & GPS"}
            </Text>

            <View style={styles.locationContainer}>
                <TouchableOpacity
                    style={[styles.pinBtn, locating && styles.pinBtnDisabled]}
                    onPress={handlePinLocation}
                    disabled={locating}
                >
                    {locating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.pinBtnText}>
                            📍 {language === 'hi' ? "जीपीएस से स्थान पिन करें" : "Pin Location via GPS"}
                        </Text>
                    )}
                </TouchableOpacity>

                {form.state || form.district ? (
                    <View style={styles.detectedBox}>
                        <Text style={styles.detectedText}>
                            {language === 'hi' ? "पिन किया गया स्थान:" : "Pinned Location:"}
                        </Text>
                        <Text style={styles.detectedValue}>
                            {form.district ? `${form.district}, ` : ''}{form.state || 'Unknown'}
                        </Text>
                    </View>
                ) : null}
            </View>

            <Field setForm={setForm}
                label={language === 'hi' ? "राज्य (State)" : "State"}
                value={form.state} field="state"
                placeholder={language === 'hi' ? "उदा. Bihar, Haryana" : "e.g. Bihar, Haryana"}
            />

            <Field setForm={setForm}
                label={language === 'hi' ? "ज़िला (District)" : "District"}
                value={form.district} field="district"
                placeholder={language === 'hi' ? "उदा. Patna, Rohtak" : "e.g. Patna, Rohtak"}
            />

            <OptionGroup setForm={setForm} value={form.aadhaar_linked} field="aadhaar_linked"
                label={t('label_aadhaar')}
                options={[{ val: true, label: t('opt_yes') }, { val: false, label: t('opt_no') }]}
            />

            <OptionGroup setForm={setForm} value={form.jdy_bank} field="jdy_bank"
                label={t('label_jdy')}
                options={[{ val: true, label: t('opt_yes') }, { val: false, label: t('opt_no') }]}
            />

            <OptionGroup setForm={setForm} value={form.pmmvy_claimed} field="pmmvy_claimed"
                label={t('label_pmmvy')}
                options={[
                    { val: 'None', label: t('opt_not_rec') },
                    { val: 'Installment 1', label: t('opt_inst_1') },
                    { val: '1+2', label: t('opt_inst_1_2') },
                    { val: 'All 3', label: t('opt_inst_all') }
                ]}
            />

            <OptionGroup setForm={setForm} value={form.jsy_registered} field="jsy_registered"
                label={t('label_jsy')}
                options={[{ val: true, label: t('opt_yes') }, { val: false, label: t('opt_no') }]}
            />

            {/* ── Emergency Contacts ── */}
            <Text style={styles.sectionTitle}>
                {t('emergency_contacts')}
            </Text>
            <Field setForm={setForm}
                label={t('label_husband_num') + " (10 digits)"}
                value={form.husband_contact} field="husband_contact" keyboardType="phone-pad"
                onChange={(txt) => setForm(prev => ({ ...prev, husband_contact: txt.replace(/[^0-9]/g, '').slice(0, 10) }))}
            />
            <Field setForm={setForm}
                label={t('label_phc_num') + " (10 digits)"}
                value={form.phc_contact} field="phc_contact" keyboardType="phone-pad"
                onChange={(txt) => setForm(prev => ({ ...prev, phc_contact: txt.replace(/[^0-9]/g, '').slice(0, 10) }))}
            />
            <Field setForm={setForm}
                label={t('label_asha_num') + " (10 digits)"}
                value={form.asha_contact} field="asha_contact" keyboardType="phone-pad"
                onChange={(txt) => setForm(prev => ({ ...prev, asha_contact: txt.replace(/[^0-9]/g, '').slice(0, 10) }))}
            />
            <Field setForm={setForm}
                label={t('label_emergency_num') + " (10 digits)"}
                value={form.emergency_contact} field="emergency_contact" keyboardType="phone-pad"
                onChange={(txt) => setForm(prev => ({ ...prev, emergency_contact: txt.replace(/[^0-9]/g, '').slice(0, 10) }))}
            />

            {/* ── Save ── */}
            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
            >
                <Text style={styles.saveBtnText}>
                    {saving ? t('saving') : t('save_btn')}
                </Text>
            </TouchableOpacity>

            {/* ── Logout ── */}
            <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                    Alert.alert(
                        t('logout'),
                        t('logout_msg'),
                        [
                            { text: t('no'), style: 'cancel' },
                            { text: t('yes'), onPress: logout, style: 'destructive' }
                        ]
                    );
                }}
            >
                <Text style={styles.logoutBtnText}>
                    {t('btn_logout')}
                </Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Dimensions.screenPadding, paddingTop: 50 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },

    // Language toggle
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.cardBackground,
        padding: 14,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 20,
    },
    languageLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
    languageOptions: { flexDirection: 'row', gap: 8 },
    langBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    langBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    langBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
    langBtnTextActive: { color: Colors.white },

    // Section
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 12,
        marginTop: 8,
    },

    // Fields
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    // Auto-derived rows
    derivedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${Colors.success}15`,
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        gap: 8,
    },
    derivedLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
    derivedValue: { fontSize: 15, fontWeight: '700', color: Colors.success },

    // Location details
    locationContainer: {
        marginBottom: 16,
        gap: 10,
    },
    pinBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    pinBtnDisabled: {
        opacity: 0.6,
    },
    pinBtnText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    detectedBox: {
        backgroundColor: `${Colors.primary}12`,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: `${Colors.primary}30`,
    },
    detectedText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    detectedValue: {
        fontSize: 16,
        color: Colors.textPrimary,
        fontWeight: '700',
    },

    // Language select row
    languageSelectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBackground,
        padding: 16,
        borderRadius: Dimensions.borderRadius,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    languageSelectLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: 4,
    },
    languageSelectValue: {
        fontSize: 16,
        color: Colors.textPrimary,
        fontWeight: '700',
    },
    dropdownArrow: {
        fontSize: 16,
        color: Colors.textSecondary,
        paddingHorizontal: 8,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    modalCloseText: {
        fontSize: 22,
        color: Colors.textSecondary,
        padding: 4,
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 20,
    },
    langGridItem: {
        width: '48%',
        backgroundColor: Colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
        minHeight: 80,
    },
    langGridItemActive: {
        backgroundColor: `${Colors.primary}12`,
        borderColor: Colors.primary,
    },
    langGridLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 2,
    },
    langGridLabelActive: {
        color: Colors.primary,
    },
    langGridSub: {
        fontSize: 11,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
    },
    langGridSubActive: {
        color: Colors.primary,
    },

    // Save button
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Dimensions.borderRadius,
        padding: 18,
        alignItems: 'center',
        marginTop: 16,
        elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },

    // Logout button
    logoutBtn: {
        marginTop: 24,
        padding: 18,
        borderRadius: Dimensions.borderRadius,
        borderWidth: 2,
        borderColor: Colors.danger,
        alignItems: 'center',
    },
    logoutBtnText: {
        color: Colors.danger,
        fontSize: 18,
        fontWeight: '800',
    },
});
