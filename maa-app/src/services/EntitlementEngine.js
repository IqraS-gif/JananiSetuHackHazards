/**
 * EntitlementEngine.js
 * Core logic for the "Ration Card to Risk Card" feature.
 * Calculates user eligibility for government schemes and cross-maps it with their nutrition gaps.
 */

import schemesData from '../constants/schemes.json';

/**
 * Main function to generate the Gap Report
 * @param {Object} profile - User profile data from SQLite
 * @param {Object} dailySummary - Today's or average daily nutrition summary
 * @param {Object} nutritionReq - Trimester-specific nutrition requirements
 * @returns {Object} Gap Report containing total unclaimed amount and detailed scheme list
 */
export function generateGapReport(profile, dailySummary, nutritionReq) {
    if (!profile) return { totalPotentialBenefit: 0, schemes: [] };

    let totalPotentialBenefit = 0;
    const reportSchemes = [];

    // Evaluate PMMVY
    const pmmvyResult = evaluatePMMVY(profile);
    if (pmmvyResult.eligible) {
        totalPotentialBenefit += pmmvyResult.unclaimed_amount;
        reportSchemes.push(pmmvyResult);
    }

    // Evaluate JSY
    const jsyResult = evaluateJSY(profile);
    if (jsyResult.eligible) {
        totalPotentialBenefit += jsyResult.unclaimed_amount;
        reportSchemes.push(jsyResult);
    }

    // Evaluate IFA Tablets (Cross-mapped with Iron nutrition gap)
    const ifaResult = evaluateIFATablets(profile, dailySummary, nutritionReq);
    if (ifaResult.eligible) {
        reportSchemes.push(ifaResult);
    }

    // Evaluate NFSA Ration (Cross-mapped with Calorie/Protein gap)
    const nfsaResult = evaluateNFSARation(profile, dailySummary, nutritionReq);
    if (nfsaResult.eligible) {
        reportSchemes.push(nfsaResult);
    }

    // Evaluate JSSK
    const jsskResult = evaluateJSSK(profile);
    if (jsskResult.eligible) {
        reportSchemes.push(jsskResult);
    }

    // Evaluate PMSMA
    const pmsmaResult = evaluatePMSMA(profile);
    if (pmsmaResult.eligible) {
        reportSchemes.push(pmsmaResult);
    }

    // Sort by urgency (HIGH first)
    reportSchemes.sort((a, b) => (a.urgency === 'HIGH' ? -1 : 1));

    return {
        totalPotentialBenefit,
        schemes: reportSchemes
    };
}

// ── Evaluating Individual Schemes ──

function evaluatePMMVY(profile) {
    const pmmvyScheme = schemesData.find(s => s.id === 'pmmvy');
    const result = {
        name_en: pmmvyScheme.name_en,
        name_hi: pmmvyScheme.name_hi,
        eligible: false,
        claimed_status: profile.pmmvy_claimed || 'None',
        unclaimed_amount: 0,
        action_en: pmmvyScheme.action_en,
        action_hi: pmmvyScheme.action_hi,
        urgency: 'NORMAL',
        reason_en: '',
        reason_hi: '',
        type: pmmvyScheme.type,
    };

    // Check basic eligibility
    if (!profile.aadhaar_linked || !profile.jdy_bank) {
        result.eligible = false;
        return result; 
    }

    result.eligible = true;

    const trimester = profile.pregnancy_week ? (profile.pregnancy_week > 28 ? 3 : (profile.pregnancy_week > 13 ? 2 : 1)) : 1;
    let expectedInstallments = 1;
    if (trimester >= 2) expectedInstallments = 2;
    if (trimester === 3 && profile.pregnancy_week > 36) expectedInstallments = 3;

    let claimedValue = 0;
    if (profile.pmmvy_claimed === 'Installment 1') claimedValue = 1;
    if (profile.pmmvy_claimed === '1+2') claimedValue = 2;
    if (profile.pmmvy_claimed === 'All 3') claimedValue = 3;

    if (claimedValue < expectedInstallments) {
        // Gap exists
        const missedInstallments = expectedInstallments - claimedValue;
        result.unclaimed_amount = missedInstallments * 2000; // rough avg
        if (claimedValue === 0) result.unclaimed_amount += 1000; // include first installement logic
        
        result.urgency = 'HIGH';
        result.reason_en = `You are in trimester ${trimester}, but haven't received installment ${claimedValue + 1}.`;
        result.reason_hi = `आप ${trimester} तिमाही में हैं, लेकिन आपको ${claimedValue + 1} किश्त नहीं मिली है।`;
    } else {
        result.unclaimed_amount = 0;
        result.urgency = 'LOW';
        result.reason_en = 'You are up to date with this scheme.';
        result.reason_hi = 'आप इस योजना से पूरी तरह अपडेट हैं।';
    }

    return result;
}

