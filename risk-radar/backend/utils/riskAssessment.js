exports.calculateRisk = (data) => {
    let score = 0;
    let level = 'Low';

    // Handle Vision Tests
    if (data.testType) {
        switch (data.testType) {
            case 'acuity':
                // score is LogMAR. Lower is better. Normal is 0.0 (20/20).
                // > 0.3 is mild loss, > 0.7 moderate, > 1.0 severe
                const logMAR = parseFloat(data.score || 0);
                if (logMAR <= 0.1) {
                    score = 10;
                    level = 'Low';
                } else if (logMAR <= 0.4) {
                    score = 40;
                    level = 'Moderate';
                } else {
                    score = 80;
                    level = 'High';
                }
                break;

            case 'contrast':
                // score is LogCS. Higher is better. Normal > 1.5.
                // < 1.5 mild, < 1.0 severe
                const logCS = parseFloat(data.score || 0);
                if (logCS >= 1.5) {
                    score = 10;
                    level = 'Low';
                } else if (logCS >= 1.0) {
                    score = 40;
                    level = 'Moderate';
                } else {
                    score = 85;
                    level = 'High';
                }
                break;

            case 'amsler':
                // score is severityScore (0-100).
                const amslerSeverity = parseFloat(data.score || 0);
                if (amslerSeverity === 0) {
                    score = 5;
                    level = 'Low';
                } else if (amslerSeverity <= 30) {
                    score = 45;
                    level = 'Moderate';
                } else if (amslerSeverity <= 70) {
                    score = 75;
                    level = 'High';
                } else {
                    score = 95;
                    level = 'Critical';
                }
                break;

            case 'peripheral':
                // score is VFI (%). Higher is better (100% is normal).
                // < 90% suspected, < 70% damage
                const vfi = parseFloat(data.score || 100);
                if (vfi >= 90) {
                    score = 10;
                    level = 'Low';
                } else if (vfi >= 70) {
                    score = 50;
                    level = 'Moderate';
                } else {
                    score = 85;
                    level = 'High';
                }
                break;

            default:
                // Fallback / General
                score = 20;
                level = 'Low';
        }
    } else {
        // Generic logic if not a specific test type
        if (data.age > 60) score += 20;
        if (data.history) score += 30;

        if (score > 80) level = 'Critical';
        else if (score > 50) level = 'High';
        else if (score > 20) level = 'Moderate';
    }

    return { score, level };
};
