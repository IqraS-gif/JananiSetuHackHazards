import firebase_admin
from firebase_admin import credentials, firestore
import csv
import os

def export_full_db():
    cred_path = 'firebase-credentials.json'
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    
    # We'll export the 'users' collection with high detail (flattened history)
    # and other collections as raw JSON strings if they exist.
    
    csv_file = 'full_database_export.csv'
    headers = [
        'collection', 'document_id', 'date', 
        'systolic_bp', 'diastolic_bp', 'headache', 'swelling', 
        'blurred_vision', 'abdominal_pain', 'sleep_hours', 'activity_minutes',
        'calories', 'carbs', 'protein', 'fat', 'sodium', 'folic',
        'raw_data'
    ]

    rows = []
    
    collections = db.collections()
    for coll in collections:
        coll_name = coll.id
        docs = coll.stream()
        
        for doc in docs:
            doc_id = doc.id
            data = doc.to_dict()
            
            if coll_name == 'users':
                # Detailed flattening for users
                vitals = data.get('daily_vitals', {})
                symptoms = data.get('daily_symptoms', {})
                lifestyle = data.get('daily_lifestyle', {})
                nutrition = data.get('daily_nutrition', {})
                
                # Use dates as the pivot
                all_dates = set(vitals.keys()) | set(symptoms.keys()) | set(lifestyle.keys()) | set(nutrition.keys())
                
                if not all_dates:
                    # Just the basic info if no daily history
                    rows.append([coll_name, doc_id, 'N/A', '', '', '', '', '', '', '', '', '', '', '', '', '', '', str(data)])
                else:
                    for date in sorted(all_dates):
                        vv = vitals.get(date, {})
                        sv = symptoms.get(date, {})
                        lv = lifestyle.get(date, {})
                        nv = nutrition.get(date, {})
                        
                        rows.append([
                            coll_name, doc_id, date,
                            vv.get('systolic_bp', ''), vv.get('diastolic_bp', ''),
                            sv.get('headache', ''), sv.get('swelling', ''),
                            sv.get('blurred_vision', ''), sv.get('abdominal_pain', ''),
                            lv.get('sleep_hours', ''), lv.get('activity_minutes', ''),
                            nv.get('total_calories', ''), nv.get('total_carbs', ''),
                            nv.get('protein', ''), nv.get('fat', ''),
                            nv.get('sodium', ''), nv.get('folic', ''),
                            'Flattened'
                        ])
            else:
                # Generic export for other collections
                rows.append([coll_name, doc_id, 'N/A', '', '', '', '', '', '', '', '', '', '', '', '', '', '', str(data)])

    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Success: Full database exported to {csv_file}")

if __name__ == "__main__":
    export_full_db()
