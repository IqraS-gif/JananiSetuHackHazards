/**
 * BabyCareTool.js
 * Hospital bag prep checklist, newborn vaccine schedule, and care tips.
 * Uses prep_checklist, vaccine_schedule, newborn_care_tips from learn_content.json
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

const topic = content.topics.find((t) => t.id === 'baby_care');
const prepChecklist = topic?.prep_checklist || [];
const vaccineSchedule = topic?.vaccine_schedule || [];
const careTips = topic?.newborn_care_tips || [];

const TABS = [
    { id: 'bag', label: '🎒 Bag Prep' },
    { id: 'vaccines', label: '💉 Vaccines' },
    { id: 'tips', label: '👶 Care Tips' },
];

// Group prep checklist by category
function groupByCategory(items) {
    return items.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});
}

export default function BabyCareTool() {
    const [tab, setTab] = useState('bag');
    const [checked, setChecked] = useState({});
    const [expanded, setExpanded] = useState(null);

    const grouped = groupByCategory(prepChecklist);
    const totalItems = prepChecklist.length;
    const checkedCount = Object.values(checked).filter(Boolean).length;

    return (
        <View style={styles.container}>
            {/* Tabs */}
            <View style={styles.tabRow}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
                        onPress={() => { setTab(t.id); setExpanded(null); }}
                    >
                        <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Hospital Bag Checklist */}
            {tab === 'bag' && (
                <View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(checkedCount / Math.max(totalItems, 1)) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>{checkedCount}/{totalItems} items packed</Text>
                    {Object.entries(grouped).map(([cat, items]) => (
                        <View key={cat} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                            {items.map((item, i) => {
                                const key = `${cat}_${i}`;
                                const isDone = !!checked[key];
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.checkItem, isDone && styles.checkItemDone]}
                                        onPress={() => setChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                                            {isDone && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <View style={styles.checkTextWrap}>
                                            <Text style={[styles.checkText, isDone && styles.checkTextDone]}>
                                                {item.itemHi}
                                            </Text>
                                            {item.tipHi ? <Text style={styles.checkTip}>{item.tipHi}</Text> : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </View>
            )}

            {/* Vaccine Schedule */}
            {tab === 'vaccines' && (
                <View>
                    {vaccineSchedule.map((v, i) => (
                        <View key={i} style={styles.vaccineCard}>
                            <View style={styles.vaccineLeft}>
                                <Text style={styles.vaccineTime}>{v.scheduleEn || v.scheduleHi}</Text>
                            </View>
                            <View style={styles.vaccineRight}>
                                <Text style={styles.vaccineName}>{v.vaccineNameEn || v.vaccineNameHi}</Text>
                                {v.protectsAgainstEn ? (
                                    <Text style={styles.vaccineProtects}>
                                        Protects against: {v.protectsAgainstEn}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Care Tips */}
            {tab === 'tips' && (
                <View>
                    {careTips.map((tip, i) => {
                        const isOpen = expanded === i;
                        return (
                            <TouchableOpacity
                                key={i}
                                style={styles.tipCard}
                                onPress={() => setExpanded(isOpen ? null : i)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.tipHeader}>
                                    <Text style={styles.tipEmoji}>{tip.emoji || '👶'}</Text>
                                    <Text style={styles.tipTitle}>{tip.titleHi}</Text>
                                    <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                                </View>
                                {isOpen && (
                                    <View style={styles.tipDetail}>
                                        <Text style={styles.tipBody}>{tip.bodyHi}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingBottom: 8 },
    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    tabBtn: {
        flex: 1, paddingVertical: 10, paddingHorizontal: 4,
        borderRadius: 12, alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBackground,
    },
    tabBtnActive: { borderColor: Colors.info, backgroundColor: `${Colors.info}12` },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
    tabBtnTextActive: { color: Colors.info },

    progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: 8, backgroundColor: Colors.success, borderRadius: 4 },
    progressLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, textAlign: 'right' },

    categorySection: { marginBottom: 12 },
    categoryTitle: { fontSize: 13, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', marginBottom: 6 },
    checkItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: Colors.cardBackground, padding: 12,
        borderRadius: 12, marginBottom: 6,
        borderWidth: 1, borderColor: Colors.border,
    },
    checkItemDone: { borderColor: Colors.success, opacity: 0.75 },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        borderColor: Colors.border, marginRight: 12, marginTop: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    checkmark: { color: Colors.white, fontWeight: '800', fontSize: 13 },
    checkTextWrap: { flex: 1 },
    checkText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
    checkTextDone: { textDecorationLine: 'line-through', color: Colors.textLight },
    checkTip: { fontSize: 12, color: Colors.textLight, marginTop: 3, fontStyle: 'italic' },

    vaccineCard: {
        flexDirection: 'row', backgroundColor: Colors.cardBackground,
        borderRadius: 12, marginBottom: 8, overflow: 'hidden',
        borderWidth: 1, borderColor: Colors.border,
    },
    vaccineLeft: {
        backgroundColor: Colors.info, width: 76,
        padding: 12, alignItems: 'center', justifyContent: 'center',
    },
    vaccineTime: { color: Colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    vaccineRight: { flex: 1, padding: 12 },
    vaccineName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
    vaccineProtects: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },

    tipCard: {
        backgroundColor: Colors.cardBackground, borderRadius: Dimensions.borderRadius,
        marginBottom: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    },
    tipHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    tipEmoji: { fontSize: 24, marginRight: 12 },
    tipTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    chevron: { fontSize: 12, color: Colors.textLight },
    tipDetail: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: Colors.border },
    tipBody: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
});
