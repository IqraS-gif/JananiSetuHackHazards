/**
 * NutritionCalculator.js
 * Maa App – Nutrition calculation and gap analysis service
 */

import { getNutritionRequirements } from '../database/DatabaseService';

/**
 * Calculate total nutrition for a list of foods with portions.
 * @param {Array} foods - Array of { calories, protein, iron, calcium, folate, portion_multiplier }
 * @returns {Object} Totals { calories, protein, iron, calcium, folate }
 */
export function calculateMealNutrition(foods) {
    const totals = { calories: 0, protein: 0, iron: 0, calcium: 0, folate: 0 };

    for (const food of foods) {
        const m = food.portion_multiplier || 1.0;
        totals.calories += (food.calories || 0) * m;
        totals.protein += (food.protein || 0) * m;
        totals.iron += (food.iron || 0) * m;
        totals.calcium += (food.calcium || 0) * m;
        totals.folate += (food.folate || 0) * m;
    }

    // Round to 1 decimal
    Object.keys(totals).forEach(k => {
        totals[k] = Math.round(totals[k] * 10) / 10;
    });

    return totals;
}

/**
 * Calculate daily nutrition from a list of meal logs.
 * @param {Array} meals - Array of meal objects with total_* fields
 * @returns {Object} Daily totals
 */
export function calculateDailyNutrition(meals) {
    const totals = { calories: 0, protein: 0, iron: 0, calcium: 0, folate: 0 };

    for (const meal of meals) {
        totals.calories += meal.total_calories || 0;
        totals.protein += meal.total_protein || 0;
        totals.iron += meal.total_iron || 0;
        totals.calcium += meal.total_calcium || 0;
        totals.folate += meal.total_folate || 0;
    }

    Object.keys(totals).forEach(k => {
        totals[k] = Math.round(totals[k] * 10) / 10;
    });

    return totals;
}

/**
 * Compare consumed nutrition against requirements.
 * @param {Object} consumed - { calories, protein, iron, calcium, folate }
 * @param {Object} required - { min_calories, min_protein, min_iron, min_calcium, min_folate }
 * @returns {Object} Gap analysis with { nutrient: { consumed, required, percentage, status } }
 */
export function calculateNutritionGaps(consumed, required) {
    if (!required) {
        // Return neutral if no requirements (shouldn't happen)
        return {
            calories: { consumed: consumed.calories, required: 0, percentage: 100, status: 'good' },
            protein: { consumed: consumed.protein, required: 0, percentage: 100, status: 'good' },
            iron: { consumed: consumed.iron, required: 0, percentage: 100, status: 'good' },
            calcium: { consumed: consumed.calcium, required: 0, percentage: 100, status: 'good' },
            folate: { consumed: consumed.folate, required: 0, percentage: 100, status: 'good' },
        };
    }

    const nutrients = [
        { key: 'calories', reqKey: 'min_calories' },
        { key: 'protein', reqKey: 'min_protein' },
        { key: 'iron', reqKey: 'min_iron' },
        { key: 'calcium', reqKey: 'min_calcium' },
        { key: 'folate', reqKey: 'min_folate' },
    ];

    const gaps = {};

    for (const n of nutrients) {
        const c = consumed[n.key] || 0;
        const r = required[n.reqKey] || 1; // avoid division by zero
        const pct = Math.round((c / r) * 100);

        let status = 'low';
        if (pct >= 80) status = 'good';
        else if (pct >= 50) status = 'medium';

        gaps[n.key] = {
            consumed: Math.round(c * 10) / 10,
            required: r,
            percentage: Math.min(pct, 100), // cap at 100
            status,
        };
    }

    return gaps;
}

/**
 * Get overall nutrition status from gaps.
 * @param {Object} gaps - Output of calculateNutritionGaps
 * @returns {string} 'good' | 'medium' | 'low'
 */
export function getOverallNutritionStatus(gaps) {
    const statuses = Object.values(gaps).map(g => g.status);

    if (statuses.includes('low')) return 'low';
    if (statuses.includes('medium')) return 'medium';
    return 'good';
}

/**
 * Generate recommendations based on gaps.
 * @param {Object} gaps - Output of calculateNutritionGaps
 * @returns {Array} Array of recommendation strings { hi, en }
 */
export function generateRecommendations(gaps) {
    const recs = [];

    if (gaps.iron && gaps.iron.status !== 'good') {
        recs.push({
            hi: '🥬 आयरन बढ़ाएं – पालक, मेथी, गुड़, या दाल खाएं',
            en: '🥬 Increase iron – eat spinach, methi, jaggery, or dal',
            priority: gaps.iron.status === 'low' ? 'high' : 'medium',
        });
    }

    if (gaps.calcium && gaps.calcium.status !== 'good') {
        recs.push({
            hi: '🥛 कैल्शियम बढ़ाएं – दूध, दही, या पनीर खाएं',
            en: '🥛 Increase calcium – have milk, curd, or paneer',
            priority: gaps.calcium.status === 'low' ? 'high' : 'medium',
        });
    }

    if (gaps.protein && gaps.protein.status !== 'good') {
        recs.push({
            hi: '🥚 प्रोटीन बढ़ाएं – अंडा, दाल, पनीर, या सोयाबीन खाएं',
            en: '🥚 Increase protein – eat eggs, dal, paneer, or soybean',
            priority: gaps.protein.status === 'low' ? 'high' : 'medium',
        });
    }

    if (gaps.folate && gaps.folate.status !== 'good') {
        recs.push({
            hi: '🥗 फोलेट बढ़ाएं – हरी सब्ज़ियाँ, दालें, और संतरा खाएं',
            en: '🥗 Increase folate – eat green veggies, lentils, and oranges',
            priority: gaps.folate.status === 'low' ? 'high' : 'medium',
        });
    }

    if (gaps.calories && gaps.calories.status !== 'good') {
        recs.push({
            hi: '🍚 कैलोरी बढ़ाएं – एक और रोटी या चावल खाएं',
            en: '🍚 Increase calories – have an extra roti or rice serving',
            priority: gaps.calories.status === 'low' ? 'high' : 'medium',
        });
    }

    // Sort by priority (high first)
    recs.sort((a, b) => (a.priority === 'high' ? -1 : 1));

    return recs;
}

/**
 * Get full nutrition analysis for a given week.
 * Combines daily data with requirements to return comprehensive analysis.
 */
export async function getFullNutritionAnalysis(meals, week) {
    const consumed = calculateDailyNutrition(meals);
    const requirements = await getNutritionRequirements(week || 1);
    const gaps = calculateNutritionGaps(consumed, requirements);
    const overallStatus = getOverallNutritionStatus(gaps);
    const recommendations = generateRecommendations(gaps);

    return {
        consumed,
        requirements,
        gaps,
        overallStatus,
        recommendations,
    };
}
