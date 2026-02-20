import pandas as pd
import numpy as np
import xgboost as xgb
import warnings
import os

warnings.filterwarnings('ignore')

# 1. Generate Synthetic Training Data (since we don't have the CSV yet)
# This ensures the model files exist and the API can load them.
print("Generating synthetic training data...")
np.random.seed(42)
num_samples = 1000

data = {
    'carb_avg_7d': np.random.uniform(50, 400, num_samples),
    'sleep_avg_3d': np.random.uniform(4, 10, num_samples),
    'HbA1c': np.random.uniform(4.5, 9.0, num_samples),
    'glucose_trend': np.random.uniform(-5, 10, num_samples),
    'BMI': np.random.uniform(18, 40, num_samples),
    'trimester': np.random.choice([1, 2, 3], num_samples)
}

train_df = pd.DataFrame(data)

# Logic for labels (Simplified for synthetic data)
# Next day glucose depends mostly on carb intake, HbA1c and trend
train_df['target_next_day_glucose'] = (
    train_df['carb_avg_7d'] * 0.2 + 
    train_df['HbA1c'] * 15 + 
    train_df['glucose_trend'] * 2 + 
    np.random.normal(60, 10, num_samples)
)

# High glucose if > 140
train_df['target_high_glucose_tomorrow'] = (train_df['target_next_day_glucose'] > 140).astype(int)

# 2. Define exactly which features the model looks at
features = ['carb_avg_7d', 'sleep_avg_3d', 'HbA1c', 'glucose_trend', 'BMI', 'trimester']

X = train_df[features]
y_class = train_df['target_high_glucose_tomorrow']
y_reg = train_df['target_next_day_glucose']

# Create models directory if it doesn't exist
os.makedirs("models", exist_ok=True)

# 3. Train Classifier (Risk Probability)
print("Training Classifier...")
clf = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, eval_metric='logloss')
clf.fit(X, y_class)
clf.save_model("models/diabetes_classifier.json")

# 4. Train Regressor (Exact mg/dL)
print("Training Regressor...")
reg = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.1)
reg.fit(X, y_reg)
reg.save_model("models/diabetes_regressor.json")

print("✅ Diabetes Models Trained & Saved in models/ as JSON!")