function evaluateJSY(profile) {
    const scheme = schemesData.find(s => s.id === 'jsy');
    const result = {
        name_en: scheme.name_en,
        name_hi: scheme.name_hi,
        eligible: false,
        claimed_status: profile.jsy_registered ? 'Registered' : 'Not Registered',
        unclaimed_amount: 0,
        action_en: scheme.action_en,
        action_hi: scheme.action_hi,
        urgency: 'NORMAL',
        reason_en: '',
        reason_hi: '',
        type: scheme.type,
    };

    if (scheme.eligibility.ration_categories.includes(profile.ration_category)) {
        result.eligible = true;
        const trimester = profile.pregnancy_week ? (profile.pregnancy_week > 28 ? 3 : (profile.pregnancy_week > 13 ? 2 : 1)) : 1;

        if (!profile.jsy_registered) {
            result.unclaimed_amount = scheme.total_amount;
            if (trimester === 3) {
                result.urgency = 'HIGH';
                result.reason_en = 'You are in 3rd trimester. Register now for ₹1,400 hospital delivery incentive.';
                result.reason_hi = 'आप तीसरी तिमाही में हैं। अस्पताल में डिलीवरी प्रोत्साहन के लिए अभी पंजीकरण करें।';
            } else {
                result.urgency = 'MEDIUM';
                result.reason_en = 'You are eligible for ₹1,400 delivery incentive. Register with ASHA soon.';
                result.reason_hi = 'आप ₹1,400 डिलीवरी प्रोत्साहन के पात्र हैं। जल्द ही ASHA के साथ पंजीकरण करें।';
            }
        } else {
            result.urgency = 'LOW';
            result.reason_en = 'You are registered. Ensure hospital delivery to claim the ₹1,400.';
            result.reason_hi = 'आप पंजीकृत हैं। ₹1,400 का दावा करने के लिए अस्पताल में डिलीवरी सुनिश्चित करें।';
        }
    }
    return result;
}

function evaluateIFATablets(profile, dailySummary, nutritionReq) {
    const scheme = schemesData.find(s => s.id === 'ifa_tablets');
    const result = {
        name_en: scheme.name_en,
        name_hi: scheme.name_hi,
        eligible: true, // Everyone is eligible
        claimed_status: profile.iron_supplements_taken ? 'Claiming' : 'Not Tracking Weekly',
        action_en: scheme.action_en,
        action_hi: scheme.action_hi,
        urgency: 'NORMAL',
        reason_en: '',
        reason_hi: '',
        type: scheme.type,
        nutrition_insight_en: null,
        nutrition_insight_hi: null,
    };

    let ironGapPct = 0;
    if (dailySummary && nutritionReq && nutritionReq.min_iron > 0) {
        const ironIntake = dailySummary.total_iron || 0;
        ironGapPct = Math.max(0, 100 - ((ironIntake / nutritionReq.min_iron) * 100));
    }

    if (ironGapPct > 30) {
        result.urgency = 'HIGH';
        result.nutrition_insight_en = `Your diet is missing ${Math.round(ironGapPct)}% of daily Iron. Free IFA tablets will bridge this gap.`;
        result.nutrition_insight_hi = `आपके आहार में आयरन की ${Math.round(ironGapPct)}% कमी है। मुफ्त IFA गोलियां इस कमी को पूरा करेंगी।`;
    } else {
        result.urgency = 'LOW';
        result.nutrition_insight_en = 'Your Iron intake is good, but keep collecting your free IFA tablets.';
        result.nutrition_insight_hi = 'आपका आयरन सेवन अच्छा है, लेकिन अपनी मुफ्त IFA गोलियां लेना जारी रखें।';
    }

    return result;
}

