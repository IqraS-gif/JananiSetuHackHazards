/**
 * FoodMappingService.js
 * Logic to map identified food names to the CSV dataset and local database.
 */

import { searchFoods } from '../database/DatabaseService';
import { parseCsvContent } from './CsvParser';
import { getDynamicInsights, getAIFoodNutrition } from './GroqService';

// We'll store the CSV data in memory after the first load
let cachedCsvData = null;

/**
 * Load and cache the CSV data.
 * @param {string} csvContent - The raw content of the CSV file.
 */
export function loadCsvData(csvContent) {
    cachedCsvData = parseCsvContent(csvContent);
}

/**
 * Find the closest match for a food name in our data sources.
 * Priority: 1. Groq AI (Smart Matching), 2. Indian Food CSV, 3. Local SQLite DB
 * @param {string} foodName - Name of the food to search.
 * @returns {Promise<Object|null>} Nutrients object or null if not found.
 */
export async function getNutrientsForFood(foodName) {
    if (!foodName) return null;
    const cleanInput = foodName.toLowerCase().trim();

    // 1. Groq AI Search (Tier 1 - Smart Extractor)
    // We use AI first to accurately match complex or descriptive food names.
    try {
        console.log(`[Mapping] (Tier 1) AI Search for: "${foodName}"`);

        const aiResults = await getAIFoodNutrition(foodName);
        if (aiResults && aiResults.length > 0) {
            const af = aiResults[0];
            console.log(`[Mapping] ✅ AI identified nutrients for: "${af.name}"`);
            return {
                name: af.name,
                name_hi: af.name_hi,
                calories: af.calories,
                protein: af.protein,
                iron: af.iron,
                calcium: af.calcium,
                folate: af.folate,
                source: 'ai_fallback',
                is_ai_generated: true
            };
        }
    } catch (e) {
        console.warn('[Mapping] AI Search failed:', e);
    }

    // 2. Try CSV Dataset (Tier 2 - Verified Dataset)
    if (cachedCsvData) {
        console.log(`[Mapping] (Tier 2) Dataset search for: "${cleanInput}"`);

        let bestMatch = null;
        let bestScore = -1;

        cachedCsvData.forEach(item => {
            const rawDishName = item['Dish Name']?.toLowerCase() || '';
            const dishNameClean = rawDishName.replace(/[()]/g, ' ').trim();

            // Perfect Match
            if (rawDishName === cleanInput || dishNameClean === cleanInput) {
                bestMatch = item;
                bestScore = 100;
                return;
            }

            if (bestScore === 100) return;

            // Simple Keyword Intersection
            const inputWords = cleanInput.split(/\s+/).filter(w => w.length >= 3);
            const dishWords = dishNameClean.split(/\s+/).filter(w => w.length >= 3);

            let currentScore = 0;
            inputWords.forEach(iw => {
                if (dishWords.includes(iw)) currentScore += 10;
                else if (dishNameClean.includes(iw)) currentScore += 2;
            });

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMatch = item;
            }
        });

        if (bestMatch && bestScore > 5) { // Minimum threshold for fuzzy match
            console.log(`[Mapping] ✅ Found match in dataset: "${bestMatch['Dish Name']}" (Score: ${bestScore})`);
            return {
                name: bestMatch['Dish Name'],
                calories: bestMatch['Calories (kcal)'],
                protein: bestMatch['Protein (g)'],
                iron: bestMatch['Iron (mg)'],
                calcium: bestMatch['Calcium (mg)'],
                folate: bestMatch['Folate (µg)'],
                source: 'dataset'
            };
        }
    }

    // 3. Try Local SQLite DB (Tier 3 - Fallback DB)
    try {
        console.log(`[Mapping] (Tier 3) Database search for: "${foodName}"`);
        // Remove brackets for cleaner search
        const dbQuery = cleanInput.replace(/\(.*?\)/g, '').trim();
        const dbResults = await searchFoods(dbQuery);

        if (dbResults && dbResults.length > 0) {
            // Find an exact match if possible, otherwise first result
            const match = dbResults.find(r =>
                (r.name_en && r.name_en.toLowerCase() === cleanInput) ||
                (r.name_hi && r.name_hi.toLowerCase() === cleanInput)
            ) || dbResults[0];

            console.log(`[Mapping] ✅ Found match in Database: "${match.name_en || match.name_hi}"`);
            return {
                name: match.name_en || match.name_hi,
                calories: match.calories,
                protein: match.protein,
                iron: match.iron,
                calcium: match.calcium,
                folate: match.folate,
                source: 'database'
            };
        }
    } catch (e) {
        console.warn('[Mapping] DB Search failed:', e);
    }

    console.log(`[Mapping] ❌ No match found for: "${foodName}" across all tiers.`);
    return null;
}

