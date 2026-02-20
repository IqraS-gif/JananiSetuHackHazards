# Maa App (माँ ऐप) 🤱

**Maa App** is a production-grade, offline-first mobile application built with **React Native (Expo)** designed to empower and guide expectant mothers in India. The application provides a bilingual experience (English & Hindi) focusing on four critical pillars of maternal health: **Advanced Nutrition Tracking**, **Antenatal Care (ANC) Scheduling**, **Health Parameter Monitoring**, and **AI-Powered Eye Health Screening**.

---

## 🌟 Mission & Impact

Maternal nutrition and regular clinical checkups are vital for the health of both the mother and the fetus. In many contexts, tracking complex nutritional values (like Iron or Folate) is difficult for users. **Maa App** simplifies this by:
1.  **Bridging the Knowledge Gap**: Providing detailed nutritional data for traditional Indian meals and branded products.
2.  **Ensuring Clinical Adherence**: Automated scheduling for ANC visits based on the mother’s Last Menstrual Period (LMP).
3.  **Local Contextualization**: Native support for Hindi and common Indian food items.

---

## 🚀 Quick Start

Get the app running in 3 minutes:

```bash
# 1. Clone & Install
git clone https://github.com/your-username/maa-app.git
cd maa-app
npm install

# 2. Start Project
npx expo start
```

