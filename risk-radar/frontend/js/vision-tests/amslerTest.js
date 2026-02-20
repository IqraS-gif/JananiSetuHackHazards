/**
 * Amsler Grid Test (Clinical Edition)
 * Interactive 20x20 grid for early detection of macular degeneration and scotomas.
 */
export class AmslerTest {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
    this.isDrawing = false;

    // Grid settings
    this.gridSize = 20; // 20x20 clinical standard
    this.cellSize = 0;
    this.FIXATION_SAFETY_RADIUS = 25; // Pixels around center that cannot be marked

    // State management
    this.markedCells = new Set();
    this.phases = ['Right Eye', 'Left Eye', 'Both Eyes'];
    this.currentPhaseIndex = 0;
    this.allPhaseResults = {};

    this.keyHandler = null;
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
        <h2>📐 Amsler Grid Test</h2>
        <p>This test screens for <strong>Metamorphopsia</strong> (distorted vision) and <strong>Scotomas</strong> (blind spots) in your central field.</p>
        
        <div class="setup-group">
          <strong>Testing Protocol:</strong>
          <ul>
            <li>Maintain a distance of about 30-40cm (12-15 inches).</li>
            <li>If you wear reading glasses, keep them on.</li>
            <li>Sequence: <strong>Right Eye → Left Eye → Both Eyes</strong></li>
          </ul>
        </div>

        <div class="setup-group">
          <strong>How to perform:</strong>
          <ul>
            <li>Focus intensely on the <strong>central green dot</strong>.</li>
            <li>While looking ONLY at the dot, use your peripheral vision to check the grid.</li>
            <li>Do any lines look wavy, broken, or blurry?</li>
            <li>Are any boxes missing or darkened?</li>
            <li><strong>Click or drag</strong> on the screen to mark those distorted areas.</li>
          </ul>
        </div>

        <div class="warning-box">
          ⚠️ <strong>Fixation Rule:</strong> Do not move your eyes to look at the distortions. Keep focusing on the center dot while you mark.
        </div>
        