/**
 * Get collective nutrients for a list of identified items.
 * @param {Array<string>} items - List of food names.
 * @returns {Promise<Object>} Collective summary and breakdown.
 */
export async function getCollectiveNutrients(items) {
    const results = [];
    const totals = {
        calories: 0,
        protein: 0,
        iron: 0,
        calcium: 0,
        folate: 0
    };

    for (const item of items) {
        const nutrients = await getNutrientsForFood(item);
        if (nutrients) {
            results.push(nutrients);
            totals.calories += (nutrients.calories || 0);
            totals.protein += (nutrients.protein || 0);
            totals.iron += (nutrients.iron || 0);
            totals.calcium += (nutrients.calcium || 0);
            totals.folate += (nutrients.folate || 0);
        } else {
            // Fallback for missing items - could add a 'generic' estimate or just skip
            results.push({ name: item, unknown: true });
        }
    }

    // Round totals
    Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k] * 10) / 10);

    const foodAlerts = getFoodSafetyInsights(results).map(a => ({ ...a, category: 'food' }));
    const nutritionAlerts = calculateNutritionalSafety(totals).map(a => ({ ...a, category: 'nutrition' }));

    // Fetch Dynamic AI insights from Groq
    let dynamic = null;
    try {
        dynamic = await getDynamicInsights(results, totals);
        // If Groq returns empty or null, we still fallback
        if (!dynamic || !dynamic.itemInsights || dynamic.itemInsights.length === 0) {
            dynamic = generateOfflineDynamicInsights(results, totals);
        }
    } catch (e) {
        console.warn('[Mapping] Groq dynamic insights failed:', e);
        dynamic = generateOfflineDynamicInsights(results, totals);
    }

    return { totals, breakdown: results, foodAlerts, nutritionAlerts, dynamic };
}

/**
 * Optimized version that uses objects with data already present (e.g., from AI).
 * Prevents redundant Tier 2/3 database lookups during the analysis phase.
 */
export async function getCollectiveNutrientsFromObjects(objects) {
    if (!objects || objects.length === 0) return null;

    const totals = {
        calories: 0,
        protein: 0,
        iron: 0,
        calcium: 0,
        folate: 0
    };

    objects.forEach(o => {
        totals.calories += (o.calories || 0);
        totals.protein += (o.protein || 0);
        totals.iron += (o.iron || 0);
        totals.calcium += (o.calcium || 0);
        totals.folate += (o.folate || 0);
    });

    // Round totals
    Object.keys(totals).forEach(k => totals[k] = Math.round(totals[k] * 10) / 10);

    const foodAlerts = getFoodSafetyInsights(objects).map(a => ({ ...a, category: 'food' }));
    const nutritionAlerts = calculateNutritionalSafety(totals).map(a => ({ ...a, category: 'nutrition' }));

    // Fetch Dynamic AI insights (One-liners + Alerts) from Groq
    let dynamic = null;
    try {
        dynamic = await getDynamicInsights(objects, totals);
        // If Groq returns empty or null, we still fallback
        if (!dynamic || !dynamic.itemInsights || dynamic.itemInsights.length === 0) {
            dynamic = generateOfflineDynamicInsights(objects, totals);
        }
    } catch (e) {
        console.warn('[Mapping] Groq dynamic insights failed:', e);
        dynamic = generateOfflineDynamicInsights(objects, totals);
    }

    return { totals, breakdown: objects, foodAlerts, nutritionAlerts, dynamic };
}

/**
 * Generate food-specific safety insights.
 */
