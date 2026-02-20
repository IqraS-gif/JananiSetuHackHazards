/**
 * Peripheral Vision Test (Clinical Edition v2)
 * Advanced Perimetry based on simplified Humphrey Field Analyzer protocols.
 */
export class PeripheralTest {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;

    // Clinical Protocol Settings
    this.phases = ['Right Eye', 'Left Eye']; // OD, OS
    this.currentPhaseIndex = 0;

    // Stimulus Settings
    this.STIM_RADIUS = 6;
    this.STIM_DURATION = 200; // ms
    this.MAX_RESPONSE_WINDOW = 1200; // ms

    // Reliability settings
    this.totalCatchTrials = 0;
    this.falsePositives = 0;
    this.falseNegatives = 0;
    this.fixationLosses = 0;

    // State management
    this.allPhaseResults = {};
    this.testPoints = []; // Grid of points to test
    this.currentPointIndex = 0;
    this.responses = [];
    this.fixationWarnings = 0;
    this.centerTolerance = 60; // Distance in px before warning

    // Staircase Thresholding
    this.intensityLevels = [1.0, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05];

    this.keyHandler = null;
    this.stimulusTimeout = null;
    this.responseWindow = null;

    // --- Progress + Time Estimation ---
    this.totalExpectedTrialsPerEye = 80; // Avg clinical estimate
    this.avgTrialTimeSec = 2.0; // Approx 2 sec per trial
    this.completedTrials = 0;
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
        <h2>👁️ Clinical Perimetry</h2>
        <p>This test maps your peripheral visual field. It is a simplified version of clinical Humphrey Field Analysis.</p>
        
        <div class="setup-group">
          <strong>Testing Protocol:</strong>
          <ul>
            <li>Maintain a distance of 40-50cm from the screen.</li>
            <li>We will test: <strong>Right Eye (Cover Left) → Left Eye (Cover Right)</strong>.</li>
            <li>Flashes will appear in your side vision.</li>
          </ul>
        </div>

        <div class="setup-group">
          <strong>Crucial Rules:</strong>
          <ul>
            <li><strong>Fixation:</strong> Keep your eyes locked on the 🔵 blue center dot at ALL times.</li>
            <li>Do NOT look at the peripheral flashes. Use your side vision.</li>
            <li>Press <kbd>SPACEBAR</kbd> as soon as you detect a flash.</li>
            <li>Some trials are "catch trials"—no light will appear to check your accuracy.</li>
          </ul>
        </div>

        <div class="warning-box">
          ⚠️ <strong>Fixation Safety:</strong> If you move your eyes to look for flashes, the test results will be unreliable.
        </div>
        
        <button class="start-test-btn">I Understand & Ready</button>
      </div>
    `;

    this.container.appendChild(instructionsDiv);
    const startBtn = instructionsDiv.querySelector('.start-test-btn');
    startBtn.addEventListener('click', () => this.initTest());
  }

  initTest() {
    this.container.innerHTML = '';

    // Setup UI
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'peripheral-test-wrapper';

    // Progress Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'peripheral-header';
    headerDiv.innerHTML = `
      <div class="progress-stats">
        <span class="eye-badge" id="eye-label">${this.phases[this.currentPhaseIndex].toUpperCase()}</span>
        <span class="reliability-label">Reliability: <strong id="reliability-score">100%</strong></span>
      </div>
      
      <!-- Progress Section -->
      <div class="trial-progress-section">
        <div class="trial-info">
          Trial: <strong id="trial-count">0</strong> /
          <strong id="trial-total">${this.totalExpectedTrialsPerEye}</strong>
          <span class="time-left">⏱️ <strong id="time-remaining">--</strong></span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>

