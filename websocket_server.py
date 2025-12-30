# WebSocket Server Module - Real-time communication
# Add this to your Flask app requirements.txt: flask-socketio

from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
from datetime import datetime

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='thread')

# Connected users storage
connected_users = {}

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'Connected to Stayfinder WebSocket'})
    
    # Send initial data
    emit('notification', {
        'type': 'success',
        'title': 'Connected',
        'message': 'You are now connected to real-time updates'
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')
    
    # Remove from connected users
    if request.sid in connected_users:
        user_id = connected_users[request.sid]
        del connected_users[request.sid]
        
        # Broadcast user offline status
        emit('user_status', {
            'user_id': user_id,
            'status': 'offline',
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)

@socketio.on('heartbeat')
def handle_heartbeat(data):
    """Handle heartbeat messages"""
    emit('heartbeat', {
        'timestamp': datetime.utcnow().isoformat(),
        'server_time': datetime.utcnow().timestamp()
    })

@socketio.on('join_room')
def handle_join_room(data):
    """Handle room joining"""
    room = data.get('room')
    if room:
        join_room(room)
        emit('room_joined', {'room': room})
        print(f'Client {request.sid} joined room: {room}')

@socketio.on('leave_room')
def handle_leave_room(data):
    """Handle room leaving"""
    room = data.get('room')
    if room:
        leave_room(room)
        emit('room_left', {'room': room})
        print(f'Client {request.sid} left room: {room}')

@socketio.on('authenticate')
@jwt_required()
def handle_authenticate(data):
    """Handle user authentication"""
    try:
        current_user_id = get_jwt_identity()
        connected_users[request.sid] = current_user_id
        
        emit('authenticated', {
            'user_id': current_user_id,
            'message': 'Authentication successful'
        })
        
        # Broadcast user online status
        emit('user_status', {
            'user_id': current_user_id,
            'status': 'online',
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)
        
        print(f'User {current_user_id} authenticated with session {request.sid}')
        
    except Exception as e:
        emit('error', {'message': f'Authentication failed: {str(e)}'})

@socketio.on('chat_message')
def handle_chat_message(data):
    """Handle chat messages"""
    try:
        room = data.get('room')
        message = data.get('message')
        user_id = data.get('user_id')
        
        if not room or not message:
            emit('error', {'message': 'Room and message are required'})
            return
        
        # Create message object
        chat_message = {
            'id': str(ObjectId()),
            'room': room,
            'user_id': user_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'sender_sid': request.sid
        }
        
        # Broadcast message to room
        emit('chat_message', chat_message, room=room)
        
        # Store message in database (optional)
        # mongo.db.chat_messages.insert_one(chat_message)
        
        print(f'Chat message in room {room}: {message}')
        
    except Exception as e:
        emit('error', {'message': f'Failed to send message: {str(e)}'})

@socketio.on('status_update')
def handle_status_update(data):
    """Handle user status updates"""
    try:
        user_id = connected_users.get(request.sid)
        if user_id:
            status = data.get('status', 'online')
            
            # Broadcast status update
            emit('user_status', {
                'user_id': user_id,
                'status': status,
                'timestamp': datetime.utcnow().isoformat()
            }, broadcast=True)
            
            print(f'User {user_id} status updated to: {status}')
            
    except Exception as e:
        emit('error', {'message': f'Failed to update status: {str(e)}'})

# Helper functions for broadcasting
def broadcast_notification(title, message, type='info', room=None):
    """Broadcast notification to all clients or specific room"""
    notification = {
        'type': type,
        'title': title,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if room:
        socketio.emit('notification', notification, room=room)
    else:
        socketio.emit('notification', notification, broadcast=True)

def broadcast_hostel_update(hostel_id, action, data):
    """Broadcast hostel updates"""
    update = {
        'hostel_id': hostel_id,
        'action': action,  # 'created', 'updated', 'deleted'
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    socketio.emit('hostel_update', update, broadcast=True)
    print(f'Broadcasted hostel {action}: {hostel_id}')

def broadcast_booking_update(booking_id, action, data):
    """Broadcast booking updates"""
    update = {
        'booking_id': booking_id,
        'action': action,
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Send to specific user room if user_id is provided
    user_id = data.get('user_id')
    if user_id:
        socketio.emit('booking_update', update, room=f'user_{user_id}')
    else:
        socketio.emit('booking_update', update, broadcast=True)
    
    print(f'Broadcasted booking {action}: {booking_id}')

def get_connected_users():
    """Get list of connected users"""
    return list(connected_users.values())

def is_user_connected(user_id):
    """Check if user is currently connected"""
    return user_id in connected_users.values()

# Add to your existing Flask routes to trigger real-time updates

# Example: Add this to your hostel creation route
def notify_hostel_created(hostel_data):
    """Notify clients when a new hostel is created"""
    broadcast_hostel_update(
        hostel_data['_id'], 
        'created', 
        hostel_data
    )

# Example: Add this to your booking creation route  
def notify_booking_created(booking_data):
    """Notify user when booking is created"""
    broadcast_booking_update(
        booking_data['_id'],
        'created', 
        booking_data
    )

# Example: Send welcome notification to new users
def send_welcome_notification(user_id):
    """Send welcome notification to specific user"""
    if is_user_connected(user_id):
        socketio.emit('notification', {
            'type': 'success',
            'title': 'Welcome to Stayfinder!',
            'message': 'Your account has been created successfully.',
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')

# Add this to your app.py to run with SocketIO
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
