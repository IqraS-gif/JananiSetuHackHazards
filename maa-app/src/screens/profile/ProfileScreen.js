/**
 * ProfileScreen.js
 * User profile editor with:
 * - LMP → auto-calculates Pregnancy Week + Due Date
 * - Language toggle (Hindi / English)
 * - All clinical inputs in one scrollable form
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
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

export default function ProfileScreen() {
    const { t, language, setLanguage } = useT();
    const { logout } = useUser();

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
        jdy_bank: false,
        aadhaar_linked: false,
        pmmvy_claimed: '',
        jsy_registered: false,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const profile = await getUserProfile();
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
                        jdy_bank: !!profile.jdy_bank,
                        aadhaar_linked: !!profile.aadhaar_linked,
                        pmmvy_claimed: profile.pmmvy_claimed || '',
                        jsy_registered: !!profile.jsy_registered,
                    });
                }
            } catch (e) {
                console.error('[ProfileScreen] Load error:', e);
            }
        })();
    }, []);

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

    const handleSave = async () => {
        if (!form.name.trim()) {
            Alert.alert(
                t('req_title'),
                t('req_name')
            );
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
                jdy_bank: form.jdy_bank,
                aadhaar_linked: form.aadhaar_linked,
                pmmvy_claimed: form.pmmvy_claimed,
                jsy_registered: form.jsy_registered,
                language,
            });
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

            {/* ── Language Toggle ── */}
            <View style={styles.languageRow}>
                <Text style={styles.languageLabel}>
                    {t('lang_row')}
                </Text>
                <View style={[styles.languageOptions, {flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 8}]}>
                    <TouchableOpacity
                        style={[styles.langBtn, language === 'hi' && styles.langBtnActive]}
                        onPress={() => setLanguage('hi')}
                    >
                        <Text style={[styles.langBtnText, language === 'hi' && styles.langBtnTextActive]}>
                            हिन्दी
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                        onPress={() => setLanguage('en')}
                    >
                        <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                            English
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.langBtn, language === 'bilingual' && styles.langBtnActive]}
                        onPress={() => setLanguage('bilingual')}
                    >
                        <Text style={[styles.langBtnText, language === 'bilingual' && styles.langBtnTextActive]}>
                            Bilingual
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

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

            <OptionGroup setForm={setForm} value={form.state} field="state"
                label={t('label_state')}
                options={[
                    { val: 'MP', label: t('opt_mp') },
                    { val: 'UP', label: t('opt_up') },
                    { val: 'Bihar', label: t('opt_bihar') },
                    { val: 'Other', label: t('opt_other') }
                ]}
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
                label={t('label_husband_num')}
                value={form.husband_contact} field="husband_contact" keyboardType="phone-pad"
            />
            <Field setForm={setForm}
                label={t('label_phc_num')}
                value={form.phc_contact} field="phc_contact" keyboardType="phone-pad"
            />
            <Field setForm={setForm}
                label={t('label_asha_num')}
                value={form.asha_contact} field="asha_contact" keyboardType="phone-pad"
            />
            <Field setForm={setForm}
                label={t('label_emergency_num')}
                value={form.emergency_contact} field="emergency_contact" keyboardType="phone-pad"
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