      <div class="instruction-hint">Press SPACEBAR when you see a flash</div>
    `;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'peripheral-canvas';
    this.ctx = this.canvas.getContext('2d');

    // Fixation Warning Overlay
    const warningDiv = document.createElement('div');
    warningDiv.id = 'fixation-warning';
    warningDiv.className = 'fixation-warning-overlay';
    warningDiv.textContent = '❌ FIXATION LOSS - Return eyes to center';
    warningDiv.style.display = 'none';

    mainWrapper.appendChild(headerDiv);
    mainWrapper.appendChild(this.canvas);
    mainWrapper.appendChild(warningDiv);
    this.container.appendChild(mainWrapper);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Input Handlers
    this.keyHandler = (e) => {
      if (e.code === 'Space' && this.isRunning) {
        e.preventDefault();
        this.handleResponse();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Initial Test Points
    this.generateTestPoints();
    this.drawFixation();
    this.updateProgressUI();

    // Start stimulus loop
    setTimeout(() => this.showNextStimulus(), 1500);
  }

  resizeCanvas() {
    const size = Math.min(this.container.clientWidth - 40, 600);
    this.canvas.width = size;
    this.canvas.height = size;
    this.drawFixation();
  }

  generateTestPoints() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxR = (this.canvas.width / 2) * 0.9;

    this.testPoints = [];

    // Clinical Grid: concentric rings (similar to 24-2 pattern)
    // Ring 1: 10 degrees, Ring 2: 20 degrees, Ring 3: 30 degrees
    const rings = [maxR * 0.25, maxR * 0.5, maxR * 0.75, maxR * 0.9];
    const ptsPerRing = [4, 8, 12, 12];

    rings.forEach((r, ringIdx) => {
      const count = ptsPerRing[ringIdx];
      for (let i = 0; i < count; i++) {
        const angle = (i * (360 / count)) * (Math.PI / 180);
        this.testPoints.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          type: 'standard',
          intensityIdx: 0, // Start at max intensity
          seen: false,
          tested: false
        });
      }
    });

    // Add Blind Spot Point (Heijl-Krakau)
    // Temporal (Right for OD, Left for OS) ~15 deg
    const blindSpotOffset = maxR * 0.55;
    const isRightEye = this.phases[this.currentPhaseIndex] === 'Right Eye';
    this.blindSpotX = isRightEye ? cx + blindSpotOffset : cx - blindSpotOffset;
    this.blindSpotY = cy + 5; // Slightly below horizontal

    // Catch Trials are now handled stochastically to avoid point grid distortion
    this.totalCatchTrials = 0;

    // Final Shuffle
    this.testPoints.sort(() => Math.random() - 0.5);
    this.currentPointIndex = 0;
  }

  drawFixation() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const cx = width / 2;
    const cy = height / 2;

    // Background
    ctx.fillStyle = '#0f172a'; // Deep slate (Humphrey style)
    ctx.fillRect(0, 0, width, height);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
    ctx.moveTo(0, cy); ctx.lineTo(width, cy);
    ctx.stroke();

    // Central Point
    ctx.fillStyle = '#3b82f6'; // Bright blue fixation
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  showNextStimulus() {
    if (!this.isRunning) return;

    if (this.currentPointIndex >= this.testPoints.length) {
      this.completePhase();
      return;
    }

    // Inter-stimulus Interval (ISI): 800-1400ms randomized
    const isi = 800 + Math.random() * 600;
    this.stimulusTimeout = setTimeout(() => {
      // Stochastic Catch Trial Injection (Approx 15% rate)
      if (Math.random() < 0.15 && this.responses.length > 5) {
        this.presentCatchTrial();
      } else {
        this.presentStimulus();
      }
    }, isi);
  }

  presentCatchTrial() {
    const catchTypes = ['blind-spot', 'false-positive', 'false-negative'];
    const type = catchTypes[Math.floor(Math.random() * catchTypes.length)];
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    let point = { type, x: 0, y: 0 };
    if (type === 'blind-spot') {
      point.x = this.blindSpotX;
      point.y = this.blindSpotY;
    } else if (type === 'false-negative') {
      const seen = this.responses.filter(r => r.seen && r.type === 'standard');
      if (seen.length > 0) {
        const ref = seen[Math.floor(Math.random() * seen.length)];
        point.x = ref.x; point.y = ref.y;
      } else {
        this.presentStimulus(); return;
      }
    }

    this.currentStimulus = { ...point, startTime: Date.now(), responded: false };
    this.totalCatchTrials++;

    if (type !== 'false-positive') {
      this.ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, this.STIM_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();
      setTimeout(() => this.drawFixation(), this.STIM_DURATION);
    }

    this.responseWindow = setTimeout(() => {
      if (this.currentStimulus && !this.currentStimulus.responded) this.recordResponse(false);
    }, this.MAX_RESPONSE_WINDOW);
  }

  presentStimulus() {
    if (!this.isRunning) return;

    const point = this.testPoints[this.currentPointIndex];
    this.currentStimulus = {
      ...point,
      startTime: Date.now(),
      responded: false
    };

    // Prepare Stimulus Rendering
    if (point.type !== 'false-positive') {
      let x = point.x, y = point.y, alpha = 1.0;

      if (point.type === 'standard') {
        alpha = this.intensityLevels[point.intensityIdx] || 1.0;
      }
      // Note: Catch trials (FP/FN/BS) are now handled in presentCatchTrial()

      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.STIM_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();

      // Short flash
      setTimeout(() => this.drawFixation(), this.STIM_DURATION);
    }

    // Response Window
    this.responseWindow = setTimeout(() => {
      if (this.currentStimulus && !this.currentStimulus.responded) {
        this.recordResponse(false);
      }
    }, this.MAX_RESPONSE_WINDOW);
  }

  handleResponse() {
    if (this.currentStimulus && !this.currentStimulus.responded) {
      clearTimeout(this.responseWindow);
      this.recordResponse(true);
    }
  }

  recordResponse(seen) {
    const s = this.currentStimulus;
    if (!s) return;
    s.responded = true;

    // Reliability Logic
    if (s.type === 'blind-spot') {
      if (seen) this.fixationLosses++;
    } else if (s.type === 'false-positive') {
      if (seen) this.falsePositives++;
    } else if (s.type === 'false-negative') {
      if (!seen) this.falseNegatives++;
    }

    // Staircase Thresholding for Standard Points
    if (s.type === 'standard') {
      s.seen = seen;

      // Update intensity based on response (Humphrey Staircase)
      if (seen && s.intensityIdx < this.intensityLevels.length - 1) {
        s.intensityIdx++; // Seen -> Harder
      } else if (!seen && s.intensityIdx > 0) {
        s.intensityIdx--; // Missed -> Easier
      }

      // Track reversals for threshold detection
      if (s.reversals === undefined) s.reversals = 0;
      if (s.lastResult !== undefined && s.lastResult !== seen) {
        s.reversals++;
      }
      s.lastResult = seen;

      // Re-test if threshold not yet stable (2 reversals) or limits reached
      const reachedLimit = (seen && s.intensityIdx === this.intensityLevels.length - 1) || (!seen && s.intensityIdx === 0);
      if (s.reversals < 2 && !reachedLimit) {
        // Re-insert into upcoming trials at a random offset
        const insertIdx = Math.min(this.testPoints.length, this.currentPointIndex + 3 + Math.floor(Math.random() * 5));
        this.testPoints.splice(insertIdx, 0, { ...s, responded: false });
      } else {
        // Final threshold recorded for this point
        this.responses.push({ ...s, responseTime: seen ? (Date.now() - s.startTime) : null });
      }
    }

    this.currentPointIndex++;
    this.completedTrials++;
    this.updateReliabilityUI();
    this.updateProgressUI();
    this.showNextStimulus();
  }

  updateProgressUI() {
    const trialCountEl = document.getElementById("trial-count");
    const fillEl = document.getElementById("progress-fill");
    const timeEl = document.getElementById("time-remaining");

    if (!trialCountEl || !fillEl || !timeEl) return;

    // Update Trial Counter
    trialCountEl.textContent = this.completedTrials;

    // Dynamic Total Trials (In case staircase re-inserts points)
    const dynamicTotal = Math.max(this.totalExpectedTrialsPerEye, this.testPoints.length);
    const trialTotalEl = document.getElementById("trial-total");
    if (trialTotalEl) trialTotalEl.textContent = dynamicTotal;

    // Progress %
    const progress = this.completedTrials / dynamicTotal;
    fillEl.style.width = `${Math.min(progress * 100, 100)}%`;

    // Estimate Remaining Time
    const remainingTrials = dynamicTotal - this.completedTrials;
    const remainingSeconds = remainingTrials * this.avgTrialTimeSec;

    const min = Math.floor(remainingSeconds / 60);
    const sec = Math.floor(remainingSeconds % 60);

    timeEl.textContent = remainingTrials > 0 ? `${min}m ${sec}s left` : "Done";
  }

  updateReliabilityUI() {
    const reliabilityScore = Math.max(0, 100 - (this.fixationLosses * 20 + this.falsePositives * 15));
    const scoreDisplay = document.getElementById('reliability-score');
    if (scoreDisplay) {
      scoreDisplay.textContent = `${Math.round(reliabilityScore)}%`;
      scoreDisplay.style.color = reliabilityScore < 60 ? '#ef4444' : '#10b981';
    }
  }

  completePhase() {
    const phaseName = this.phases[this.currentPhaseIndex];
    this.allPhaseResults[phaseName] = this.calculatePhaseMetrics();

    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.showIntermission();
    } else {
      this.completeOverallTest();
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
        <p><small>(Switch eye cover: now test the other eye)</small></p>
        <button class="start-test-btn" id="resume-test">Start Next Phase</button>
      </div>
    `;
    this.container.appendChild(overlay);

