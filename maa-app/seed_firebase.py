import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

def seed_data():
    # Path to your service account key file
    cred_path = 'firebase-credentials.json'
    
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return

    # Initialize Firebase Admin SDK
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

    db = firestore.client()

    # Load the generated seed data
    with open('seed_data.json', 'r') as f:
        data = json.load(f)

    users_data = data.get('users', {})

    for user_id, user_content in users_data.items():
        print(f"Seeding data for {user_id}...")
        
        # Reference to the user document
        user_ref = db.collection('users').document(user_id)
        
        # Using a batch might be better for 40 days of history, 
        # but for simplicity and reliability in this environment, 
        # we'll set the fields directly.
        
        # Set top level fields
        user_ref.set({
            "basic_info": user_content["basic_info"],
            "medical_history": user_content["medical_history"],
            "daily_vitals": user_content["daily_vitals"],
            "daily_symptoms": user_content["daily_symptoms"],
            "daily_lifestyle": user_content["daily_lifestyle"],
            "daily_nutrition": user_content["daily_nutrition"],
            "lab_reports": user_content["lab_reports"]
        })
        
        print(f"Successfully seeded {user_id}")

    print("All seeding operations completed successfully.")

if __name__ == "__main__":
    seed_data()
