# Code Structure

```
risk-radar/
├── docs/                        # Project documentation
├── backend/                     # Node.js Express Server
│   ├── models/                  # Mongoose Schemas (User, Assessment)
│   ├── routes/                  # API Endpoints (Auth, Assessments, Users)
│   ├── middleware/              # Auth middleware, error handling
│   ├── utils/                   # Helper functions (Risk scoring logic)
│   └── server.js                # Entry point
│
├── ml-service/                  # Python Flask ML Service
│   ├── app.py                   # Flask API
│   ├── generate_training_data.py # Synthetic data generation
│   └── train_model.py           # Model training script
│
└── frontend/                    # Vanilla HTML/CSS/JS Client
    ├── css/                     # Stylesheets
    ├── js/                      # Application Logic
    │   ├── vision-tests/        # Specific logic for vision tests
    │   └── ...                  # Core logic (auth, dashboard, api)
    └── ...                      # HTML Pages
```
