/**
 * MealLoggingFlow.js
 * Maa App – Streamlined 3-Step Meal Logging Flow
 *
 * Step 1: Selection (Auto-detect Meal Type + Paginated Food Search / Grid)
 * Step 2: Portions  (Adjust multipliers for selected items)
 * Step 3: Review & Save (Concise summary + safety check)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, Alert, TextInput, ActivityIndicator, Modal,
} from 'react-native';

import FoodCard from '../../components/common/FoodCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import {
    getFoodsByCategoryPaginated,
    searchFoodsPaginated,
    getFoodById,
    saveMealLog,
    getAllFoodsPaginated,
} from '../../services/database/DatabaseService';
import { calculateMealNutrition } from '../../services/nutrition/NutritionCalculator';
import { Colors, Dimensions, Labels, FoodKeywords, QuickMeals } from '../../constants';
// 29-30: Refactored to use centralized VoiceRecognitionService
import { VoiceRecognitionService, useSpeechRecognitionEvent } from '../../services/VoiceRecognitionService';
import * as ImagePicker from 'expo-image-picker';
import { identifyFoodFromImage } from '../../services/ai/GeminiService';
import {
    getCollectiveNutrients,
    getCollectiveNutrientsFromObjects,
    loadCsvData,
    getFoodSafetyInsights,
    calculateNutritionalSafety,
    getNutrientsForFood
} from '../../services/ai/FoodMappingService';
import { getAIFoodNutrition, extractFoodNames, getAIFoodItemsFromText } from '../../services/ai/GroqService';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { TextToSpeechService } from '../../services/TextToSpeechService';
import { useT } from '../../i18n/useT';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAutoMealType = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 19) return 'snack';
    return 'dinner';
};

const MEAL_META = {
    breakfast: { emoji: '🌅', hi: 'नाश्ता', en: 'Breakfast', color: '#FF9800' },
    lunch: { emoji: '☀️', hi: 'दोपहर का खाना', en: 'Lunch', color: '#4CAF50' },
    dinner: { emoji: '🌙', hi: 'रात का खाना', en: 'Dinner', color: '#3F51B5' },
    snack: { emoji: '🍪', hi: 'स्नैक', en: 'Snack', color: '#E91E63' },
};

const LIMIT = 30;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FLOW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MealLoggingFlow({ navigation }) {
    const { t, isHindi, isBilingual } = useT();
    const [step, setStep] = useState(1);
    const [mealType, setMealType] = useState(getAutoMealType());
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [saving, setSaving] = useState(false);
    const [selectedDetailFood, setSelectedDetailFood] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

    const goBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const handleSaveMeal = async () => {
        setSaving(true);
        try {
            const items = selectedFoods.map(sf => ({
                food_id: sf.food.id,
                portion_multiplier: sf.portion_multiplier,
            }));
            await saveMealLog({ mealType, items });

            // Stop voice on success before leaving
            TextToSpeechService.stop();

            Alert.alert(
                '✅ ' + t('meal_saved_title'),
                t('meal_saved_msg'),
                [{ 
                    text: t('ok'), 
                    onPress: () => {
                        setStep(1);
                        setSelectedFoods([]);
                        navigation.navigate('Home');
                    } 
                }]
            );
        } catch (error) {
            console.error('[MealLog] Save error:', error);
            Alert.alert('❌', t('something_went_wrong'));
        } finally {
            setSaving(false);
        }
    };

    // Voice Cleanup
    useEffect(() => {
        return () => {
            console.log('[MealLoggingFlow] Unmounting, stopping voice...');
            TextToSpeechService.stop();
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* Header / Progress Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={goBack} style={styles.headerBackBtn}
                    accessibilityRole="button" accessibilityLabel="Go back"
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                    <Text style={styles.headerBackText}>← {t('back')}</Text>
                </TouchableOpacity>
                <View
                    style={styles.progressContainer}
                    accessible
                    accessibilityLabel={`Step ${step} of 3`}
                    accessibilityRole="progressbar"
                >
                    {[1, 2, 3].map(s => (
                        <View key={s} style={[styles.progressPin, s <= step && styles.progressPinActive]} />
                    ))}
                </View>
                <View style={{ width: 80 }} />
            </View>

            {step === 1 && (
                <StepSelection
                    mealType={mealType}
                    setMealType={setMealType}
                    selectedIds={selectedFoods.map(sf => sf.food.id)}
                    onFoodsChange={(foods) =>
                        setSelectedFoods(foods.map(f => ({ food: f, portion_multiplier: 1.0 })))
                    }
                    onNext={() => setStep(2)}
                    onFoodClick={(f, mult = 1.0) => {
                        setSelectedDetailFood({ food: f, portion_multiplier: mult });
                        setShowDetailModal(true);
                    }}
                    isVoiceEnabled={isVoiceEnabled}
                    setIsVoiceEnabled={setIsVoiceEnabled}
                />
            )}

            {step === 2 && (
                <StepPortions
                    selectedFoods={selectedFoods}
                    onUpdate={setSelectedFoods}
                    onNext={() => setStep(3)}
                    onFoodClick={(f, mult) => {
                        setSelectedDetailFood({ food: f, portion_multiplier: mult });
                        setShowDetailModal(true);
                    }}
                />
            )}

            {step === 3 && (
                <StepReview
                    mealType={mealType}
                    selectedFoods={selectedFoods}
                    saving={saving}
                    onSave={handleSaveMeal}
                    onFoodClick={(sf) => {
                        setSelectedDetailFood(sf);
                        setShowDetailModal(true);
                    }}
                    isVoiceEnabled={isVoiceEnabled}
                    setIsVoiceEnabled={setIsVoiceEnabled}
                />
            )}

            {/* SHARED NUTRITION MODAL */}
            <Modal
                transparent={true}
                visible={showDetailModal}
                animationType="fade"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalEmoji}>ℹ️</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {isBilingual ? selectedDetailFood?.food.name_en : (isHindi ? (selectedDetailFood?.food.name_hi || selectedDetailFood?.food.name_en) : selectedDetailFood?.food.name_en)}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {t('nutrition_info')}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Text style={styles.closeModalText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.portionLabel}>
                            {t('size')}: {selectedDetailFood?.portion_multiplier === 0.5 ? t('less') : selectedDetailFood?.portion_multiplier === 1.5 ? t('more') : t('medium')}
                            {' '}({selectedDetailFood?.portion_multiplier}x portion)
                        </Text>

                        <View style={styles.detailGrid}>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailVal}>
                                    {Math.round((selectedDetailFood?.food.calories || 0) * (selectedDetailFood?.portion_multiplier || 1))}
                                </Text>
                                <Text style={styles.detailLab}>kcal</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailVal}>
                                    {Math.round((selectedDetailFood?.food.protein || 0) * (selectedDetailFood?.portion_multiplier || 1))}g
                                </Text>
                                <Text style={styles.detailLab}>{t('protein_label')}</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailVal}>
                                    {Math.round((selectedDetailFood?.food.iron || 0) * (selectedDetailFood?.portion_multiplier || 1))}mg
                                </Text>
                                <Text style={styles.detailLab}>{t('iron_label')}</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailVal}>
                                    {Math.round((selectedDetailFood?.food.calcium || 0) * (selectedDetailFood?.portion_multiplier || 1))}mg
                                </Text>
                                <Text style={styles.detailLab}>Ca (mg)</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailVal}>
                                    {Math.round((selectedDetailFood?.food.folate || 0) * (selectedDetailFood?.portion_multiplier || 1))}µg
                                </Text>
                                <Text style={styles.detailLab}>{t('folate_label')}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowDetailModal(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>{t('ok')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: INTEGRATED SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

function StepSelection({
    mealType, setMealType, selectedIds, onFoodsChange, onNext, onFoodClick,
    isVoiceEnabled, setIsVoiceEnabled
}) {
    const { t, isBilingual, isHindi } = useT();
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedObjects, setSelectedObjects] = useState([]);
    const [inputMethod, setInputMethod] = useState('grid'); // 'grid' | 'voice' | 'quick' | 'photo'

    // Photo state
    const [photoResults, setPhotoResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Use refs for pagination so loadFoods always reads current values (avoids stale closure)
    const offsetRef = useRef(0);
    const hasMoreRef = useRef(true);
    const isLoadingRef = useRef(false);

    // Voice state
    const [textInput, setTextInput] = useState('');
    const [detectedFoods, setDetectedFoods] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const loadFoods = useCallback(async (isNewSearch = false) => {
        if (isLoadingRef.current && !isNewSearch) return;
        if (!hasMoreRef.current && !isNewSearch) return;

        isLoadingRef.current = true;
        setLoading(true);

        const currentOffset = isNewSearch ? 0 : offsetRef.current;
        try {
            let result = [];
            if (query.trim()) {
                result = await searchFoodsPaginated(query.trim(), LIMIT, currentOffset);
            } else if (activeCategory !== 'all') {
                result = await getFoodsByCategoryPaginated(activeCategory, LIMIT, currentOffset);
            } else {
                result = await getAllFoodsPaginated(LIMIT, currentOffset);
            }

            if (isNewSearch) {
                setFoods(result);
                offsetRef.current = LIMIT;
            } else {
                setFoods(prev => {
                    const ids = new Set(prev.map(f => f.id));
                    const unique = result.filter(f => !ids.has(f.id));
                    return [...prev, ...unique];
                });
                offsetRef.current = currentOffset + LIMIT;
            }
            hasMoreRef.current = result.length === LIMIT;
        } catch (e) {
            console.error('[StepSelection] loadFoods:', e);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
        }
    }, [query, activeCategory]);

    useEffect(() => {
        // Reset pagination refs on new search
        offsetRef.current = 0;
        hasMoreRef.current = true;
        const timer = setTimeout(() => loadFoods(true), 350);
        return () => clearTimeout(timer);
    }, [query, activeCategory, loadFoods]);

    const toggleFood = (food) => {
        let newSel;
        if (selectedIds.includes(food.id)) {
            newSel = selectedObjects.filter(f => f.id !== food.id);
        } else {
            newSel = [...selectedObjects, food];
        }
        setSelectedObjects(newSel);
        onFoodsChange(newSel);
    };

    // Voice helpers
    useSpeechRecognitionEvent('result', (event) => {
        const transcript = event.results?.[0]?.transcript;
        if (transcript) handleVoiceText(transcript);
    });
    useSpeechRecognitionEvent('end', () => setIsListening(false));

    const parseTextForFoods = useCallback(async (text) => {
        if (!text.trim()) return;
        setIsTranscribing(true);

        try {
            console.log(`[StepSelection] Starting Deep AI food extraction for: "${text}"`);

            // Single pass for both names and nutritional details
            const foodsFromAI = await getAIFoodItemsFromText(text);
            console.log(`[StepSelection] Deep extracted items:`, foodsFromAI.length);

            if (!foodsFromAI || foodsFromAI.length === 0) {
                return;
            }

            const foods = foodsFromAI.map(af => ({
                id: af.id,
                name_en: af.name,
                name_hi: af.name_hi || af.name,
                calories: af.calories,
                protein: af.protein,
                iron: af.iron,
                calcium: af.calcium,
                folate: af.folate,
                is_ai_generated: true,
                source: af.source
            }));

            if (foods.length > 0) {
                setDetectedFoods(foods);
                // Merge into selectedObjects
                const merged = [...selectedObjects];
                foods.forEach(f => {
                    if (!merged.find(s => s.name_en === f.name_en)) {
                        merged.push(f);
                    }
                });
                setSelectedObjects(merged);
                onFoodsChange(merged);
            }
        } catch (e) {
            console.warn('[StepSelection] Deep dynamic parsing failed:', e);
        } finally {
            setIsTranscribing(false);
        }
    }, [selectedObjects, onFoodsChange]);

    const handleVoiceText = (text) => {
        setTextInput(text);
        parseTextForFoods(text);
    };

    const toggleListening = async () => {
        try {
            if (isListening) {
                setIsListening(false);
                // The transcription status will be handled by parseTextForFoods
                // triggered by the 'result' event from stop()
                await VoiceRecognitionService.stop();
            } else {
                const granted = await VoiceRecognitionService.requestPermissions();
                if (!granted) {
                    Alert.alert(
                        t('permission_required'),
                        t('mic_permission_msg'),
                        [{ text: t('ok') }]
                    );
                    return;
                }
                setIsListening(true);
                await VoiceRecognitionService.start();
            }
        } catch (e) {
            setIsListening(false);
            setIsTranscribing(false);
            Alert.alert('Voice Error', e.message || 'Could not start recording.');
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('permission_denied'), t('camera_permission_msg'));
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0].base64) {
                setIsAnalyzing(true);
                try {
                    // Try to load CSV if not loaded
                    // Note: In Expo Go, bundleDirectory might not be directly readable like this
                    // We'll fallback to a prompt or attempt reading from known locations
                    let csvContent = null;
                    try {
                        csvContent = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + 'Indian_Food_Nutrition_Processed.csv');
                    } catch (e) {
                        try {
                            // Using the bundled asset
                            const asset = Asset.fromModule(require('../../../nutrition_dataset.csv'));
                            if (!asset.localUri) {
                                await asset.downloadAsync();
                            }
                            csvContent = await FileSystem.readAsStringAsync(asset.localUri || asset.uri);
                        } catch (e2) {
                            console.warn('Could not bundle or read CSV file:', e2);
                        }
                    }

                    if (csvContent) loadCsvData(csvContent);

                    const identifiedItems = await identifyFoodFromImage(result.assets[0].base64);
                    const analysis = await getCollectiveNutrients(identifiedItems);
                    setPhotoResults(analysis);

                    // Add identified foods to selected objects if they have a match
                    const matchedFoods = analysis.breakdown
                        .filter(item => !item.unknown)
                        .map((item, index) => {
                            // item.name is typically "English Name (Hindi Name)"
                            let nameEn = item.name;
                            let nameHi = item.name;
                            const match = item.name.match(/^(.*)\s*\((.*)\)$/);
                            if (match) {
                                nameEn = match[1].trim();
                                nameHi = match[2].trim();
                            }

                            return {
                                id: `ai_${nameEn}_${Date.now()}_${index}`,
                                name_en: nameEn,
                                name_hi: nameHi,
                                calories: item.calories,
                                protein: item.protein,
                                iron: item.iron,
                                calcium: item.calcium,
                                folate: item.folate,
                                source: 'ai'
                            };
                        });

                    const merged = [...selectedObjects, ...matchedFoods.filter(f => !selectedObjects.find(s => s.id === f.id))];
                    setSelectedObjects(merged);
                    onFoodsChange(merged);
                } catch (err) {
                    Alert.alert(t('analysis_failed'), err.message || t('could_not_recognize'));
                } finally {
                    setIsAnalyzing(false);
                }
            }
        } catch (e) {
            console.error('[StepSelection] handleTakePhoto:', e);
            Alert.alert(t('error'), t('failed_to_open_camera'));
        }
    };

    const handleQuickMeal = async (qm) => {
        const foods = [];
        for (const item of qm.foods) {
            const food = await getFoodById(item.food_id);
            if (food) { food.preset_portion = item.portion; foods.push(food); }
        }
        const merged = [...selectedObjects, ...foods.filter(f => !selectedObjects.find(s => s.id === f.id))];
        setSelectedObjects(merged);
        onFoodsChange(merged);
    };

    const categories = [
        { id: 'all', hi: t('cat_all', { returnObjects: true })?.hi || 'सब', en: t('cat_all', { returnObjects: true })?.en || 'All' },
        { id: 'grain', hi: t('cat_grain', { returnObjects: true })?.hi || 'अनाज', en: t('cat_grain', { returnObjects: true })?.en || 'Grains' },
        { id: 'vegetable', hi: t('cat_veg', { returnObjects: true })?.hi || 'सब्ज़ी', en: t('cat_veg', { returnObjects: true })?.en || 'Veg' },
        { id: 'protein', hi: t('cat_protein', { returnObjects: true })?.hi || 'प्रोटीन', en: t('cat_protein', { returnObjects: true })?.en || 'Protein' },
        { id: 'dairy', hi: t('cat_dairy', { returnObjects: true })?.hi || 'डेरी', en: t('cat_dairy', { returnObjects: true })?.en || 'Dairy' },
        { id: 'fruit', hi: t('cat_fruit', { returnObjects: true })?.hi || 'फल', en: t('cat_fruit', { returnObjects: true })?.en || 'Fruit' },
    ];

    return (
        <View style={{ flex: 1 }}>
            {/* Meal Type Toggle */}
            <View style={styles.mealToggleRow}>
                {Object.entries(MEAL_META).map(([type, meta]) => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.mealToggleBtn, mealType === type && { backgroundColor: meta.color, borderColor: meta.color }]}
                        onPress={() => setMealType(type)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: mealType === type }}
                        accessibilityLabel={`${meta.en}, ${meta.hi}`}
                    >
                        <Text style={styles.mealToggleEmoji}>{meta.emoji}</Text>
                        <Text style={[styles.mealToggleText, mealType === type && { color: Colors.white }]}>
                            {isBilingual ? meta.hi : (isHindi ? meta.hi : meta.en)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Input Method Tabs */}
            <View style={styles.methodTabRow}>
                {[
                    { id: 'grid', label: `📸 ${isBilingual ? 'List / लिस्ट' : (isHindi ? 'लिस्ट' : 'List')}`, emoji: '🔍' },
                    { id: 'photo', label: `📷 ${isBilingual ? 'Photo / फोटो' : (isHindi ? 'फोटो' : 'Photo')}`, emoji: '📸' },
                    { id: 'voice', label: `🎤 ${isBilingual ? 'Speak / बोलें' : (isHindi ? 'बोलें' : 'Speak')}`, emoji: '🎤' },
                    { id: 'quick', label: `📋 ${isBilingual ? 'Quick / जल्दी' : (isHindi ? 'जल्दी' : 'Quick')}`, emoji: '📋' }
                ].map(m => (
                    <TouchableOpacity
                        key={m.id}
                        style={[styles.methodTab, inputMethod === m.id && styles.methodTabActive]}
                        onPress={() => setInputMethod(m.id)}
                    >
                        <Text style={[styles.methodTabText, inputMethod === m.id && styles.methodTabTextActive]}>{m.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Grid Mode */}
            {inputMethod === 'grid' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder={isBilingual ? "🔍 Search food / खोजें..." : (isHindi ? "🔍 खोजें..." : "🔍 Search food...")}
                            placeholderTextColor={Colors.textLight}
                            value={query}
                            onChangeText={setQuery}
                            cursorColor={Colors.primary}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catTab, activeCategory === cat.id && styles.catTabActive]}
                                onPress={() => setActiveCategory(cat.id)}
                            >
                                <Text style={[styles.catTabText, activeCategory === cat.id && styles.catTabTextActive]}>
                                    {isBilingual ? cat.hi : (isHindi ? cat.hi : cat.en)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {/* Food Grid or Skeleton/Empty */}
                    {loading && foods.length === 0
                        ? <LoadingPlaceholder variant="grid" rows={2} />
                        : foods.length === 0
                            ? (
                                <EmptyState
                                    emoji="🔍"
                                    titleHi={t('no_food_found', { returnObjects: true })?.hi || "कोई खाना नहीं मिला"}
                                    titleEn={t('no_food_found', { returnObjects: true })?.en || "No foods found"}
                                    subtitleEn={query ? t('try_diff_search') : t('try_diff_cat')}
                                />
                            )
                            : (
                                <FlatList
                                    data={foods}
                                    numColumns={3}
                                    keyExtractor={(item, index) => `${item.id}_${index}`}
                                    renderItem={({ item }) => (
                                        <FoodCard
                                            food={item}
                                            selected={selectedIds.includes(item.id)}
                                            onPress={() => toggleFood(item)}
                                            onInfoPress={onFoodClick}
                                        />
                                    )}
                                    onEndReached={() => loadFoods(false)}
                                    onEndReachedThreshold={0.5}
                                    contentContainerStyle={styles.gridContainer}
                                />
                            )
                    }
                </View>
            )}

            {/* Photo Mode */}
            {inputMethod === 'photo' && (
                <ScrollView contentContainerStyle={styles.stepContent}>
                    <Text style={styles.stepTitle}>📷 {t('identify_via_photo')}</Text>
                    <TouchableOpacity
                        style={[styles.micButton, { backgroundColor: Colors.primary }]}
                        onPress={handleTakePhoto}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <ActivityIndicator size="large" color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.micEmoji}>📸</Text>
                                <Text style={styles.micLabel}>{t('take_photo')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {photoResults && (
                        <View style={styles.analysisContainer}>
                            <Text style={styles.detectedTitle}>🥗 {t('meal_analysis')}</Text>

                            {/* Dual Alerts Section */}
                            {(photoResults.safetyAlerts?.length > 0 || photoResults.nutritionAlerts?.length > 0) && (
                                <View style={styles.alertsContainer}>
                                    {photoResults.safetyAlerts?.map((alert, idx) => (
                                        <View key={`safe_${idx}`} style={[styles.insightCard, styles.warningCard]}>
                                            <Text style={styles.insightIcon}>⚠️</Text>
                                            <View style={styles.insightContent}>
                                                <Text style={styles.insightTextHi}>{alert.hi}</Text>
                                                <Text style={styles.insightTextEn}>{alert.en}</Text>
                                            </View>
                                        </View>
                                    ))}
                                    {photoResults.nutritionAlerts?.map((alert, idx) => (
                                        <View key={`nut_${idx}`} style={[styles.insightCard, alert.type === 'positive' ? styles.positiveCard : styles.cautionCard]}>
                                            <Text style={styles.insightIcon}>{alert.type === 'positive' ? '✅' : 'ℹ️'}</Text>
                                            <View style={styles.insightContent}>
                                                <Text style={styles.insightTextHi}>{alert.hi}</Text>
                                                <Text style={styles.insightTextEn}>{alert.en}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Nutrition Dashboard */}
                            <View style={styles.premiumDashboard}>
                                <Text style={styles.dashboardTitle}>{t('total_nutrients')}</Text>
                                <View style={styles.nutGrid}>
                                    <View style={styles.nutCard}>
                                        <Text style={styles.nutValSmall}>{photoResults.totals.calories}</Text>
                                        <Text style={styles.nutLabSmall}>kcal</Text>
                                    </View>
                                    <View style={styles.nutCard}>
                                        <Text style={styles.nutValSmall}>{photoResults.totals.protein}g</Text>
                                        <Text style={styles.nutLabSmall}>{t('protein_label')}</Text>
                                    </View>
                                    <View style={styles.nutCard}>
                                        <Text style={styles.nutValSmall}>{photoResults.totals.iron}mg</Text>
                                        <Text style={styles.nutLabSmall}>{t('iron_label')}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.itemListBox}>
                                <Text style={styles.itemListTitle}>{t('identified_items')}:</Text>
                                {photoResults.breakdown.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.itemRow}
                                        onPress={() => {
                                            // Create a temp food object for the modal
                                            onFoodClick({
                                                name_en: item.name,
                                                calories: item.calories,
                                                protein: item.protein,
                                                iron: item.iron,
                                                calcium: item.calcium,
                                                folate: item.folate
                                            }, 1.0);
                                        }}
                                    >
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={[styles.itemPortion, item.unknown ? { color: Colors.textLight } : null]}>
                                            {item.unknown ? t('not_found') : `${item.calories} kcal ⓘ`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Voice Mode */}
            {inputMethod === 'voice' && (
                <ScrollView contentContainerStyle={styles.stepContent}>
                    <TouchableOpacity
                        style={[
                            styles.micButton,
                            isListening ? styles.micButtonActive : null,
                            isTranscribing ? { opacity: 0.7 } : null
                        ]}
                        onPress={toggleListening}
                        disabled={isTranscribing}
                    >
                        {isTranscribing ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Text style={styles.micEmoji}>{isListening ? '🔴' : '🎤'}</Text>
                        )}
                        <Text style={styles.micLabel}>
                            {isTranscribing ? t('transcribing') :
                                isListening ? t('stop_speaking') : t('tap_to_speak')}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.orText}>{t('or_type')}:</Text>
                    <TextInput
                        style={styles.voiceInput}
                        placeholder="दाल चावल रोटी / dal chawal roti..."
                        placeholderTextColor={Colors.textLight}
                        value={textInput}
                        onChangeText={handleVoiceText}
                        multiline
                        cursorColor={Colors.primary}
                    />
                    {detectedFoods.length > 0 ? (
                        <View style={styles.detectedSection}>
                            <Text style={styles.detectedTitle}>✅ {t('detected')}:</Text>
                            <View style={styles.chipRow}>
                                {detectedFoods.map(food => (
                                    <TouchableOpacity
                                        key={food.id}
                                        style={styles.foodChip}
                                        onPress={() => onFoodClick(food, 1.0)}
                                    >
                                        <Text style={styles.chipText}>{food.name_hi || food.name_en} ⓘ</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            )}

            {/* Quick Meals Mode */}
            {inputMethod === 'quick' && (
                <ScrollView contentContainerStyle={styles.stepContent}>
                    <Text style={styles.stepTitle}>📋 {t('quick_meals_title')}</Text>
                    {QuickMeals.map(qm => (
                        <TouchableOpacity key={qm.id} style={styles.quickMealCard} onPress={() => handleQuickMeal(qm)}>
                            <Text style={styles.quickMealEmoji}>{qm.emoji}</Text>
                            <View style={styles.quickMealInfo}>
                                <Text style={styles.quickMealHi}>{qm.name_hi}</Text>
                                <Text style={styles.quickMealEn}>{qm.name_en}</Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Floating Next Button */}
            {selectedIds.length > 0 ? (
                <View style={styles.floatingAction}>
                    <View style={styles.floatingInfo}>
                        <Text style={styles.floatingTitle}>{selectedIds.length} {t('items_selected')}</Text>
                    </View>
                    <TouchableOpacity style={styles.floatingBtn} onPress={onNext}>
                        <Text style={styles.floatingBtnText}>{t('next_btn')} →</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: INLINE PORTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function StepPortions({ selectedFoods, onUpdate, onNext, onFoodClick }) {
    const { t, isBilingual, isHindi } = useT();
    const portions = [
        { label: '🥄', hi: t('less', { returnObjects: true })?.hi || 'कम', mult: 0.5 },
        { label: '🍽️', hi: t('medium', { returnObjects: true })?.hi || 'मध्यम', mult: 1.0 },
        { label: '🍲', hi: t('more', { returnObjects: true })?.hi || 'ज़्यादा', mult: 1.5 },
    ];

    const updateMult = (foodId, mult) => {
        onUpdate(prev => prev.map(sf => sf.food.id === foodId ? { ...sf, portion_multiplier: mult } : sf));
    };

    return (
        <ScrollView contentContainerStyle={styles.stepContent}>
            <Text style={styles.stepTitle}>🥄 {t('how_much')}</Text>
            {selectedFoods.map(sf => (
                <View key={sf.food.id} style={styles.portionCard}>
                    <TouchableOpacity onPress={() => onFoodClick(sf.food, sf.portion_multiplier)}>
                        <Text style={styles.portionName}>{isBilingual ? sf.food.name_en : (isHindi ? (sf.food.name_hi || sf.food.name_en) : sf.food.name_en)} ⓘ</Text>
                        {(isBilingual || isHindi) && sf.food.name_hi && sf.food.name_en !== sf.food.name_hi && (
                            <Text style={styles.portionNameEn}>{sf.food.name_en}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={styles.portionPicker}>
                        {portions.map(p => (
                            <TouchableOpacity
                                key={p.mult}
                                style={[styles.pOption, sf.portion_multiplier === p.mult && styles.pOptionActive]}
                                onPress={() => updateMult(sf.food.id, p.mult)}
                            >
                                <Text style={styles.pEmoji}>{p.label}</Text>
                                <Text style={[styles.pLabel, sf.portion_multiplier === p.mult && { color: Colors.white }]}>{p.hi}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
            <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
                <Text style={styles.primaryBtnText}>👀 {t('review_btn')} →</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: REVIEW & SAVE
// ═══════════════════════════════════════════════════════════════════════════════

function StepReview({
    mealType, selectedFoods, saving, onSave, onFoodClick,
    isVoiceEnabled, setIsVoiceEnabled
}) {
    const { t, isHindi, isBilingual } = useT();
    const meta = MEAL_META[mealType] || MEAL_META.snack;
    const nutrition = calculateMealNutrition(
        selectedFoods.map(sf => ({ ...sf.food, portion_multiplier: sf.portion_multiplier }))
    );

    const [analysis, setAnalysis] = useState(null);
    const [loadingAlerts, setLoadingAlerts] = useState(true);

    useEffect(() => {
        const fetchDynamicAlerts = async () => {
            setLoadingAlerts(true);
            try {
                // Use the object-based analyzer to avoid Tier 1-3 mapping lookups
                const objects = selectedFoods.map(sf => sf.food);
                const result = await getCollectiveNutrientsFromObjects(objects);
                setAnalysis(result);

                // Automatic Speech Readout
                if (isVoiceEnabled && result) {
                    const allAlerts = [
                        ...(result.dynamic?.summaryAlerts || []),
                        ...result.foodAlerts,
                        ...result.nutritionAlerts
                    ];
                    TextToSpeechService.speakAlerts(allAlerts);
                }
            } catch (error) {
                console.error('Groq fetch error:', error);
            } finally {
                setLoadingAlerts(false);
            }
        };
        fetchDynamicAlerts();
    }, [selectedFoods]);

    // Manual Re-read / Trigger when toggled ON while on this screen
    useEffect(() => {
        if (isVoiceEnabled && !loadingAlerts && analysis) {
            console.log('[StepReview] Voice enabled, reading existing alerts');
            const allAlerts = [
                ...(analysis.dynamic?.summaryAlerts || []),
                ...analysis.foodAlerts,
                ...analysis.nutritionAlerts
            ];
            TextToSpeechService.speakAlerts(allAlerts);
        }
    }, [isVoiceEnabled]);

    return (
        <ScrollView contentContainerStyle={styles.stepContent}>
            <View style={styles.reviewHeader}>
                <Text style={styles.reviewEmoji}>{meta.emoji}</Text>
                <View>
                    <Text style={styles.reviewTitle}>{isBilingual ? `${meta.hi} / ${meta.en}` : (isHindi ? meta.hi : meta.en)}</Text>
                    <Text style={styles.reviewDate}>{new Date().toLocaleDateString()}</Text>
                </View>
            </View>

            {/* Premium Nutrition Dashboard */}
            <View style={styles.premiumDashboard}>
                <Text style={styles.dashboardTitle}>📊 {isHindi ? 'पोषण विश्लेषण' : 'Nutrition Analysis'}</Text>
                <View style={styles.nutGrid}>
                    <View style={styles.nutCard}>
                        <Text style={styles.nutValSmall}>{Math.round(nutrition.calories)}</Text>
                        <Text style={styles.nutLabSmall}>kcal</Text>
                    </View>
                    <View style={styles.nutCard}>
                        <Text style={styles.nutValSmall}>{Math.round(nutrition.protein)}g</Text>
                        <Text style={styles.nutLabSmall}>{t('protein_label')}</Text>
                    </View>
                    <View style={styles.nutCard}>
                        <Text style={styles.nutValSmall}>{Math.round(nutrition.iron)}mg</Text>
                        <Text style={styles.nutLabSmall}>{t('iron_label')}</Text>
                    </View>
                    <View style={styles.nutCard}>
                        <Text style={styles.nutValSmall}>{Math.round(nutrition.calcium)}mg</Text>
                        <Text style={styles.nutLabSmall}>Ca (mg)</Text>
                    </View>
                </View>
            </View>

            {/* Advanced Analysis Section */}
            <View style={styles.alertsContainer}>
                {loadingAlerts ? (
                    <View style={styles.loadingAlertsBox}>
                        <ActivityIndicator color={Colors.primary} size="small" />
                        <Text style={styles.loadingAlertsText}>📊 {t('analyzing_meal')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 }}>
                            <Text style={styles.itemListTitle}>🥗 {isHindi ? 'भोजन विश्लेषण' : 'Food Analysis'}</Text>
                            <TouchableOpacity
                                style={[styles.voiceToggleMini, isVoiceEnabled && styles.voiceToggleActive]}
                                onPress={() => {
                                    const newState = !isVoiceEnabled;
                                    setIsVoiceEnabled(newState);
                                    if (!newState) TextToSpeechService.stop();
                                }}
                            >
                                <Text style={{ fontSize: 13 }}>{isVoiceEnabled ? `🔊 ${isHindi ? 'चालू' : 'Voice ON'}` : `🔇 ${isHindi ? 'बंद' : 'Voice OFF'}`}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 1. Dynamic AI Insights */}
                        {analysis?.dynamic?.itemInsights?.map((insight, idx) => {
                            const cardColor = insight.sentiment === 'warning' ? Colors.error : Colors.primary;
                            const bgColor = insight.sentiment === 'warning' ? '#FFF5F5' : '#F5FFF5';
                            return (
                                <View key={`rev_ins_${idx}`} style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: cardColor, backgroundColor: bgColor }]}>
                                    <Text style={styles.insightIcon}>{insight.sentiment === 'warning' ? '⚠️' : '✨'}</Text>
                                    <View style={styles.insightContent}>
                                        <Text style={[styles.itemName, { fontSize: 14, fontWeight: '700', color: cardColor }]}>{insight.name}</Text>
                                        <Text style={[styles.insightTextHi, { fontSize: 13, color: '#333' }]}>{insight.hi}</Text>
                                        <Text style={[styles.insightTextEn, { fontSize: 11, color: '#666', marginTop: 2 }]}>{insight.en}</Text>
                                    </View>
                                </View>
                            );
                        })}

                        {/* 2. Summary & Rules */}
                        <View style={{ marginTop: 16 }}>
                            <Text style={[styles.itemListTitle, { fontSize: 13, marginBottom: 8, opacity: 0.8 }]}>📊 {isHindi ? 'पोषण विश्लेषण' : 'Nutrition Analysis'}</Text>
                            {analysis?.dynamic?.summaryAlerts?.map((alert, idx) => (
                                <View key={`rev_sum_${idx}`} style={[
                                    styles.insightCard, 
                                    alert.sentiment === 'positive' ? styles.positiveCard : 
                                    alert.sentiment === 'warning' ? styles.warningCard : styles.cautionCard
                                ]}>
                                    <Text style={styles.insightIcon}>{alert.sentiment === 'positive' ? '✅' : '⚠️'}</Text>
                                    <View style={styles.insightContent}>
                                        <Text style={styles.insightTextHi}>{alert.hi}</Text>
                                        <Text style={styles.insightTextEn}>{alert.en}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* 3. Professional Verdict */}
                        {analysis?.dynamic?.conclusion && (
                            <View style={[styles.premiumDashboard, { marginTop: 16, backgroundColor: '#F0F7FF', borderColor: '#D1E8FF' }]}>
                                <Text style={[styles.dashboardTitle, { color: Colors.primary, marginBottom: 12 }]}>🏁 {isHindi ? 'पेशेवर निष्कर्ष' : 'Professional Verdict'}</Text>
                                <Text style={[styles.insightTextHi, { fontSize: 14, fontWeight: '600', color: '#1A365D' }]}>
                                    {analysis.dynamic.conclusion.hi}
                                </Text>
                                <Text style={[styles.insightTextEn, { fontSize: 12, fontStyle: 'italic', color: '#4A5568', marginTop: 4 }]}>
                                    {analysis.dynamic.conclusion.en}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            <View style={styles.itemListBox}>
                <Text style={styles.itemListTitle}>🍽️ {t('items_selected')}</Text>
                {selectedFoods.map(sf => (
                    <TouchableOpacity
                        key={sf.food.id}
                        style={styles.itemRow}
                        onPress={() => onFoodClick(sf)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{isBilingual ? sf.food.name_en : (isHindi ? (sf.food.name_hi || sf.food.name_en) : sf.food.name_en)} ⓘ</Text>
                            {(isBilingual || isHindi) && sf.food.name_hi && sf.food.name_en !== sf.food.name_hi && (
                                <Text style={{ fontSize: 11, color: Colors.textLight }}>{sf.food.name_en}</Text>
                            )}
                        </View>
                        <Text style={styles.itemPortion}>
                            {sf.portion_multiplier === 0.5 ? t('less') : sf.portion_multiplier === 1.5 ? t('more') : t('medium')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={onSave}
                disabled={saving}
            >
                {saving
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.saveBtnText}>✅ {t('save_meal')}</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerBackBtn: { width: 80 },
    headerBackText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
    progressContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    progressPin: { width: 30, height: 6, borderRadius: 3, backgroundColor: Colors.border },
    progressPinActive: { backgroundColor: Colors.primary, width: 48 },

    mealToggleRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.white, gap: 6 },
    mealToggleBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: Colors.background,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    mealToggleEmoji: { fontSize: 18 },
    mealToggleText: { fontSize: 12, fontWeight: '700', marginTop: 2, color: Colors.textSecondary },

    methodTabRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: Colors.white,
        gap: 8,
    },
    methodTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    methodTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    methodTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    methodTabTextActive: { color: Colors.white },

    searchContainer: { paddingHorizontal: 14, paddingVertical: 8 },
    searchInput: {
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        color: Colors.textPrimary,
        textAlignVertical: 'center',
    },
    catScroll: { paddingHorizontal: 14, paddingBottom: 10, gap: 8, alignItems: 'center' },
    catTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 44,
    },
    catTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    catTabTextActive: { color: Colors.white },
    gridContainer: { paddingHorizontal: 10, paddingBottom: 120 },

    floatingAction: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: Colors.textPrimary,
        borderRadius: 22,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 12,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    floatingInfo: { flex: 1 },
    floatingTitle: { color: Colors.white, fontSize: 15, fontWeight: '800' },
    floatingBtn: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
    floatingBtnText: { color: Colors.white, fontWeight: '800' },

    stepContent: { padding: Dimensions.screenPadding, paddingBottom: 50 },
    stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },

    // Voice
    micButton: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: Colors.info, justifyContent: 'center', alignItems: 'center',
        alignSelf: 'center', marginVertical: 20, elevation: 6,
    },
    micButtonActive: { backgroundColor: Colors.danger },
    micEmoji: { fontSize: 40 },
    micLabel: { color: Colors.white, fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    orText: { textAlign: 'center', fontSize: 14, color: Colors.textLight, marginVertical: 10 },
    voiceInput: {
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 14,
        fontSize: 18,
        minHeight: 80,
        borderWidth: 1,
        borderColor: Colors.border,
        textAlignVertical: 'top',
        color: Colors.textPrimary,
    },
    detectedSection: { marginTop: 16 },
    detectedTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    foodChip: {
        backgroundColor: Colors.primary + '15', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

    // Quick Meals
    quickMealCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
        borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2,
    },
    quickMealEmoji: { fontSize: 36, marginRight: 14 },
    quickMealInfo: { flex: 1 },
    quickMealHi: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 22,
    },
    quickMealEn: { fontSize: 13, color: Colors.textSecondary },
    arrow: { fontSize: 20, color: Colors.textLight },

    // Portions
    portionCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2 },
    portionName: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
    portionNameEn: { fontSize: 13, color: Colors.textLight, marginBottom: 12 },
    portionPicker: { flexDirection: 'row', justifyContent: 'space-between' },
    pOption: {
        flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, marginHorizontal: 4,
        backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    },
    pOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    pEmoji: { fontSize: 24, marginBottom: 4 },
    pLabel: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary },
    primaryBtn: { backgroundColor: Colors.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
    primaryBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },

    // Review
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    reviewEmoji: { fontSize: 48, marginRight: 16 },
    reviewTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    reviewDate: { fontSize: 14, color: Colors.textLight, marginTop: 2 },
    summaryBox: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginBottom: 20 },
    summaryTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14 },
    nutRow: { flexDirection: 'row', justifyContent: 'space-between' },
    nutItem: { alignItems: 'center', flex: 1 },
    nutVal: { fontSize: 20, fontWeight: '900', color: Colors.primary },
    nutLab: { fontSize: 10, color: Colors.textLight, fontWeight: '700', textAlign: 'center' },
    alertBox: {
        backgroundColor: Colors.danger + '10', borderRadius: 15, padding: 16, marginBottom: 20,
        borderLeftWidth: 4, borderLeftColor: Colors.danger,
    },
    alertTitle: { fontSize: 15, fontWeight: '800', color: Colors.danger, marginBottom: 8 },
    alertText: { fontSize: 13, color: Colors.textPrimary, marginBottom: 4 },
    itemListBox: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginBottom: 30 },
    itemListTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14 },
    itemRow: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    itemName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
    itemPortion: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
    saveBtn: {
        backgroundColor: Colors.success, padding: 20, borderRadius: 18,
        alignItems: 'center', elevation: 4,
    },
    saveBtnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },

    // Premium Analysis UI
    analysisContainer: { marginTop: 16 },
    alertsContainer: { marginBottom: 20 },
    insightCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        backgroundColor: Colors.white,
        elevation: 3,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 5,
    },
    warningCard: { borderLeftColor: Colors.danger, backgroundColor: Colors.danger + '05' },
    positiveCard: { borderLeftColor: Colors.success, backgroundColor: Colors.success + '05' },
    cautionCard: { borderLeftColor: Colors.warning, backgroundColor: Colors.warning + '05' },
    insightIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
    insightContent: { flex: 1 },
    insightTextHi: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
    insightTextEn: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

    premiumDashboard: {
        backgroundColor: Colors.white,
        borderRadius: 22,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    dashboardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
    nutGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    nutCard: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    nutValSmall: { fontSize: 18, fontWeight: '900', color: Colors.primary },
    nutLabSmall: { fontSize: 10, color: Colors.textLight, fontWeight: '700', marginTop: 4, textAlign: 'center' },

    // Split Alerts Styling
    alertSectionBlock: { marginBottom: 20 },
    alertSectionHeader: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.textSecondary,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    loadingAlertsBox: {
        padding: 24,
        backgroundColor: Colors.white,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
        borderStyle: 'dashed'
    },
    loadingAlertsText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textLight,
        fontWeight: '700',
        textAlign: 'center'
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: 30,
        padding: 24,
        elevation: 10,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalEmoji: {
        fontSize: 32,
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    modalSubtitle: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    closeModalText: {
        fontSize: 24,
        color: Colors.textLight,
        fontWeight: '300',
        padding: 4,
    },
    voiceToggleMini: {
        backgroundColor: Colors.background,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    voiceToggleActive: {
        backgroundColor: Colors.primary + '15',
        borderColor: Colors.primary,
    },
    portionLabel: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '800',
        marginBottom: 20,
        textAlign: 'center',
        backgroundColor: Colors.primary + '10',
        paddingVertical: 8,
        borderRadius: 12,
    },
    detailGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 24,
    },
    detailCard: {
        width: '31%',
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 4,
    },
    detailVal: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.primary,
    },
    detailLab: {
        fontSize: 9,
        color: Colors.textLight,
        fontWeight: '700',
        marginTop: 4,
        textAlign: 'center',
    },
    modalCloseBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '900',
    },
});
