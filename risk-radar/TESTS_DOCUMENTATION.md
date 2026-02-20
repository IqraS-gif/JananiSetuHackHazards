# Risk Radar - Tests Documentation

This document provides a comprehensive overview of the diagnostic and technical tests implemented in the Risk Radar project. It covers clinical vision screenings used for patient assessment and the technical validation suite for the system's infrastructure.

---

## 👁️ Clinical Vision Diagnostics

Risk Radar incorporates four core vision tests designed to detect early signs of Age-related Macular Degeneration (AMD) and other visual impairments.

### 1. Visual Acuity Test (Tumbling E)
*   **Methodology:** Uses the "Tumbling E" chart and the staircase method to determine the smallest letter size a user can identify.
*   **Procedure:**
    1.  **Calibration:** Users calibrate screen size using a standard credit card (85.6mm).
    2.  **Testing:** From a distance of 6 meters (20 feet), users identify the orientation of the letter 'E'.
    3.  **Iteration:** The letter size decreases with correct answers and increases with incorrect ones to find the threshold.
*   **Key Metric:** **LogMAR** (Logarithm of the Minimum Angle of Resolution) and **Snellen Equivalent** (e.g., 20/20).

### 2. Amsler Grid Distortion Test
*   **Methodology:** An interactive grid used to detect visual distortions, scotomas (blind spots), and macular issues.
*   **Procedure:**
    1.  Users focus on a central green fixation point.
    2.  Using peripheral vision, users identify and "mark" areas on the grid that appear wavy, blurry, or missing.
    3.  The system maps these marks to quadrants to identify potential retinal irregularities.
*   **Key Metric:** **Distortion Map** and percentage of visual field affected.

### 3. Contrast Sensitivity Test (Pelli-Robson Style)
*   **Methodology:** Measures the ability to distinguish between an object and its background.
*   **Procedure:**
    1.  Standard Sloan letters are displayed at decreasing contrast levels (starting from 100% down to 2%).
    2.  Users must identify the letter among 6 choices.
    3.  Each level requires 2 correct answers before moving to a lower contrast.
*   **Key Metric:** **LogCS** (Log Contrast Sensitivity). A higher value indicates better sensitivity.

### 4. Peripheral Vision Test (Visual Field Map)
*   **Methodology:** A simplified version of the Humphrey Field Analyzer to map the visual field.
*   **Procedure:**
    1.  Users keep their eyes fixed on a central crosshair.
    2.  Stimuli (flashing white dots) appear randomly in the peripheral zones.
    3.  Users press the `SPACEBAR` upon detection.
    4.  The system monitors fixation—looking away from the center triggers a warning.
*   **Key Metric:** **VFI (Visual Field Index)**, representing the percentage of the remaining visual field.

---

## 🛠️ Technical Testing Suite

The technical suite ensures the reliability, performance, and accuracy of the backend and machine learning services.

### 1. ML API Integration Tests (`ml-service/test_api.py`)
A comprehensive Python suite that validates the Risk Prediction engine:
*   **Scenario Testing:** Validates low, moderate, and high-risk case predictions.
*   **Boundary Validation:** Ensures the API correctly rejects invalid data (e.g., impossible age values).
*   **Batch Processing:** Verifies the `batch-predict` endpoint for multi-patient processing.
*   **Error Handling:** Tests behavior with missing fields or malformed JSON.

### 2. Performance Benchmarking
*   **Throughput Test:** Measures sequential API response times.
*   **SLA Check:** Validates that predictions return within acceptable limits (Target: <200ms).

### 3. Backend Health Monitoring
*   **System Status:** Automated checks for service availability and database connectivity.
*   **Endpoint Health:** Validates the `/health` and `/` endpoints for proper routing.

---

## 📋 Interpretation Guidelines

> [!IMPORTANT]
> These tests are intended for screening and monitoring purposes. They do NOT replace a professional clinical diagnosis.

| Metric | Normal Range | Warning Range | Critical Range |
| :--- | :--- | :--- | :--- |
| **LogMAR** | < 0.3 (20/40) | 0.3 - 0.7 | > 0.7 |
| **LogCS** | > 1.5 | 1.2 - 1.5 | < 1.2 |
| **VFI** | > 95% | 85% - 95% | < 85% |
| **Amsler** | No marks | < 10 marks | > 10 marks |

---

## 🚀 How to Run Technical Tests

### Prerequisites
- Python 3.8+
- Active ML Service (`python app.py`)

### Execute API Tests
```bash
cd ml-service
python test_api.py
```
