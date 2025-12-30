// UI Components Module - Reusable UI components and interactions
class UIComponents {
    constructor() {
        this.init();
    }

    init() {
        this.initializeTooltips();
        this.initializeModals();
        this.initializeDropdowns();
        this.initializeFormValidation();
    }

    // Initialize Bootstrap tooltips
    initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Initialize Bootstrap modals
    initializeModals() {
        const modalElements = document.querySelectorAll('.modal');
        modalElements.forEach(modalEl => {
            new bootstrap.Modal(modalEl);
        });
    }

    // Initialize dropdowns
    initializeDropdowns() {
        const dropdownElements = document.querySelectorAll('.dropdown-toggle');
        dropdownElements.forEach(dropdownEl => {
            new bootstrap.Dropdown(dropdownEl);
        });
    }

    // Form validation
    initializeFormValidation() {
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    // Loading spinner
    showLoading(element, text = 'Loading...') {
        const spinner = `
            <div class="d-flex justify-content-center align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                ${text}
            </div>
        `;
        
        if (typeof element === 'string') {
            document.getElementById(element).innerHTML = spinner;
        } else {
            element.innerHTML = spinner;
        }
    }

    hideLoading(element, content) {
        if (typeof element === 'string') {
            document.getElementById(element).innerHTML = content;
        } else {
            element.innerHTML = content;
        }
    }

    // Hostel card component
    createHostelCard(hostel) {
        const amenities = hostel.amenities.slice(0, 3).map(amenity => 
            `<span class="amenity-badge">${this.getAmenityIcon(amenity)} ${amenity}</span>`
        ).join('');

        const priceDisplay = hostel.original_price ? 
            `<div class="price-display">
                <span class="text-decoration-line-through text-muted">₹${hostel.original_price}</span>
                <span class="fw-bold text-success">₹${hostel.price}</span>
                <span class="badge bg-success">Save ₹${hostel.original_price - hostel.price}</span>
            </div>` :
            `<div class="price-display">
                <span class="fw-bold">₹${hostel.price}</span>
                <span class="text-muted">/month</span>
            </div>`;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card hostel-card h-100">
                    <div class="position-relative">
                        <img src="${hostel.image}" class="card-img-top" alt="${hostel.name}">
                        <span class="badge bg-dark position-absolute top-0 end-0 m-2">${hostel.type}</span>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${hostel.name}</h5>
                        <p class="card-text text-muted mb-2">
                            <i class="bi bi-geo-alt"></i> ${hostel.location}, ${hostel.city}
                        </p>
                        <p class="card-text flex-grow-1">${this.truncateText(hostel.desc, 100)}</p>
                        <div class="mb-3">${amenities}</div>
                        <div class="mb-3">${priceDisplay}</div>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <a href="/hostel/${hostel._id}" class="btn btn-primary btn-sm">View Details</a>
                            <button class="btn btn-outline-primary btn-sm" onclick="uiComponents.addToFavorites('${hostel._id}')">
                                <i class="bi bi-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Search component
    createSearchComponent() {
        return `
            <div class="search-container">
                <form id="searchForm" class="d-flex">
                    <input type="text" class="form-control me-2" placeholder="Search hostels by city, name, or location..." id="searchInput">
                    <button class="btn btn-primary" type="submit">
                        <i class="bi bi-search"></i> Search
                    </button>
                </form>
                <div id="searchSuggestions" class="search-suggestions"></div>
            </div>
        `;
    }

    // Filter component
    createFilterComponent() {
        return `
            <div class="filter-component">
                <h5>Filters</h5>
                <div class="mb-3">
                    <label for="cityFilter" class="form-label">City</label>
                    <select class="form-select" id="cityFilter">
                        <option value="">All Cities</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Pune">Pune</option>
                        <option value="Hyderabad">Hyderabad</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="typeFilter" class="form-label">Hostel Type</label>
                    <select class="form-select" id="typeFilter">
                        <option value="">All Types</option>
                        <option value="Boys">Boys</option>
                        <option value="Girls">Girls</option>
                        <option value="Co-ed">Co-ed</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="priceRange" class="form-label">Price Range: ₹<span id="priceValue">5000</span></label>
                    <input type="range" class="form-range" id="priceRange" min="0" max="20000" step="500" value="5000">
                </div>
                <div class="mb-3">
                    <label class="form-label">Amenities</label>
                    <div class="amenity-filters">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="WiFi" id="amenityWiFi">
                            <label class="form-check-label" for="amenityWiFi">WiFi</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="AC" id="amenityAC">
                            <label class="form-check-label" for="amenityAC">AC</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="Laundry" id="amenityLaundry">
                            <label class="form-check-label" for="amenityLaundry">Laundry</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="Food" id="amenityFood">
                            <label class="form-check-label" for="amenityFood">Food</label>
                        </div>
                    </div>
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="uiComponents.clearFilters()">Clear Filters</button>
            </div>
        `;
    }

    // Utility methods
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getAmenityIcon(amenity) {
        const icons = {
            'WiFi': '<i class="bi bi-wifi"></i>',
            'AC': '<i class="bi bi-snow"></i>',
            'TV': '<i class="bi bi-tv"></i>',
            'Laundry': '<i class="bi bi-basket"></i>',
            'Food': '<i class="bi bi-egg-fried"></i>',
            'Fully Furnished': '<i class="bi bi-house"></i>',
            'Parking': '<i class="bi bi-car-front"></i>',
            'Gym': '<i class="bi bi-bicycle"></i>',
            'Security': '<i class="bi bi-shield-check"></i>'
        };
        return icons[amenity] || '<i class="bi bi-check-circle"></i>';
    }

    addToFavorites(hostelId) {
        // Implement favorite functionality
        console.log('Added to favorites:', hostelId);
        this.showNotification('Added to favorites!', 'success');
    }

    clearFilters() {
        document.getElementById('cityFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('priceRange').value = '5000';
        document.getElementById('priceValue').textContent = '5000';
        document.querySelectorAll('.amenity-filters input').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Trigger filter update
        window.dispatchEvent(new CustomEvent('filtersCleared'));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Image gallery component
    createImageGallery(images) {
        return `
            <div class="image-gallery">
                <div class="main-image">
                    <img src="${images[0]}" alt="Main image" class="img-fluid rounded">
                </div>
                <div class="thumbnail-container">
                    ${images.map((img, index) => `
                        <img src="${img}" alt="Thumbnail ${index + 1}" class="thumbnail img-thumbnail ${index === 0 ? 'active' : ''}" onclick="uiComponents.changeMainImage('${img}', this)">
                    `).join('')}
                </div>
            </div>
        `;
    }

    changeMainImage(imageSrc, thumbnail) {
        document.querySelector('.main-image img').src = imageSrc;
        document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
        thumbnail.classList.add('active');
    }
}

// Export as singleton
const uiComponents = new UIComponents();
export default uiComponents;