        <button class="start-test-btn">I'm Ready</button>
      </div>
    `;

    this.container.appendChild(instructionsDiv);
    const startBtn = instructionsDiv.querySelector('.start-test-btn');
    startBtn.addEventListener('click', () => this.initTest());
  }

  initTest() {
    this.container.innerHTML = '';

    // Create UI Structure
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'amsler-test-wrapper';

    // Canvas Container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'amsler-canvas-container';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'amsler-canvas';
    this.ctx = this.canvas.getContext('2d');
    canvasContainer.appendChild(this.canvas);

    // Controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'amsler-controls';
    controlsDiv.innerHTML = `
      <div class="test-progress">
        <span class="eye-label" id="current-eye-label">${this.phases[this.currentPhaseIndex].toUpperCase()}</span>
        <span>Question: <strong>Mark Distortions</strong></span>
      </div>
      <div class="amsler-instruction-hint">
        Click or drag to mark wavy or missing lines
      </div>
      <div class="amsler-actions">
        <button class="amsler-btn" id="clear-marks">Clear Current marks</button>
        <button class="amsler-btn primary" id="next-phase-btn">Submit Phase</button>
      </div>
    `;

    mainWrapper.appendChild(canvasContainer);
    mainWrapper.appendChild(controlsDiv);
    this.container.appendChild(mainWrapper);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Input Listeners
    this.setupInteractions();

    // Button Handlers
    document.getElementById('clear-marks').addEventListener('click', () => {
      this.markedCells.clear();
      this.draw();
    });

    document.getElementById('next-phase-btn').addEventListener('click', () => {
      this.completePhase();
    });

    this.draw();
  }

  setupInteractions() {
    const handleInput = (e) => {
      if (!this.isDrawing) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      this.markAtPosition(x, y);
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      handleInput(e);
    });

    this.canvas.addEventListener('mousemove', handleInput);
    window.addEventListener('mouseup', () => this.isDrawing = false);

    // Touch Support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDrawing = true;
      handleInput(e);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleInput(e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => this.isDrawing = false);
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const size = Math.min(container.clientWidth, 600);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = size / this.gridSize;
    this.draw();
  }

  markAtPosition(x, y) {
    // 1. Fixation Safety Check
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const distToCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    if (distToCenter < this.FIXATION_SAFETY_RADIUS) return; // Prevent marking center

    // 2. Map to Grid
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      const key = `${row},${col}`;
      if (!this.markedCells.has(key)) {
        this.markedCells.add(key);
        this.draw();
      }
    }
  }

  draw() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear background
    ctx.fillStyle = '#111827'; // Dark theme background
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    for (let i = 0; i <= this.gridSize; i++) {
      const pos = i * this.cellSize;

      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.stroke();

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }

    // Draw marked cells
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; // Clinical Red
    this.markedCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      ctx.fillRect(c * this.cellSize + 1, r * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
    });

    // Draw Fixation Dot
    const cx = width / 2;
    const cy = height / 2;

    // Outer Glow
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 15);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    // Central Point
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Core highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  completePhase() {
    const phaseName = this.phases[this.currentPhaseIndex];
    this.allPhaseResults[phaseName] = this.calculatePhaseScore();

    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.showIntermission();
    } else {
      this.completeOverallTest();
    }
  }

  showIntermission() {
    const nextEye = this.phases[this.currentPhaseIndex];
    this.isRunning = false;

    const overlay = document.createElement('div');
    overlay.className = 'test-intermission-overlay';
    overlay.innerHTML = `
        <div class="intermission-card">
            <h2>Phase Complete</h2>
            <p>Ready to test your <strong>${nextEye}</strong>?</p>
            <p><small>(Cover the other eye before clicking resume)</small></p>
            <button class="start-test-btn" id="start-next-phase">Resume Test</button>
        </div>
    `;
    this.container.appendChild(overlay);

    document.getElementById('start-next-phase').addEventListener('click', () => {
      overlay.remove();
      this.isDrawing = false;
      this.markedCells.clear();
      this.isRunning = true;

      const label = document.getElementById('current-eye-label');
      if (label) label.textContent = nextEye.toUpperCase();
      this.draw();
    });
  }

  calculatePhaseScore() {
    const markedCount = this.markedCells.size;
    const markedArray = Array.from(this.markedCells).map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });

    // Quadrants
    const quadrants = { TL: 0, TR: 0, BL: 0, BR: 0 };
    markedArray.forEach(cell => {
      if (cell.row < 10) {
        if (cell.col < 10) quadrants.TL++;
        else quadrants.TR++;
      } else {
        if (cell.col < 10) quadrants.BL++;
        else quadrants.BR++;
      }
    });

    // Clinical Severity Matrix
    // Amsler grids are 400 cells. 
    // Moderate distortion is often > 5-10% coverage.
    const severityPercentage = (markedCount / 400) * 100;
    let level = 'Normal';
    let score = 0;

    if (markedCount > 0) {
      if (markedCount <= 5) {
        level = 'Mild';
        score = 25;
      } else if (markedCount <= 20) {
        level = 'Moderate';
        score = 60;
      } else {
        level = 'Severe';
        score = 90;
      }
    }

    return {
      hasDistortion: markedCount > 0,
      count: markedCount,
      markedCells: markedArray,
      quadrants: Object.keys(quadrants).filter(q => quadrants[q] > 0),
      severity: level,
      riskScore: score
    };
  }

  completeOverallTest() {
    this.isRunning = false;
    this.container.innerHTML = '';

    // Aggregate data
    const finalData = this.end();
    const isCrisis = finalData.distortionLevel === 'Severe';
    const badgeClass = finalData.distortionLevel.toLowerCase();

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'amsler-results-screen';
    resultsDiv.innerHTML = `
      <div class="results-card">
        <div class="result-header ${isCrisis ? 'danger' : ''}">
          <h2>${isCrisis ? '⚠️' : '✅'} Clinical Summary</h2>
          <span class="status-badge ${badgeClass}">${finalData.distortionLevel}</span>
        </div>

        <div class="results-grid">
          <div class="eye-stat">
            <strong>Right Eye</strong>
            <span>${this.allPhaseResults['Right Eye'].severity}</span>
          </div>
          <div class="eye-stat">
            <strong>Left Eye</strong>
            <span>${this.allPhaseResults['Left Eye'].severity}</span>
          </div>
        </div>

        <div class="clinical-details">
          <p><strong>Affected Quadrants:</strong> ${finalData.affectedQuadrants.length ? finalData.affectedQuadrants.join(', ') : 'None'}</p>
          <p><strong>Total Marked Area:</strong> ${finalData.markedCells.length} cells</p>
        </div>

