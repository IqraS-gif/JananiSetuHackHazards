import json
import csv
import os

def json_to_csv(json_file, csv_file):
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found.")
        return

    with open(json_file, 'r') as f:
        data = json.load(f)

    users = data.get('users', {})
    
    # We'll collect all dynamic daily data and flattern it
    # Format: user_id, date, vitals..., symptoms..., lifestyle..., nutrition...
    
    csv_rows = []
    
    # Headers
    headers = [
        'user_id', 'date', 
        'systolic_bp', 'diastolic_bp',
        'headache', 'swelling', 'blurred_vision', 'abdominal_pain',
        'sleep_hours', 'activity_minutes',
        'total_calories', 'total_carbs', 'protein', 'fat', 'sodium', 'folic'
    ]
    
    for user_id, content in users.items():
        vitals = content.get('daily_vitals', {})
        symptoms = content.get('daily_symptoms', {})
        lifestyle = content.get('daily_lifestyle', {})
        nutrition = content.get('daily_nutrition', {})
        
        # All categories share the same dates
        all_dates = sorted(vitals.keys())
        
        for date in all_dates:
            vv = vitals.get(date, {})
            sv = symptoms.get(date, {})
            lv = lifestyle.get(date, {})
            nv = nutrition.get(date, {})
            
            row = [
                user_id,
                date,
                vv.get('systolic_bp', ''),
                vv.get('diastolic_bp', ''),
                sv.get('headache', ''),
                sv.get('swelling', ''),
                sv.get('blurred_vision', ''),
                sv.get('abdominal_pain', ''),
                lv.get('sleep_hours', ''),
                lv.get('activity_minutes', ''),
                nv.get('total_calories', ''),
                nv.get('total_carbs', ''),
                nv.get('protein', ''),
                nv.get('fat', ''),
                nv.get('sodium', ''),
                nv.get('folic', '')
            ]
            csv_rows.append(row)

    with open(csv_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(csv_rows)

    print(f"Success: {csv_file} generated from {json_file}")

if __name__ == "__main__":
    json_to_csv('seed_data.json', 'pregnancy_data.csv')
