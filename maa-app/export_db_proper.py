import firebase_admin
from firebase_admin import credentials, firestore
import csv
import os

def export_proper_csv():
    cred_path = 'firebase-credentials.json'
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    csv_file = 'maa_app_database_final.csv'
    
    headers = [
        # Basic Info
        'user_id', 'name', 'age', 'height', 'pre_pregnancy_weight', 
        'current_weight', 'BMI', 'trimester', 'expected_due_date',
        # Medical History
        'prev_GDM', 'prev_HTN', 'fam_diabetes', 'fam_HTN', 'chronic_conditions',
        # Daily Data (Pivot)
        'date', 'systolic_bp', 'diastolic_bp', 
        'headache', 'swelling', 'blurred_vision', 'abdominal_pain',
        'sleep_hours', 'activity_minutes', 
        'calories', 'carbs', 'protein', 'fat', 'sodium', 'folic'
    ]

    rows = []
    
    # We focus on the 'users' collection as it contains the structured history
    users_coll = db.collection('users').stream()
    
    for doc in users_coll:
        user_id = doc.id
        data = doc.to_dict()
        
        bi = data.get('basic_info', {})
        mh = data.get('medical_history', {})
        
        vitals = data.get('daily_vitals', {})
        symptoms = data.get('daily_symptoms', {})
        lifestyle = data.get('daily_lifestyle', {})
        nutrition = data.get('daily_nutrition', {})
        
        # Consistent base info for every row of this user
        base_info = [
            user_id,
            bi.get('name', ''), bi.get('age', ''), bi.get('height', ''),
            bi.get('pre_pregnancy_weight', ''), bi.get('current_weight', ''),
            bi.get('BMI', ''), bi.get('trimester', ''), bi.get('expected_due_date', ''),
            mh.get('previous_GDM', ''), mh.get('previous_hypertension', ''),
            mh.get('family_history_diabetes', ''), mh.get('family_history_hypertension', ''),
            mh.get('chronic_conditions', '')
        ]
        
        all_dates = sorted(set(vitals.keys()) | set(symptoms.keys()) | set(lifestyle.keys()) | set(nutrition.keys()))
        
        if not all_dates:
            # If no history, just one row with basic data
            rows.append(base_info + ['N/A'] + [''] * 14)
        else:
            for d in all_dates:
                vv = vitals.get(d, {})
                sv = symptoms.get(d, {})
                lv = lifestyle.get(d, {})
                nv = nutrition.get(d, {})
                
                daily_info = [
                    d,
                    vv.get('systolic_bp', ''), vv.get('diastolic_bp', ''),
                    sv.get('headache', ''), sv.get('swelling', ''),
                    sv.get('blurred_vision', ''), sv.get('abdominal_pain', ''),
                    lv.get('sleep_hours', ''), lv.get('activity_minutes', ''),
                    nv.get('total_calories', ''), nv.get('total_carbs', ''),
                    nv.get('protein', ''), nv.get('fat', ''),
                    nv.get('sodium', ''), nv.get('folic', '')
                ]
                rows.append(base_info + daily_info)

    # Check for other standalone collections (generic rows)
    collections = db.collections()
    for coll in collections:
        if coll.id == 'users': continue
        docs = coll.stream()
        for doc in docs:
            # For other unstructured collections, we just note them down at the end
            rows.append([f"COLL:{coll.id}", doc.id] + [''] * 12 + ['Unstructured Data'] + [str(doc.to_dict())])

    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Success: Proper database CSV exported to {csv_file}")

if __name__ == "__main__":
    export_proper_csv()