export function getFoodSafetyInsights(foodList) {
    const alerts = [];
    foodList.forEach(food => {
        const name = (food.name || food.name_en || '').toLowerCase();

        // ⚠️ CAUTIONARY / WARNINGS
        if (name.includes('pizza') || name.includes('burger') || name.includes('chowmein') || name.includes('noodles')) {
            alerts.push({
                type: 'warning',
                en: `${food.name} is high in refined flour and processed fat. Avoid in pregnancy.`,
                hi: `${food.name} में मैदा और प्रोसेस्ड फैट अधिक है। गर्भावस्था में इससे बचें।`
            });
        } else if (name.includes('fried') || name.includes('chips') || name.includes('samosa') || name.includes('pakora') || name.includes('vada')) {
            alerts.push({
                type: 'warning',
                en: `Deep fried foods like ${food.name} can cause acidity and unwanted weight gain.`,
                hi: `${food.name} जैसे तले हुए भोजन से एसिडिटी और वजन बढ़ सकता है।`
            });
        } else if (name.includes('sauce') || name.includes('ketchup') || name.includes('maggi') || name.includes('instant') || name.includes('preserved')) {
            alerts.push({
                type: 'caution',
                en: `${food.name} may contain high sodium or preservatives. Use sparingly.`,
                hi: `${food.name} में अधिक नमक या प्रिजरवेटिव हो सकते हैं। कम मात्रा में उपयोग करें।`
            });
        } else if (name.includes('soda') || name.includes('cola') || name.includes('soft drink') || name.includes('sugar') || name.includes('candy')) {
            alerts.push({
                type: 'warning',
                en: `High sugar items like ${food.name} can increase gestational diabetes risk.`,
                hi: `${food.name} जैसे अधिक चीनी वाले खाद्य पदार्थ जेस्टेशनल डायबिटीज का खतरा बढ़ा सकते हैं।`
            });
        }

        // ✅ POSITIVE / GOOD CHOICE
        if (name.includes('dal') || name.includes('lentil') || name.includes('daal') || name.includes('pulse')) {
            alerts.push({
                type: 'positive',
                en: `${food.name || 'Dal'} is a great source of protein. Excellent choice!`,
                hi: `${food.name || 'दाल'} प्रोटीन का एक बड़ा स्रोत है। बहुत बढ़िया विकल्प!`
            });
        } else if (name.includes('egg') || name.includes('paneer') || name.includes('milk') || name.includes('curd') || name.includes('yoghurt')) {
            alerts.push({
                type: 'positive',
                en: `${food.name} provides essential calcium and protein for baby's development.`,
                hi: `${food.name} बच्चे के विकास के लिए आवश्यक कैल्शियम और प्रोटीन प्रदान करता है।`
            });
        } else if (name.includes('spinach') || name.includes('palak') || name.includes('methi') || name.includes('broccoli') || name.includes('leafy')) {
            alerts.push({
                type: 'positive',
                en: `Green leafy vegetables like ${food.name} are rich in folic acid and iron.`,
                hi: `${food.name} जैसी हरी पत्तेदार सब्जियां फोलिक एसिड और आयरन से भरपूर होती हैं।`
            });
        } else if (name.includes('fruit') || name.includes('banana') || name.includes('apple') || name.includes('orange') || name.includes('juice')) {
            alerts.push({
                type: 'positive',
                en: `Fruits like ${food.name} are packed with vitamins and natural fiber.`,
                hi: `${food.name} जैसे फल विटामिन और प्राकृतिक फाइबर से भरपूर होते हैं।`
            });
        } else if (name.includes('rice') || name.includes('roti') || name.includes('chawal')) {
            alerts.push({
                type: 'positive',
                en: `${food.name || 'Meal staple'} is healthy in moderate portions. Good choice!`,
                hi: `${food.name || 'भोजन'} सीमित मात्रा में स्वास्थ्यवर्धक है। अच्छा विकल्प!`
            });
        }
    });
    return alerts;
}

/**
 * Generate nutritional safety alerts.
 */
export function calculateNutritionalSafety(totals) {
    const alerts = [];
    if (totals.iron > 5) {
        alerts.push({
            type: 'positive',
            en: 'High Iron meal! Excellent for baby\'s growth.',
            hi: 'आयरन से भरपूर भोजन! बच्चे के स्वास्थ्य के लिए बेहतरीन।'
        });
    }
    if (totals.protein > 15) {
        alerts.push({
            type: 'positive',
            en: 'High Protein meal! Helps in muscle development.',
            hi: 'प्रोटीन से भरपूर भोजन! बच्चे के विकास में सहायक।'
        });
    }
    if (totals.calories > 800) {
        alerts.push({
            type: 'caution',
            en: 'High calorie meal. Monitor your total daily intake.',
            hi: 'अधिक कैलोरी वाला भोजन। अपने दैनिक आहार पर ध्यान दें।'
        });
    }
    return alerts;
}

/**
 * Generates rule-based dynamic insights for offline usage
 */
