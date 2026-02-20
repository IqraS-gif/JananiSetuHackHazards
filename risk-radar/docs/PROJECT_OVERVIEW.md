# Risk Radar - Project Overview

Risk Radar is a comprehensive system designed to assess and monitor risks, featuring a backend API, a machine learning service for risk scoring, and a frontend dashboard with vision tests.

## Architecture

The system consists of three main components:

1.  **Backend (Node.js/Express)**:
    *   Handles user authentication and management.
    *   Manages assessments and risk data.
    *   Serves as the API gateway for the frontend.
    *   Communicates with the ML Service for advanced analysis.

2.  **ML Service (Python/Flask)**:
    *   Provides machine learning models for risk prediction.
    *   Exposes an API for the backend to request predictions.
    *   Includes scripts for data generation and model training.

3.  **Frontend (HTML/CSS/JS)**:
    *   User interface for login, registration, and dashboard.
    *   Interactive vision tests (Contrast Sensitivity, Visual Acuity, Amsler Grid, Peripheral Vision).
    *   Visualizes risk assessment results.

## Key Features
*   **User Authentication**: Secure login and registration.
*   **Risk Assessment**: Rule-based and ML-based risk scoring.
*   **Vision Tests**: Interactive tools to gather physiological data.
*   **Dashboard**: Centralized view of assessments and results.