function evaluateNFSARation(profile, dailySummary, nutritionReq) {
    const scheme = schemesData.find(s => s.id === 'nfsa_ration');
    const result = {
        name_en: scheme.name_en,
        name_hi: scheme.name_hi,
        eligible: false,
        claimed_status: profile.nfsa_status ? 'Claiming' : 'Not Claiming',
        action_en: scheme.action_en,
        action_hi: scheme.action_hi,
        urgency: 'NORMAL',
        reason_en: '',
        reason_hi: '',
        type: scheme.type,
        nutrition_insight_en: null,
        nutrition_insight_hi: null,
    };

    if (profile.nfsa_status || scheme.eligibility.ration_categories.includes(profile.ration_category)) {
        result.eligible = true;
        
        let calorieGapPct = 0;
        if (dailySummary && nutritionReq && nutritionReq.min_calories > 0) {
            const calorieIntake = dailySummary.total_calories || 0;
            calorieGapPct = Math.max(0, 100 - ((calorieIntake / nutritionReq.min_calories) * 100));
        }

        if (!profile.nfsa_status) {
            result.urgency = 'HIGH';
            if (calorieGapPct > 20) {
                result.nutrition_insight_en = `You have a ${Math.round(calorieGapPct)}% calorie gap. You are entitled to 5kg extra free grains. claiming this is vital for your baby's weight.`;
                result.nutrition_insight_hi = `आपके आहार में ${Math.round(calorieGapPct)}% कैलोरी की कमी है। आप 5 किलो अतिरिक्त मुफ्त अनाज की हकदार हैं। इसे मांगना जरूरी है।`;
            } else {
                result.reason_en = 'You have AAY/BPL card but are not claiming free pregnancy ration.';
                result.reason_hi = 'आपके पास AAY/BPL कार्ड है लेकिन आप गर्भावस्था का मुफ्त राशन नहीं ले रही हैं।';
            }
        } else {
            result.urgency = 'LOW';
            result.reason_en = 'You are receiving your NFSA ration.';
            result.reason_hi = 'आप अपना NFSA राशन प्राप्त कर रही हैं।';
        }
    }
    return result;
}

function evaluateJSSK(profile) {
    const scheme = schemesData.find(s => s.id === 'jssk');
    const trimester = profile.pregnancy_week ? (profile.pregnancy_week > 28 ? 3 : (profile.pregnancy_week > 13 ? 2 : 1)) : 1;
    
    // Eligible from day 1, but urgency scales up as delivery approaches
    const result = {
        name_en: scheme.name_en,
        name_hi: scheme.name_hi,
        eligible: true,
        claimed_status: 'Available at Delivery',
        action_en: scheme.action_en,
        action_hi: scheme.action_hi,
        unclaimed_amount: 0,
        urgency: trimester === 3 ? 'HIGH' : 'NORMAL',
        reason_en: trimester === 3 ? 'You are approaching delivery. Remember that Govt hospitals provide completely free C-sections and care.' : 'Available when you deliver.',
        reason_hi: trimester === 3 ? 'आप डिलीवरी के करीब हैं। याद रखें कि सरकारी अस्पताल पूरी तरह से मुफ्त सी-सेक्शन और देखभाल प्रदान करते हैं।' : 'आपकी डिलीवरी के समय उपलब्ध है।',
        type: scheme.type,
        nutrition_insight_en: null,
        nutrition_insight_hi: null,
    };

    return result;
}

function evaluatePMSMA(profile) {
    const scheme = schemesData.find(s => s.id === 'pmsma');
    const trimester = profile.pregnancy_week ? (profile.pregnancy_week > 28 ? 3 : (profile.pregnancy_week > 13 ? 2 : 1)) : 1;
    
    const result = {
        name_en: scheme.name_en,
        name_hi: scheme.name_hi,
        eligible: trimester >= 2, // Targeted heavily at 2nd and 3rd trimesters
        claimed_status: 'Monthly on the 9th',
        action_en: scheme.action_en,
        action_hi: scheme.action_hi,
        unclaimed_amount: 0,
        urgency: 'LOW',
        reason_en: 'Eligible for free specialist checkups on the 9th of every month.',
        reason_hi: 'हर महीने की 9 तारीख को मुफ्त विशेषज्ञ जांच के लिए पात्र।',
        type: scheme.type,
        nutrition_insight_en: null,
        nutrition_insight_hi: null,
    };

    if (!result.eligible) return result;

    const todayDate = new Date().getDate();
    // High urgency if the 9th is approaching (e.g. 5th to 9th of the month)
    if (todayDate >= 5 && todayDate <= 9) {
        result.urgency = 'HIGH';
        result.reason_en = `Today is the ${todayDate}th. The PMSMA free specialist check-up clinic is open on the 9th. Do not miss it!`;
        result.reason_hi = `आज ${todayDate} तारीख है। PMSMA मुफ्त विशेषज्ञ चेक-अप क्लिनिक 9 तारीख को खुला है। इसे चुके नहीं!`;
    } else {
        result.urgency = 'NORMAL';
    }

    return result;
}
