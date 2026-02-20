import { API } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = user ? user.username : 'User';
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Load Assessments
    const container = document.getElementById('assessmentContainer');
    if (container) {
        try {
            const assessments = await API.get('/assessments');

            if (assessments.length === 0) {
                container.innerHTML = '<p>No assessments found. Start a new one!</p>';
            } else {
                container.innerHTML = assessments.map(a => `
                    <div class="assessment-card ${a.riskLevel ? a.riskLevel.toLowerCase() : ''}">
                        <div class="card-header">
                            <h4>${a.type.toUpperCase()} Test</h4>
                            <span class="badge ${a.riskLevel ? a.riskLevel.toLowerCase() : ''}">${a.riskLevel || 'N/A'}</span>
                        </div>
                        <div class="card-body">
                            ${a.type === 'acuity' && a.data && a.data.score !== undefined ? `
                                <p>Score: <strong>${parseFloat(a.data.score).toFixed(2)} LogMAR</strong></p>
                            ` : ''}
                            ${a.type === 'contrast' && a.data && a.data.score !== undefined ? `
                                <p>Score: <strong>${parseFloat(a.data.score).toFixed(2)} LogCS</strong></p>
                            ` : ''}
                            ${a.type === 'amsler' && a.data && a.data.affectedQuadrants && a.data.affectedQuadrants.length > 0 ? `
                                <p class="quadrant-info">Distortion Zones: <strong>${a.data.affectedQuadrants.join(', ')}</strong></p>
                            ` : ''}
                            ${a.type === 'peripheral' && a.data ? `
                                <div class="peripheral-details">
                                    <p>VFI: <strong>${parseFloat(a.data.score || 0).toFixed(0)}%</strong> | MD: <strong>${parseFloat(a.data.md || 0).toFixed(1)}</strong></p>
                                    ${a.data.reliability ? `
                                        <p class="reliability-summary">Reliability: 
                                            FL: ${Math.round(a.data.reliability.fixationLossRate || 0)}% | 
                                            FP: ${Math.round(a.data.reliability.falsePositiveRate || 0)}%
                                        </p>
                                    ` : ''}
                                </div>
                            ` : ''}
                            ${a.mlAnalysis ? `
                                <div class="ml-insights">
                                    <div class="ml-tag">AI Insights (${a.mlAnalysis.method})</div>
                                    <p>AI Risk Score: <strong>${a.mlAnalysis.riskScore}%</strong></p>
                                    <p>AI Confidence: <strong>${(a.mlAnalysis.confidence * 100).toFixed(0)}%</strong></p>
                                    ${a.mlAnalysis.recommendations && a.mlAnalysis.recommendations.length > 0 ? `
                                        <div class="recommendations">
                                            <strong>Recommendations:</strong>
                                            <ul>
                                                ${a.mlAnalysis.recommendations.map(r => `<li>${r}</li>`).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer">
                            <small>Date: ${new Date(a.createdAt).toLocaleDateString()}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            container.innerHTML = `<p class="error">Error loading assessments: ${error.message}</p>`;
        }
    }

    // New Assessment Button
    const newBtn = document.getElementById('newAssessmentBtn');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            window.location.href = 'assessment.html';
        });
    }
});
