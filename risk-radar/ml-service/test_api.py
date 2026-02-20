"""
Risk Radar - API Test Script
Tests the ML service endpoints with various scenarios
"""

import requests
import json
import time

# API base URL
BASE_URL = "http://localhost:5001"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")

def test_health_check():
    """Test the health check endpoint"""
    print_section("1. Health Check Test")
    
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API server.")
        print("   Please start the server with: python app.py")
        return False

def test_detailed_health():
    """Test the detailed health endpoint"""
    print_section("2. Detailed Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_low_risk_patient():
    """Test prediction for a low-risk patient"""
    print_section("3. Low Risk Patient Prediction")
    
    patient_data = {
        "age": 35.0,
        "familyHistory": 0,
        "logMAR": 0.0,
        "logCS": 1.9,
        "vfi": 99.5,
        "amslerDistortion": 0
    }
    
    print("Patient Data:")
    print(json.dumps(patient_data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=patient_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        result = response.json()
        assert result['riskLevel'] == 'Low', "Expected Low risk level"
        print("\n✓ Test passed: Correctly predicted Low risk")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_moderate_risk_patient():
    """Test prediction for a moderate-risk patient"""
    print_section("4. Moderate Risk Patient Prediction")
    
    patient_data = {
        "age": 72.0,
        "familyHistory": 1,
        "logMAR": 0.3,
        "logCS": 1.5,
        "vfi": 88.0,
        "amslerDistortion": 0
    }
    
    print("Patient Data:")
    print(json.dumps(patient_data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=patient_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        result = response.json()
        assert result['riskLevel'] in ['Moderate', 'High'], "Expected Moderate or High risk level"
        print(f"\n✓ Test passed: Predicted {result['riskLevel']} risk")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_high_risk_patient():
    """Test prediction for a high-risk patient"""
    print_section("5. High Risk Patient Prediction")
    
    patient_data = {
        "age": 68.0,
        "familyHistory": 1,
        "logMAR": 0.9,
        "logCS": 0.8,
        "vfi": 65.0,
        "amslerDistortion": 1
    }
    
    print("Patient Data:")
    print(json.dumps(patient_data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=patient_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        result = response.json()
        assert result['riskLevel'] == 'High', "Expected High risk level"
        print("\n✓ Test passed: Correctly predicted High risk")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_invalid_input():
    """Test error handling with invalid input"""
    print_section("6. Invalid Input Test")
    
    invalid_data = {
        "age": 150,  # Invalid: too old
        "familyHistory": 0,
        "logMAR": 0.1,
        "logCS": 1.7,
        "vfi": 98.5,
        "amslerDistortion": 0
    }
    
    print("Invalid Patient Data (age=150):")
    print(json.dumps(invalid_data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=invalid_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 400, "Expected 400 Bad Request"
        print("\n✓ Test passed: Correctly rejected invalid input")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_missing_field():
    """Test error handling with missing required field"""
    print_section("7. Missing Field Test")
    
    incomplete_data = {
        "age": 45.0,
        "familyHistory": 0,
        # Missing: logMAR, logCS, vfi, amslerDistortion
    }
    
    print("Incomplete Patient Data (missing fields):")
    print(json.dumps(incomplete_data, indent=2))
    
    try:
        response = requests.post(f"{BASE_URL}/predict", json=incomplete_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 400, "Expected 400 Bad Request"
        print("\n✓ Test passed: Correctly rejected incomplete data")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_batch_prediction():
    """Test batch prediction endpoint"""
    print_section("8. Batch Prediction Test")
    
    batch_data = {
        "patients": [
            {
                "age": 30.0,
                "familyHistory": 0,
                "logMAR": 0.0,
                "logCS": 1.9,
                "vfi": 99.5,
                "amslerDistortion": 0
            },
            {
                "age": 70.0,
                "familyHistory": 1,
                "logMAR": 0.4,
                "logCS": 1.3,
                "vfi": 85.0,
                "amslerDistortion": 0
            },
            {
                "age": 65.0,
                "familyHistory": 0,
                "logMAR": 1.0,
                "logCS": 0.9,
                "vfi": 60.0,
                "amslerDistortion": 1
            }
        ]
    }
    
    print(f"Batch Request with {len(batch_data['patients'])} patients")
    
    try:
        response = requests.post(f"{BASE_URL}/batch-predict", json=batch_data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        
        result = response.json()
        assert result['total'] == 3, "Expected 3 results"
        assert len(result['results']) == 3, "Expected 3 result objects"
        print("\n✓ Test passed: Batch prediction successful")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_performance():
    """Test API response time"""
    print_section("9. Performance Test")
    
    patient_data = {
        "age": 50.0,
        "familyHistory": 0,
        "logMAR": 0.2,
        "logCS": 1.6,
        "vfi": 95.0,
        "amslerDistortion": 0
    }
    
    print("Testing 10 sequential predictions...")
    
    try:
        times = []
        for i in range(10):
            start = time.time()
            response = requests.post(f"{BASE_URL}/predict", json=patient_data)
            end = time.time()
            
            if response.status_code == 200:
                times.append((end - start) * 1000)  # Convert to ms
        
        if times:
            avg_time = sum(times) / len(times)
            min_time = min(times)
            max_time = max(times)
            
            print(f"\nResults:")
            print(f"  Average response time: {avg_time:.2f}ms")
            print(f"  Min response time: {min_time:.2f}ms")
            print(f"  Max response time: {max_time:.2f}ms")
            print(f"\n✓ Test passed: Performance is {'excellent' if avg_time < 50 else 'good' if avg_time < 200 else 'acceptable'}")
            return True
        else:
            print("❌ No successful requests")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_all_tests():
    """Run all test cases"""
    print("\n╔═══════════════════════════════════════════════════════════╗")
    print("║       Risk Radar ML API - Comprehensive Test Suite       ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    
    tests = [
        ("Health Check", test_health_check),
        ("Detailed Health", test_detailed_health),
        ("Low Risk Patient", test_low_risk_patient),
        ("Moderate Risk Patient", test_moderate_risk_patient),
        ("High Risk Patient", test_high_risk_patient),
        ("Invalid Input", test_invalid_input),
        ("Missing Field", test_missing_field),
        ("Batch Prediction", test_batch_prediction),
        ("Performance", test_performance)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
        
        time.sleep(0.5)  # Brief pause between tests
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "❌ FAILED"
        print(f"{status:12} - {test_name}")
    
    print(f"\n{'='*60}")
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print(f"{'='*60}\n")
    
    if passed == total:
        print("🎉 All tests passed successfully!")
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please review the errors above.")

if __name__ == "__main__":
    run_all_tests()