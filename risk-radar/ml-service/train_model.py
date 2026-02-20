"""
Risk Radar - Model Training Script
Trains a RandomForestClassifier for eye disease risk prediction
"""

import numpy as np
import pandas as pd
import pickle
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, 
    classification_report, 
    confusion_matrix,
    f1_score
)
import warnings
warnings.filterwarnings('ignore')

def load_training_data(data_path='data/training_data.csv'):
    """
    Load the generated training data
    """
    print(f"Loading training data from: {data_path}")
    
    if not Path(data_path).exists():
        raise FileNotFoundError(
            f"Training data not found at {data_path}. "
            "Please run generate_training_data.py first."
        )
    
    df = pd.read_csv(data_path)
    print(f"✓ Loaded {len(df)} patient records\n")
    
    return df

def prepare_data(df, test_size=0.2, random_state=42):
    """
    Split data into training and test sets
    """
    # Separate features and labels
    X = df.drop('riskLevel', axis=1)
    y = df['riskLevel']
    
    # Split into train and test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=test_size, 
        random_state=random_state,
        stratify=y  # Maintain class distribution
    )
    
    print("Data split:")
    print(f"  Training set: {len(X_train)} samples")
    print(f"  Test set: {len(X_test)} samples")
    print(f"  Features: {list(X.columns)}\n")
    
    return X_train, X_test, y_train, y_test

def train_model(X_train, y_train, n_estimators=100, random_state=42):
    """
    Train a RandomForestClassifier
    """
    print("Training RandomForestClassifier...")
    print(f"  Parameters: n_estimators={n_estimators}, max_depth=None, min_samples_split=2")
    
    # Initialize model
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=random_state,
        n_jobs=-1,  # Use all CPU cores
        class_weight='balanced'  # Handle class imbalance
    )
    
    # Train model
    model.fit(X_train, y_train)
    
    print("✓ Training complete!\n")
    
    return model

def evaluate_model(model, X_train, y_train, X_test, y_test):
    """
    Evaluate model performance with comprehensive metrics
    """
    print("="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Training accuracy
    train_accuracy = accuracy_score(y_train, y_train_pred)
    print(f"\nTraining Accuracy: {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
    
    # Test accuracy
    test_accuracy = accuracy_score(y_test, y_test_pred)
    print(f"Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
    
    # F1 Score (macro average)
    f1 = f1_score(y_test, y_test_pred, average='macro')
    print(f"F1 Score (macro): {f1:.4f}")
    
    # Cross-validation score
    print("\nCross-Validation (5-fold):")
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    print(f"  CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Classification report
    print("\n" + "-"*60)
    print("CLASSIFICATION REPORT (Test Set)")
    print("-"*60)
    target_names = ['Low Risk', 'Moderate Risk', 'High Risk']
    print(classification_report(y_test, y_test_pred, target_names=target_names))
    
    # Confusion matrix
    print("-"*60)
    print("CONFUSION MATRIX (Test Set)")
    print("-"*60)
    cm = confusion_matrix(y_test, y_test_pred)
    print("Predicted →")
    print(f"           Low  Moderate  High")
    for i, row_label in enumerate(['Low', 'Moderate', 'High']):
        print(f"{row_label:9} {cm[i][0]:4d}    {cm[i][1]:4d}    {cm[i][2]:4d}")
    
    # Feature importance
    print("\n" + "-"*60)
    print("FEATURE IMPORTANCE")
    print("-"*60)
    feature_names = X_train.columns
    importances = model.feature_importances_
    
    # Sort by importance
    indices = np.argsort(importances)[::-1]
    
    for i, idx in enumerate(indices):
        print(f"{i+1}. {feature_names[idx]:20s}: {importances[idx]:.4f}")
    
    print("="*60 + "\n")
    
    return {
        'train_accuracy': train_accuracy,
        'test_accuracy': test_accuracy,
        'f1_score': f1,
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std()
    }

def save_model(model, model_path='models/risk_model.pkl'):
    """
    Save the trained model to disk
    """
    # Create models directory
    model_dir = Path(model_path).parent
    model_dir.mkdir(exist_ok=True)
    
    # Save model
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"✓ Model saved to: {model_path}")
    
    # Get model size
    size_mb = Path(model_path).stat().st_size / (1024 * 1024)
    print(f"  Model size: {size_mb:.2f} MB")

def print_model_info(model):
    """
    Print information about the trained model
    """
    print("\n" + "="*60)
    print("MODEL INFORMATION")
    print("="*60)
    print(f"Algorithm: {type(model).__name__}")
    print(f"Number of estimators: {model.n_estimators}")
    print(f"Number of features: {model.n_features_in_}")
    print(f"Number of classes: {model.n_classes_}")
    print(f"Classes: {model.classes_}")
    print("="*60 + "\n")

def test_prediction_example(model, X_test):
    """
    Demonstrate prediction on a sample patient
    """
    print("="*60)
    print("EXAMPLE PREDICTION")
    print("="*60)
    
    # Get a random sample
    sample = X_test.iloc[0:1]
    
    print("\nSample Patient Data:")
    for col in sample.columns:
        print(f"  {col}: {sample[col].values[0]:.2f}")
    
    # Predict
    prediction = model.predict(sample)[0]
    probabilities = model.predict_proba(sample)[0]
    
    risk_names = ['Low', 'Moderate', 'High']
    print(f"\nPredicted Risk Level: {prediction} ({risk_names[prediction]})")
    
    print("\nClass Probabilities:")
    for i, prob in enumerate(probabilities):
        print(f"  {risk_names[i]}: {prob:.4f} ({prob*100:.2f}%)")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║          Risk Radar - Model Training Script              ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")
    
    try:
        # Load data
        df = load_training_data()
        
        # Prepare data
        X_train, X_test, y_train, y_test = prepare_data(df)
        
        # Train model
        model = train_model(X_train, y_train, n_estimators=100)
        
        # Print model info
        print_model_info(model)
        
        # Evaluate model
        metrics = evaluate_model(model, X_train, y_train, X_test, y_test)
        
        # Save model
        save_model(model)
        
        # Test prediction example
        test_prediction_example(model, X_test)
        
        # Final summary
        print("╔═══════════════════════════════════════════════════════════╗")
        print("║                   TRAINING COMPLETE                       ║")
        print("╚═══════════════════════════════════════════════════════════╝")
        print(f"\n✓ Model trained successfully!")
        print(f"✓ Test Accuracy: {metrics['test_accuracy']*100:.2f}%")
        print(f"✓ F1 Score: {metrics['f1_score']:.4f}")
        print(f"✓ Model saved to: models/risk_model.pkl")
        print(f"\nNext step: Run app.py to start the Flask API service")
        
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        print("\nPlease run generate_training_data.py first to create training data.")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()