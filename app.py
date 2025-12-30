from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity, verify_jwt_in_request
from bson.objectid import ObjectId
from bson import json_util
import os
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api
from authlib.integrations.flask_client import OAuth
import bcrypt
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, auth
import json

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, template_folder=".")

# Configure Flask
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 24)))

# Initialize JWT
jwt = JWTManager(app)

# Initialize OAuth
oauth = OAuth(app)

# --- DATABASE CONFIGURATION ---
# Ensure MongoDB is running on your computer OR replace with your Atlas URL
app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://localhost:27017/Stayfinder")
mongo = PyMongo(app)

# --- CLOUDINARY CONFIGURATION ---
# Only configure Cloudinary if credentials are available
cloudinary_cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
cloudinary_api_key = os.environ.get("CLOUDINARY_API_KEY")
cloudinary_api_secret = os.environ.get("CLOUDINARY_API_SECRET")

# Check if Cloudinary credentials are properly loaded
if cloudinary_cloud_name and cloudinary_api_key and cloudinary_api_secret:
    # Strip any whitespace that might have been accidentally included
    cloudinary_cloud_name = cloudinary_cloud_name.strip()
    cloudinary_api_key = cloudinary_api_key.strip()
    cloudinary_api_secret = cloudinary_api_secret.strip()
    
    if cloudinary_cloud_name and cloudinary_api_key and cloudinary_api_secret:
        cloudinary.config(
            cloud_name=cloudinary_cloud_name,
            api_key=cloudinary_api_key,
            api_secret=cloudinary_api_secret
        )
        print("✓ Cloudinary configured successfully")
    else:
        print("⚠ Cloudinary credentials found but are empty after stripping whitespace")
else:
    print("⚠ Cloudinary credentials not found in environment variables")
    if not cloudinary_cloud_name:
        print("  - CLOUDINARY_CLOUD_NAME is missing")
    if not cloudinary_api_key:
        print("  - CLOUDINARY_API_KEY is missing")
    if not cloudinary_api_secret:
        print("  - CLOUDINARY_API_SECRET is missing")

# --- FIREBASE ADMIN CONFIGURATION ---
# Initialize Firebase Admin SDK
firebase_config = {
    "apiKey": "AIzaSyCONFEQz0f0eNpZHt9AKfNjTrsSwG_8BY0",
    "authDomain": "stayfinder-cee38.firebaseapp.com",
    "projectId": "stayfinder-cee38",
    "storageBucket": "stayfinder-cee38.firebasestorage.app",
    "messagingSenderId": "404788657962",
    "appId": "1:404788657962:web:93facaca2fcf76ab1be853"
}

if not firebase_admin._apps:
    # Initialize Firebase Admin SDK with service account or default credentials
    try:
        # Try to initialize with default credentials first
        firebase_admin.initialize_app()
    except Exception as e:
        # If that fails, you'll need to set up service account credentials
        print(f"Firebase Admin initialization error: {e}")

# --- OAUTH CONFIGURATION ---
# Google OAuth
google = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Facebook OAuth
facebook = oauth.register(
    name='facebook',
    client_id=os.environ.get('FACEBOOK_CLIENT_ID'),
    client_secret=os.environ.get('FACEBOOK_CLIENT_SECRET'),
    access_token_url='https://graph.facebook.com/oauth/access_token',
    authorize_url='https://www.facebook.com/dialog/oauth',
    client_kwargs={'scope': 'email'},
)

# --- API ENDPOINTS FOR JAVASCRIPT FRONTEND ---
# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

