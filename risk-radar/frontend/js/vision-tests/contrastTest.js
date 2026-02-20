/**
 * Contrast Sensitivity Test (Clinical Edition v2)
 * Based on Pelli-Robson Chart protocol using Sloan letters and Logarithmic steps.
 */
export class ContrastTest {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;

    // Sloan letters per Pelli-Robson standard
    this.sloanLetters = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];

    // Clinical Protocol Settings
    this.LOG_STEP = 0.15; // Log units per level
    this.START_LOG_CS = 0.0; // 100% contrast
    this.LETTERS_PER_LEVEL = 3; // Triplet structure

    // State management
    this.phases = ['Right Eye', 'Left Eye', 'Both Eyes'];
    this.currentPhaseIndex = 0;
    this.currentLetter = null;
    this.allPhaseResults = {};

    // Current trial state
    this.currentLogCS = this.START_LOG_CS;
    this.lettersTriedInLevel = 0;
    this.correctInLevel = 0;
    this.totalCorrect = 0;
    this.totalTrials = 0;
    this.lastPassedLogCS = -0.15; // Set to -0.15 so first pass (0.0) works

    this.results = []; // Detailed trial history
  }

  /**
   * Entry point for the assessment orchestrator
   */
  start() {
    this.container.innerHTML = '';
    this.isRunning = true;
    this.showInstructions();
    this.injectStyles();
  }

  showInstructions() {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'vision-test-instructions';
    instructionsDiv.innerHTML = `
      <div class="instructions-card">
        <h2>📊 Clinical Contrast Test</h2>
        <p>This test measures how well you see objects against their background, which is critical for driving and early disease detection.</p>
        
        <div class="setup-group">
          <strong>Testing Protocol:</strong>
          <ul>
            <li>Sit at a comfortable distance (approx. 50-60cm).</li>
            <li>We will test: <strong>Right Eye → Left Eye → Both Eyes</strong>.</li>
            <li>Letters will appear one by one, gradually becoming harder to see.</li>
          </ul>
        </div>

        <div class="setup-group">
          <strong>How to perform:</strong>
          <ul>
            <li>Identify the letter shown on the screen.</li>
            <li>Click the corresponding button below.</li>
            <li>Guess if you are unsure—it's part of the clinical calculation.</li>
            <li>Maintain focus on the central screen area.</li>
          </ul>
        </div>

        <div class="warning-box">
          ⚠️ <strong>Note:</strong> The letters will become extremely faint. This is normal and expected for a sensitivity test.
        </div>
        
        <button class="start-test-btn">Begin Assessment</button>
      </div>
    `;

    this.container.appendChild(instructionsDiv);
    const startBtn = instructionsDiv.querySelector('.start-test-btn');
    startBtn.addEventListener('click', () => this.initTest());
  }

  initTest() {
    this.container.innerHTML = '';

    // UI Layout
    const wrapper = document.createElement('div');
    wrapper.className = 'contrast-test-wrapper';

    // Progress Header
    const progressDiv = document.createElement('div');
    progressDiv.className = 'test-progress-header';
    progressDiv.innerHTML = `
      <div class="test-meta">
        <span class="eye-badge" id="eye-label">${this.phases[this.currentPhaseIndex].toUpperCase()}</span>
        <span class="step-info">LogCS: <strong id="logcs-level">0.00</strong></span>
      </div>
      <div class="progress-track">
        Level Success: <span id="triplet-progress">0/3</span>
      </div>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'contrast-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Choices
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'letter-selection-grid';
    choicesDiv.id = 'letter-choices';

    wrapper.appendChild(progressDiv);
    wrapper.appendChild(this.canvas);
    wrapper.appendChild(choicesDiv);
    this.container.appendChild(wrapper);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.createChoiceButtons();
    this.nextQuestion();
  }

  resizeCanvas() {
    const size = Math.min(this.container.clientWidth - 40, 500);
    this.canvas.width = size;
    this.canvas.height = size * 0.6;
    if (this.currentLetter) this.drawLetter();
  }

  nextQuestion() {
    if (!this.isRunning) return;

    // 1. Check if triplet is complete
    if (this.lettersTriedInLevel >= this.LETTERS_PER_LEVEL) {
      // Pelli-Robson Rule: Need at least 2/3 correct to pass the level
      if (this.correctInLevel >= 2) {
        this.lastPassedLogCS = this.currentLogCS;
        this.currentLogCS = parseFloat((this.currentLogCS + this.LOG_STEP).toFixed(2));
        this.lettersTriedInLevel = 0;
        this.correctInLevel = 0;
      } else {
        // Termination logic
        this.completePhase();
        return;
      }
    }

    // 2. Pick next letter (Sloan)
    this.currentLetter = this.sloanLetters[Math.floor(Math.random() * this.sloanLetters.length)];
    this.totalTrials++;
    this.lettersTriedInLevel++;

    this.updateUI();
    this.drawLetter();
    this.enableButtons(true);
  }

  drawLetter() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear with clinical white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle Fixation Dot (Subtle hint for focus)
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Calculate Contrast
    // Weber Contrast = (L_target - L_bg) / L_bg
    // In our case L_bg is white (255)
    // Contrast threshold C = 10^(-LogCS)
    const contrast = Math.max(0.005, Math.pow(10, -this.currentLogCS));
    const grayValue = 255 * (1 - contrast);

    ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
    ctx.font = `bold ${Math.min(width, height) * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentLetter, width / 2, height / 2);
  }

  createChoiceButtons() {
    const choicesDiv = document.getElementById('letter-choices');
    choicesDiv.innerHTML = '';

    this.sloanLetters.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'sloan-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => this.handleAnswer(letter));
      choicesDiv.appendChild(btn);
    });
  }

  handleAnswer(selected) {
    const isCorrect = selected === this.currentLetter;

    this.results.push({
      phase: this.phases[this.currentPhaseIndex],
      logCS: this.currentLogCS,
      letter: this.currentLetter,
      selected: selected,
      correct: isCorrect
    });

    if (isCorrect) {
      this.correctInLevel++;
      this.totalCorrect++;
    }

    this.enableButtons(false);

    // Brief feedback then next
    setTimeout(() => this.nextQuestion(), 400);
  }

  enableButtons(status) {
    const btns = document.querySelectorAll('.sloan-btn');
    btns.forEach(b => b.disabled = !status);
  }

  updateUI() {
    document.getElementById('logcs-level').textContent = this.currentLogCS.toFixed(2);
    document.getElementById('triplet-progress').textContent = `${this.lettersTriedInLevel}/${this.LETTERS_PER_LEVEL}`;
  }

  completePhase() {
    const phaseName = this.phases[this.currentPhaseIndex];

    // Store results
    this.allPhaseResults[phaseName] = {
      logCS: Math.max(0.00, this.lastPassedLogCS),
      phaseAccuracy: ((this.totalCorrect / Math.max(1, this.totalTrials)) * 100).toFixed(1),
      trials: this.totalTrials
    };

    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.showIntermission();
    } else {
      this.completeFinalTest();
    }
  }

  showIntermission() {
    this.isRunning = false;
    const nextEye = this.phases[this.currentPhaseIndex];

    const overlay = document.createElement('div');
    overlay.className = 'test-intermission-overlay';
    overlay.innerHTML = `
      <div class="intermission-card">
        <h2>Phase Complete</h2>
        <p>Prepare for <strong>${nextEye}</strong> testing.</p>
        <p><small>(Adjust eye cover and distance if needed)</small></p>
        <button class="start-test-btn" id="resume-test">Continue</button>
      </div>
    `;
    this.container.appendChild(overlay);

    document.getElementById('resume-test').addEventListener('click', () => {
      overlay.remove();
      this.resetPhaseState();
      this.isRunning = true;

      const label = document.getElementById('eye-label');
      if (label) label.textContent = nextEye.toUpperCase();
      this.nextQuestion();
    });
  }

  resetPhaseState() {
    this.currentLogCS = this.START_LOG_CS;
    this.lettersTriedInLevel = 0;
    this.correctInLevel = 0;
    this.totalCorrect = 0;
    this.totalTrials = 0;
    this.lastPassedLogCS = -0.15;
  }

  completeFinalTest() {
    this.isRunning = false;
    this.container.innerHTML = '';

    const finalData = this.end();

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'contrast-results-screen';
    summaryDiv.innerHTML = `
      <div class="results-card">
        <div class="result-header">
          <h2>✅ Assessment Complete</h2>
          <span class="severity-tag ${finalData.severityLevel.toLowerCase()}">${finalData.severityLevel}</span>
        </div>

        <div class="clinical-scores">
          <div class="score-row">
            <span>OD (Right Eye):</span>
            <strong>${this.allPhaseResults['Right Eye'].logCS.toFixed(2)} LogCS</strong>
          </div>
          <div class="score-row">
            <span>OS (Left Eye):</span>
            <strong>${this.allPhaseResults['Left Eye'].logCS.toFixed(2)} LogCS</strong>
          </div>
          <div class="score-row highlight">
            <span>OU (Both Eyes):</span>
            <strong>${this.allPhaseResults['Both Eyes'].logCS.toFixed(2)} LogCS</strong>
          </div>
        </div>

        <div class="interpretation-box">
          <p><strong>Clinical Interpretation:</strong></p>
          <p>${this.getClinicalInterpretation(finalData.score)}</p>
        </div>

        <div class="medical-disclaimer">
          <strong>Note:</strong> LogCS values above 1.6 are typically considered normal for adults. Values below 1.5 may indicate early signs of cataracts, glaucoma, or diabetic retinopathy. Please consult a specialist if scores differ significantly between eyes.
        </div>
      </div>
    `;

    this.container.appendChild(summaryDiv);
  }

  getClinicalInterpretation(logCS) {
    if (logCS >= 1.7) return "Excellent Contrast Sensitivity. Well above population averages.";
    if (logCS >= 1.5) return "Normal Contrast Sensitivity. Within standard clinical range.";
    if (logCS >= 1.25) return "Mildly Reduced. May experience slight difficulty in low-light or fog.";
    if (logCS >= 1.0) return "Moderately Reduced. Significant impact on daily visual tasks (e.g. night driving).";
    return "Severely Reduced. High risk of clinical pathology. Immediate specialist referral recommended.";
  }

  /**
   * Returns ML-ready JSON payload
   */
  end() {
    this.isRunning = false;

    const binocular = this.allPhaseResults['Both Eyes'] || { logCS: 0 };
    const score = binocular.logCS;

    let severity = 'Normal';
    if (score < 1.0) severity = 'Severe';
    else if (score < 1.3) severity = 'Moderate';
    else if (score < 1.5) severity = 'Mild';

    const grandTotalCorrect = this.results.filter(r => r.correct).length;
    const grandTotalTrials = this.results.length;

    return {
      metric: "LogCS",
      score: score, // Principal score for dashboard
      contrastThreshold: Math.pow(10, -score),
      severityLevel: severity,
      eyeResults: this.allPhaseResults,
      accuracy: ((grandTotalCorrect / Math.max(1, grandTotalTrials)) * 100).toFixed(1),
      rawTrials: this.results
    };
  }

  injectStyles() {
    if (document.getElementById('contrast-clinical-styles')) return;
    const style = document.createElement('style');
    style.id = 'contrast-clinical-styles';
    style.textContent = `
      .contrast-test-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }

      .test-progress-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        background: #f8fafc;
        padding: 12px 20px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }

      .test-meta {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .eye-badge {
        background: #3b82f6;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 12px;
      }

      .contrast-canvas {
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      }

      .letter-selection-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        width: 100%;
      }

      .sloan-btn {
        background: white;
        border: 2px solid #cbd5e1;
        padding: 15px 5px;
        border-radius: 10px;
        font-size: 20px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sloan-btn:hover:not(:disabled) {
        border-color: #3b82f6;
        color: #3b82f6;
        transform: translateY(-2px);
      }

      .sloan-btn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .contrast-results-screen {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }

      .results-card {
        background: white;
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
      }

      .severity-tag {
        padding: 6px 16px;
        border-radius: 30px;
        font-weight: 700;
        color: white;
      }

      .severity-tag.normal { background: #10b981; }
      .severity-tag.mild { background: #f59e0b; }
      .severity-tag.moderate { background: #f97316; }
      .severity-tag.severe { background: #ef4444; }

      .clinical-scores {
        margin-bottom: 25px;
      }

      .score-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .score-row.highlight {
        background: #f0f9ff;
        border: none;
        padding: 15px;
        border-radius: 12px;
        margin-top: 10px;
        color: #0369a1;
      }

      .medical-disclaimer {
        margin-top: 25px;
        font-size: 12px;
        color: #64748b;
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        line-height: 1.6;
      }

      .test-intermission-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        color: white;
      }

      .intermission-card {
        background: white;
        color: #1e293b;
        padding: 40px;
        border-radius: 24px;
        text-align: center;
        max-width: 80%;
      }
    `;
    document.head.appendChild(style);
  }
}