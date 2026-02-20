/**
 * Visual Acuity Test (Tumbling E)
 * Measures visual acuity using the staircase method with size calibration
 */
export class AcuityTest {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.pixelsPerMM = null; // Calibrated pixels per millimeter
    this.currentSize = 88; // Starting size in arcminutes (20/200 equivalent)
    this.minSize = 5; // Minimum 20/20 equivalent
    this.orientation = null; // 'up', 'down', 'left', 'right'
    this.correctStreak = 0;
    this.incorrectStreak = 0;
    this.results = [];
    this.isRunning = false;
    this.testDistance = 6000; // Default 6 meters in mm
    this.reversals = 0;
    this.lastDirection = null; // 'smaller' or 'larger'

    // Clinical size steps (Standard Snellen denominations)
    this.sizeSteps = [88, 70, 55, 44, 35, 28, 22, 17, 14, 11, 8, 5];
    this.currentStepIndex = 0; // Starting at 88
    this.currentSize = this.sizeSteps[this.currentStepIndex];

    // Per-eye testing state
    this.phases = ['Right Eye', 'Left Eye', 'Both Eyes'];
    this.currentPhaseIndex = 0;
    this.allPhaseResults = {};
  }

  start() {
    this.container.innerHTML = '';
    this.isRunning = true;
    this.showCalibration();
  }

  showCalibration() {
    const calibrationDiv = document.createElement('div');
    calibrationDiv.className = 'vision-test-instructions';
    calibrationDiv.innerHTML = `
      <div class="instructions-card">
        <h2>👁️ Visual Acuity Test</h2>
        <h3>Step 1: Screen Calibration</h3>
        <p>For accurate results, we need to calibrate your screen size.</p>
        <div class="calibration-box">
          <div class="credit-card-outline" id="credit-card">
            <span class="card-label">Credit Card Size (85.6mm)</span>
          </div>
          <div class="calibration-controls">
            <button class="calibration-btn" id="decrease-size">-</button>
            <span class="calibration-text">Adjust size to match a real credit card</span>
            <button class="calibration-btn" id="increase-size">+</button>
          </div>
        </div>
        <p style="margin-top: 20px;"><small>Hold a credit card (or ID card) against the box above and adjust until they match.</small></p>
        <button class="start-test-btn" id="calibration-done">Continue to Test</button>
      </div>
    `;

    this.container.appendChild(calibrationDiv);

    let cardWidth = 200; // Initial width in pixels
    const cardElement = document.getElementById('credit-card');
    const decreaseBtn = document.getElementById('decrease-size');
    const increaseBtn = document.getElementById('increase-size');
    const doneBtn = document.getElementById('calibration-done');

    const updateCardSize = () => {
      cardElement.style.width = `${cardWidth}px`;
      // Credit card is 85.6mm wide
      this.pixelsPerMM = cardWidth / 85.6;
    };

    updateCardSize();

    decreaseBtn.addEventListener('click', () => {
      cardWidth = Math.max(100, cardWidth - 5);
      updateCardSize();
    });

    increaseBtn.addEventListener('click', () => {
      cardWidth = Math.min(400, cardWidth + 5);
      updateCardSize();
    });

    doneBtn.addEventListener('click', () => this.showInstructions());

    this.injectStyles();
  }

  showInstructions() {
    this.container.innerHTML = '';

    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'vision-test-instructions';
    instructionsDiv.innerHTML = `
      <div class="instructions-card">
        <h2>👁️ Visual Acuity Test</h2>
        <h3>Step 2: Setup & Instructions</h3>
        
        <div class="setup-group">
          <label>Select Testing Distance:</label>
          <select id="distance-selector" class="calibration-select">
            <option value="6000">6 Meters (Clinical Standard)</option>
            <option value="3000">3 Meters (Laptop/Desktop)</option>
            <option value="1000">1 Meter (Mobile/Tablet)</option>
          </select>
        </div>

        <p>You will see the letter "E" pointing in different directions.</p>
        <div class="eye-sequence-hint">
            Testing Sequence: <strong>Right Eye → Left Eye → Both Eyes</strong>
        </div>
        <ul>
          <li>Cover the eye not being tested with your hand (don't press on the eyelid)</li>
          <li>Use arrow buttons or keyboard arrows to indicate the direction</li>
          <li>The letter gets smaller after <strong>3 correct</strong> answers</li>
          <li>The letter gets larger after <strong>2 wrong</strong> answers</li>
        </ul>
        <button class="start-test-btn">Start Test</button>
      </div>
    `;

    this.container.appendChild(instructionsDiv);

    const startBtn = instructionsDiv.querySelector('.start-test-btn');
    const distanceSelector = document.getElementById('distance-selector');

    startBtn.addEventListener('click', () => {
      this.testDistance = parseInt(distanceSelector.value);
      this.initTest();
    });
  }

  initTest() {
    this.container.innerHTML = '';

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vision-test-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Create controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'acuity-controls';
    controlsDiv.innerHTML = `
      <div class="test-progress">
        <span class="eye-label" id="current-eye-label">RIGHT EYE</span>
        <span>Acuity: <strong id="acuity-level">20/200</strong></span>
        <span>Question: <strong id="question-count">0</strong></span>
      </div>
      <div class="direction-buttons">
        <button class="direction-btn" data-direction="up" title="Up Arrow">↑</button>
        <div class="horizontal-btns">
          <button class="direction-btn" data-direction="left" title="Left Arrow">←</button>
          <button class="direction-btn" data-direction="right" title="Right Arrow">→</button>
        </div>
        <button class="direction-btn" data-direction="down" title="Down Arrow">↓</button>
      </div>
    `;

    this.container.appendChild(this.canvas);
    this.container.appendChild(controlsDiv);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Initialize state
    this.currentStepIndex = 0;
    this.currentSize = this.sizeSteps[this.currentStepIndex];
    this.lastOrientation = null;

    // Add event listeners
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const direction = btn.getAttribute('data-direction');
        this.handleAnswer(direction);
      });
    });

    // Keyboard support
    this.keyHandler = (e) => {
      if (!this.isRunning) return;

      const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        this.handleAnswer(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', this.keyHandler);

    this.nextQuestion();
  }

  resizeCanvas() {
    const containerWidth = this.container.clientWidth;
    const size = Math.min(containerWidth - 40, 600);
    this.canvas.width = size;
    this.canvas.height = size * 0.75;

    if (this.orientation) {
      this.drawE();
    }
  }

  nextQuestion() {
    if (!this.isRunning) return;

    // Random orientation (Avoid repeating same direction twice)
    const orientations = ['up', 'down', 'left', 'right'];
    let newOrientation;
    do {
      newOrientation = orientations[Math.floor(Math.random() * orientations.length)];
    } while (newOrientation === this.lastOrientation);

    this.orientation = newOrientation;
    this.lastOrientation = this.orientation;

    this.updateProgress();
    this.drawE();
  }

  calculateESize() {
    // Convert arcminutes to physical size at test distance
    // tan(angle) = size / distance
    const angleRadians = (this.currentSize / 60) * (Math.PI / 180);
    const physicalSizeMM = Math.tan(angleRadians) * this.testDistance;
    const sizeInPixels = physicalSizeMM * this.pixelsPerMM;

    return Math.max(sizeInPixels, 20); // Minimum 20 pixels
  }

  drawE() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear with light gray background
    this.ctx.fillStyle = '#f9fafb';
    this.ctx.fillRect(0, 0, width, height);

    // Calculate E size (total height/width in pixels)
    const sizePx = this.calculateESize();
    const u = sizePx / 5; // One stroke unit

    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // Rotate based on orientation
    // Default (0 rad) will be pointing RIGHT
    switch (this.orientation) {
      case 'up':
        this.ctx.rotate(-Math.PI / 2);
        break;
      case 'down':
        this.ctx.rotate(Math.PI / 2);
        break;
      case 'left':
        this.ctx.rotate(Math.PI);
        break;
      case 'right':
        // No rotation needed
        break;
    }

    // Draw the Snellen optotype centered at (0,0)
    this.drawOptotypeE(u);

    this.ctx.restore();

    // Fixation dot (Subtle hint for focus)
    this.ctx.fillStyle = "rgba(0,0,0,0.15)";
    this.ctx.beginPath();
    this.ctx.arc(width / 2, height / 2, 2, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  /**
   * Draws a Snellen-standard "E" optotype (5x5 grid)
   * @param {number} u Stroke unit (1/5th of total size)
   */
  drawOptotypeE(u) {
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';

    // Offset to center the 5u x 5u box at (0,0)
    const offset = -2.5 * u;

    // 1. Vertical spine (Left column)
    ctx.fillRect(offset, offset, u, 5 * u);

    // 2. Top horizontal bar (Full 5 units)
    ctx.fillRect(offset, offset, 5 * u, u);

    // 3. Middle horizontal bar (Full 5 units)
    ctx.fillRect(offset, offset + 2 * u, 5 * u, u);

    // 4. Bottom horizontal bar (Full 5 units)
    ctx.fillRect(offset, offset + 4 * u, 5 * u, u);
  }

  handleAnswer(selectedDirection) {
    const isCorrect = selectedDirection === this.orientation;

    this.results.push({
      size: this.currentSize,
      snellen: this.arcMinutesToSnellen(this.currentSize),
      correct: isCorrect,
      orientation: this.orientation,
      selected: selectedDirection
    });

    // Visual feedback
    const buttons = document.querySelectorAll('.direction-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      const btnDirection = btn.getAttribute('data-direction');

      if (btnDirection === this.orientation) {
        btn.classList.add('correct');
      } else if (btnDirection === selectedDirection && !isCorrect) {
        btn.classList.add('incorrect');
      }
    });

    // Staircase logic (3-down / 2-up)
    if (isCorrect) {
      this.correctStreak++;
      this.incorrectStreak = 0;

      // 3 correct -> smaller (next discrete step)
      if (this.correctStreak >= 3) {
        const newDirection = 'smaller';
        if (this.lastDirection === 'larger') {
          this.reversals++;
        }
        this.lastDirection = newDirection;

        // Move to smaller size in steps
        this.currentStepIndex = Math.min(this.sizeSteps.length - 1, this.currentStepIndex + 1);
        this.currentSize = this.sizeSteps[this.currentStepIndex];
        this.correctStreak = 0;
      }
    } else {
      this.incorrectStreak++;
      this.correctStreak = 0;

      // 2 consecutive wrong -> larger (previous discrete step)
      if (this.incorrectStreak >= 2) {
        const newDirection = 'larger';
        if (this.lastDirection === 'smaller') {
          this.reversals++;
        }
        this.lastDirection = newDirection;

        // Move to larger size in steps
        this.currentStepIndex = Math.max(0, this.currentStepIndex - 1);
        this.currentSize = this.sizeSteps[this.currentStepIndex];
        this.incorrectStreak = 0;
      }
    }

    // End phase after 8 reversals or 25 questions per eye
    if (this.reversals >= 8 || this.results.length >= 25) {
      setTimeout(() => this.nextPhase(), 800);
    } else {
      setTimeout(() => {
        // Re-enable buttons
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('correct', 'incorrect');
        });
        this.nextQuestion();
      }, 800);
    }
  }

  nextPhase() {
    // Save current phase results
    const phaseName = this.phases[this.currentPhaseIndex];
    this.allPhaseResults[phaseName] = this.calculatePhaseAcuity();

    this.currentPhaseIndex++;

    if (this.currentPhaseIndex < this.phases.length) {
      // Show intermission
      this.showPhaseIntermission();
    } else {
      this.completeTest();
    }
  }

  calculatePhaseAcuity() {
    const summaryBySize = {};
    this.results.forEach(res => {
      if (!summaryBySize[res.size]) {
        summaryBySize[res.size] = { total: 0, correct: 0 };
      }
      summaryBySize[res.size].total++;
      if (res.correct) summaryBySize[res.size].correct++;
    });

    const sizes = Object.keys(summaryBySize).map(Number).sort((a, b) => a - b);
    let bestSize = sizes[sizes.length - 1]; // Fallback to largest

    // 62.5% threshold to account for 25% guess probability in 4-choice test
    const clinicalThreshold = 0.625;

    for (const size of sizes) {
      const stats = summaryBySize[size];
      if (stats.correct / stats.total >= clinicalThreshold) {
        bestSize = size;
        break;
      }
    }

    return {
      bestSize,
      snellen: this.arcMinutesToSnellen(bestSize),
      logMAR: this.arcMinutesToLogMAR(bestSize),
      results: [...this.results]
    };
  }

  showPhaseIntermission() {
    this.isRunning = false;
    const nextEye = this.phases[this.currentPhaseIndex];

    // Clear canvas and show instructions
    this.ctx.fillStyle = '#f9fafb';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const overlay = document.createElement('div');
    overlay.className = 'test-intermission-overlay';
    overlay.innerHTML = `
        <div class="intermission-card">
            <h2>Next Phase</h2>
            <p>Ready to test your <strong>${nextEye}</strong>?</p>
            <p><small>(Remember to switch hands if covering the eye)</small></p>
            <button class="start-test-btn" id="start-next-phase">Resume Test</button>
        </div>
    `;
    this.container.appendChild(overlay);

    document.getElementById('start-next-phase').addEventListener('click', () => {
      overlay.remove();
      this.resetPhase();
      this.isRunning = true;
      this.nextQuestion();
    });
  }

  resetPhase() {
    this.currentStepIndex = 0;
    this.currentSize = this.sizeSteps[this.currentStepIndex];
    this.correctStreak = 0;
    this.incorrectStreak = 0;
    this.results = [];
    this.reversals = 0;
    this.lastDirection = null;
    this.lastOrientation = null;

    // Immediate UI reset
    const eyeLabel = document.getElementById('current-eye-label');
    const questionCount = document.getElementById('question-count');
    const acuityLevel = document.getElementById('acuity-level');

    if (eyeLabel) eyeLabel.textContent = this.phases[this.currentPhaseIndex].toUpperCase();
    if (questionCount) questionCount.textContent = "0";
    if (acuityLevel) acuityLevel.textContent = this.arcMinutesToSnellen(this.currentSize);
  }

  arcMinutesToSnellen(arcMinutes) {
    // MAR = Minimum Angle of Resolution (size of 1 element in arcminutes)
    // For Snellen, MAR is 1/5th of total optotype size
    const MAR = arcMinutes / 5;
    const denominator = Math.round(20 * MAR);
    return `20/${denominator}`;
  }

  arcMinutesToLogMAR(arcMinutes) {
    // LogMAR = log10(arcMinutes / 5)
    return Math.log10(arcMinutes / 5);
  }

  updateProgress() {
    const snellen = this.arcMinutesToSnellen(this.currentSize);
    document.getElementById('acuity-level').textContent = snellen;
    document.getElementById('question-count').textContent = this.results.length + 1;
  }

  completeTest() {
    this.isRunning = false;
    window.removeEventListener('keydown', this.keyHandler);

    const rRes = this.allPhaseResults['Right Eye'];
    const lRes = this.allPhaseResults['Left Eye'];
    const bRes = this.allPhaseResults['Both Eyes'];

    this.container.innerHTML = `
      <div class="test-complete">
        <h2>✅ Test Complete</h2>
        <div class="results-table">
            <div class="table-row header">
                <span>Eye</span>
                <span>Snellen</span>
                <span>LogMAR</span>
            </div>
            <div class="table-row">
                <span>Right Eye</span>
                <strong>${rRes.snellen}</strong>
                <span>${rRes.logMAR.toFixed(2)}</span>
            </div>
            <div class="table-row">
                <span>Left Eye</span>
                <strong>${lRes.snellen}</strong>
                <span>${lRes.logMAR.toFixed(2)}</span>
            </div>
            <div class="table-row highlight">
                <span>Combined</span>
                <strong>${bRes.snellen}</strong>
                <span>${bRes.logMAR.toFixed(2)}</span>
            </div>
        </div>
        <div class="interpretation">
          <p><strong>Interpretation:</strong></p>
          <p>${this.getInterpretation(bRes.snellen)}</p>
          <p><small>Note: This test calibration is based on your selected distance of <strong>${(this.testDistance / 1000).toFixed(1)}m</strong>.</small></p>
        </div>
      </div>
    `;
  }

  getInterpretation(snellen) {
    const denominator = parseInt(snellen.split('/')[1]);

    if (denominator <= 20) {
      return 'Excellent visual acuity - equal to or better than 20/20.';
    } else if (denominator <= 40) {
      return 'Good visual acuity - within normal range.';
    } else if (denominator <= 70) {
      return 'Reduced visual acuity - may benefit from corrective lenses.';
    } else {
      return 'Significantly reduced visual acuity. Recommend consulting an eye care professional.';
    }
  }

  end() {
    this.isRunning = false;
    const bRes = this.allPhaseResults['Both Eyes'] || this.calculatePhaseAcuity();

    const binocularCorrect = bRes.results.filter(r => r.correct).length;
    const binocularTotal = bRes.results.length;
    const binocularAccuracy = binocularTotal > 0 ? (binocularCorrect / binocularTotal * 100).toFixed(1) : 0;

    return {
      score: bRes.logMAR,
      metric: 'LogMAR',
      snellen: bRes.snellen,
      eyeData: this.allPhaseResults,
      accuracy: binocularAccuracy,
      results: this.allPhaseResults // Return full multi-eye data set
    };
  }

  injectStyles() {
    if (document.getElementById('acuity-test-styles')) return;

    const style = document.createElement('style');
    style.id = 'acuity-test-styles';
    style.textContent = `
      #test-area, .vision-test-canvas {
        position: relative;
        min-height: 400px;
      }

      .calibration-box {
        margin: 30px auto;
        text-align: center;
      }
      
      .credit-card-outline {
        width: 200px;
        height: 126px;
        border: 3px solid #2563eb;
        border-radius: 8px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        position: relative;
      }
      
      .card-label {
        color: white;
        font-weight: bold;
        font-size: 12px;
        text-align: center;
        padding: 10px;
      }
      
      .calibration-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
      }
      
      .calibration-btn {
        background: #2563eb;
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .calibration-btn:hover {
        background: #1d4ed8;
      }
      
      .calibration-text {
        font-size: 14px;
        color: #6b7280;
      }
      
      .direction-example {
        margin: 20px 0;
        text-align: center;
      }
      
      .e-example {
        font-size: 48px;
        font-weight: bold;
        font-family: monospace;
        color: #2563eb;
        margin-bottom: 10px;
      }
      
      .arrow-hints {
        font-size: 24px;
        color: #6b7280;
      }
      
      .acuity-controls {
        max-width: 600px;
        margin: 20px auto;
        padding: 0 20px;
      }
      
      .direction-buttons {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-top: 20px;
      }
      
      .horizontal-btns {
        display: flex;
        gap: 80px;
      }
      
      .direction-btn {
        background: white;
        border: 2px solid #e5e7eb;
        width: 60px;
        height: 60px;
        border-radius: 12px;
        font-size: 28px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .direction-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #2563eb;
        transform: scale(1.1);
      }
      
      .direction-btn:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
      
      .direction-btn.correct {
        background: #10b981;
        border-color: #10b981;
        color: white;
      }
      
      .direction-btn.incorrect {
        background: #ef4444;
        border-color: #ef4444;
        color: white;
      }
      
      .setup-group {
        margin: 20px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      
      .calibration-select {
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #ddd;
        font-size: 16px;
        width: 100%;
        max-width: 300px;
      }

      .eye-sequence-hint {
          background: #fdf2f2;
          padding: 10px;
          border-radius: 6px;
          border-left: 4px solid #ef4444;
          margin: 15px 0;
          font-size: 14px;
      }

      .test-progress {
          position: relative;
      }

      .test-intermission-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          padding-bottom: 20%;
          height: 100%;
          background: rgba(255,255,255,0.98);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          text-align: center;
      }

      .intermission-card {
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid #eee;
      }

      .eye-label {
          background: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
      }

      .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
      }

      .table-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          border-bottom: 1px solid #f0f0f0;
      }

      .table-row.header {
          background: #f8fafc;
          font-weight: bold;
          font-size: 13px;
          color: #64748b;
          text-transform: uppercase;
      }

      .table-row.highlight {
          background: #eff6ff;
          border-radius: 8px;
          border-bottom: none;
          margin-top: 5px;
      }
    `;

    document.head.appendChild(style);
  }
}