@app.route('/api/hostels', methods=['GET'])
def api_get_hostels():
    """Get all hostels as JSON API"""
    try:
        # Get query parameters for filtering
        city = request.args.get('city', '')
        type_filter = request.args.get('type', '')
        min_price = float(request.args.get('min_price', 0))
        max_price = float(request.args.get('max_price', 10000))
        amenities = request.args.getlist('amenities')
        
        # Build query
        query = {}
        if city:
            query['city'] = city
        if type_filter:
            query['type'] = type_filter
        query['price'] = {'$gte': min_price, '$lte': max_price}
        if amenities:
            query['amenities'] = {'$all': amenities}
        
        hostels = list(mongo.db.hostels.find(query))
        serialized_hostels = [serialize_doc(hostel) for hostel in hostels]
        
        return jsonify({
            'success': True,
            'data': serialized_hostels,
            'count': len(serialized_hostels)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/hostels/<hostel_id>', methods=['GET'])
def api_get_hostel(hostel_id):
    """Get specific hostel by ID as JSON API"""
    try:
        hostel = mongo.db.hostels.find_one({"_id": ObjectId(hostel_id)})
        if hostel:
            return jsonify({
                'success': True,
                'data': serialize_doc(hostel)
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Hostel not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/hostels/search', methods=['POST'])
def api_search_hostels():
    """Search hostels as JSON API"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        # Build search query
        search_query = {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"city": {"$regex": query, "$options": "i"}},
                {"location": {"$regex": query, "$options": "i"}},
                {"desc": {"$regex": query, "$options": "i"}}
            ]
        }
        
        hostels = list(mongo.db.hostels.find(search_query))
        serialized_hostels = [serialize_doc(hostel) for hostel in hostels]
        
        return jsonify({
            'success': True,
            'data': serialized_hostels,
            'count': len(serialized_hostels),
            'query': query
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def api_get_user_profile():
    """Get current user profile as JSON API"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if user:
            # Remove password from response
            user_data = serialize_doc(user)
            user_data.pop('password', None)
            
            return jsonify({
                'success': True,
                'data': user_data
            })
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/user/bookings', methods=['GET'])
@jwt_required()
def api_get_user_bookings():
    """Get user bookings as JSON API"""
    try:
        current_user_id = get_jwt_identity()
        # This would integrate with a bookings collection
        # For now, return empty array
        return jsonify({
            'success': True,
            'data': [],
            'message': 'Bookings feature coming soon'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/hostels', methods=['POST'])
@jwt_required()
def api_create_hostel():
    """Create new hostel as JSON API"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'city', 'location', 'price', 'desc', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Create hostel document
        new_hostel = {
            'name': data['name'],
            'city': data['city'],
            'location': data['location'],
            'price': int(data['price']),
            'original_price': data.get('original_price'),
            'image': data.get('image', 'https://via.placeholder.com/400x300?text=No+Image'),
            'photos': data.get('photos', []),
            'desc': data['desc'],
            'type': data['type'],
            'amenities': data.get('amenities', []),
            'appliances': data.get('appliances', []),
            'room_types': data.get('room_types', []),
            'longitude': float(data.get('longitude', 0.0)),
            'latitude': float(data.get('latitude', 0.0)),
            'neighborhood_highlights': data.get('neighborhood_highlights', []),
            'contact_phone': data.get('contact_phone', ''),
            'contact_email': data.get('contact_email', ''),
            'address': data.get('address', ''),
            'property_type': data.get('property_type', 'Hostel'),
            'created_by': current_user_id,
            'created_at': datetime.utcnow()
        }
        
        result = mongo.db.hostels.insert_one(new_hostel)
        created_hostel = mongo.db.hostels.find_one({"_id": result.inserted_id})
        
        return jsonify({
            'success': True,
            'data': serialize_doc(created_hostel),
            'message': 'Hostel created successfully'
        }), 201
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/hostels/<hostel_id>', methods=['PUT'])
@jwt_required()
def api_update_hostel(hostel_id):
    """Update hostel as JSON API"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Check if hostel exists and user has permission
        hostel = mongo.db.hostels.find_one({"_id": ObjectId(hostel_id)})
        if not hostel:
            return jsonify({
                'success': False,
                'message': 'Hostel not found'
            }), 404
        
        # Check if user created this hostel or is admin
        if hostel.get('created_by') != current_user_id:
            return jsonify({
                'success': False,
                'message': 'Permission denied'
            }), 403
        
        # Update hostel
        update_data = {k: v for k, v in data.items() if k != '_id'}
        update_data['updated_at'] = datetime.utcnow()
        
        mongo.db.hostels.update_one(
            {"_id": ObjectId(hostel_id)},
            {"$set": update_data}
        )
        
        updated_hostel = mongo.db.hostels.find_one({"_id": ObjectId(hostel_id)})
        
        return jsonify({
            'success': True,
            'data': serialize_doc(updated_hostel),
            'message': 'Hostel updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/hostels/<hostel_id>', methods=['DELETE'])
@jwt_required()
def api_delete_hostel(hostel_id):
    """Delete hostel as JSON API"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if hostel exists and user has permission
        hostel = mongo.db.hostels.find_one({"_id": ObjectId(hostel_id)})
        if not hostel:
            return jsonify({
                'success': False,
                'message': 'Hostel not found'
            }), 404
        
        # Check if user created this hostel or is admin
        if hostel.get('created_by') != current_user_id:
            return jsonify({
                'success': False,
                'message': 'Permission denied'
            }), 403
        
        mongo.db.hostels.delete_one({"_id": ObjectId(hostel_id)})
        
        return jsonify({
            'success': True,
            'message': 'Hostel deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def api_verify_token():
    """Verify JWT token"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
        
        if user:
            user_data = serialize_doc(user)
            user_data.pop('password', None)
            
            return jsonify({
                'success': True,
                'data': user_data,
                'message': 'Token is valid'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# --- ROUTES ---

# Debug route to check Cloudinary configuration (remove in production)
@app.route('/debug/cloudinary')
def debug_cloudinary():
    """Debug route to check if Cloudinary credentials are loaded"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    api_key = os.environ.get("CLOUDINARY_API_KEY", "")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "")
    
    return jsonify({
        "cloud_name_present": bool(cloud_name),
        "cloud_name_length": len(cloud_name) if cloud_name else 0,
        "api_key_present": bool(api_key),
        "api_key_length": len(api_key) if api_key else 0,
        "api_secret_present": bool(api_secret),
        "api_secret_length": len(api_secret) if api_secret else 0,
        "all_configured": bool(cloud_name and api_key and api_secret),
        "note": "Visit this URL to check if your .env file is being read correctly"
    })

@app.route('/')
def home():
    # Get all hostels from the database
    hostels = list(mongo.db.hostels.find())
    return render_template('index.html', hostels=hostels)

@app.route('/search', methods=['POST'])
def search():
    query = request.form.get('query')
    # Simple search by City (case insensitive)
    hostels = list(mongo.db.hostels.find({"city": {"$regex": query, "$options": "i"}}))
    return render_template('index.html', hostels=hostels)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faqs')
def faqs():
    return render_template('faqs.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/help-center')
def help_center():
    return render_template('helpcenter.html')

@app.route('/safety')
def safety():
    return render_template('safety.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/cancellation')
def cancellation():
    return render_template('cancellation.html')

@app.route('/hostel/<hostel_id>')
def detail(hostel_id):
    # Find specific hostel by ID
    hostel = mongo.db.hostels.find_one({"_id": ObjectId(hostel_id)})
    return render_template('detail.html', hostel=hostel)

@app.route('/add', methods=['GET', 'POST'])
def add_hostel():
    # This page lets you add hostels to the database easily
    if request.method == 'POST':
        image_url = request.form.get("image") or None  # Fallback to URL if provided
        photo_urls = []
        
        # Handle multiple photo uploads
        if 'photos' in request.files:
            photos = request.files.getlist('photos')
            uploaded_count = 0
            
            for photo in photos:
                if photo and photo.filename != '':
                    try:
                        # Check if Cloudinary is configured
                        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
                        api_key = os.environ.get("CLOUDINARY_API_KEY", "").strip()
                        api_secret = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
                        
                        if cloud_name and api_key and api_secret:
                            # Ensure Cloudinary is configured with current values
                            cloudinary.config(
                                cloud_name=cloud_name,
                                api_key=api_key,
                                api_secret=api_secret
                            )
                            
                            # Upload to Cloudinary
                            upload_result = cloudinary.uploader.upload(
                                photo,
                                folder="stayfinder/hostels",
                                resource_type="image"
                            )
                            photo_url = upload_result.get('secure_url')
                            if photo_url:
                                photo_urls.append(photo_url)
                                uploaded_count += 1
                        else:
                            # If Cloudinary not configured, skip file upload
                            missing = []
                            if not cloud_name:
                                missing.append("CLOUDINARY_CLOUD_NAME")
                            if not api_key:
                                missing.append("CLOUDINARY_API_KEY")
                            if not api_secret:
                                missing.append("CLOUDINARY_API_SECRET")
                            flash(f'Cloudinary credentials missing: {", ".join(missing)}. Photos not uploaded.', 'warning')
                            break
                    except Exception as e:
                        print(f"Error uploading photo: {e}")
                        continue
            
            if uploaded_count > 0:
                flash(f'{uploaded_count} photos uploaded successfully!', 'success')
                # Set the first photo as the main image if no image_url provided
                if not image_url and photo_urls:
                    image_url = photo_urls[0]
        
        # Ensure we have an image URL - use placeholder if none provided
        if not image_url or image_url.strip() == '':
            # Default placeholder image
            image_url = "https://via.placeholder.com/400x300?text=No+Image"
            flash('No image provided. Using placeholder image.', 'info')
        
        # Get amenities from form (can be multiple)
        amenities = request.form.getlist("amenities")
        # If no amenities selected, use default ones
        if not amenities:
            amenities = ["WiFi", "Fully Furnished", "AC", "TV", "Laundry"]
        
        # Get original_price (optional)
        original_price = request.form.get("original_price")
        if original_price and original_price.strip():
            original_price = int(original_price)
        else:
            original_price = None
        
        # Get appliances from form (can be multiple)
        appliances = request.form.getlist("appliances")
        
        # Get room types and pricing
        room_types = []
        double_sharing_price = request.form.get("double_sharing_price")
        triple_sharing_price = request.form.get("triple_sharing_price")
        quadruple_sharing_price = request.form.get("quadruple_sharing_price")
        
        if double_sharing_price:
            room_types.append({
                "type": "Double Sharing",
                "facility": request.form.get("double_sharing_facility", "Regular"),
                "price": int(double_sharing_price)
            })
        if triple_sharing_price:
            room_types.append({
                "type": "Triple Sharing", 
                "facility": request.form.get("triple_sharing_facility", "Regular"),
                "price": int(triple_sharing_price)
            })
        if quadruple_sharing_price:
            room_types.append({
                "type": "Quadruple Sharing",
                "facility": request.form.get("quadruple_sharing_facility", "Regular"), 
                "price": int(quadruple_sharing_price)
            })
        
        # Get neighborhood highlights
        neighborhood_highlights = []
        for i in range(1, 6):  # Support up to 5 nearby places
            place_name = request.form.get(f"nearby_place_{i}")
            place_distance = request.form.get(f"nearby_distance_{i}")
            place_time = request.form.get(f"nearby_time_{i}")
            
            if place_name and place_distance and place_time:
                neighborhood_highlights.append({
                    "name": place_name,
                    "distance": place_distance,
                    "time": place_time
                })
        
        new_hostel = {
            "name": request.form.get("name"),
            "city": request.form.get("city"),
            "location": request.form.get("location", "").strip(),  # Area/locality
            "price": int(request.form.get("price")),
            "original_price": original_price,
            "image": image_url,  # Cloudinary URL or provided URL
            "photos": photo_urls,  # Multiple photo URLs
            "desc": request.form.get("desc"),
            "type": request.form.get("type"),  # e.g., Boys, Girls, Co-ed
            "amenities": amenities,
            "appliances": appliances,
            "room_types": room_types,
            "longitude": float(request.form.get("longitude", 0.0)),
            "latitude": float(request.form.get("latitude", 0.0)),
            "neighborhood_highlights": neighborhood_highlights,
            "contact_phone": request.form.get("contact_phone", ""),
            "contact_email": request.form.get("contact_email", ""),
            "address": request.form.get("address", ""),
            "property_type": request.form.get("property_type", "Hostel")  # Hostel or PG
        }
        mongo.db.hostels.insert_one(new_hostel)
        flash('Hostel added successfully!', 'success')
        return redirect(url_for('home'))
    return render_template('add.html')

# --- AUTHENTICATION ROUTES ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Find user in database
        user = mongo.db.users.find_one({'email': email})
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            # Create JWT token
            access_token = create_access_token(identity=str(user['_id']))
            session['user_id'] = str(user['_id'])
            session['access_token'] = access_token
            flash('Login successful!', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid email or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('home'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check if user already exists
        existing_user = mongo.db.users.find_one({'email': email})
        if existing_user:
            flash('Email already registered', 'error')
            return render_template('register.html')
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create new user
        new_user = {
            'name': name,
            'email': email,
            'password': hashed_password.decode('utf-8'),
            'created_at': datetime.utcnow(),
            'auth_method': 'email'
        }
        
        mongo.db.users.insert_one(new_user)
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# --- OAUTH ROUTES ---

@app.route('/auth/google')
def google_auth():
    redirect_uri = url_for('google_auth_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def google_auth_callback():
    try:
        token = google.authorize_access_token()
        # Get user info from Google
        user_info = google.parse_id_token(token)
        
        if not user_info:
            flash('Failed to get user information from Google', 'error')
            return redirect(url_for('login'))
        
        # Check if user exists
        user = mongo.db.users.find_one({'email': user_info['email']})
        
        if not user:
            # Create new user from Google data
            new_user = {
                'name': user_info.get('name', ''),
                'email': user_info['email'],
                'password': '',  # No password for OAuth users
                'google_id': user_info.get('sub'),
                'profile_picture': user_info.get('picture', ''),
                'created_at': datetime.utcnow(),
                'auth_method': 'google'
            }
            mongo.db.users.insert_one(new_user)
            user = new_user
        
        # Create JWT token
        access_token = create_access_token(identity=str(user['_id']))
        session['user_id'] = str(user['_id'])
        session['access_token'] = access_token
        flash('Login successful with Google!', 'success')
        return redirect(url_for('home'))
        
    except Exception as e:
        flash(f'Google authentication failed: {str(e)}', 'error')
        return redirect(url_for('login'))

@app.route('/auth/facebook')
def facebook_auth():
    redirect_uri = url_for('facebook_auth_callback', _external=True)
    return facebook.authorize_redirect(redirect_uri)

@app.route('/auth/facebook/callback')
def facebook_auth_callback():
    try:
        token = facebook.authorize_access_token()
        resp = facebook.get('me?fields=id,name,email,picture')
        user_info = resp.json()
        
        if not user_info or 'email' not in user_info:
            flash('Failed to get user information from Facebook', 'error')
            return redirect(url_for('login'))
        
        # Check if user exists
        user = mongo.db.users.find_one({'email': user_info['email']})
        
        if not user:
            # Create new user from Facebook data
            new_user = {
                'name': user_info.get('name', ''),
                'email': user_info['email'],
                'password': '',  # No password for OAuth users
                'facebook_id': user_info.get('id'),
                'profile_picture': user_info.get('picture', {}).get('data', {}).get('url', ''),
                'created_at': datetime.utcnow(),
                'auth_method': 'facebook'
            }
            mongo.db.users.insert_one(new_user)
            user = new_user
        
        # Create JWT token
        access_token = create_access_token(identity=str(user['_id']))
        session['user_id'] = str(user['_id'])
        session['access_token'] = access_token
        flash('Login successful with Facebook!', 'success')
        return redirect(url_for('home'))
        
    except Exception as e:
        flash(f'Facebook authentication failed: {str(e)}', 'error')
        return redirect(url_for('login'))

# --- FIREBASE GOOGLE OAUTH ROUTE ---

@app.route('/auth/firebase/google', methods=['POST'])
def firebase_google_auth():
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        user_data = data.get('user', {})
        
        if not id_token:
            return jsonify({'success': False, 'message': 'No ID token provided'}), 400
        
        # Verify the Firebase ID token
        try:
            # For development, you might need to set up proper Firebase Admin credentials
            # For now, we'll skip verification and use the user data directly
            # In production, you should verify the token like this:
            # decoded_token = auth.verify_id_token(id_token)
            # uid = decoded_token['uid']
            
            # For development, use the user data from frontend
            uid = user_data.get('uid')
            email = user_data.get('email')
            name = user_data.get('displayName', '')
            photo_url = user_data.get('photoURL', '')
            email_verified = user_data.get('emailVerified', False)
            
            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400
            
        except Exception as e:
            return jsonify({'success': False, 'message': f'Token verification failed: {str(e)}'}), 400
        
        # Check if user exists in database
        user = mongo.db.users.find_one({'email': email})
        
        if not user:
            # Create new user from Firebase data
            new_user = {
                'name': name,
                'email': email,
                'password': '',  # No password for OAuth users
                'firebase_uid': uid,
                'profile_picture': photo_url,
                'email_verified': email_verified,
                'created_at': datetime.utcnow(),
                'auth_method': 'firebase_google'
            }
            
            result = mongo.db.users.insert_one(new_user)
            user_id = str(result.inserted_id)
        else:
            user_id = str(user['_id'])
            # Update user info if needed
            mongo.db.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {
                    'firebase_uid': uid,
                    'profile_picture': photo_url,
                    'email_verified': email_verified,
                    'last_login': datetime.utcnow()
                }}
            )
        
        # Create JWT token
        access_token = create_access_token(identity=user_id)
        session['user_id'] = user_id
        session['access_token'] = access_token
        
        return jsonify({
            'success': True,
            'message': 'Firebase Google authentication successful',
            'redirect': url_for('home')
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Authentication failed: {str(e)}'}), 500

# --- USER PROFILE ROUTES ---

@app.route('/account-settings')
def account_settings():
    if 'user_id' not in session:
        flash('Please login to access account settings', 'error')
        return redirect(url_for('login'))
    
    user = mongo.db.users.find_one({'_id': ObjectId(session['user_id'])})
    return render_template('account_settings.html', user=user)

@app.route('/bookings')
def bookings():
    if 'user_id' not in session:
        flash('Please login to view your bookings', 'error')
        return redirect(url_for('login'))
    
    user = mongo.db.users.find_one({'_id': ObjectId(session['user_id'])})
    return render_template('bookings.html', user=user)

@app.route('/enquiries')
def enquiries():
    if 'user_id' not in session:
        flash('Please login to view your enquiries', 'error')
        return redirect(url_for('login'))
    
    user = mongo.db.users.find_one({'_id': ObjectId(session['user_id'])})
    return render_template('enquiries.html', user=user)

@app.route('/update-profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return {'success': False, 'message': 'Please login to update profile'}
    
    try:
        data = request.get_json()
        user_id = ObjectId(session['user_id'])
        
        # Update user profile
        update_data = {
            'name': data.get('name'),
            'phone': data.get('phone'),
            'gender': data.get('gender'),
            'profile_picture': data.get('profile_picture')
        }
        
        mongo.db.users.update_one(
            {'_id': user_id},
            {'$set': update_data}
        )
        
        return {'success': True, 'message': 'Profile updated successfully'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

if __name__ == '__main__':
    app.run(debug=True)