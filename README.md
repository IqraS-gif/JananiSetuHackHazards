# JananiSetu 2.0 (जननी सेतु) 🤱

**JananiSetu 2.0** is a comprehensive digital health ecosystem designed to support maternal and prenatal care in India. It combines a production-grade mobile application for mothers with advanced risk assessment tools powered by machine learning.

---

## 🏗️ Project Structure

This repository is a monorepo containing the following core components:

| Component | Path | Description |
| :--- | :--- | :--- |
| **Maa App** | [`/maa-app`](./maa-app) | React Native (Expo) mobile app for nutrition, ANC tracking, and health monitoring. |
| **Risk Radar** | [`/risk-radar`](./risk-radar) | Web-based vision screening and ML-powered eye health risk assessment. |
| **Database** | [`/database`](./database) | Unified seed data and nutrition datasets (7,000+ items). |

---

## 🚀 Quick Setup Guide

Follow these steps to get the entire ecosystem running on your local machine.

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.8+)
- **Expo Go** app (installed on your mobile device)
- **MongoDB** (running locally on port 27017)

### 2. Mobile App Setup (Maa App)
The mobile app is the primary interface for expectant mothers.

```bash
cd maa-app
npm install
```

#### 🔑 Environment Variables
Create a `.env` file in the `maa-app/` directory and add your Firebase and API keys:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI Services
EXPO_PUBLIC_SERPAPI_KEY=your_serpapi_key
EXPO_PUBLIC_GROQ_API_KEY=your_groq_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

#### Run the App
```bash
npx expo start -c
```
*Scan the QR code with **Expo Go** (Android) or the **Camera App** (iOS).*

---

### 3. Web & ML Setup (Risk Radar)
Risk Radar provides the backend and ML services for vision health screening.

#### ML Service (Terminal 1)
```bash
cd risk-radar/ml-service
python setup.py   # Installs dependencies & trains model
python app.py     # Runs on http://localhost:5001
```

#### Backend (Terminal 2)
```bash
cd risk-radar/backend
npm install
npm run dev       # Runs on http://localhost:5000
```

#### Frontend (Terminal 3)
```bash
cd risk-radar/frontend
npx http-server -p 8080
```

---

## 🔒 Security & Privacy
- **Local-First**: Patient data in the mobile app is stored locally in SQLite and is not uploaded to any central cloud without explicit action.
- **Environment Safety**: All secrets are managed via `.env` files and are excluded from version control via `.gitignore`.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
