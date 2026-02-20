"""
Risk Radar - Flask API Service
Provides ML-based risk prediction endpoint with rule-based fallback
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from pathlib import Path
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variables
model = None
MODEL_PATH = 'models/risk_model.pkl'

# Diabetes Models
diabetes_clf = None
diabetes_reg = None
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = str(BASE_DIR / 'models' / 'risk_model.pkl')
DIABETES_CLF_PATH = str(BASE_DIR / 'models' / 'diabetes_classifier.json')
DIABETES_REG_PATH = str(BASE_DIR / 'models' / 'diabetes_regressor.json')

def load_model():
    """
    Load the trained ML model from disk
    """
    global model
    
    if Path(MODEL_PATH).exists():
        try:
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            logger.info(f"✓ ML model loaded successfully from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            model = None
    else:
        logger.warning(f"⚠️  Model file not found at {MODEL_PATH}. Using rule-based fallback.")
        model = None

    # Load Diabetes Models
    global diabetes_clf, diabetes_reg
    try:
        import xgboost as xgb
        clf_path = Path(DIABETES_CLF_PATH)
        if clf_path.exists():
            diabetes_clf = xgb.XGBClassifier()
            diabetes_clf.load_model(DIABETES_CLF_PATH)
            logger.info(f"✓ Diabetes Classifier loaded from {DIABETES_CLF_PATH}")
        
        reg_path = Path(DIABETES_REG_PATH)
        if reg_path.exists():
            diabetes_reg = xgb.XGBRegressor()
            diabetes_reg.load_model(DIABETES_REG_PATH)
            logger.info(f"✓ Diabetes Regressor loaded from {DIABETES_REG_PATH}")
            
    except Exception as e:
        logger.error(f"❌ Failed to load Diabetes models: {e}")

    return model is not None

def rule_based_prediction(features):
    """
    Fallback rule-based risk assessment (mirrors training logic)
    Used when ML model is not available
    
    High Risk (2): Serious indicators
    - Amsler distortion = 1
    - VFI < 70
    - LogMAR > 0.7 AND LogCS < 1.0
    
    Moderate Risk (1): Warning signs
    - Age > 65
    - Family history = 1
    - VFI < 90
    
    Low Risk (0): Healthy parameters
    """
    age = features['age']
    family_history = features['familyHistory']
    logmar = features['logMAR']
    logcs = features['logCS']
    vfi = features['vfi']
    amsler = features['amslerDistortion']
    
    # High risk conditions
    if amsler == 1:
        risk_level = 2
        risk_score = 85.0
    elif vfi < 70:
        risk_level = 2
        risk_score = 90.0
    elif logmar > 0.7 and logcs < 1.0:
        risk_level = 2
        risk_score = 80.0
    # Moderate risk conditions
    elif age > 65:
        risk_level = 1
        risk_score = 55.0
    elif family_history == 1:
        risk_level = 1
        risk_score = 60.0
    elif vfi < 90:
        risk_level = 1
        risk_score = 50.0
    # Low risk
    else:
        risk_level = 0
        risk_score = 15.0
    
    # Final risk score calculation for rule-based
    # Normalizing to a 0-100 scale where higher is more risk
    # Low: 0-33, Moderate: 34-66, High: 67-100
    if risk_level == 2:
        final_score = max(70.0, risk_score)
    elif risk_level == 1:
        final_score = max(40.0, risk_score)
    else:
        final_score = risk_score

    # Adjust score based on multiple factors
    score_adjustments = 0
    if age > 70:
        score_adjustments += 10
    if vfi < 95:
        score_adjustments += 5
    if logcs < 1.5:
        score_adjustments += 5
    
    final_score = min(100.0, final_score + score_adjustments)
    
    # Confidence is lower for rule-based (no ML model)
    confidence = 0.70
    
    return risk_level, final_score, confidence

def ml_based_prediction(features):
    """
    ML-based risk prediction using the trained RandomForest model
    """
    # Prepare features in correct order
    feature_array = np.array([[
        features['age'],
        features['familyHistory'],
        features['logMAR'],
        features['logCS'],
        features['vfi'],
        features['amslerDistortion']
    ]])
    
    # Predict
    risk_level = int(model.predict(feature_array)[0])
    probabilities = model.predict_proba(feature_array)[0]
    
    # Get probabilities safely (mapping to [Low, Moderate, High])
    # Classes are mapped based on model.classes_
    class_map = {cls: idx for idx, cls in enumerate(model.classes_)}
    
    p_low = probabilities[class_map[0]] if 0 in class_map else 0
    p_mod = probabilities[class_map[1]] if 1 in class_map else 0
    p_high = probabilities[class_map[2]] if 2 in class_map else 0

    # Risk score calculation: Normalizing to "Disease Intensity" (0-100)
    risk_score = float((p_mod * 50) + (p_high * 100))
    
    # Confidence is based on the margin between top prediction and others
    sorted_probs = sorted(probabilities, reverse=True)
    confidence = float(sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else float(sorted_probs[0])
    confidence = min(1.0, confidence + 0.4)
    
    return risk_level, risk_score, confidence

def validate_input(data):
    """
    Validate input data and return error message if invalid
    """
    required_fields = ['age', 'familyHistory', 'logMAR', 'logCS', 'vfi', 'amslerDistortion']
    
    # Check all required fields present
    for field in required_fields:
        if field not in data:
            return f"Missing required field: {field}"
    
    # Validate ranges
    try:
        age = float(data['age'])
        if not 0 <= age <= 120:
            return "Age must be between 0 and 120"
        
        family_history = int(data['familyHistory'])
        if family_history not in [0, 1]:
            return "familyHistory must be 0 or 1"
        
        logmar = float(data['logMAR'])
        if not 0.0 <= logmar <= 2.0:
            return "logMAR must be between 0.0 and 2.0"
        
        logcs = float(data['logCS'])
        if not 0.0 <= logcs <= 2.2:
            return "logCS must be between 0.0 and 2.2"
        
        vfi = float(data['vfi'])
        if not 0.0 <= vfi <= 100.0:
            return "vfi must be between 0.0 and 100.0"
        
        amsler = int(data['amslerDistortion'])
        if amsler not in [0, 1]:
            return "amslerDistortion must be 0 or 1"
        
    except (ValueError, TypeError) as e:
        return f"Invalid data type: {str(e)}"
    
    return None  # No errors

def validate_diabetes_input(data):
    """
    Validate diabetes input data
    """
    required = ['carb_avg_7d', 'sleep_avg_3d', 'HbA1c', 'glucose_trend', 'BMI', 'trimester']
    for field in required:
        if field not in data:
            return f"Missing required field: {field}"
    
    try:
        # Check numeric types and basic ranges
        float(data['carb_avg_7d'])
        float(data['sleep_avg_3d'])
        hba1c = float(data['HbA1c'])
        if not 3.0 <= hba1c <= 15.0:
            return "HbA1c must be between 3.0 and 15.0"
        
        float(data['glucose_trend'])
        float(data['BMI'])
        trimester = int(data['trimester'])
        if trimester not in [1, 2, 3]:
            return "Trimester must be 1, 2, or 3"
    except (ValueError, TypeError) as e:
        return f"Invalid data type: {str(e)}"
    
    return None

def predict_diabetes_risk(features):
    """
    Predict diabetes risk probability and next day glucose level
    """
    if diabetes_clf is None or diabetes_reg is None:
        raise Exception("Diabetes models not loaded")
    
    # Prepare features
    feature_array = np.array([[
        features['carb_avg_7d'],
        features['sleep_avg_3d'],
        features['HbA1c'],
        features['glucose_trend'],
        features['BMI'],
        features['trimester']
    ]])
    
    # Risk Probability (Classifier)
    prob = float(diabetes_clf.predict_proba(feature_array)[0][1])
    
    # Predicted Glucose (Regressor)
    pred_glucose = float(diabetes_reg.predict(feature_array)[0])
    
    # Risk Level
    if prob > 0.7:
        risk_level = "High"
    elif prob > 0.3:
        risk_level = "Moderate"
    else:
        risk_level = "Low"
        
    return {
        'riskLevel': risk_level,
        'riskProbability': round(prob, 4),
        'predictedGlucose': round(pred_glucose, 2),
        'confidence': 0.88 # XGBoost is generally confident
    }

@app.route('/', methods=['GET'])
def home():
    """
    Health check endpoint
    """
    model_status = "Loaded" if model is not None else "Not loaded (using fallback)"
    
    return jsonify({
        'service': 'Risk Radar ML API',
        'status': 'running',
        'model_status': model_status,
        'version': '1.0.0',
        'endpoints': {
            'predict': '/predict (POST)',
            'health': '/health (GET)'
        }
    })

@app.route('/health', methods=['GET'])
def health():
    """
    Detailed health check
    """
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'fallback_available': True
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Risk prediction endpoint
    
    Expected JSON input:
    {
        "age": 45.0,
        "familyHistory": 0,
        "logMAR": 0.1,
        "logCS": 1.7,
        "vfi": 98.5,
        "amslerDistortion": 0
    }
    
    Returns:
    {
        "riskLevel": "Low",
        "riskScore": 15.2,
        "confidence": 0.85,
        "details": {
            "age": 45.0,
            "riskLevelNumeric": 0
        },
        "method": "ml" or "rule-based"
    }
    """
    try:
        # Get JSON data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No JSON data provided',
                'message': 'Please send data as JSON in the request body'
            }), 400
        
        # Validate input
        validation_error = validate_input(data)
        if validation_error:
            return jsonify({
                'error': 'Invalid input',
                'message': validation_error
            }), 400
        
        # Prepare features
        features = {
            'age': float(data['age']),
            'familyHistory': int(data['familyHistory']),
            'logMAR': float(data['logMAR']),
            'logCS': float(data['logCS']),
            'vfi': float(data['vfi']),
            'amslerDistortion': int(data['amslerDistortion'])
        }
        
        # Make prediction
        if model is not None:
            # Use ML model
            risk_level, risk_score, confidence = ml_based_prediction(features)
            method = 'ml'
            logger.info(f"ML prediction: risk_level={risk_level}, score={risk_score:.2f}")
        else:
            # Use rule-based fallback
            risk_level, risk_score, confidence = rule_based_prediction(features)
            method = 'rule-based'
            logger.info(f"Rule-based prediction: risk_level={risk_level}, score={risk_score:.2f}")
        
        # Convert risk level to string
        risk_level_map = {0: 'Low', 1: 'Moderate', 2: 'High'}
        risk_level_str = risk_level_map[risk_level]
        
        # Prepare response
        response = {
            'riskLevel': risk_level_str,
            'riskScore': round(risk_score, 2),
            'confidence': round(confidence, 2),
            'details': {
                'age': features['age'],
                'familyHistory': bool(features['familyHistory']),
                'riskLevelNumeric': risk_level,
                'vfi': features['vfi'],
                'hasAmslerDistortion': bool(features['amslerDistortion'])
            },
            'method': method,
            'recommendations': get_recommendations(risk_level, features)
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.route('/predict-diabetes', methods=['POST'])
def predict_diabetes():
    """
    Diabetes Risk prediction endpoint
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        err = validate_diabetes_input(data)
        if err:
            return jsonify({'error': 'Invalid input', 'message': err}), 400
            
        features = {
            'carb_avg_7d': float(data['carb_avg_7d']),
            'sleep_avg_3d': float(data['sleep_avg_3d']),
            'HbA1c': float(data['HbA1c']),
            'glucose_trend': float(data['glucose_trend']),
            'BMI': float(data['BMI']),
            'trimester': int(data['trimester'])
        }
        
        result = predict_diabetes_risk(features)
        
        # Recommendations
        recommendations = []
        if result['riskLevel'] == 'High':
            recommendations.append("High Risk: Consult your doctor immediately about Gestational Diabetes.")
            recommendations.append("Reduce carbohydrate intake and monitor glucose levels after every meal.")
        elif result['riskLevel'] == 'Moderate':
            recommendations.append("Moderate Risk: Monitor your glucose levels closely.")
            recommendations.append("Focus on low-GI foods and regular walks.")
        else:
            recommendations.append("Low Risk: Your glucose management looks good.")
            recommendations.append("Continue balanced nutrition and regular checkups.")

        response = {
            **result,
            'details': features,
            'recommendations': recommendations,
            'method': 'xgboost'
        }
        
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Diabetes prediction error: {e}")
        return jsonify({'error': 'Prediction failed', 'message': str(e)}), 500

def get_recommendations(risk_level, features):
    """
    Generate personalized recommendations based on risk level and features
    """
    recommendations = []
    clinical_flags = []
    
    # 1. Feature-specific clinical insights
    if features['amslerDistortion'] == 1:
        clinical_flags.append("Amsler grid distortion detected - possible macular changes")
    
    if features['vfi'] < 85:
        clinical_flags.append("Significant visual field loss detected - Glaucoma screening advised")
    elif features['vfi'] < 95:
        clinical_flags.append("Minor peripheral field irregularities noted")

    if features['logMAR'] > 0.4:
        clinical_flags.append("Reduced visual acuity - Corrective lens review recommended")
    elif features['logMAR'] > 0.1:
        clinical_flags.append("Acuity is slightly below optimal 20/20")

    if features['logCS'] < 1.2:
        clinical_flags.append("Severe contrast sensitivity loss detected")
    elif features['logCS'] < 1.5:
        clinical_flags.append("Mild contrast sensitivity loss - may affect night driving")

    # 2. General advice based on risk level and clinical flags
    if risk_level == 2 or len(clinical_flags) >= 2:
        recommendations.append("Urgent: Schedule a comprehensive clinical eye exam")
    elif risk_level == 1 or len(clinical_flags) > 0:
        recommendations.append("Monitor: Schedule a follow-up exam within 3-6 months")
    else:
        recommendations.append("Healthy: Maintain routine exams every 1-2 years")
        recommendations.append("Maintain healthy lifestyle habits and UV protection")

    # Add the specific findings after the general advice
    recommendations.extend(clinical_flags)
    
    return recommendations

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction endpoint for multiple patients
    
    Expected JSON input:
    {
        "patients": [
            {patient1_data},
            {patient2_data},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'patients' not in data:
            return jsonify({
                'error': 'Invalid input',
                'message': 'Expected JSON with "patients" array'
            }), 400
        
        patients = data['patients']
        results = []
        
        for i, patient in enumerate(patients):
            # Validate
            validation_error = validate_input(patient)
            if validation_error:
                results.append({
                    'index': i,
                    'error': validation_error
                })
                continue
            
            # Predict
            features = {
                'age': float(patient['age']),
                'familyHistory': int(patient['familyHistory']),
                'logMAR': float(patient['logMAR']),
                'logCS': float(patient['logCS']),
                'vfi': float(patient['vfi']),
                'amslerDistortion': int(patient['amslerDistortion'])
            }
            
            if model is not None:
                risk_level, risk_score, confidence = ml_based_prediction(features)
                method = 'ml'
            else:
                risk_level, risk_score, confidence = rule_based_prediction(features)
                method = 'rule-based'
            
            risk_level_map = {0: 'Low', 1: 'Moderate', 2: 'High'}
            
            results.append({
                'index': i,
                'riskLevel': risk_level_map[risk_level],
                'riskScore': round(risk_score, 2),
                'confidence': round(confidence, 2),
                'method': method
            })
        
        return jsonify({
            'total': len(patients),
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({
            'error': 'Batch prediction failed',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║         Risk Radar ML API Service Starting...            ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")
    
    # Load model on startup
    load_model()
    
    # Start Flask app
    print("\n🚀 Starting Flask server...")
    print("   URL: http://localhost:5001")
    print("   Endpoints:")
    print("     - GET  /          (Health check)")
    print("     - GET  /health    (Detailed health)")
    print("     - POST /predict   (Single prediction)")
    print("     - POST /batch-predict (Batch prediction)")
    print("\n   Press CTRL+C to stop\n")
    
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )