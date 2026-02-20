# Installation Guide

Follow these steps to set up the Risk Radar project locally.

## Prerequisites
*   Node.js (v14+)
*   npm (v6+)
*   Python (3.8+)
*   MongoDB (v4+)

## Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    *   Copy `.env.example` to `.env`.
    *   Update values in `.env` (Database URL, JWT Secret, etc.).
4.  Start the server:
    ```bash
    npm start
    ```

## ML Service Setup
1.  Navigate to the `ml-service` directory:
    ```bash
    cd ml-service
    ```
2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the Flask app:
    ```bash
    python app.py
    ```

## Frontend Discovery
1.  Navigate to the `frontend` directory.
2.  Open `index.html` in your web browser.
    *   For a better experience, serve it using a simple HTTP server (e.g., `npx serve` or Live Server extension in VS Code).
