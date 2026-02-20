import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../../learn_content.json';
import { Colors, Dimensions } from '../../constants';

export default function LearnScreen({ navigation }) {
    const topics = Array.isArray(content?.topics) ? content.topics : [];

    if (!topics.length) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Learn content unavailable</Text>
                <Text style={styles.emptyText}>
                    We could not load educational topics right now. Please restart the app.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.pageTitle}>📚 सीखें</Text>
                <Text style={styles.subtitle}>Learn & Grow</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Topics / विषय</Text>
                {topics.map((topic) => (
                    <TouchableOpacity
                        key={topic.id}
                        style={styles.topicCard}
                        activeOpacity={0.7}
                        onPress={() =>
                            navigation.navigate('TopicDetail', {
                                topicId: topic.id,
                                titleHi: topic.titleHi,
                                titleEn: topic.titleEn,
                            })
                        }
                    >
                        <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                        <View style={styles.topicBody}>
                            <Text style={styles.topicTitle}>{topic.titleHi}</Text>
                            <Text style={styles.topicTitleEn}>{topic.titleEn}</Text>
                            <Text style={styles.topicMeta}>
                                {topic.articles?.length || 0} articles • {topic.checklist?.length || 0} checklist items
                            </Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Dimensions.screenPadding, paddingTop: 50 },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 24,
    },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
    emptyText: { fontSize: 14, textAlign: 'center', color: Colors.textSecondary, lineHeight: 20 },
    header: { marginBottom: 20 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
    subtitle: { fontSize: 16, color: Colors.primary, marginTop: 4, fontWeight: '600' },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    topicCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Dimensions.borderRadius,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        elevation: 1,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    topicEmoji: { fontSize: 32, marginRight: 14 },
    topicBody: { flex: 1 },
    topicTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
    topicTitleEn: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
    topicMeta: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
    arrow: { fontSize: 26, color: Colors.textLight, fontWeight: '300' },
});