function generateOfflineDynamicInsights(objects, totals) {
    const itemInsights = [];
    let hasProcessed = false;
    let hasHighOil = false;
    
    objects.forEach(food => {
        const name = (food.name || food.name_en || '').toLowerCase();
        let sentiment = 'positive';
        let en = `${food.name_en || food.name || 'This item'} is a safe and healthy choice.`;
        let hi = `${food.name_hi || food.name_en || food.name || 'यह भोजन'} एक सुरक्षित और स्वस्थ विकल्प है।`;
        
        if (name.includes('lasagne') || name.includes('pizza') || name.includes('burger') || name.includes('processed')) {
            sentiment = 'warning';
            en = 'Processed food, high risk during pregnancy';
            hi = 'गर्भावस्था में प्रसंस्कृत आहार से बचना चाहिए';
            hasProcessed = true;
        } else if (name.includes('manchurian') || name.includes('fried') || name.includes('chilli') || name.includes('samosa') || name.includes('pakora')) {
            sentiment = 'warning';
            en = 'High oil and spice content, consume in limited amounts during pregnancy';
            hi = 'अधिक तेल और मसालों से बना होता है, गर्भावस्था में सीमित मात्रा में लें';
            hasHighOil = true;
        } else if (name.includes('sauce') || name.includes('ketchup') || name.includes('instant') || name.includes('preserved') || name.includes('noodles') || name.includes('maggi')) {
            sentiment = 'caution';
            en = 'Contains preservatives or high sodium, eat in moderation';
            hi = 'इसमें प्रिजर्वेटिव या उच्च सोडियम हो सकता है, संयम से खाएं';
        } else if (name.includes('soda') || name.includes('cola') || name.includes('soft drink') || name.includes('sugar') || name.includes('candy')) {
             sentiment = 'warning';
             en = 'High sugar can increase gestational diabetes risk';
             hi = 'अधिक चीनी जेस्टेशनल डायबिटीज के जोखिम को बढ़ा सकती है';           
        } else if (name.includes('dal') || name.includes('lentil') || name.includes('egg') || name.includes('chicken')) {
            sentiment = 'positive';
            en = 'Good source of protein, helpful for fetal development';
            hi = 'प्रोटीन का अच्छा स्रोत, भ्रूण के विकास में सहायक';
        } else if (name.includes('spinach') || name.includes('leafy') || name.includes('apple') || name.includes('fruit')) {
            sentiment = 'positive';
            en = 'Rich in vitamins and fiber, highly recommended';
            hi = 'विटामिन और फाइबर से भरपूर, बहुत फायदेमंद';
        } else if (name.includes('milk') || name.includes('paneer') || name.includes('curd') || name.includes('yoghurt')) {
            sentiment = 'positive';
            en = `Provides calcium needed for baby's bones`;
            hi = `नवजात की हड्डियों के विकास के लिए आवश्यक कैल्शियम प्रदान करता है`;            
        }

        itemInsights.push({
            name: food.name_en || food.name || '',
            sentiment,
            en,
            hi
        });
    });

    const summaryAlerts = [];
    
    if (hasProcessed && hasHighOil) {
        summaryAlerts.push({
            sentiment: 'warning',
            en: 'Meal contains processed and high oil foods',
            hi: 'भोजन में प्रसंस्कृत और उच्च तेल वाले खाद्य पदार्थ हैं'
        });
    } else if (hasProcessed) {
         summaryAlerts.push({
            sentiment: 'warning',
            en: 'Meal contains processed foods',
            hi: 'भोजन में प्रसंस्कृत खाद्य पदार्थ हैं'
        });       
    } else if (hasHighOil) {
        summaryAlerts.push({
            sentiment: 'warning',
            en: 'Meal is high in oil and spices',
            hi: 'भोजन में तेल और मसाले अधिक हैं'
        });
    }

    if (totals.iron < 3) {
        summaryAlerts.push({
            sentiment: 'warning',
            en: 'Low iron content in the meal, not sufficient for pregnancy',
            hi: 'आहार में आयरन की मात्रा कम है, गर्भावस्था के लिए पर्याप्त नहीं'
        });
    }
    
    if (totals.calories > 800) {
        summaryAlerts.push({
            sentiment: 'caution',
            en: 'High calorie intake detected in a single meal.',
            hi: 'एक ही भोजन में अधिक कैलोरी ली जा रही है।'
        });
    }

    const conclusion = (hasProcessed || hasHighOil || totals.iron < 3) ? {
        en: "This meal has some processed components and might lack essential nutrients. Try substituting with fresh vegetables and iron-rich foods.",
        hi: "इस भोजन में कुछ प्रसंस्कृत (processed) चीज़ें हैं। स्वस्थ गर्भावस्था के लिए अधिक ताजी सब्जियां और आयरन युक्त आहार लें।"
    } : {
        en: "A well-balanced and safe meal for pregnancy. Keep up the good dietary habits!",
        hi: "यह गर्भावस्था के दौरान खाने के लिए एक सुरक्षित और अच्छा भोजन है। अपना आहार ऐसे ही स्वस्थ रखें!"
    };

    return {
        itemInsights,
        summaryAlerts,
        conclusion
    };
}
