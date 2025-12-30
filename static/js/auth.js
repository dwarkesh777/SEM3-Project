// Authentication Module - Handles user authentication
class AuthService {
    constructor(apiService, stateManager) {
        this.api = apiService;
        this.state = stateManager;
        this.init();
    }

    // Initialize authentication state
    async init() {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        if (token) {
            try {
                // Verify token and get user data
                const userData = await this.api.getUserProfile();
                this.state.setUser(userData);
                this.api.token = token;
            } catch (error) {
                console.error('Invalid token:', error);
                this.logout();
            }
        }
    }

    // Login with email and password
    async login(email, password) {
        try {
            this.state.setLoading(true);
            this.state.clearError();

            const response = await this.api.login(email, password);
            
            if (response.access_token) {
                // Get user data
                const userData = await this.api.getUserProfile();
                this.state.setUser(userData);
                this.showNotification('Login successful!', 'success');
                return { success: true, redirect: '/' };
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            this.state.setError(error.message);
            this.showNotification(error.message, 'error');
            return { success: false, message: error.message };
        } finally {
            this.state.setLoading(false);
        }
    }

    // Register new user
    async register(userData) {
        try {
            this.state.setLoading(true);
            this.state.clearError();

            const response = await this.api.register(userData);
            
            if (response.success !== false) {
                this.showNotification('Registration successful! Please login.', 'success');
                return { success: true, redirect: '/login' };
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            this.state.setError(error.message);
            this.showNotification(error.message, 'error');
            return { success: false, message: error.message };
        } finally {
            this.state.setLoading(false);
        }
    }

    // OAuth login methods
    async loginWithGoogle() {
        this.api.googleOAuth();
    }

    async loginWithFacebook() {
        this.api.facebookOAuth();
    }

    // Firebase Google authentication
    async loginWithFirebaseGoogle(idToken, userData) {
        try {
            this.state.setLoading(true);
            this.state.clearError();

            const response = await this.api.firebaseGoogleAuth(idToken, userData);
            
            if (response.success) {
                // Get user data
                const userProfile = await this.api.getUserProfile();
                this.state.setUser(userProfile);
                this.showNotification('Firebase authentication successful!', 'success');
                return { success: true, redirect: response.redirect };
            } else {
                throw new Error(response.message || 'Firebase authentication failed');
            }
        } catch (error) {
            this.state.setError(error.message);
            this.showNotification(error.message, 'error');
            return { success: false, message: error.message };
        } finally {
            this.state.setLoading(false);
        }
    }

    // Logout user
    async logout() {
        try {
            await this.api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.state.clearUser();
            this.showNotification('Logged out successfully', 'success');
            window.location.href = '/';
        }
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            this.state.setLoading(true);
            this.state.clearError();

            const response = await this.api.updateProfile(profileData);
            
            if (response.success) {
                // Update user state
                const updatedUser = { ...this.state.getState().user, ...profileData };
                this.state.setUser(updatedUser);
                this.showNotification('Profile updated successfully!', 'success');
                return { success: true };
            } else {
                throw new Error(response.message || 'Profile update failed');
            }
        } catch (error) {
            this.state.setError(error.message);
            this.showNotification(error.message, 'error');
            return { success: false, message: error.message };
        } finally {
            this.state.setLoading(false);
        }
    }

    // Check authentication status
    isAuthenticated() {
        return this.state.isAuthenticated();
    }

    // Get current user
    getCurrentUser() {
        return this.state.getState().user;
    }

    // Require authentication (redirect if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    // Show notification (to be implemented based on UI framework)
    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Form validation helpers
    validateLoginForm(email, password) {
        const errors = {};
        
        if (!email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'Email is invalid';
        }
        
        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        return Object.keys(errors).length === 0 ? null : errors;
    }

    validateRegisterForm(userData) {
        const errors = {};
        
        if (!userData.name) {
            errors.name = 'Name is required';
        }
        
        if (!userData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
            errors.email = 'Email is invalid';
        }
        
        if (!userData.password) {
            errors.password = 'Password is required';
        } else if (userData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        if (userData.confirmPassword && userData.password !== userData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        
        return Object.keys(errors).length === 0 ? null : errors;
    }
}

// Export as singleton
const authService = new AuthService(apiService, stateManager);
export default authService;
