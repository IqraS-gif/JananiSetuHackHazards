"""
Risk Radar - Training Data Generator
Generates synthetic patient records with realistic ophthalmology feature distributions
"""

import numpy as np
import pandas as pd
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(42)

def generate_age_dependent_logmar(age):
    """
    Generate visual acuity (LogMAR) based on age
    Young: μ=0.1, σ=0.15
    Older (>60): μ increases, more variability
    """
    if age < 40:
        mean = 0.1
        std = 0.15
    elif age < 60:
        mean = 0.2
        std = 0.2
    else:
        mean = 0.35
        std = 0.25
    
    logmar = np.random.normal(mean, std)
    return np.clip(logmar, 0.0, 2.0)

def generate_contrast_sensitivity(age, has_disease=False):
    """
    Generate contrast sensitivity (LogCS)
    Healthy: μ=1.7, σ=0.2
    With disease or advanced age: reduced
    """
    if has_disease:
        mean = 1.2
        std = 0.3
    elif age > 70:
        mean = 1.5
        std = 0.25
    else:
        mean = 1.7
        std = 0.2
    
    logcs = np.random.normal(mean, std)
    return np.clip(logcs, 0.0, 2.2)

def generate_peripheral_vfi(age, has_glaucoma=False):
    """
    Generate peripheral Visual Field Index (VFI)
    Healthy: heavily skewed towards 95-100%
    Glaucoma: significantly reduced
    """
    if has_glaucoma:
        # Glaucoma patients: much lower VFI
        mean = 70
        std = 15
        vfi = np.random.normal(mean, std)
    elif age > 65:
        # Older patients: slight reduction
        vfi = np.random.beta(20, 1) * 100  # Skewed high
        vfi = vfi - np.random.uniform(0, 5)
    else:
        # Healthy young: very high VFI
        vfi = np.random.beta(30, 1) * 100  # Very skewed towards 100
    
    return np.clip(vfi, 0.0, 100.0)

def generate_amsler_distortion(age):
    """
    Generate Amsler grid distortion (binary)
    Rare (5%) generally, higher (20%) for age > 60
    """
    if age > 60:
        probability = 0.20
    else:
        probability = 0.05
    
    return 1 if np.random.random() < probability else 0

def calculate_risk_level(row):
    """
    Calculate ground truth risk level based on clinical logic
    
    High Risk (2): Serious indicators present
    - Amsler distortion detected
    - VFI < 70 (significant field loss)
    - Poor vision combo: LogMAR > 0.7 AND LogCS < 1.0
    
    Moderate Risk (1): Warning signs
    - Age > 65 (increased risk demographic)
    - Family history positive
    - VFI < 90 (mild field loss)
    
    Low Risk (0): Healthy parameters
    """
    # High risk conditions
    if row['amslerDistortion'] == 1:
        return 2
    
    if row['vfi'] < 70:
        return 2
    
    if row['logMAR'] > 0.7 and row['logCS'] < 1.0:
        return 2
    
    # Moderate risk conditions
    if row['age'] > 65:
        return 1
    
    if row['familyHistory'] == 1:
        return 1
    
    if row['vfi'] < 90:
        return 1
    
    # Otherwise low risk
    return 0

def add_label_noise(risk_level, noise_rate=0.05):
    """
    Add random noise to labels to simulate real-world diagnostic uncertainty
    5% of labels are randomly shifted up or down
    """
    if np.random.random() < noise_rate:
        # Randomly shift by ±1, but stay within [0, 2]
        shift = np.random.choice([-1, 1])
        return int(np.clip(risk_level + shift, 0, 2))
    return risk_level

def generate_training_data(n_samples=5000):
    """
    Generate synthetic patient records with realistic feature distributions
    """
    print(f"Generating {n_samples} synthetic patient records...")
    
    data = []
    
    for i in range(n_samples):
        # Basic demographics
        age = np.random.uniform(20, 90)
        family_history = 1 if np.random.random() < 0.30 else 0
        
        # Simulate some patients with underlying conditions
        has_glaucoma = (age > 60 and np.random.random() < 0.15) or (family_history == 1 and np.random.random() < 0.25)
        has_macular_issue = age > 65 and np.random.random() < 0.10
        
        # Generate features
        logmar = generate_age_dependent_logmar(age)
        logcs = generate_contrast_sensitivity(age, has_disease=(has_glaucoma or has_macular_issue))
        vfi = generate_peripheral_vfi(age, has_glaucoma=has_glaucoma)
        amsler_distortion = generate_amsler_distortion(age) if not has_macular_issue else (1 if np.random.random() < 0.6 else 0)
        
        # Create record
        record = {
            'age': age,
            'familyHistory': family_history,
            'logMAR': logmar,
            'logCS': logcs,
            'vfi': vfi,
            'amslerDistortion': amsler_distortion
        }
        
        data.append(record)
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Calculate ground truth risk levels
    print("Calculating risk levels based on clinical logic...")
    df['riskLevel'] = df.apply(calculate_risk_level, axis=1)
    
    # Add label noise
    print("Adding 5% label noise to simulate real-world uncertainty...")
    df['riskLevel'] = df['riskLevel'].apply(lambda x: add_label_noise(x, noise_rate=0.05))
    
    return df

