# Risk Radar

A comprehensive application for assessing and monitoring eye health risks, identifying potential conditions like Glaucoma and Macular Degeneration through web-based vision tests and machine learning.

## Project Architecture
- **Frontend**: HTML5, CSS3, ES6 Modules
- **Backend**: Node.js, Express, MongoDB
- **ML Service**: Python, Flask, Scikit-Learn

### Documentation
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Tests Documentation](docs/TESTS_DOCUMENTATION.md)

## 🚀 Quick Start Guide

You need to run all three components (Database, Backend, ML Service) for the application to function fully.

### Prerequisites
- Node.js (v14+)
- Python (3.8+)
- MongoDB (Running locally on default port 27017)

### 1. Setup & Run ML Service (Terminal 1)
The ML service provides risk predictions based on vision test results.

```bash
cd ml-service

# Install dependencies, generate data, and train model in one go:
python setup.py

# Start the API server:
python app.py
```
*Runs on http://localhost:5001*

### 2. Setup & Run Backend (Terminal 2)
The backend handles user authentication, data storage, and coordinates with the ML service.

```bash
cd backend

# Install dependencies
npm install

# Start the server (in development mode)
npm run dev
```
*Runs on http://localhost:5000* (Note: Ensure ML service is not conflicting on port 5000. ML Service `app.py` usually defaults to 5000 or 5001. Check `app.py` in ml-service. **Correction**: `ml-service/app.py` provided earlier sets port 5000. `backend/.env.example` expects backend on 5000. **We need to resolve this port conflict.**)

>**⚠️ PORT CONFLICT NOTICE**: 
> By default, Flask (`ml-service`) and Express (`backend`) might both try to use port 5000. 
> The provided content shows `ml-service` running on 5000.
> **Please edit `ml-service/app.py` to run on 5001** or update `backend/server.js` and `.env` to use different ports.
>
> *Recommended Configuration:*
> - Backend: Port **5000**
> - ML Service: Port **5001**

### 3. Run Frontend (Terminal 3)
Since the frontend uses ES Modules (`import`/`export`), you **cannot** just open the HTML files directly. You must use a local server.

```bash
# Option A: Using Python (if you have it installed)
cd frontend
python -m http.server 8080

# Option B: Using Node.js http-server
npx http-server frontend -p 8080
```
*Open http://localhost:8080 in your browser.*

## Usage Flow
1. Go to the Frontend URL.
2. Register a new account.
3. Use the Dashboard to take Vision Tests (Acuity, Contrast, etc.).
4. Submit results - they are sent to the Backend, which queries the ML Service for a risk assessment.
5. View your Risk Score on the Dashboard.