> [!TIP]
> For advanced network setups (different Wi-Fi/Remote) or Native Android builds, see the [Developer Setup](#-developer-setup) section below.

---

## 🚀 Key Features

### 1. 🍽️ Advanced Nutrition Engine
The heart of the app is a powerful meal logging system that goes beyond simple calorie counting:
-   **Voice-Activated Logging**: Powered by `expo-speech-recognition`, users can simply speak their meal (e.g., "मैंने दो रोटी और दाल खाई") to log it.
-   **Intelligent Portioning**: Maps "Small", "Medium", and "Large" portions to scientifically accurate grammage.
-   **Micronutrient Focus**: Tracks critical pregnancy nutrients: **Iron**, **Calcium**, **Folate**, **Protein**, and **Vitamin A/C**.
-   **Safety Alerts**: Visual badges warn users about foods that should be avoided (⛔) or limited (⚠️) during pregnancy (e.g., raw papaya, certain fish).

### 2. 💊 Health & Supplement Monitoring
-   **Supplement Adherence**: Dedicated logic for tracking Iron, Calcium, and Folic Acid intake, with trimester-specific requirements.
-   **Weight Trajectory**: Logs weight changes and compares them against healthy pregnancy gains.
-   **Daily Vitals**: Tracking for water intake (in glasses), mood, and physical symptoms.

### 3. 📅 Antenatal Care (ANC) Scheduler
-   **Dynamic Timeline**: Calculates a personalized 40-week timeline from the LMP.
-   **Visit Checklists**: Every recommended visit comes with a checklist of specific tests (Blood pressure, Ultrasound, Hemoglobin, etc.).
-   **Status Tracking**: Mark visits as completed and store clinical notes for each.

### 4. 👁️ Eye Health & Vision Tests
An industry-first integration of clinical vision screening inside a maternal health app:
-   **Interactive Vision Tests**: 4 high-precision tests (Visual Acuity, Contrast, Amsler Grid, Peripheral) optimized for rural mobile users.
-   **🎙️ Voice-Reactive UI**: Say "ऊपर" (Up) or "देखा" (Seen) to answer—perfect for self-administration.
-   **AI Risk Assessment**: Integrated with the **Risk-Radar ML Service** to detect early signs of gestational eye issues (Retinopathy, Glaucoma).
-   **Offline Clinical Logic**: All tests rendering logic and algorithms run 100% locally.

---

## 💾 The Nutrition Database: 7,000+ Items

Maa App features one of the most comprehensive mobile food databases specifically for India, merging three world-class data sources:

| Source | Item Count | Focus |
| :--- | :--- | :--- |
| **IFCT 2017** | 542 | High-precision scientific data for whole foods and raw ingredients. |
| **INDB 2024** | 1,014 | Traditional Indian cooked dishes, snacks, and regional specialties. |
| **Open Food Facts** | 5,297 | Branded and packaged products available in India (Maggi, Britannia, etc.). |
| **Original App Data** | 102 | Curated staple Indian meals with high-quality metadata. |

### Data Integration Architecture
-   **Streaming Filter**: The 12GB Open Food Facts dataset was processed using a custom Node.js streaming pipeline to extract only Indian products.
-   **Standardization**: All data is normalized to **per 100g** units for calories (kcal), protein (g), iron (mg), and other micronutrients.
-   **Source Tracking**: Every food item is tagged with its origin (`source` column) to ensure data transparency.

---

## 🛠️ Technical Architecture

### Tech Stack
-   **Frontend**: React Native with Expo SDK 54.
-   **Architecture**: **Legacy Architecture (Paper)** enabled for stability with various native modules.
-   **Database**: [Expo SQLite (Next)](https://docs.expo.dev/versions/latest/sdk/sqlite/) - Providing a local, high-performance structured database.
-   **Navigation**: React Navigation 7 (Bottom Tabs + Stack).
-   **State Management**: React Lifecycle + SQLite Transactional Persistence.
-   **Speech Engine**: `expo-speech-recognition` for low-latency voice-to-text.
-   **ML Integration**: REST API client for **Risk-Radar** (Random Forest model) with offline rule-based fallback.

### Native Build Configuration (Android)
To ensure build stability and resolve runtime crashes (`IllegalViewOperationException`), the following configuration is applied:
-   **New Architecture**: Disabled (`newArchEnabled = false`) in `app.json` and `android/gradle.properties`.
-   **NDK Version**: Pinned to **27.1.12297006** in `android/app/build.gradle` to resolve environment-specific compilation errors.

### Project Structure
```bash
maa-app/
├── database/
│   ├── schema.sql          # Master SQLite schema definition
│   └── seed-data/          # Unified 3.6MB JSON database (7,000+ items)
├── src/
│   ├── components/         # Atomic UI components (FoodCard, StatusCard, etc.)
│   ├── constants/          # Theme, Colors (Pink/Dark Blue), and Bilingual Labels
│   ├── navigation/         # App flow and routing logic
│   ├── screens/
│   │   ├── food/           # 3-Step Meal Logging Flow (Selection, Portions, Review)
│   │   ├── health/         # Supplement Tracking & Vitals logging
│   │   ├── home/           # Dashboard with progress visualizations
│   │   ├── profile/        # User profile, LMP/Due Date calculation, & Language toggle
│   │   ├── learn/          # Nutrition Tool and education content
│   │   └── eye/            # Eye Health Screening & Interactive Vision Tests
│   │       └── tests/      # Core test logic (Acuity, Contrast, Amsler, Peripheral)
│   └── services/
│       ├── database/       # SQLite logic, migrations, and transactions
│       ├── nutrition/      # Calculation engine for meal nutrition
│       ├── RiskRadarService.js # ML service API client
│       └── VoiceRecognitionService.js # Speech-to-text integration
├── App.js                  # Entry point with DB initialization
└── package.json            # Core dependencies
```

---

## 💅 Accessibility & UI Standards

The app adheres to high contrast and readability standards for a critical healthcare context:
1.  **Text Visibility**: Explicitly set to `Colors.textPrimary` (#1A1A2E) across all inputs to prevent invisible text on dark-mode-enabled devices or Paper mode.
2.  **Hindi Character Scaling**: Increased `lineHeight` and `padding` for labels in the Food Grid and Category Pills to prevent clipping of "matras" (top/bottom accents).
3.  **Input Clarity**: Added pink cursors and high-contrast placeholders to all clinical input fields (Weight, BP, Sugar).
4.  **Bilingual Support**: Instant toggle between Hindi and English with persistent preference storage.

---

---

## 🔒 Data & Privacy: Local-First Shield

Maa App is designed with a **privacy-by-default** architecture. Since clinical and nutritional data is highly personal, we ensure the user remains the sole owner of their information.

### 1. Data Inventory (What we store)
| Feature | Data Collected | Purpose |
| :--- | :--- | :--- |
| **User Profile** | LMP Date, Preferred Language. | Calculations for Trimester and Due Date. |
| **Nutrition** | Meal items, Portion sizes, Timestamp. | Weekly nutrient progress tracking. |
| **Health Logs** | Weight (kg), Blood Pressure, Sugar, Symptoms. | Monitoring vital trends. |
| **Vision Tests** | Acuity (LogMAR), Contrast (LogCS), VFI %, Amsler Markings. | Clinical eye health screening results. |

### 2. Physical Storage & Security
-   **No User Accounts**: We do not require an email, phone number, or login. Data is tied strictly to the physical device.
-   **SQLite Encryption**: All parameters are stored in a local [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) database file within the app's sandboxed storage.
-   **Zero Cloud Sync**: Your logs are **not** uploaded to any central server. If the app is deleted, the data is permanently erased, giving the mother total "Right to be Forgotten."
-   **ML Processing**: Risk analysis (Risk-Radar) is performed via an optional, anonymous API call. No PII (Personally Identifiable Information) is sent to the ML service.

---

## 🔧 Developer Setup

### 1. Prerequisites
- Node.js v18+
- Expo Go or Development Build
- Android Studio with **NDK 27.1.12297006** installed.

### 2. Installation
```bash
# Clone the repo
git clone https://github.com/your-username/maa-app.git
cd maa-app

# Install dependencies
npm install
```

### 3. Running the Project

#### A. Standard Local Start (Same Wi-Fi)
```bash
npx expo start
```

#### B. Manual Tunnel (External Network / Different Wi-Fi)
If the standard `--tunnel` flag fails, use this robust manual workaround:
1.  **Start Metro**:
    ```powershell
    # PowerShell
    $env:EXPO_PACKAGER_PROXY_URL="https://your-url.ngrok-free.dev"; npx expo start

    # Bash/CMD
    set EXPO_PACKAGER_PROXY_URL=https://your-url.ngrok-free.dev && npx expo start
    ```
2.  **Start Ngrok**:
    In a separate terminal, run:
    ```bash
    npx ngrok http 8081 --host-header=rewrite
    ```
3.  **Connect**: Type the Ngrok URL into the **Expo Go** app ("Enter URL manually").

#### C. Run Native Android Build (Recommended)
```bash
npx expo run:android
```

---

### 🛠️ Troubleshooting
- **Ngrok Auth Error:** If ngrok fails, add your token first: `npx ngrok authtoken <your-token>`.
- **Tunnel TypeError:** If `npx expo start --tunnel` throws a `body` error, use the **Manual Tunnel** steps above.
- **Native Crash:** Ensure **NDK 27.1.12297006** is installed and Paper mode is active in `app.json`.
- **Device Unauthorized:** If you see `adb reverse failed` or `unauthorized`, look at your Android phone and click **"Allow USB Debugging"**. Run `adb devices` to confirm it says `device` instead of `unauthorized`.

---

## 📈 Future Roadmap
-   **AI Recipe Analysis**: Estimating nutrition from home-cooked recipe photos.
-   **Offline Voice Recognition**: Removing the dependency on network for speech-to-text.
-   **Health Report Export**: Generating PDF summaries for doctors.

---

### 📄 License
This project is licensed under the MIT License.
