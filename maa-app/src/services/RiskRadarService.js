/**
 * RiskRadarService.js
 * Maa App - Eye Health Risk Assessment API client.
 * Connects to the Risk-Radar ML service (Python/Flask on port 5001).
 */

const ML_SERVICE_URL = 'http://192.168.1.3:5001'; // Risk-Radar ML service (Flask on port 5001)

/**
 * Sends eye health parameters to the Risk-Radar ML service
 * and returns a risk assessment result.
 *
 * @param {object} params
 * @param {number} params.age
 * @param {number} params.familyHistory - 0 or 1
 * @param {number} params.logMAR - 0.0 to 2.0
 * @param {number} params.logCS - 0.0 to 2.2
 * @param {number} params.vfi - 0 to 100
 * @param {number} params.amslerDistortion - 0 or 1
 * @returns {Promise<object>} risk assessment result
 */
export async function predictEyeRisk({ age, familyHistory, logMAR, logCS, vfi, amslerDistortion }) {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age, familyHistory, logMAR, logCS, vfi, amslerDistortion }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Server error');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        if (error.message === 'Network request failed') {
            return {
                success: false,
                error: 'offline',
                message: 'Could not connect to the Risk-Radar server. Please ensure the ML service is running.',
            };
        }
        return { success: false, error: 'error', message: error.message };
    }
}

/**
 * Quick health check to see if the ML service is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkMLServiceHealth() {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/health`, {
            method: 'GET',
        });
        return response.ok;
    } catch {
        return false;
    }
}
/**
 * Sends health parameters to the Risk-Radar ML service
 * and returns a diabetes risk assessment result.
 *
 * @param {object} params
 * @returns {Promise<object>} risk assessment result
 */
export async function predictDiabetesRisk(params) {
    try {
        const response = await fetch(`${ML_SERVICE_URL}/predict-diabetes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Server error');
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        if (error.message === 'Network request failed') {
            return {
                success: false,
                error: 'offline',
                message: 'Could not connect to the Risk-Radar server.',
            };
        }
        return { success: false, error: 'error', message: error.message };
    }
}