def print_data_statistics(df):
    """
    Print summary statistics of the generated dataset
    """
    print("\n" + "="*60)
    print("DATASET STATISTICS")
    print("="*60)
    
    print(f"\nTotal records: {len(df)}")
    
    print("\n--- Feature Distributions ---")
    print(f"Age: μ={df['age'].mean():.1f}, σ={df['age'].std():.1f}, range=[{df['age'].min():.1f}, {df['age'].max():.1f}]")
    print(f"Family History: {(df['familyHistory'].sum() / len(df) * 100):.1f}% positive")
    print(f"LogMAR: μ={df['logMAR'].mean():.3f}, σ={df['logMAR'].std():.3f}, range=[{df['logMAR'].min():.3f}, {df['logMAR'].max():.3f}]")
    print(f"LogCS: μ={df['logCS'].mean():.3f}, σ={df['logCS'].std():.3f}, range=[{df['logCS'].min():.3f}, {df['logCS'].max():.3f}]")
    print(f"VFI: μ={df['vfi'].mean():.1f}%, σ={df['vfi'].std():.1f}%, range=[{df['vfi'].min():.1f}%, {df['vfi'].max():.1f}%]")
    print(f"Amsler Distortion: {(df['amslerDistortion'].sum() / len(df) * 100):.1f}% positive")
    
    print("\n--- Risk Level Distribution ---")
    risk_counts = df['riskLevel'].value_counts().sort_index()
    for risk_level, count in risk_counts.items():
        risk_name = ['Low', 'Moderate', 'High'][risk_level]
        percentage = (count / len(df) * 100)
        print(f"Risk Level {risk_level} ({risk_name}): {count} patients ({percentage:.1f}%)")
    
    print("\n--- Correlations with High Risk ---")
    high_risk = df[df['riskLevel'] == 2]
    if len(high_risk) > 0:
        print(f"High risk patients with Amsler distortion: {(high_risk['amslerDistortion'].sum() / len(high_risk) * 100):.1f}%")
        print(f"High risk patients with VFI < 70: {(len(high_risk[high_risk['vfi'] < 70]) / len(high_risk) * 100):.1f}%")
        print(f"High risk patients age > 65: {(len(high_risk[high_risk['age'] > 65]) / len(high_risk) * 100):.1f}%")
    
    print("="*60 + "\n")

def save_data(df, output_dir='data'):
    """
    Save generated data to CSV files
    """
    # Create output directory
    Path(output_dir).mkdir(exist_ok=True)
    
    # Save full dataset
    full_path = Path(output_dir) / 'training_data.csv'
    df.to_csv(full_path, index=False)
    print(f"✓ Saved full dataset to: {full_path}")
    
    # Save features and labels separately (useful for some ML workflows)
    features = df.drop('riskLevel', axis=1)
    labels = df['riskLevel']
    
    features_path = Path(output_dir) / 'features.csv'
    labels_path = Path(output_dir) / 'labels.csv'
    
    features.to_csv(features_path, index=False)
    labels.to_csv(labels_path, index=False, header=True)
    
    print(f"✓ Saved features to: {features_path}")
    print(f"✓ Saved labels to: {labels_path}")
    
    # Sample some records for inspection
    print("\n--- Sample Records ---")
    print(df.head(10).to_string())

if __name__ == "__main__":
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║      Risk Radar - Training Data Generation Script        ║")
    print("╚═══════════════════════════════════════════════════════════╝\n")
    
    # Generate data
    df = generate_training_data(n_samples=5000)
    
    # Print statistics
    print_data_statistics(df)
    
    # Save to disk
    save_data(df)
    
    print("\n✓ Data generation complete!")
    print("  Next step: Run train_model.py to train the ML model")