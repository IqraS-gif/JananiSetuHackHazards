# Maa App: Technical Deep Dive 🧠

This document provides a detailed, simple explanation of the technology, algorithms, and architecture behind the **Maa App**.

---

## 🛠️ The Tech Stack (What we used)

We chose a modern, high-performance stack that works perfectly in areas with low internet connectivity:

1.  **React Native & Expo**: This allowed us to build one codebase that runs on both Android and iOS. We used **Expo SDK 54** for its stability and powerful native modules.
2.  **SQLite (Local Database)**: Instead of a slow cloud database, the app stores almost 7,000 food items directly on the phone. This makes searches **instant** and allows the app to work 100% offline.
3.  **Paper Architecture**: We used the "Legacy Architecture" (Paper) because it is the most stable version for supporting complex native features like high-speed SQLite and Speech Recognition.
4.  **Bilingual Engine**: A custom localization system that allows users to toggle between **Hindi and English** instantly without restarting the app.

---

## 🧮 Core Algorithms (How it "thinks")

### 1. Pregnancy Timeline Algorithm
The app calculates exactly how far along a mother is using the **Naegele's Rule** variant:
-   **Logic**: It takes the **Last Menstrual Period (LMP)** and adds **280 days** (40 weeks) to find the Estimated Due Date (EDD).
-   **Trimester Tracking**: It automatically splits these 40 weeks into three trimesters, which changes the advice and the medical tests shown to the user.

### 2. Nutrition Scaling Logic
When a user logs a meal, the app doesn't just guess. It uses a **portion-to-gram conversion**:
-   **Algorithm**: 
    1.  User selects a food item (e.g., "Roti").
    2.  User selects a portion size: **Small (0.5x)**, **Medium (1.0x)**, or **Large (1.5x)**.
    3.  The app multiplies the base 100g nutritional values (Iron, Protein, etc.) by the selected multiplier.
    4.  The result is added to the daily progress gauge.

### 3. Smart Search & Ranking
With thousands of items, we used a **Database Indexing Strategy**:
-   **Algorithm**: We added "Indices" to the `name_en` and `name_hi` columns in SQLite.
-   **Ranking**: When a user searches "Dal," the app uses a `LIKE` query to find matches. Because of the indices, the phone can search through 7,000 items in less than **20 milliseconds**.

---

## 🔬 Vision Screening Algorithms

The app implements clinical vision screening using pure React Native rendering (SVG + Animated API).

### 1. Tumbling E Staircase (Acuity)
Instead of a fixed chart, we use a **3-down / 2-up psychological method**:
-   **Logic**: 
    -   Starts at 20/200 size.
    -   If the user gets **3 correct** in a row → size decreases (harder).
    -   If the user gets **2 wrong** in a row → size increases (easier).
-   **Reversal Rule**: The test ends after 8 "reversals" (direction changes in size), providing a highly accurate threshold score (LogMAR).

### 2. Pelli-Robson Sloan Triplets (Contrast)
Measures the minimum contrast a user can perceive.
-   **Logic**: Displays triplets (3 letters) at decreasing contrast levels (by 0.15 LogCS steps).
-   **Scoring**: The user must identify at least 2 out of 3 letters to advance.

### 3. Visual Field Index - VFI (Perimetry)
A simplified automated perimetry test for peripheral vision.
-   **Stimulus**: 44 test points are flashed at random locations across 4 concentric rings (eccentricities).
-   **Algorithm**: Calculates a percentage-based **VFI score**. A healthy eye typically scores >95%.

### 4. Macular Marker System (Amsler)
-   **Logic**: Uses a high-density 20x20 interactive grid.
-   **Input**: A touch-and-drag responder allows users to "paint" areas where lines look wavy (metamorphopsia) or are missing (scotoma).

---

## 🎙️ Voice Processing (Backend)

The "Backend" of our voice system is a hybrid model:
1.  **Speech-to-Text**: We use `expo-speech-recognition`, which uses the phone's native Google (Android) or Apple (iOS) engine to turn your voice into text.
2.  **Keyword Mapping**: Once we have the text (e.g., "I ate an Apple"), we run a **Keyword Extraction Algorithm** that searches the local database for the closest food match.

---

## 💅 UI Design Principles

-   **Anti-Clipping Rules**: Hindi characters have matras (accents) on top and bottom. We implemented a **Vertical Padding Formula** (using `lineHeight` and `paddingVertical`) to ensure no character is ever "half cut."
-   **High Contrast Mode**: We enforced a strict color palette (`#1A1A2E` for text) to ensure that even on cheap screens or in bright sunlight, the clinical data is readable.

---

---

## 📊 Data Schema & Integrity

The app uses a structured SQLite schema to ensure clinical data is reliable and easy to retrieve.

### 1. Unified Nutrition Database
Items from IFCT, INDB, and Open Food Facts are merged into a single `foods` table:
-   **Standardized per 100g**: All macronutrients and micronutrients are normalized to a 100g baseline.
-   **Source Attribution**: The `source` column ensures we can trace every item back to its clinical or commercial origin.

### 2. Clinical Log Tables
-   **Antenatal Care (`anc_visits`)**: Stores visit status, dates, and doctor's notes.
-   **Vision Screening (`eye_test_results`)**: A specialized table that stores JSON-serialized results for each test (logMAR, logCS, VFI, and grid markings) to preservation the full context of each screening.
-   **Health Parameters (`vitals_log`)**: Timeseries data for Weight, BP, and Sugar, indexed by date for fast graphing.

---

## 🔒 Security & Privacy (Local-First)

Because health data is sensitive, we avoided the "Big Cloud" approach:
-   **No Login Required**: The app works without an account to protect user identity.
-   **Device-Only Storage**: All data (weight logs, supplement history) stays on the mother's phone. If she deletes the app, the data is gone, ensuring she has total control.
