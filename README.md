# JananiSetu — AI-Powered Maternal Health Platform

> HackHazards Hackathon Submission | Team JananiSetu

JananiSetu bridges the critical gap in maternal healthcare for rural India by connecting pregnant women, ASHA workers, and doctors through a unified AI-powered mobile platform.

---

## Project Structure

`
mini-project-sem6/
   maa-app/          # Expo React Native mobile app (mothers + ASHA + doctors)
   risk-radar/
      backend/       # Node.js + Express + MongoDB REST API
      ml-service/    # Python Flask ML service (pregnancy risk prediction)
      frontend/      # Web dashboard (doctors)
`

---

## Key Features

### For Pregnant Women (Maa App)
- **Janani AI Chatbot** — voice-first maternal health assistant in 11 Indian languages
- **Voice Activity Detection** — custom VAD using expo-av decibel metering
- **Indic TTS** — Sarvam AI bulbul:v3 for natural Hindi/regional speech
- **AI Meal Logging** — photo -> Gemini Vision -> nutrition analysis
- **Vitals AI Extraction** — upload PDF/image lab reports, AI auto-fills vitals
- **Swelling Analysis** — photo-based edema risk screen for preeclampsia detection
- **Emergency SOS** — GPS + bilingual SMS to multiple contacts in one tap
- **Eye Health Screen** — AI-powered vision risk assessment via Risk-Radar ML

### For ASHA Workers
- **Smart Route Map** — GPS-sorted patient list with one-tap navigation
- **AI Visit Summaries** — voice notes -> structured bilingual visit reports
- **Medication Tracker** — scan medicine strip to log drug name and dose count
- **QR Patient Registration** — link new mothers with a QR code scan

### For Doctors
- **Risk-Stratified Dashboard** — ML-ranked patient list by pregnancy risk
- **Patient Detail View** — full vitals timeline, ASHA notes, uploaded reports
- **PDF Report Viewer** — AI-extracted health parameters with Firebase backup

### Entitlement Engine
- Computes unclaimed government scheme benefits per user profile
- Covers: PMMVY, Janani Suraksha, PM Poshan, PDS, and 6+ more schemes
- AI generates personalised voice explanation of entitlement gaps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | Expo SDK 54, React Native 0.81, New Architecture |
| AI / LLM | Gemini 2.5 Flash, Sarvam sarvam-30b, Groq LLaMA-3 |
| STT | Sarvam saaras:v3, Gemini multimodal, Groq Whisper |
| TTS | Sarvam bulbul:v3, expo-speech (fallback) |
| Local DB | expo-sqlite (offline-first relational DB) |
| Cloud | Firebase Storage, Firebase Auth |
| Backend | Node.js, Express, MongoDB, JWT |
| ML Service | Python, Flask, scikit-learn, pandas |
| Build | EAS Build (preview APK + production AAB) |

---

## Setup

### Mobile App (maa-app)
`ash
cd maa-app
cp .env.example .env     # Fill in your API keys
npm install
npx expo start
`

### Backend (risk-radar/backend)
`ash
cd risk-radar/backend
cp .env.example .env     # Fill in MONGO_URI and JWT_SECRET
npm install
node server.js
`

### ML Service (risk-radar/ml-service)
`ash
cd risk-radar/ml-service
pip install -r requirements.txt
python train_model.py
python app.py
`

---

## Environment Variables

See maa-app/.env.example and isk-radar/backend/.env.example for all required variables.
**Never commit real credentials to version control.**

---

## Team

Built with care for rural India at HackHazards.
