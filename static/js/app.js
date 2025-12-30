// Main Application Module - Coordinates all modules
class StayfinderApp {
    constructor() {
        this.currentPage = '';
        this.init();
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    async setupApp() {
        try {
            // Initialize authentication
            await authService.init();
            
            // Setup page-specific functionality
            this.setupPageHandlers();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup routing
            this.setupRouting();
            
            // Load initial data if needed
            await this.loadInitialData();
            
            console.log('Stayfinder app initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    setupPageHandlers() {
        const path = window.location.pathname;
        this.currentPage = path;

        // Page-specific initialization
        switch (path) {
            case '/':
            case '/index.html':
                this.setupHomePage();
                break;
            case '/login':
                this.setupLoginPage();
                break;
            case '/register':
                this.setupRegisterPage();
                break;
            case '/add':
                this.setupAddHostelPage();
                break;
            case '/account-settings':
                this.setupAccountSettingsPage();
                break;
            default:
                if (path.startsWith('/hostel/')) {
                    this.setupHostelDetailPage();
                }
                break;
        }
    }

    setupGlobalEventListeners() {
        // Search functionality
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Search input with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleSearchSuggestions(e.target.value);
                }, 300);
            });
        }

        // Filter changes
        const filters = ['cityFilter', 'typeFilter', 'priceRange'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });

        // Amenity checkboxes
        document.querySelectorAll('.amenity-filters input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Price range slider
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        if (priceRange && priceValue) {
            priceRange.addEventListener('input', (e) => {
                priceValue.textContent = e.target.value;
            });
        }

        // Custom events
        window.addEventListener('filtersCleared', () => this.applyFilters());
        window.addEventListener('userLoggedIn', () => this.handleUserLogin());
        window.addEventListener('userLoggedOut', () => this.handleUserLogout());
    }

    setupRouting() {
        // Client-side routing for single-page feel
        const links = document.querySelectorAll('[data-route]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigateTo(route);
            });
        });
    }

    async loadInitialData() {
        // Load hostels if on home page
        if (this.currentPage === '/' || this.currentPage === '/index.html') {
            await this.loadHostels();
        }
    }

    // Page-specific setup methods
    setupHomePage() {
        console.log('Setting up home page');
        this.renderHostelGrid();
    }

    setupLoginPage() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // OAuth buttons
        const googleBtn = document.getElementById('googleLoginBtn');
        const facebookBtn = document.getElementById('facebookLoginBtn');
        
        if (googleBtn) googleBtn.addEventListener('click', () => authService.loginWithGoogle());
        if (facebookBtn) facebookBtn.addEventListener('click', () => authService.loginWithFacebook());
    }

    setupRegisterPage() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password && confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                if (confirmPassword.value !== password.value) {
                    confirmPassword.setCustomValidity('Passwords do not match');
                } else {
                    confirmPassword.setCustomValidity('');
                }
            });
        }
    }

    setupAddHostelPage() {
        const addHostelForm = document.getElementById('addHostelForm');
        if (addHostelForm) {
            addHostelForm.addEventListener('submit', (e) => this.handleAddHostel(e));
        }

        // Dynamic form fields
        this.setupDynamicFormFields();
    }

    setupAccountSettingsPage() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Load user data
        this.loadUserProfile();
    }

    setupHostelDetailPage() {
        // Load hostel details
        this.loadHostelDetails();
        
        // Setup booking form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBooking(e));
        }
    }

    // Event handlers
    async handleSearch(e) {
        e.preventDefault();
        const query = document.getElementById('searchInput').value;
        
        try {
            stateManager.setLoading(true);
            stateManager.setSearchQuery(query);
            
            const results = await apiService.searchHostels(query);
            stateManager.setHostels(results);
            this.renderHostelGrid();
        } catch (error) {
            console.error('Search failed:', error);
            uiComponents.showNotification('Search failed. Please try again.', 'error');
        } finally {
            stateManager.setLoading(false);
        }
    }

    async handleSearchSuggestions(query) {
        if (query.length < 2) {
            document.getElementById('searchSuggestions').innerHTML = '';
            return;
        }

        try {
            const hostels = await apiService.searchHostels(query);
            const suggestions = hostels.slice(0, 5).map(hostel => `
                <div class="suggestion-item" onclick="app.selectSuggestion('${hostel.name}')">
                    <i class="bi bi-geo-alt"></i> ${hostel.name} - ${hostel.city}
                </div>
            `).join('');
            
            document.getElementById('searchSuggestions').innerHTML = suggestions;
        } catch (error) {
            console.error('Failed to get suggestions:', error);
        }
    }

    selectSuggestion(hostelName) {
        document.getElementById('searchInput').value = hostelName;
        document.getElementById('searchSuggestions').innerHTML = '';
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const errors = authService.validateLoginForm(email, password);
        if (errors) {
            this.displayFormErrors(errors);
            return;
        }

        const result = await authService.login(email, password);
        if (result.success) {
            window.location.href = result.redirect;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());

        const errors = authService.validateRegisterForm(userData);
        if (errors) {
            this.displayFormErrors(errors);
            return;
        }

        const result = await authService.register(userData);
        if (result.success) {
            window.location.href = result.redirect;
        }
    }

    async handleAddHostel(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            stateManager.setLoading(true);
            const result = await apiService.addHostel(formData);
            
            if (result.success !== false) {
                uiComponents.showNotification('Hostel added successfully!', 'success');
                window.location.href = '/';
            } else {
                throw new Error(result.message || 'Failed to add hostel');
            }
        } catch (error) {
            console.error('Add hostel failed:', error);
            uiComponents.showNotification(error.message, 'error');
        } finally {
            stateManager.setLoading(false);
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const profileData = Object.fromEntries(formData.entries());

        const result = await authService.updateProfile(profileData);
        if (result.success) {
            uiComponents.showNotification('Profile updated successfully!', 'success');
        }
    }

    async handleBooking(e) {
        e.preventDefault();
        if (!authService.isAuthenticated()) {
            uiComponents.showNotification('Please login to make a booking', 'warning');
            window.location.href = '/login';
            return;
        }

        // Handle booking logic
        uiComponents.showNotification('Booking feature coming soon!', 'info');
    }

    // Data loading methods
    async loadHostels() {
        try {
            stateManager.setLoading(true);
            const hostels = await apiService.getHostels();
            stateManager.setHostels(hostels);
            this.renderHostelGrid();
        } catch (error) {
            console.error('Failed to load hostels:', error);
        } finally {
            stateManager.setLoading(false);
        }
    }

    async loadHostelDetails() {
        const hostelId = window.location.pathname.split('/').pop();
        try {
            stateManager.setLoading(true);
            const hostel = await apiService.getHostel(hostelId);
            stateManager.setCurrentHostel(hostel);
            this.renderHostelDetails(hostel);
        } catch (error) {
            console.error('Failed to load hostel details:', error);
        } finally {
            stateManager.setLoading(false);
        }
    }

    async loadUserProfile() {
        if (!authService.isAuthenticated()) return;

        try {
            const user = authService.getCurrentUser();
            if (user) {
                this.populateProfileForm(user);
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    // Rendering methods
    renderHostelGrid() {
        const hostels = stateManager.filterHostels();
        const container = document.getElementById('hostelGrid');
        
        if (!container) return;

        if (hostels.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-house-x display-1 text-muted"></i>
                    <h3 class="mt-3">No hostels found</h3>
                    <p class="text-muted">Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = hostels.map(hostel => uiComponents.createHostelCard(hostel)).join('');
    }

    renderHostelDetails(hostel) {
        // Implement hostel detail rendering
        console.log('Rendering hostel details:', hostel);
    }

    populateProfileForm(user) {
        const form = document.getElementById('profileForm');
        if (!form) return;

        Object.keys(user).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = user[key] || '';
            }
        });
    }

    // Utility methods
    applyFilters() {
        const city = document.getElementById('cityFilter')?.value || '';
        const type = document.getElementById('typeFilter')?.value || '';
        const maxPrice = parseInt(document.getElementById('priceRange')?.value || '10000');
        const amenities = Array.from(document.querySelectorAll('.amenity-filters input:checked'))
            .map(cb => cb.value);

        stateManager.setFilters({ city, type, priceRange: [0, maxPrice], amenities });
        this.renderHostelGrid();
    }

    setupDynamicFormFields() {
        // Add dynamic neighborhood highlights
        const addNeighborhoodBtn = document.getElementById('addNeighborhoodBtn');
        if (addNeighborhoodBtn) {
            addNeighborhoodBtn.addEventListener('click', () => this.addNeighborhoodField());
        }

        // Add dynamic room types
        const addRoomTypeBtn = document.getElementById('addRoomTypeBtn');
        if (addRoomTypeBtn) {
            addRoomTypeBtn.addEventListener('click', () => this.addRoomTypeField());
        }
    }

    addNeighborhoodField() {
        const container = document.getElementById('neighborhoodHighlights');
        const index = container.children.length;
        const field = document.createElement('div');
        field.className = 'row mb-2';
        field.innerHTML = `
            <div class="col-md-4">
                <input type="text" class="form-control" name="nearby_place_${index}" placeholder="Place name">
            </div>
            <div class="col-md-4">
                <input type="text" class="form-control" name="nearby_distance_${index}" placeholder="Distance">
            </div>
            <div class="col-md-4">
                <input type="text" class="form-control" name="nearby_time_${index}" placeholder="Travel time">
            </div>
        `;
        container.appendChild(field);
    }

    addRoomTypeField() {
        // Implement dynamic room type addition
        console.log('Adding room type field');
    }

    displayFormErrors(errors) {
        Object.keys(errors).forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.setCustomValidity(errors[field]);
                input.classList.add('is-invalid');
            }
        });
    }

    navigateTo(route) {
        window.history.pushState({}, '', route);
        this.setupPageHandlers();
    }

    handleUserLogin() {
        console.log('User logged in');
        // Update UI for logged-in user
        this.updateAuthUI();
    }

    handleUserLogout() {
        console.log('User logged out');
        // Update UI for logged-out user
        this.updateAuthUI();
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        
        if (authService.isAuthenticated()) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
        } else {
            if (authButtons) authButtons.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }
}

// Initialize the app
const app = new StayfinderApp();
export default app;
