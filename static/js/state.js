// State Management Module - Manages application state
class StateManager {
    constructor() {
        this.state = {
            user: null,
            hostels: [],
            currentHostel: null,
            isLoading: false,
            error: null,
            searchQuery: '',
            filters: {
                city: '',
                type: '',
                priceRange: [0, 10000],
                amenities: []
            }
        };
        this.listeners = [];
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners of state changes
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Update state
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notify();
    }

    // Loading states
    setLoading(isLoading) {
        this.setState({ isLoading });
    }

    setError(error) {
        this.setState({ error });
    }

    clearError() {
        this.setState({ error: null });
    }

    // User management
    setUser(user) {
        this.setState({ user });
    }

    clearUser() {
        this.setState({ user: null });
    }

    // Hostel management
    setHostels(hostels) {
        this.setState({ hostels });
    }

    addHostel(hostel) {
        this.setState({
            hostels: [...this.state.hostels, hostel]
        });
    }

    setCurrentHostel(hostel) {
        this.setState({ currentHostel: hostel });
    }

    // Search and filters
    setSearchQuery(query) {
        this.setState({ searchQuery: query });
    }

    setFilters(filters) {
        this.setState({
            filters: { ...this.state.filters, ...filters }
        });
    }

    clearFilters() {
        this.setState({
            filters: {
                city: '',
                type: '',
                priceRange: [0, 10000],
                amenities: []
            }
        });
    }

    // Utility methods
    filterHostels() {
        let filtered = [...this.state.hostels];

        if (this.state.searchQuery) {
            filtered = filtered.filter(hostel => 
                hostel.name.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
                hostel.city.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
                hostel.location.toLowerCase().includes(this.state.searchQuery.toLowerCase())
            );
        }

        if (this.state.filters.city) {
            filtered = filtered.filter(hostel => 
                hostel.city.toLowerCase() === this.state.filters.city.toLowerCase()
            );
        }

        if (this.state.filters.type) {
            filtered = filtered.filter(hostel => 
                hostel.type.toLowerCase() === this.state.filters.type.toLowerCase()
            );
        }

        filtered = filtered.filter(hostel => 
            hostel.price >= this.state.filters.priceRange[0] && 
            hostel.price <= this.state.filters.priceRange[1]
        );

        if (this.state.filters.amenities.length > 0) {
            filtered = filtered.filter(hostel => 
                this.state.filters.amenities.every(amenity => 
                    hostel.amenities.includes(amenity)
                )
            );
        }

        return filtered;
    }

    // Authentication helpers
    isAuthenticated() {
        return !!this.state.user;
    }

    hasRole(role) {
        return this.state.user && this.state.user.role === role;
    }
}

// Export as singleton
const stateManager = new StateManager();
export default stateManager;
