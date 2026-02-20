#!/usr/bin/env python3
"""
Risk Radar ML Service - Setup Script
Automates data generation, model training, and validation
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def print_header(text):
    """Print a formatted header"""
    print("\n" + "╔" + "═"*58 + "╗")
    print(f"║ {text:^56} ║")
    print("╚" + "═"*58 + "╝\n")

def print_step(step_num, total_steps, description):
    """Print a step indicator"""
    print(f"\n{'='*60}")
    print(f"STEP {step_num}/{total_steps}: {description}")
    print('='*60 + '\n')

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=False,
            text=True
        )
        print(f"✓ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during {description}")
        print(f"   Command failed with exit code {e.returncode}")
        return False

def check_dependencies():
    """Check if required packages are installed"""
    print("Checking dependencies...")
    
    required_packages = [
        'flask', 'flask_cors', 'sklearn', 'numpy', 'pandas', 'pickle'
    ]
    
    missing = []
    
    for package in required_packages:
        try:
            if package == 'pickle':
                import pickle
            elif package == 'sklearn':
                import sklearn
            else:
                __import__(package)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ❌ {package} (missing)")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("   Please run: pip install -r requirements.txt")
        return False
    
    print("\n✓ All dependencies installed\n")
    return True

def create_directories():
    """Create necessary directories"""
    print("Creating directories...")
    
    directories = ['data', 'models']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"  ✓ {directory}/")
    
    print()
    return True

def generate_data():
    """Generate training data"""
    if Path('data/training_data.csv').exists():
        print("⚠️  Training data already exists.")
        response = input("   Regenerate? (y/N): ").strip().lower()
        if response != 'y':
            print("   Skipping data generation.")
            return True
    
    return run_command(
        'python generate_training_data.py',
        'Data generation'
    )

def train_model():
    """Train the ML model"""
    if Path('models/risk_model.pkl').exists():
        print("⚠️  Trained model already exists.")
        response = input("   Retrain? (y/N): ").strip().lower()
        if response != 'y':
            print("   Skipping model training.")
            return True
    
    return run_command(
        'python train_model.py',
        'Model training'
    )

def verify_setup():
    """Verify that all components are in place"""
    print("Verifying setup...")
    
    checks = [
        ('data/training_data.csv', 'Training data'),
        ('data/features.csv', 'Feature matrix'),
        ('data/labels.csv', 'Label vector'),
        ('models/risk_model.pkl', 'Trained model')
    ]
    
    all_good = True
    
    for file_path, description in checks:
        if Path(file_path).exists():
            size = Path(file_path).stat().st_size / 1024  # KB
            print(f"  ✓ {description}: {size:.1f} KB")
        else:
            print(f"  ❌ {description}: Not found")
            all_good = False
    
    print()
    return all_good

def main():
    """Main setup workflow"""
    print_header("Risk Radar ML Service - Setup")
    
    total_steps = 5
    
    # Step 1: Check dependencies
    print_step(1, total_steps, "Checking Dependencies")
    if not check_dependencies():
        print("\n❌ Setup failed: Missing dependencies")
        sys.exit(1)
    
    # Step 2: Create directories
    print_step(2, total_steps, "Creating Directories")
    if not create_directories():
        print("\n❌ Setup failed: Could not create directories")
        sys.exit(1)
    
    # Step 3: Generate data
    print_step(3, total_steps, "Generating Training Data")
    if not generate_data():
        print("\n❌ Setup failed: Data generation failed")
        sys.exit(1)
    
    # Step 4: Train model
    print_step(4, total_steps, "Training ML Model")
    if not train_model():
        print("\n❌ Setup failed: Model training failed")
        sys.exit(1)
    
    # Step 5: Verify setup
    print_step(5, total_steps, "Verifying Setup")
    if not verify_setup():
        print("\n❌ Setup incomplete: Some files are missing")
        sys.exit(1)
    
    # Success!
    print_header("Setup Complete!")
    
    print("✓ All components ready")
    print("✓ Data generated: 5,000 patient records")
    print("✓ Model trained and saved")
    print()
    print("Next steps:")
    print("  1. Start the API server: python app.py")
    print("  2. Test the API: python test_api.py")
    print("  3. Integrate with frontend: See README.md")
    print()
    
    # Ask if user wants to start the server
    response = input("Start the API server now? (y/N): ").strip().lower()
    if response == 'y':
        print("\n" + "="*60)
        print("Starting Flask API server...")
        print("="*60 + "\n")
        try:
            subprocess.run('python app.py', shell=True)
        except KeyboardInterrupt:
            print("\n\n✓ Server stopped")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)