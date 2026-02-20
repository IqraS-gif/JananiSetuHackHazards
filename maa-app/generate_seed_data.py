import json
import random
from datetime import datetime, timedelta

def generate_date_range(start_date, days):
    return [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days)]

def generate_user_data(user_id, start_date_str, days):
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    dates = generate_date_range(start_date, days)
    
    data = {
        "basic_info": {},
        "medical_history": {},
        "daily_vitals": {},
        "daily_symptoms": {},
        "daily_lifestyle": {},
        "daily_nutrition": {},
        "lab_reports": []
    }
    
    if user_id == "user_001":
        # Normal Case
        data["basic_info"] = {
            "name": "Priya Sharma",
            "age": 26,
            "height": 162,
            "pre_pregnancy_weight": 58,
            "current_weight": 64,
            "BMI": 22.1,
            "trimester": 2,
            "expected_due_date": "2026-07-15"
        }
        data["medical_history"] = {
            "previous_GDM": False,
            "previous_hypertension": False,
            "family_history_diabetes": False,
            "family_history_hypertension": False,
            "chronic_conditions": "None"
        }
        
        for date in dates:
            data["daily_vitals"][date] = {
                "systolic_bp": random.randint(110, 120),
                "diastolic_bp": random.randint(70, 80)
            }
            data["daily_symptoms"][date] = {
                "headache": 0,
                "swelling": 1 if random.random() < 0.05 else 0, # Very rare
                "blurred_vision": 0,
                "abdominal_pain": 0
            }
            data["daily_lifestyle"][date] = {
                "sleep_hours": round(random.uniform(7, 8.5), 1),
                "activity_minutes": random.randint(20, 45)
            }
            data["daily_nutrition"][date] = {
                "total_calories": random.randint(2000, 2200),
                "total_carbs": random.randint(150, 190),
                "protein": random.randint(65, 75),
                "fat": random.randint(50, 65),
                "sodium": random.randint(1500, 1950),
                "folic": random.randint(400, 600)
            }
        
        data["lab_reports"] = [
            {"report_id": "L101", "date": "2026-01-15", "HbA1c": 5.2, "urine_protein": 0, "hemoglobin": 12.5, "fasting_glucose_lab": 88},
            {"report_id": "L102", "date": "2026-02-05", "HbA1c": 5.1, "urine_protein": 0, "hemoglobin": 12.6, "fasting_glucose_lab": 85}
        ]

    elif user_id == "user_002":
        # High-Risk Case
        data["basic_info"] = {
            "name": "Anjali Verma",
            "age": 34,
            "height": 158,
            "pre_pregnancy_weight": 72,
            "current_weight": 81,
            "BMI": 28.8,
            "trimester": 2,
            "expected_due_date": "2026-06-20"
        }
        data["medical_history"] = {
            "previous_GDM": True,
            "previous_hypertension": False,
            "family_history_diabetes": True,
            "family_history_hypertension": True,
            "chronic_conditions": "Early signs of Preeclampsia"
        }
        
        # Trend: BP gradually increasing from 135/85 to 155/100 over 40 days
        for i, date in enumerate(dates):
            progress = i / (days - 1)
            sys_base = 135 + (progress * 20) # 135 to 155
            dia_base = 85 + (progress * 15)  # 85 to 100
            
            data["daily_vitals"][date] = {
                "systolic_bp": int(sys_base + random.randint(-3, 3)),
                "diastolic_bp": int(dia_base + random.randint(-2, 2))
            }
            
            # Symptoms frequency increase with BP
            prob_symp = 0.2 + (progress * 0.6) # 20% to 80%
            data["daily_symptoms"][date] = {
                "headache": 1 if random.random() < prob_symp else 0,
                "swelling": 1 if random.random() < (prob_symp + 0.1) else 0,
                "blurred_vision": 1 if progress > 0.8 and random.random() < 0.3 else 0,
                "abdominal_pain": 1 if progress > 0.7 and random.random() < 0.2 else 0
            }
            
            data["daily_lifestyle"][date] = {
                "sleep_hours": round(random.uniform(4, 6), 1),
                "activity_minutes": random.randint(5, 15)
            }
            data["daily_nutrition"][date] = {
                "total_calories": random.randint(2400, 2800),
                "total_carbs": random.randint(220, 280),
                "protein": random.randint(55, 65),
                "fat": random.randint(80, 100),
                "sodium": random.randint(2800, 3500),
                "folic": random.randint(300, 450)
            }
            
        data["lab_reports"] = [
            {"report_id": "L201", "date": "2026-01-10", "HbA1c": 6.2, "urine_protein": 0, "hemoglobin": 10.5, "fasting_glucose_lab": 105},
            {"report_id": "L202", "date": "2026-02-08", "HbA1c": 6.8, "urine_protein": 1, "hemoglobin": 10.1, "fasting_glucose_lab": 118}
        ]

    return data

def main():
    users = {
        "user_001": generate_user_data("user_001", "2026-01-01", 40),
        "user_002": generate_user_data("user_002", "2026-01-01", 40)
    }
    
    final_data = {"users": users}
    
    with open('seed_data.json', 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print("Success: seed_data.json generated with 40 days of data for two users.")

if __name__ == "__main__":
    main()