        <div class="disclaimer">
          <strong>Medical Disclaimer:</strong> This test is a screening tool for home monitoring and DOES NOT replace a clinical examination by an ophthalmologist. If you notice any sudden changes in your vision, seek medical attention immediately.
        </div>

        <p class="next-steps-hint">Results have been saved and sent for AI Risk Analysis.</p>
      </div>
    `;

    this.container.appendChild(resultsDiv);
  }

  /**
   * Returns ML-ready JSON payload
   */
  end() {
    this.isRunning = false;

    // We prioritize the worst eye for the overall status
    const eyeResults = this.allPhaseResults;
    const allEyes = Object.values(eyeResults);

    let highestScore = 0;
    let worstLevel = 'Normal';
    const allQuadrants = new Set();
    const uniqueMarkedKeys = new Set();

    allEyes.forEach(res => {
      if (res.riskScore > highestScore) highestScore = res.riskScore;
      if (res.severity === 'Severe') worstLevel = 'Severe';
      else if (res.severity === 'Moderate' && worstLevel !== 'Severe') worstLevel = 'Moderate';
      else if (res.severity === 'Mild' && worstLevel === 'Normal') worstLevel = 'Mild';

      res.quadrants.forEach(q => allQuadrants.add(q));
      res.markedCells.forEach(c => uniqueMarkedKeys.add(`${c.row},${c.col}`));
    });

    const dedupedMarkedCells = Array.from(uniqueMarkedKeys).map(k => {
      const [r, c] = k.split(',').map(Number);
      return { row: r, col: c };
    });

    return {
      hasDistortion: highestScore > 0,
      severityScore: highestScore,
      distortionLevel: worstLevel,
      affectedQuadrants: Array.from(allQuadrants),
      markedCells: dedupedMarkedCells,
      eyeResults: eyeResults,
      metric: 'Amsler_Distortion_Score',
      score: highestScore // Compatibility with internal dashboard router
    };
  }

  injectStyles() {
    if (document.getElementById('amsler-clinical-styles')) return;
    const style = document.createElement('style');
    style.id = 'amsler-clinical-styles';
    style.textContent = `
      .amsler-test-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 20px;
        user-select: none;
      }

      .amsler-canvas-container {
        position: relative;
        background: #1f2937;
        padding: 10px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      }

      .amsler-canvas {
        border-radius: 8px;
        cursor: crosshair;
        touch-action: none;
      }

      .amsler-controls {
        width: 100%;
        max-width: 600px;
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .test-progress {
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        font-family: inherit;
      }

      .eye-label {
        background: #ebf5ff;
        color: #1e429f;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 14px;
      }

      .amsler-instruction-hint {
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 20px;
      }

      .amsler-actions {
        display: flex;
        gap: 12px;
      }

      .amsler-btn {
        flex: 1;
        padding: 12px;
        border-radius: 8px;
        font-weight: 600;
        border: 2px solid #e5e7eb;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
      }

      .amsler-btn.primary {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .amsler-results-screen {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }

      .results-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .result-header {
        padding: 24px;
        background: #f0fdf4;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .result-header.danger {
        background: #fef2f2;
      }

      .status-badge {
        padding: 6px 16px;
        border-radius: 30px;
        color: white;
        font-weight: 700;
        background: #10b981;
      }

      .status-badge.normal { background: #10b981; }
      .status-badge.mild { background: #f59e0b; }
      .status-badge.moderate { background: #f97316; }
      .status-badge.severe { background: #ef4444; }

      .danger .status-badge {
        background: #ef4444;
      }

      .results-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 24px;
        gap: 16px;
        border-bottom: 1px solid #f3f4f6;
      }

      .eye-stat {
        display: flex;
        flex-direction: column;
        background: #f9fafb;
        padding: 16px;
        border-radius: 12px;
      }

      .disclaimer {
        padding: 20px;
        font-size: 12px;
        color: #6b7280;
        background: #f9fafb;
        line-height: 1.5;
        margin: 20px;
        border-radius: 8px;
        border-left: 3px solid #9ca3af;
      }
        
      .test-intermission-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.98);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        text-align: center;
      }

      .intermission-card {
        padding: 30px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
        max-width: 80%;
      }
    `;
    document.head.appendChild(style);
  }
}