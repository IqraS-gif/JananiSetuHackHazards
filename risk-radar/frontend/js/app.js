import { API } from './api.js';
import { ContrastTest } from './vision-tests/contrastTest.js';
import { AcuityTest } from './vision-tests/acuityTest.js';
import { AmslerTest } from './vision-tests/amslerTest.js';
import { PeripheralTest } from './vision-tests/peripheralTest.js';

console.log('Risk Radar App Loaded (Module Mode)');

// Main Orchestrator
document.addEventListener('DOMContentLoaded', () => {
    const testArea = document.getElementById('test-area');
    const instructions = document.getElementById('instructions');

    // Test Buttons
    const btnContrast = document.getElementById('btn-contrast');
    const btnAcuity = document.getElementById('btn-acuity');
    const btnAmsler = document.getElementById('btn-amsler');
    const btnPeripheral = document.getElementById('btn-peripheral');

    if (btnContrast) btnContrast.addEventListener('click', () => runTest('contrast'));
    if (btnAcuity) btnAcuity.addEventListener('click', () => runTest('acuity'));
    if (btnAmsler) btnAmsler.addEventListener('click', () => runTest('amsler'));
    if (btnPeripheral) btnPeripheral.addEventListener('click', () => runTest('peripheral'));

    function runTest(type) {
        if (!instructions || !testArea) return;

        instructions.style.display = 'none';
        testArea.style.display = 'block';

        // Clear previous content
        testArea.innerHTML = '';

        let testInstance;

        switch (type) {
            case 'contrast':
                testInstance = new ContrastTest(testArea);
                break;
            case 'acuity':
                testInstance = new AcuityTest(testArea);
                break;
            case 'amsler':
                testInstance = new AmslerTest(testArea);
                break;
            case 'peripheral':
                testInstance = new PeripheralTest(testArea);
                break;
        }

        if (testInstance) {
            testInstance.start();

            // Hook into completion to save results
            // We'll wrap the end/complete method or poll/check
            // Since the provided classes don't emit events, we'll add a 'Save Results' button 
            // injected by this orchestrator OR we can modify the classes to accept a callback.
            // For now, let's inject a "Return to Dashboard" button that grabs the state.

            // A better approach without modifying the user's huge paste is to observe the DOM
            // or monkey-patch the end method.

            const originalEnd = testInstance.end.bind(testInstance);

            // We need a way to know when the user is DONE. 
            // The classes render a "Test Complete" screen.
            // We can add a "Save & Exit" button to the container when we detect the test is over.

            // Let's rely on mutations or just a simple interval check for "Test Complete" text
            // Or better: pass a callback if we could, but we can't easily change the files now without big edits.

            // Actually, we can just inject a global "Save & Quit" button at the bottom of testArea
            // that calls testInstance.end() and saves.

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'orchestrator-controls';
            controlsDiv.style.marginTop = '20px';
            controlsDiv.style.textAlign = 'center';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save Result & Exit';
            saveBtn.className = 'btn btn-primary';
            saveBtn.style.marginTop = '20px';
            saveBtn.addEventListener('click', async () => {
                const results = testInstance.end();
                console.log('Test Results:', results);

                try {
                    await API.post('/assessments', {
                        type: type,
                        data: results
                    });
                    alert('Results saved!');
                    window.location.href = 'dashboard.html';
                } catch (err) {
                    console.error(err);
                    alert('Error saving results: ' + err.message);
                }
            });

            // Append button (it might be cleared by test updates, so we might need a persistent footer)
            // The test classes clear `this.container.innerHTML`.
            // So we should pass a child div to the test, not the main container.

            testArea.innerHTML = '<div id="test-instance-layer"></div><div id="test-controls-layer"></div>';
            const instanceLayer = document.getElementById('test-instance-layer');
            const controlsLayer = document.getElementById('test-controls-layer');

            // Re-instantiate with the sub-div
            switch (type) {
                case 'contrast': testInstance = new ContrastTest(instanceLayer); break;
                case 'acuity': testInstance = new AcuityTest(instanceLayer); break;
                case 'amsler': testInstance = new AmslerTest(instanceLayer); break;
                case 'peripheral': testInstance = new PeripheralTest(instanceLayer); break;
            }

            testInstance.start();
            controlsLayer.appendChild(saveBtn);
        }
    }
});
