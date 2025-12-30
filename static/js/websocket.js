// WebSocket Service Module - Handles real-time communication
class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.listeners = new Map();
        this.heartbeatInterval = null;
    }

    // Connect to WebSocket server
    connect(url = null) {
        if (this.socket && this.isConnected) {
            console.log('WebSocket already connected');
            return;
        }

        const wsUrl = url || `ws://${window.location.host}/ws`;
        console.log('Connecting to WebSocket:', wsUrl);

        try {
            this.socket = new WebSocket(wsUrl);
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleReconnect();
        }
    }

    // Setup WebSocket event listeners
    setupEventListeners() {
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.emit('connected');
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected', { code: event.code, reason: event.reason });
            
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.handleReconnect();
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    // Handle incoming messages
    handleMessage(data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'heartbeat':
                this.handleHeartbeat(payload);
                break;
            case 'notification':
                this.handleNotification(payload);
                break;
            case 'hostel_update':
                this.handleHostelUpdate(payload);
                break;
            case 'booking_update':
                this.handleBookingUpdate(payload);
                break;
            case 'chat_message':
                this.handleChatMessage(payload);
                break;
            default:
                console.log('Unknown message type:', type);
                this.emit(type, payload);
        }
    }

    // Send message to server
    send(type, payload = {}) {
        if (!this.isConnected || !this.socket) {
            console.warn('WebSocket not connected, cannot send message');
            return false;
        }

        try {
            const message = JSON.stringify({ type, payload });
            this.socket.send(message);
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    // Event listener management
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data = null) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in WebSocket event listener:', error);
                }
            });
        }
    }

    // Heartbeat mechanism
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.send('heartbeat', { timestamp: Date.now() });
        }, 30000); // Send heartbeat every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    handleHeartbeat(payload) {
        // Server heartbeat response
        console.log('Heartbeat received:', payload);
    }

    // Reconnection logic
    handleReconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
    }

    // Specific message handlers
    handleNotification(payload) {
        console.log('Notification received:', payload);
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.title || 'Stayfinder', {
                body: payload.message,
                icon: '/static/images/favicon.ico'
            });
        }

        // Show in-app notification
        this.showInAppNotification(payload);
        
        this.emit('notification', payload);
    }

    handleHostelUpdate(payload) {
        console.log('Hostel update received:', payload);
        
        // Update local state if hostel data changed
        if (payload.action === 'updated' || payload.action === 'created') {
            // Refresh hostel data
            this.emit('hostel_changed', payload);
        }
        
        this.emit('hostel_update', payload);
    }

    handleBookingUpdate(payload) {
        console.log('Booking update received:', payload);
        this.emit('booking_update', payload);
    }

    handleChatMessage(payload) {
        console.log('Chat message received:', payload);
        this.emit('chat_message', payload);
    }

    // Notification helpers
    showInAppNotification(payload) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${payload.type || 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                    <strong>${payload.title || 'Notification'}</strong>
                    <div class="small">${payload.message}</div>
                </div>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }

    // Join room (for targeted messages)
    joinRoom(roomId) {
        this.send('join_room', { room: roomId });
    }

    // Leave room
    leaveRoom(roomId) {
        this.send('leave_room', { room: roomId });
    }

    // Send chat message
    sendChatMessage(roomId, message) {
        this.send('chat_message', { room: roomId, message });
    }

    // Update user status
    updateStatus(status) {
        this.send('status_update', { status });
    }

    // Disconnect WebSocket
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.close();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // Get connection status
    isReady() {
        return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}

// Export as singleton
const webSocketService = new WebSocketService();
export default webSocketService;