    document.getElementById('resume-test').addEventListener('click', () => {
      overlay.remove();
      this.responses = [];
      this.fixationLosses = 0;
      this.falsePositives = 0;
      this.falseNegatives = 0;
      this.totalCatchTrials = 0;
      this.completedTrials = 0;
      this.updateProgressUI();
      this.isRunning = true;

      const label = document.getElementById('eye-label');
      if (label) label.textContent = nextEye.toUpperCase();
      this.generateTestPoints();
      this.drawFixation();
      this.showNextStimulus();
    });
  }

  calculatePhaseMetrics() {
    const seen = this.responses.filter(r => r.seen).length;
    const total = this.responses.length;
    const vfi = (seen / Math.max(1, total)) * 100;

    // MD (Mean Deviation) Approximation
    const expectedIdx = this.intensityLevels.length - 1; // Highest sensitivity
    const deviations = this.responses.map(r => expectedIdx - r.intensityIdx);
    const md = deviations.length > 0 ? (deviations.reduce((a, b) => a + b, 0) / deviations.length) : 0;

    // Cluster detection for scotomas
    const scotomas = this.detectScotomaClusters();

    return {
      vfi: vfi,
      md: -md, // MD is typically negative in loss
      seenCount: seen,
      totalCount: total,
      fixationLosses: this.fixationLosses,
      falsePositives: this.falsePositives,
      falseNegatives: this.falseNegatives,
      totalCatchTrials: this.totalCatchTrials,
      scotomas: scotomas,
      rawResponses: [...this.responses]
    };
  }

  detectScotomaClusters() {
    const missed = this.responses.filter(r => !r.seen);
    const clusters = [];
    const threshold = this.canvas.width * 0.15; // Proximity threshold

    const used = new Set();
    missed.forEach((p, i) => {
      if (used.has(i)) return;
      const cluster = [p];
      used.add(i);

      missed.forEach((other, j) => {
        if (i === j || used.has(j)) return;
        const dist = Math.sqrt(Math.pow(p.x - other.x, 2) + Math.pow(p.y - other.y, 2));
        if (dist < threshold) {
          cluster.push(other);
          used.add(j);
        }
      });
      if (cluster.length >= 3) {
        const avgX = cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length;
        const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
        clusters.push({
          points: cluster,
          size: cluster.length,
          quadrant: this.getQuadrantLabel(avgX, avgY)
        });
      }
    });
    return clusters;
  }

  getQuadrantLabel(x, y) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const isRightEye = this.phases[this.currentPhaseIndex] === 'Right Eye';

    // Clinical Logic: Temporal is away from nose, Nasal is towards nose
    // For Right Eye (OD): Right side is Temporal, Left side is Nasal
    // For Left Eye (OS): Left side is Temporal, Right side is Nasal
    const isUpper = y < cy;
    const isRightSide = x > cx;

    let vertical = isUpper ? "Superior" : "Inferior";
    let horizontal = "";

    if (isRightEye) {
      horizontal = isRightSide ? "Temporal" : "Nasal";
    } else {
      horizontal = isRightSide ? "Nasal" : "Temporal";
    }

    return `${vertical} ${horizontal}`;
  }

  completeOverallTest() {
    this.isRunning = false;
    this.container.innerHTML = '';
    const finalData = this.end();

    const odData = this.allPhaseResults['Right Eye'] || { vfi: 0, md: 0, rawResponses: [], scotomas: [] };
    const osData = this.allPhaseResults['Left Eye'] || { vfi: 0, md: 0, rawResponses: [], scotomas: [] };

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'peripheral-results-screen';

    // Check for Reliability Warnings (Heijl-Krakau)
    const flWarning = finalData.reliability.fixationLossRate > 20;
    const fpWarning = finalData.reliability.falsePositiveRate > 15;
    const showWarning = flWarning || fpWarning;

    resultsDiv.innerHTML = `
      <div class="results-card">
        ${showWarning ? `
          <div class="reliability-warning-banner">
            ⚠️ Reliability Warning: Results may be inaccurate
          </div>
        ` : ''}

        <div class="result-header">
          <h2>✅ Field Analysis Complete</h2>
          <span class="status-tag ${finalData.riskScore > 30 ? 'danger' : (finalData.riskScore > 15 ? 'moderate' : 'safe')}">
            Risk: ${finalData.riskScore > 30 ? 'High' : (finalData.riskScore > 15 ? 'Moderate' : 'Low')}
          </span>
        </div>

        <!-- Per-Eye Heatmaps -->
        <div class="field-maps-container">
          <div class="field-map-box">
            <h4>Right Eye (OD)</h4>
            <div id="map-od" class="heatmap-canvas-container"></div>
            <div class="eye-stats">VFI: ${odData.vfi.toFixed(0)}% | MD: ${odData.md.toFixed(1)}</div>
          </div>
          <div class="field-map-box">
            <h4>Left Eye (OS)</h4>
            <div id="map-os" class="heatmap-canvas-container"></div>
            <div class="eye-stats">VFI: ${osData.vfi.toFixed(0)}% | MD: ${osData.md.toFixed(1)}</div>
          </div>
        </div>

        <div class="heatmap-legend">
          <div class="legend-item"><span class="swatch white"></span> 30 dB (Normal)</div>
          <div class="legend-item"><span class="swatch gray"></span> 18-24 dB (Loss)</div>
          <div class="legend-item"><span class="swatch black"></span> 0 dB (Scotoma)</div>
        </div>

        <div class="reliability-summary">
          <p><strong>Reliability Indices:</strong></p>
          <ul>
            <li>Fixation Losses: ${finalData.reliability.fixationLossRate.toFixed(0)}% (${finalData.reliability.fixationLosses} checks)</li>
            <li>False Positives: ${finalData.reliability.falsePositiveRate.toFixed(0)}% (${finalData.reliability.falsePositives} checks)</li>
            <li>False Negatives: ${finalData.reliability.falseNegativeRate.toFixed(0)}% (${finalData.reliability.falseNegatives} checks)</li>
          </ul>
        </div>

        <div class="clinical-assessment">
          <p><strong>Automated Assessment:</strong></p>
          <p>${this.getClinicalSummary(finalData)}</p>
        </div>

        <div class="disclaimer-footer">
          * This is a screening tool. Visual field loss often precedes subjective awareness in glaucoma. Regular check-ups are essential.
        </div>
      </div>
    `;

    this.container.appendChild(resultsDiv);

    // Render Heatmaps using localized element finders
    const odContainer = resultsDiv.querySelector('#map-od');
    const osContainer = resultsDiv.querySelector('#map-os');

    if (odContainer) this.renderFieldMap(odData, odContainer);
    if (osContainer) this.renderFieldMap(osData, osContainer);
  }

  renderFieldMap(phaseResults, container) {
    if (!container || !phaseResults?.rawResponses) return;

    container.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.width = "100%";
    const ctx = canvas.getContext("2d");
    container.appendChild(canvas);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = (canvas.width * 0.9) / (this.canvas?.width || 600);

    // --- 1. Grayscale Interpolation (Humphrey Style) ---
    // Check filter support
    const supportsFilter = typeof ctx.filter !== 'undefined';
    if (supportsFilter) ctx.filter = "blur(1.5px)";

    const gridRes = 30;
    const cellSize = canvas.width / gridRes;

    // Map test points to clinical dB values
    const dataPoints = phaseResults.rawResponses.map(r => {
      let db = 0;
      if (r.seen) {
        const mapping = { 6: 30, 5: 27, 4: 24, 3: 21, 2: 18, 1: 14, 0: 10 };
        db = mapping[r.intensityIdx] || 10;
      }
      return { x: r.x, y: r.y, val: db };
    });

    if (dataPoints.length > 0) {
      for (let i = 0; i < gridRes; i++) {
        for (let j = 0; j < gridRes; j++) {
          const px = (i * cellSize + cellSize / 2);
          const py = (j * cellSize + cellSize / 2);

          let weightedSum = 0;
          let weightSum = 0;
          let foundExact = false;

          for (const p of dataPoints) {
            const dx = px - (cx + (p.x - (this.canvas?.width || 600) / 2) * scale);
            const dy = py - (cy + (p.y - (this.canvas?.height || 600) / 2) * scale);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < cellSize * 0.5) {
              weightedSum = p.val;
              weightSum = 1;
              foundExact = true;
              break;
            }

            const weight = 1 / Math.pow(dist, 2.5);
            weightedSum += p.val * weight;
            weightSum += weight;
          }

          const sensitivity = weightSum > 0 ? weightedSum / weightSum : 15; // default neutral gray
          const gray = Math.round((sensitivity / 30) * 255);
          ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;

          const distFromCenter = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
          if (distFromCenter < canvas.width * 0.45) {
            ctx.fillRect(i * cellSize, j * cellSize, cellSize + 1.5, cellSize + 1.5);
          }
        }
      }
    }
    if (supportsFilter) ctx.filter = "none";

    // --- 2. Overlay Clinical Annotations ---
    // Outer Border
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, canvas.width * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs (for clinical orientation)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - canvas.width * 0.45); ctx.lineTo(cx, cy + canvas.width * 0.45);
    ctx.moveTo(cx - canvas.width * 0.45, cy); ctx.lineTo(cx + canvas.width * 0.45, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot dB Values
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    dataPoints.forEach(p => {
      const x = cx + (p.x - (this.canvas?.width || 600) / 2) * scale;
      const y = cy + (p.y - (this.canvas?.height || 600) / 2) * scale;
      const db = Math.round(p.val);

      // Shadow for readability
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.font = "8px Inter, sans-serif";
      if (db > 0) ctx.fillText(db, x + 1, y + 1);

      ctx.fillStyle = db > 18 ? "#000" : (db > 0 ? "#fff" : "transparent");
      ctx.font = "bold 9px Inter, sans-serif";
      if (db > 0) ctx.fillText(db, x, y);
    });

    // --- 3. Scotoma Labels ---
    if (phaseResults.scotomas?.length > 0) {
      phaseResults.scotomas.forEach((s) => {
        const avgX = s.points.reduce((sum, p) => sum + p.x, 0) / s.points.length;
        const avgY = s.points.reduce((sum, p) => sum + p.y, 0) / s.points.length;
        const labelX = cx + (avgX - (this.canvas?.width || 600) / 2) * scale;
        const labelY = cy + (avgY - (this.canvas?.height || 600) / 2) * scale;

        ctx.font = "bold 9px Inter, sans-serif";
        const labelText = `${s.quadrant.toUpperCase()} SCOTOMA`;
        const textWidth = ctx.measureText(labelText).width;

        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(labelX - (textWidth / 2) - 5, labelY - 18, textWidth + 10, 14);
        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, labelX, labelY - 11);
      });
    }

    // Fixation Marker
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  getClinicalSummary(data) {
    if (data.score > 90 && data.scotomas === 0) return "Normal peripheral field. No significant clusters of vision loss detected.";
    if (data.scotomas > 0) return `Possible ${data.scotomas > 1 ? 'scotomas' : 'scotoma'} detected. Clusters of non-responsive points found in the periphery. Requires ophthalmological confirmation.`;
    return "Generalized reduced sensitivity detected. May be due to fatigue, cataracts, or early field loss.";
  }

  /**
   * Returns ML-ready JSON payload
   */
  end() {
    this.isRunning = false;
    window.removeEventListener('keydown', this.keyHandler);

    const od = this.allPhaseResults['Right Eye'] || { vfi: 100, md: 0, scotomas: [], fixationLosses: 0, falsePositives: 0, falseNegatives: 0 };
    const os = this.allPhaseResults['Left Eye'] || { vfi: 100, md: 0, scotomas: [], fixationLosses: 0, falsePositives: 0, falseNegatives: 0 };

    const avgVfi = (od.vfi + os.vfi) / 2;
    const avgMd = (od.md + os.md) / 2;
    const totalScotomas = (od.scotomas ? od.scotomas.length : 0) + (os.scotomas ? os.scotomas.length : 0);

    // Risk Calculation (Weighted Reliability and Defect markers)
    let risk = (100 - avgVfi) + (Math.abs(avgMd) * 5);
    if (totalScotomas > 0) risk += 20 + (totalScotomas * 5);

    // Factor in reliability (if poor, risk might be underestimated or overestimated)
    const totalCatchTrialsPerEye = 9; // 3 BS, 3 FP, 3 FN
    const reliabilityError = (od.fixationLosses + os.fixationLosses + od.falsePositives + os.falsePositives) * 2;
    risk = risk + (reliabilityError / 2);

    const totalCatchTrials = od.totalCatchTrials + os.totalCatchTrials;

    return {
      metric: "VFI",
      score: avgVfi,
      md: avgMd,
      riskScore: Math.min(100, Math.max(0, risk)),
      scotomas: totalScotomas,
      reliability: {
        fixationLosses: od.fixationLosses + os.fixationLosses,
        falsePositives: od.falsePositives + os.falsePositives,
        falseNegatives: od.falseNegatives + os.falseNegatives,
        fixationLossRate: totalCatchTrials > 0 ? (od.fixationLosses + os.fixationLosses) / totalCatchTrials * 100 : 0,
        falsePositiveRate: totalCatchTrials > 0 ? (od.falsePositives + os.falsePositives) / totalCatchTrials * 100 : 0,
        falseNegativeRate: totalCatchTrials > 0 ? (od.falseNegatives + os.falseNegatives) / totalCatchTrials * 100 : 0
      },
      eyeResults: this.allPhaseResults,
      timestamp: new Date().toISOString()
    };
  }

  injectStyles() {
    if (document.getElementById('peripheral-clinical-styles')) return;
    const style = document.createElement('style');
    style.id = 'peripheral-clinical-styles';
    style.textContent = `
      .peripheral-test-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
      }

      .peripheral-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: white;
        padding: 15px 25px;
        border-radius: 16px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      }

      .eye-badge {
        background: #2563eb;
        color: white;
        padding: 5px 15px;
        border-radius: 30px;
        font-weight: 800;
        font-size: 14px;
        margin-right: 15px;
      }

      .peripheral-canvas {
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        cursor: none;
      }

      .peripheral-results-screen {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }

      .results-card {
        background: white;
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }

      .status-tag {
        padding: 8px 20px;
        border-radius: 40px;
        font-weight: 700;
        color: white;
      }
      .status-tag.safe { background: #10b981; }
      .status-tag.moderate { background: #f97316; }
      .status-tag.danger { background: #ef4444; }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }

      .stat-box {
        background: #f8fafc;
        padding: 20px;
        border-radius: 16px;
        text-align: center;
      }

      .stat-box strong {
        display: block;
        font-size: 24px;
        color: #1e293b;
        margin-top: 5px;
      }

      .disclaimer-footer {
        margin-top: 30px;
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.5;
        border-top: 1px solid #f1f5f9;
        padding-top: 20px;
      }

      .fixation-warning-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(239, 68, 68, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 50px;
        font-weight: 800;
        z-index: 1000;
      }
        
      .test-intermission-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }

      .intermission-card {
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
      }

      .trial-progress-section {
        width: 100%;
        margin-top: 10px;
      }

      .trial-info {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #334155;
        margin-bottom: 6px;
      }

      .progress-bar {
        width: 100%;
        height: 10px;
        background: #e2e8f0;
        border-radius: 20px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        width: 0%;
        background: #2563eb;
        transition: width 0.3s ease;
      }

      .time-left {
        font-size: 12px;
        color: #475569;
      }

      .reliability-warning-banner {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 20px;
        font-weight: 700;
        font-size: 14px;
        text-align: center;
      }

      .field-maps-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }

      .field-map-box {
        background: #f8fafc;
        padding: 15px;
        border-radius: 16px;
        text-align: center;
      }

      .field-map-box h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #64748b;
      }

      .heatmap-canvas-container {
        background: white;
        border-radius: 12px;
        aspect-ratio: 1;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0;
      }

      .eye-stats {
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
      }

      .heatmap-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 30px;
        padding: 10px;
        background: #f1f5f9;
        border-radius: 10px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
      }

      .swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
      }
      .swatch.white { background: #fff; border: 1px solid #e2e8f0; }
      .swatch.gray { background: #888; }
      .swatch.black { background: #000; }
    `;
    document.head.appendChild(style);
  }
}