#!/usr/bin/env python3
"""
Test script to verify image rendering fix for Stayfinder
"""

import os
import sys
import json
from pymongo import MongoClient
from bson.objectid import ObjectId

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_image_data_structure():
    """Test that image data is properly structured in the database"""
    try:
        # Connect to MongoDB (same as app.py)
        MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://harshal_mangukiya_db_user:HhH3iDZDPm71omqY@cluster0.ntg5ion.mongodb.net/?appName=Cluster0")
        
        client = MongoClient(
            MONGO_URI, 
            serverSelectionTimeoutMS=10000,
            ssl=True,
            tlsAllowInvalidCertificates=True,
            retryWrites=False
        )
        
        db = client["stayfinder"]
        
        # Find a hostel with photos
        hostel = db.hostels.find_one({"photos": {"$exists": True, "$ne": []}})
        
        if hostel:
            print("✓ Found hostel with photos")
            print(f"  Hostel ID: {hostel['_id']}")
            print(f"  Hostel Name: {hostel.get('name', 'N/A')}")
            print(f"  Number of photos: {len(hostel.get('photos', []))}")
            
            # Check photo URLs
            photos = hostel.get('photos', [])
            if photos:
                print(f"  First photo URL: {photos[0]}")
                print(f"  Photo URLs are valid: {all(url.startswith('http') for url in photos)}")
            
            # Check main image
            main_image = hostel.get('image')
            if main_image:
                print(f"  Main image URL: {main_image}")
                print(f"  Main image is valid: {main_image.startswith('http')}")
            
            return True
        else:
            print("⚠ No hostel with photos found")
            
            # Check for hostels with main image only
            hostel = db.hostels.find_one({"image": {"$exists": True, "$ne": ""}})
            if hostel:
                print("✓ Found hostel with main image")
                print(f"  Hostel ID: {hostel['_id']}")
                print(f"  Main image URL: {hostel.get('image')}")
                return True
            else:
                print("⚠ No hostel with images found")
                return False
                
    except Exception as e:
        print(f"✗ Error testing image data: {e}")
        return False

def test_cloudinary_config():
    """Test Cloudinary configuration"""
    try:
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
        api_key = os.environ.get("CLOUDINARY_API_KEY", "").strip()
        api_secret = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
        
        print("Cloudinary Configuration:")
        print(f"  Cloud Name: {'✓' if cloud_name else '✗'}")
        print(f"  API Key: {'✓' if api_key else '✗'}")
        print(f"  API Secret: {'✓' if api_secret else '✗'}")
        
        if cloud_name and api_key and api_secret:
            print("✓ Cloudinary is properly configured")
            return True
        else:
            print("⚠ Cloudinary configuration incomplete")
            return False
            
    except Exception as e:
        print(f"✗ Error checking Cloudinary config: {e}")
        return False

def test_template_fix():
    """Test that the template fix is applied"""
    try:
        with open('detail.html', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for the fixed data-photos attribute
        if 'data-photos="{{ all_photos|tojson|safe }}"' in content:
            print("✓ Template fix applied: data-photos attribute corrected")
        else:
            print("✗ Template fix not found: data-photos attribute still incorrect")
            return False
        
        # Check for enhanced error handling
        if 'console.error(\'Failed to load main image:' in content:
            print("✓ Enhanced error handling added to main photo")
        else:
            print("⚠ Enhanced error handling not found for main photo")
        
        if 'console.error(\'Failed to load thumbnail:' in content:
            print("✓ Enhanced error handling added to thumbnails")
        else:
            print("⚠ Enhanced error handling not found for thumbnails")
        
        # Check for improved lightbox
        if 'console.log(\'Opening lightbox at index:' in content:
            print("✓ Improved lightbox with logging added")
        else:
            print("⚠ Improved lightbox not found")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing template fix: {e}")
        return False

if __name__ == "__main__":
    print("Testing Stayfinder Image Rendering Fix")
    print("=" * 50)
    
    tests = [
        ("Cloudinary Configuration", test_cloudinary_config),
        ("Database Image Data", test_image_data_structure),
        ("Template Fix", test_template_fix)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 30)
        result = test_func()
        results.append(result)
    
    print("\n" + "=" * 50)
    print("Test Summary:")
    for i, (test_name, _) in enumerate(tests):
        status = "✓ PASS" if results[i] else "✗ FAIL"
        print(f"  {test_name}: {status}")
    
    if all(results):
        print("\n🎉 All tests passed! Image rendering should now work correctly.")
    else:
        print("\n⚠ Some tests failed. Please check the issues above.")
