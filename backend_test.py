#!/usr/bin/env python3
"""
NoSmoke Backend API Testing Suite
Tests all backend endpoints for the NoSmoke app
"""

import requests
import sys
import json
from datetime import datetime
import time

class NoSmokeAPITester:
    def __init__(self, base_url="https://smokefree-12.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": name, "details": details})

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request and return response"""
        url = f"{self.base_url}/{endpoint}"
        headers = self.session.headers.copy()
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            return success, response
        except Exception as e:
            return False, str(e)

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, response = self.make_request('GET', '')
        if success:
            data = response.json()
            self.log_test("Root endpoint", "message" in data, f"Response: {data}")
        else:
            self.log_test("Root endpoint", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test health endpoint
        success, response = self.make_request('GET', 'health')
        if success:
            data = response.json()
            self.log_test("Health endpoint", "status" in data, f"Response: {data}")
        else:
            self.log_test("Health endpoint", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique email for testing
        timestamp = int(time.time())
        test_email = f"test{timestamp}@nosmoke.com"
        
        register_data = {
            "email": test_email,
            "password": "password123",
            "name": "Test User",
            "cigarettes_per_day": 15,
            "cost_per_pack": 12.0,
            "cigarettes_per_pack": 20
        }
        
        success, response = self.make_request('POST', 'auth/register', register_data, 200)
        if success:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("User registration", True, f"User ID: {self.user_id}")
            else:
                self.log_test("User registration", False, "Missing token or user in response")
        else:
            self.log_test("User registration", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        
        # Try to login with test credentials
        login_data = {
            "email": "test@nosmoke.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        if success:
            data = response.json()
            if "access_token" in data:
                # Don't override token if we already have one from registration
                if not self.token:
                    self.token = data["access_token"]
                    self.user_id = data["user"]["id"]
                self.log_test("User login", True, "Login successful")
            else:
                self.log_test("User login", False, "Missing token in response")
        else:
            # Login might fail if user doesn't exist, which is okay
            self.log_test("User login", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response} (Expected if user doesn't exist)")

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n🔍 Testing Auth Me Endpoint...")
        
        if not self.token:
            self.log_test("Auth me endpoint", False, "No token available")
            return
            
        success, response = self.make_request('GET', 'auth/me')
        if success:
            data = response.json()
            if "id" in data and "name" in data:
                self.log_test("Auth me endpoint", True, f"User: {data.get('name')}")
            else:
                self.log_test("Auth me endpoint", False, "Missing user data")
        else:
            self.log_test("Auth me endpoint", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_events_api(self):
        """Test events API endpoints"""
        print("\n🔍 Testing Events API...")
        
        if not self.token:
            self.log_test("Events API", False, "No token available")
            return

        # Test creating an urge event
        urge_data = {
            "event_type": "urge",
            "context": "Test urge context",
            "intensity": 7
        }
        
        success, response = self.make_request('POST', 'events', urge_data, 200)
        if success:
            data = response.json()
            self.log_test("Create urge event", "id" in data, f"Event ID: {data.get('id')}")
        else:
            self.log_test("Create urge event", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test creating a resisted event
        resisted_data = {
            "event_type": "resisted",
            "context": "Successfully resisted urge",
            "intensity": 5
        }
        
        success, response = self.make_request('POST', 'events', resisted_data, 200)
        if success:
            data = response.json()
            self.log_test("Create resisted event", "id" in data, f"Event ID: {data.get('id')}")
        else:
            self.log_test("Create resisted event", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting all events
        success, response = self.make_request('GET', 'events')
        if success:
            data = response.json()
            self.log_test("Get all events", isinstance(data, list), f"Found {len(data)} events")
        else:
            self.log_test("Get all events", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting today's stats
        success, response = self.make_request('GET', 'events/today')
        if success:
            data = response.json()
            expected_keys = ["cigarettes_today", "urges_today", "resisted_today", "last_cigarette"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get today stats", has_keys, f"Stats: {data}")
        else:
            self.log_test("Get today stats", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_triggers_api(self):
        """Test triggers API endpoints"""
        print("\n🔍 Testing Triggers API...")
        
        if not self.token:
            self.log_test("Triggers API", False, "No token available")
            return

        # Test creating a trigger
        trigger_data = {
            "trigger_type": "stress",
            "description": "Work deadline stress",
            "location": "Office"
        }
        
        success, response = self.make_request('POST', 'triggers', trigger_data, 200)
        if success:
            data = response.json()
            self.log_test("Create trigger", "id" in data, f"Trigger ID: {data.get('id')}")
        else:
            self.log_test("Create trigger", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting all triggers
        success, response = self.make_request('GET', 'triggers')
        if success:
            data = response.json()
            self.log_test("Get all triggers", isinstance(data, list), f"Found {len(data)} triggers")
        else:
            self.log_test("Get all triggers", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting trigger patterns
        success, response = self.make_request('GET', 'triggers/patterns')
        if success:
            data = response.json()
            expected_keys = ["total_triggers", "by_type"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get trigger patterns", has_keys, f"Patterns: {data}")
        else:
            self.log_test("Get trigger patterns", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_progress_api(self):
        """Test progress API endpoints"""
        print("\n🔍 Testing Progress API...")
        
        if not self.token:
            self.log_test("Progress API", False, "No token available")
            return

        # Test getting progress summary
        success, response = self.make_request('GET', 'progress/summary')
        if success:
            data = response.json()
            expected_keys = ["days_smoke_free", "current_streak", "cigarettes_avoided", "money_saved"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get progress summary", has_keys, f"Summary: {data}")
        else:
            self.log_test("Get progress summary", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting weekly progress
        success, response = self.make_request('GET', 'progress/weekly')
        if success:
            data = response.json()
            self.log_test("Get weekly progress", "days" in data, f"Weekly data: {len(data.get('days', []))} days")
        else:
            self.log_test("Get weekly progress", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting monthly progress
        success, response = self.make_request('GET', 'progress/monthly')
        if success:
            data = response.json()
            self.log_test("Get monthly progress", "weeks" in data, f"Monthly data: {len(data.get('weeks', []))} weeks")
        else:
            self.log_test("Get monthly progress", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_profile_api(self):
        """Test profile API endpoints"""
        print("\n🔍 Testing Profile API...")
        
        if not self.token:
            self.log_test("Profile API", False, "No token available")
            return

        # Test getting profile stats
        success, response = self.make_request('GET', 'profile/stats')
        if success:
            data = response.json()
            expected_keys = ["total_events_logged", "total_triggers_logged", "subscription_status"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get profile stats", has_keys, f"Stats: {data}")
        else:
            self.log_test("Get profile stats", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test updating profile
        update_data = {
            "name": "Updated Test User",
            "cigarettes_per_day": 20
        }
        
        success, response = self.make_request('PUT', 'profile', update_data)
        if success:
            data = response.json()
            self.log_test("Update profile", "name" in data, f"Updated name: {data.get('name')}")
        else:
            self.log_test("Update profile", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_subscription_api(self):
        """Test subscription API endpoints"""
        print("\n🔍 Testing Subscription API...")
        
        # Test getting subscription plans (no auth required)
        success, response = self.make_request('GET', 'subscription/plans')
        if success:
            data = response.json()
            self.log_test("Get subscription plans", "plans" in data, f"Plans: {list(data.get('plans', {}).keys())}")
        else:
            self.log_test("Get subscription plans", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        if not self.token:
            return

        # Test creating checkout session
        checkout_data = {
            "plan_id": "premium_monthly",
            "origin_url": "https://smokefree-12.preview.emergentagent.com"
        }
        
        success, response = self.make_request('POST', 'subscription/checkout', checkout_data)
        if success:
            data = response.json()
            self.log_test("Create checkout session", "checkout_url" in data, f"Checkout URL created")
        else:
            self.log_test("Create checkout session", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def test_insights_api(self):
        """Test insights API endpoints"""
        print("\n🔍 Testing Insights API...")
        
        if not self.token:
            self.log_test("Insights API", False, "No token available")
            return

        # Test getting insights
        success, response = self.make_request('GET', 'insights')
        if success:
            data = response.json()
            expected_keys = ["insights", "daily_tip", "is_premium"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get insights", has_keys, f"Insights: {len(data.get('insights', []))} items")
        else:
            self.log_test("Get insights", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

        # Test getting educational content
        success, response = self.make_request('GET', 'insights/education')
        if success:
            data = response.json()
            expected_keys = ["articles", "milestones"]
            has_keys = all(key in data for key in expected_keys)
            self.log_test("Get educational content", has_keys, f"Articles: {len(data.get('articles', []))}, Milestones: {len(data.get('milestones', []))}")
        else:
            self.log_test("Get educational content", False, f"Status: {response.status_code if hasattr(response, 'status_code') else response}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting NoSmoke Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites
        self.test_health_endpoints()
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        self.test_events_api()
        self.test_triggers_api()
        self.test_progress_api()
        self.test_profile_api()
        self.test_subscription_api()
        self.test_insights_api()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = NoSmokeAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())