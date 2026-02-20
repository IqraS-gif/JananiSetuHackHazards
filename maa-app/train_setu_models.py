import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler, MinMaxScaler

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input

# ==========================================
# 1. DATA LOADING & FEATURE ENGINEERING
# ==========================================

def load_and_preprocess_data(csv_path):
    df = pd.read_csv(csv_path)
    # Filter out unstructured generic data
    if 'date' in df.columns:
        df = df[df['date'] != 'N/A']
    
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['user_id', 'date']).reset_index(drop=True)
    
    # --- Feature Engineering: Gestational Diabetes (XGBoost) ---
    # Rolling averages (3-day and 7-day)
    df['carb_avg_3d'] = df.groupby('user_id')['carbs'].transform(lambda x: pd.to_numeric(x, errors='coerce').rolling(3, min_periods=1).mean())
    df['carb_avg_7d'] = df.groupby('user_id')['carbs'].transform(lambda x: pd.to_numeric(x, errors='coerce').rolling(7, min_periods=1).mean())
    df['sleep_avg_3d'] = df.groupby('user_id')['sleep_hours'].transform(lambda x: pd.to_numeric(x, errors='coerce').rolling(3, min_periods=1).mean())
    
    # Fasting glucose trend
    if 'fasting_glucose' in df.columns:
        df['glucose_trend'] = df.groupby('user_id')['fasting_glucose'].diff(periods=3) / 3.0
        df['target_next_day_glucose'] = df.groupby('user_id')['fasting_glucose'].shift(-1)
        df['target_high_glucose_tomorrow'] = (df['target_next_day_glucose'] >= 95).astype(int)

    # --- Feature Engineering: Hypertension (LSTM) ---
    df['target_next_day_systolic'] = df.groupby('user_id')['systolic_bp'].shift(-1)
    df['target_next_day_diastolic'] = df.groupby('user_id')['diastolic_bp'].shift(-1)
    
    df['target_high_bp_tomorrow'] = ((pd.to_numeric(df['target_next_day_systolic'], errors='coerce') >= 140) | 
                                     (pd.to_numeric(df['target_next_day_diastolic'], errors='coerce') >= 90)).astype(int)

    # Drop rows where targets are NaN
    df = df.dropna(subset=['target_next_day_systolic'])
    return df

# ==========================================
# 2. GESTATIONAL DIABETES PREDICTION (XGBOOST)
# ==========================================

def train_diabetes_models(df):
    print("\n--- Training Gestational Diabetes Models (XGBoost) ---")
    if 'fasting_glucose' not in df.columns:
        print("Skipping Diabetes models: fasting_glucose column missing.")
        return

    xgb_features = ['carb_avg_7d', 'sleep_avg_3d', 'HbA1c', 'glucose_trend', 'BMI', 'trimester']
    X = df[xgb_features].fillna(0)
    y_class = df['target_high_glucose_tomorrow']
    y_reg = df['target_next_day_glucose']
    
    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg, test_size=0.2, random_state=42)
    
    xgb_classifier = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05)
    xgb_classifier.fit(X_train, y_class_train)
    
    xgb_regressor = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.05)
    xgb_regressor.fit(X_train, y_reg_train)
    
    xgb_classifier.save_model("diabetes_classifier.json")
    xgb_regressor.save_model("diabetes_regressor.json")
    print("Saved: diabetes_classifier.json, diabetes_regressor.json")

# ==========================================
# 3. HYPERTENSION / PREECLAMPSIA PREDICTION (LSTM)
# ==========================================

def create_lstm_sequences(df, window_size=14):
    lstm_features = ['systolic_bp', 'diastolic_bp', 'sleep_hours', 'headache', 'swelling', 'blurred_vision', 'sodium']
    # Ensure numeric
    for feat in lstm_features:
        df[feat] = pd.to_numeric(df[feat], errors='coerce').fillna(0)

    scaler = MinMaxScaler()
    df[lstm_features] = scaler.fit_transform(df[lstm_features])
    
    X_seq, y_class_seq, y_reg_seq = [], [], []
    
    for user_id, group in df.groupby('user_id'):
        data = group[lstm_features].values
        target_class = group['target_high_bp_tomorrow'].values
        target_reg = group['target_next_day_systolic'].values
        
        for i in range(len(data) - window_size):
            X_seq.append(data[i : i + window_size])
            y_class_seq.append(target_class[i + window_size - 1])
            y_reg_seq.append(target_reg[i + window_size - 1])
            
    return np.array(X_seq), np.array(y_class_seq), np.array(y_reg_seq), len(lstm_features)

def train_hypertension_models(df):
    print("\n--- Training Hypertension Models (LSTM) ---")
    WINDOW_SIZE = 14
    X_seq, y_class_seq, y_reg_seq, num_features = create_lstm_sequences(df, window_size=WINDOW_SIZE)
    
    if X_seq.size == 0:
        print("Not enough data to create sequences for LSTM.")
        return None, None

    X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
        X_seq, y_class_seq, y_reg_seq, test_size=0.2, random_state=42)

    model_class = Sequential([
        Input(shape=(WINDOW_SIZE, num_features)),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])
    model_class.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    model_class.fit(X_train, y_class_train, epochs=5, batch_size=32, verbose=1)

    model_reg = Sequential([
        Input(shape=(WINDOW_SIZE, num_features)),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1, activation='linear')
    ])
    model_reg.compile(optimizer='adam', loss='mse', metrics=['mae'])
    model_reg.fit(X_train, y_reg_train, epochs=5, batch_size=32, verbose=1)

    return model_class, model_reg

def export_to_tflite(keras_model, filename):
    if keras_model is None: return
    converter = tf.lite.TFLiteConverter.from_keras_model(keras_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT] 
    tflite_model = converter.convert()
    with open(filename, 'wb') as f:
        f.write(tflite_model)
    print(f"Saved TFLite model: {filename}")

if __name__ == "__main__":
    df = load_and_preprocess_data('maa_app_database_final.csv')
    train_diabetes_models(df)
    lstm_classifier, lstm_regressor = train_hypertension_models(df)
    export_to_tflite(lstm_classifier, "hypertension_classifier.tflite")
    export_to_tflite(lstm_regressor, "hypertension_regressor.tflite")
