/**
 * NutritionTool.js
 * Food safety checker for pregnancy
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import content from '../../../learn_content.json';

export default function NutritionTool() {
    const [searchQuery, setSearchQuery] = useState('');
    const nutritionTopic = content.topics.find(t => t.id === 'nutrition');
    const foodSafety = nutritionTopic?.food_safety || [];

    const filteredFood = foodSafety.filter(item =>
        item.nameHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'safe': return Colors.success;
            case 'limit': return Colors.warning;
            case 'avoid': return Colors.danger;
            default: return Colors.textLight;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'safe': return 'सुरक्षित / Safe';
            case 'limit': return 'सीमित / Limit';
            case 'avoid': return 'न खाएं / Avoid';
            default: return status;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.input}
                    placeholder="फल या खाने का नाम लिखें / Search food..."
                    placeholderTextColor={Colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    cursorColor={Colors.primary}
                />
            </View>

            {filteredFood.map((item, index) => (
                <View key={index} style={styles.foodCard}>
                    <View style={styles.foodHeader}>
                        <Text style={styles.foodEmoji}>{item.emoji}</Text>
                        <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{item.nameHi}</Text>
                            <Text style={styles.foodNameEn}>{item.nameEn}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {getStatusText(item.status)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.foodDetails}>
                        <Text style={styles.reasonLabel}>क्यो? / Why:</Text>
                        <Text style={styles.reasonText}>{item.reasonHi}</Text>
                        {item.serving_hi && (
                            <View style={styles.servingRow}>
                                <Text style={styles.reasonLabel}>कितना? / Portion:</Text>
                                <Text style={styles.reasonText}>{item.serving_hi}</Text>
                            </View>
                        )}
                    </View>
                </View>
            ))}

            {filteredFood.length === 0 && (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>कोई परिणाम नहीं मिला। / No results found.</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 4 },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border
    },
    searchIcon: { fontSize: 18, marginRight: 10 },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
        color: Colors.textPrimary,
        textAlignVertical: 'center',
    },

    foodCard: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
    },
    foodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    foodEmoji: { fontSize: 32, marginRight: 12 },
    foodInfo: { flex: 1 },
    foodName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 22,
    },
    foodNameEn: { fontSize: 13, color: Colors.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },

    foodDetails: { borderTopWidth: 1, borderTopColor: Colors.background, paddingTop: 10 },
    reasonLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, marginBottom: 2 },
    reasonText: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, lineHeight: 18 },
    servingRow: { marginTop: 4 },

    empty: { alignItems: 'center', padding: 40 },
    emptyText: { color: Colors.textLight, fontSize: 15 }
});
