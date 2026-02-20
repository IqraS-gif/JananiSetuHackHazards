/**
 * TopicDetailScreen.js
 * Screen to display articles, checklists, and interactive tools for a specific topic
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import content from '../../../learn_content.json';
import BabyCareTool from './BabyCareTool';
import BreastfeedingTool from './BreastfeedingTool';
import BreathingTool from './BreathingTool';
import DangerSignsTool from './DangerSignsTool';
import ExerciseTool from './ExerciseTool';
import NutritionTool from './NutritionTool';
import SupplementsTool from './SupplementsTool';
import WeightGainTool from './WeightGainTool';

const META = content.meta || {};

const TABS = [
    { id: 'articles', hi: 'लेख', en: 'Articles' },
    { id: 'checklist', hi: 'चेकलिस्ट', en: 'Checklist' },
    { id: 'tools', hi: 'टूल', en: 'Tools' },
];

export default function TopicDetailScreen({ route, navigation }) {
    const { topicId } = route.params;
    const [activeTab, setActiveTab] = useState('articles');
    const [expandedArticle, setExpandedArticle] = useState(null);

    const topic = content.topics.find(t => t.id === topicId);

    if (!topic) {
        return (
            <View style={styles.center}>
                <Text>Topic not found</Text>
            </View>
        );
    }

    const renderArticles = () => (
        <View style={styles.tabContent}>
            {topic.articles.map((article) => (
                <View key={article.id} style={styles.articleCard}>
                    <View style={styles.articleHeader}>
                        <Text style={styles.readTime}>⏱️ {article.read_time_min} min read</Text>
                        <View style={styles.tagsRow}>
                            {article.tags.slice(0, 2).map(tag => (
                                <View key={tag} style={styles.tag}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <Text style={styles.articleTitle}>{article.titleHi}</Text>
                    <Text style={styles.articleTitleEn}>{article.titleEn}</Text>
                    <Text style={styles.articleBody} numberOfLines={4}>{article.bodyHi}</Text>

                    <TouchableOpacity style={styles.readMoreBtn} onPress={() => setExpandedArticle(article)}>
                        <Text style={styles.readMoreText}>पूरा पढ़ें / Read More →</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );

    const renderChecklist = () => (
        <View style={styles.tabContent}>
            {topic.checklist.map((item) => (
                <TouchableOpacity key={item.id} style={styles.checkItem} activeOpacity={0.7}>
                    <View style={[styles.checkbox, item.type === 'avoid' && styles.checkboxAvoid]}>
                        <Text style={styles.checkIcon}>{item.type === 'avoid' ? '❌' : '✅'}</Text>
                    </View>
                    <View style={styles.checkTextContent}>
                        <Text style={styles.checkText}>{item.textHi}</Text>
                        <Text style={styles.checkTextEn}>{item.textEn}</Text>
                        <Text style={styles.checkReason}>{item.reasonHi}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );

    const TOOL_MAP = {
        danger_signs: <DangerSignsTool />,
        nutrition: <NutritionTool />,
        mental_health: <BreathingTool />,
        weight_gain: <WeightGainTool />,
        supplements: <SupplementsTool />,
        exercise: <ExerciseTool />,
        breastfeeding: <BreastfeedingTool />,
        baby_care: <BabyCareTool />,
    };

    const renderTools = () => {
        const ToolComponent = TOOL_MAP[topicId];
        if (ToolComponent) return <View style={styles.tabContent}>{ToolComponent}</View>;
        return (
            <View style={styles.tabContent}>
                <View style={styles.toolCard}>
                    <Text style={styles.toolEmoji}>{topic.emoji}</Text>
                    <Text style={styles.toolTitle}>{topic.titleHi} टूल</Text>
                    <Text style={styles.toolDesc}>इस विषय के लिए इंटरैक्टिव टूल जल्द ही उपलब्ध होगा।</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header info */}
            <View style={[styles.header, { backgroundColor: topic.color + '10' }]}>
                <Text style={styles.emojiLarge}>{topic.emoji}</Text>
                <Text style={styles.title}>{topic.titleHi}</Text>
                <Text style={styles.subtitle}>{topic.titleEn}</Text>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                            {tab.hi}
                        </Text>
                        <Text style={[styles.tabTextEn, activeTab === tab.id && styles.activeTabText]}>
                            {tab.en}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {activeTab === 'articles' && renderArticles()}
                {activeTab === 'checklist' && renderChecklist()}
                {activeTab === 'tools' && renderTools()}

                {/* Source & Disclaimer */}
                <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerTitle}>📖 स्रोत / Source</Text>
                    <Text style={styles.disclaimerText}>{META.source || 'WHO/UNICEF/ICMR'}</Text>
                    <Text style={styles.disclaimerText}>Last updated: {META.last_updated || '2025'}</Text>
                    <Text style={styles.disclaimerNote}>
                        {'⚕️ यह जानकारी शैक्षिक उद्देश्यों के लिए है। किसी भी चिकित्सा निर्णय के लिए अपने डॉक्टर से सलाह लें।\nThis information is for educational purposes only. Always consult your doctor for medical decisions.'}
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Article Full-Read Modal */}
            <Modal
                visible={!!expandedArticle}
                animationType="slide"
                onRequestClose={() => setExpandedArticle(null)}
            >
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setExpandedArticle(null)} style={styles.modalCloseBtn}>
                            <Text style={styles.modalCloseText}>✕ बंद करें</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalReadTime}>⏱️ {expandedArticle?.read_time_min} min</Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalTitle}>{expandedArticle?.titleHi}</Text>
                        <Text style={styles.modalTitleEn}>{expandedArticle?.titleEn}</Text>
                        <Text style={styles.modalBody}>{expandedArticle?.bodyHi}</Text>

                        {expandedArticle?.key_takeaways_hi?.length > 0 && (
                            <View style={styles.takeawayBox}>
                                <Text style={styles.takeawayTitle}>🔑 मुख्य बातें / Key Takeaways</Text>
                                {expandedArticle.key_takeaways_hi.map((t, i) => (
                                    <View key={i} style={styles.takeawayItem}>
                                        <Text style={styles.takeawayBullet}>•</Text>
                                        <Text style={styles.takeawayText}>{t}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 25, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    emojiLarge: { fontSize: 60, marginBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },

    tabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        marginHorizontal: 16,
        marginTop: -20,
        borderRadius: 15,
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        padding: 5
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
    activeTab: { backgroundColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    tabTextEn: { fontSize: 11, color: Colors.textSecondary },
    activeTabText: { color: Colors.white },

    scrollContent: { paddingTop: 20, paddingHorizontal: 16 },
    tabContent: { width: '100%' },

    articleCard: {
        backgroundColor: Colors.white,
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    articleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    readTime: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
    tagsRow: { flexDirection: 'row' },
    tag: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 5 },
    tagText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
    articleTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    articleTitleEn: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
    articleBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },
    readMoreBtn: { alignSelf: 'flex-start' },
    readMoreText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

    checkItem: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 14,
        marginBottom: 12,
        alignItems: 'flex-start'
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 4
    },
    checkboxAvoid: { backgroundColor: Colors.danger + '20' },
    checkIcon: { fontSize: 16 },
    checkTextContent: { flex: 1 },
    checkText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    checkTextEn: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
    checkReason: { fontSize: 12, color: Colors.textLight, fontStyle: 'italic' },

    toolCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed'
    },
    toolEmoji: { fontSize: 50, marginBottom: 15 },
    toolTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    toolDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },

    modal: { flex: 1, backgroundColor: Colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalCloseBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.surfaceLight, borderRadius: 10 },
    modalCloseText: { color: Colors.primary, fontWeight: '700' },
    modalReadTime: { fontSize: 13, color: Colors.textLight },
    modalContent: { padding: 20 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    modalTitleEn: { fontSize: 16, color: Colors.textSecondary, marginBottom: 20 },
    modalBody: { fontSize: 16, color: Colors.textPrimary, lineHeight: 26 },
    takeawayBox: { backgroundColor: Colors.surfaceLight, borderRadius: 15, padding: 16, marginTop: 24 },
    takeawayTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: 12 },
    takeawayItem: { flexDirection: 'row', marginBottom: 8 },
    takeawayBullet: { fontSize: 18, color: Colors.primary, marginRight: 8 },
    takeawayText: { flex: 1, fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },

    disclaimerBox: {
        marginTop: 20,
        padding: 16,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    disclaimerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
    disclaimerText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
    disclaimerNote: { fontSize: 12, color: Colors.textLight, marginTop: 10, fontStyle: 'italic', lineHeight: 18 },
});
