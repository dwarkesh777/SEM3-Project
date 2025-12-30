# Stayfinder - Hybrid Flask-JavaScript Application

A modern hostel booking application that combines Python Flask backend with equal proportions of JavaScript frontend functionality.

## Architecture Overview

This application uses a **hybrid architecture** with equal proportions of Python (Flask) and JavaScript:

### Backend (Python Flask - 50%)
- RESTful API endpoints
- Authentication & Authorization
- Database operations (MongoDB)
- File uploads (Cloudinary)
- OAuth integration (Google, Facebook)
- Firebase authentication
- WebSocket server for real-time features

### Frontend (JavaScript - 50%)
- Modern ES6+ modules
- Client-side routing and state management
- Dynamic UI interactions
- Real-time WebSocket communication
- Form validation
- API communication layer
- Component-based architecture

## Features

### 🏠 Hostel Management
- View, search, and filter hostels
- Dynamic content loading
- Real-time updates
- Image galleries
- Advanced filtering (city, type, price, amenities)

### 🔐 Authentication
- Email/password login
- Google OAuth
- Facebook OAuth  
- Firebase Google Auth
- JWT token management
- Session persistence

### 📱 Modern UI/UX
- Responsive design with Bootstrap
- Dynamic search suggestions
- Loading states
- Error handling
- Notifications system
- Interactive components

### ⚡ Real-time Features
- WebSocket connections
- Live notifications
- User status updates
- Real-time chat (future)
- Live booking updates

## Project Structure

```
e:\sem3\
├── app.py                 # Main Flask application
├── websocket_server.py    # WebSocket server module
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── static/
│   └── js/
│       ├── api.js         # API service module
│       ├── state.js       # State management
│       ├── auth.js        # Authentication service
│       ├── components.js  # UI components
│       ├── websocket.js   # WebSocket service
│       └── app.js         # Main application module
├── templates/
│   ├── base.html          # Base template with JS modules
│   ├── index.html         # Home page
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   └── ...                # Other templates
└── index_enhanced.html    # Enhanced home page with JS features
```

## Installation & Setup

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 2. Environment Variables

Create `.env` file with:

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
MONGO_URI=mongodb://localhost:27017/Stayfinder
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
```

### 3. Database Setup

```bash
# Start MongoDB
mongod

# The app will automatically create the Stayfinder database
```

### 4. Run the Application

```bash
# Regular Flask run
python app.py

# Or with WebSocket support
python -c "from app import app, socketio; socketio.run(app, debug=True)"
```

## JavaScript Modules

### API Service (`static/js/api.js`)
- Centralized API communication
- JWT token management
- Error handling
- Request/response interceptors

### State Management (`static/js/state.js`)
- Application state management
- Observer pattern for state changes
- Filter and search state
- User authentication state

### Authentication (`static/js/auth.js`)
- Login/register functionality
- OAuth integration
- Token validation
- Form validation

### UI Components (`static/js/components.js`)
- Reusable UI components
- Hostel cards
- Search components
- Filter components
- Notification system

### WebSocket Service (`static/js/websocket.js`)
- Real-time communication
- Connection management
- Event handling
- Reconnection logic

### Main App (`static/js/app.js`)
- Application initialization
- Page-specific handlers
- Event coordination
- Routing logic

## API Endpoints

### Hostel APIs
- `GET /api/hostels` - Get all hostels
- `GET /api/hostels/<id>` - Get specific hostel
- `POST /api/hostels` - Create hostel (JWT required)
- `PUT /api/hostels/<id>` - Update hostel (JWT required)
- `DELETE /api/hostels/<id>` - Delete hostel (JWT required)
- `POST /api/hostels/search` - Search hostels

### User APIs
- `GET /api/user/profile` - Get user profile (JWT required)
- `GET /api/user/bookings` - Get user bookings (JWT required)
- `POST /api/auth/verify` - Verify JWT token

### Traditional Routes (for SSR)
- `GET /` - Home page
- `GET /login` - Login page
- `POST /login` - Login handler
- `GET /register` - Registration page
- `POST /register` - Registration handler
- `GET /hostel/<id>` - Hostel detail page

## WebSocket Events

### Client → Server
- `connect` - Initial connection
- `authenticate` - Authenticate WebSocket connection
- `join_room` - Join a room
- `leave_room` - Leave a room
- `chat_message` - Send chat message
- `status_update` - Update user status
- `heartbeat` - Keep-alive ping

### Server → Client
- `connected` - Connection established
- `notification` - System notifications
- `hostel_update` - Hostel data changes
- `booking_update` - Booking updates
- `chat_message` - Chat messages
- `user_status` - User status changes

## Development

### Adding New Features

1. **Backend**: Add Flask routes and API endpoints
2. **Frontend**: Create JavaScript modules and components
3. **Real-time**: Add WebSocket events if needed
4. **State**: Update state management

### Code Style

- **Python**: Follow PEP 8
- **JavaScript**: Use ES6+ modules and modern syntax
- **HTML**: Use semantic HTML5
- **CSS**: Follow BEM methodology

## Deployment

### Production Setup

```bash
# Install production server
pip install gunicorn eventlet

# Run with Gunicorn and WebSocket support
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 app:app
```

### Environment Variables for Production

Set the following in production:
- `FLASK_ENV=production`
- `DEBUG=False`
- Secure database and API credentials

## Performance Optimization

### Frontend
- Module lazy loading
- Image optimization
- Caching strategies
- Bundle splitting

### Backend
- Database indexing
- API response caching
- WebSocket connection pooling
- Rate limiting

## Security

### Authentication
- JWT token expiration
- Secure password hashing
- OAuth state validation
- CSRF protection

### API Security
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with equal Python/JavaScript balance
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Email: support@stayfinder.com
- Phone: +91 1800-123-4567
- Help Center: `/help-center`

---

**Note**: This application maintains a 50/50 balance between Python Flask backend and JavaScript frontend, providing equal proportions of both technologies as requested.
