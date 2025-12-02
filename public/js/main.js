/**
 * SupermarketApp Main JavaScript
 * Client-side functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // ===========================================
    // AUTO-DISMISS ALERTS
    // Automatically dismiss flash messages after 5 seconds
    // ===========================================
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // ===========================================
    // CONFIRM DIALOGS
    // Enhanced confirmation for delete actions
    // ===========================================
    const deleteLinks = document.querySelectorAll('a[href*="delete"]');
    deleteLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    });

    // ===========================================
    // QUANTITY INPUT VALIDATION
    // Ensure quantity inputs are within valid range
    // ===========================================
    const quantityInputs = document.querySelectorAll('input[name="quantity"]');
    quantityInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 99;
            let value = parseInt(input.value) || min;
            
            if (value < min) value = min;
            if (value > max) value = max;
            
            input.value = value;
        });
    });

    // ===========================================
    // SEARCH FORM ENHANCEMENT
    // Clear search on empty submit
    // ===========================================
    const searchForms = document.querySelectorAll('form[action*="search"], form[action*="inventory"], form[action*="shopping"]');
    searchForms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            const searchInput = form.querySelector('input[name="search"]');
            if (searchInput && searchInput.value.trim() === '') {
                // Remove search parameter if empty
                searchInput.disabled = true;
            }
        });
    });

    // ===========================================
    // IMAGE PREVIEW FOR FILE UPLOADS
    // Shows preview before uploading
    // ===========================================
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(function(input) {
        input.addEventListener('change', function(e) {
            const previewContainer = document.getElementById('imagePreview');
            const previewImage = document.getElementById('preview');
            
            if (previewContainer && previewImage && e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = 'block';
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    });

    // ===========================================
    // FORM VALIDATION FEEDBACK
    // Bootstrap validation styles
    // ===========================================
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // ===========================================
    // LOADING STATE FOR BUTTONS
    // Shows spinner during form submission
    // ===========================================
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(function(button) {
        const form = button.closest('form');
        if (form) {
            form.addEventListener('submit', function() {
                if (form.checkValidity()) {
                    button.disabled = true;
                    const originalContent = button.innerHTML;
                    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
                    
                    // Reset after timeout in case of error
                    setTimeout(function() {
                        button.disabled = false;
                        button.innerHTML = originalContent;
                    }, 10000);
                }
            });
        }
    });

    // ===========================================
    // CART COUNT UPDATE (for AJAX operations)
    // Updates cart badge without page reload
    // ===========================================
    function updateCartCount(count) {
        const cartBadges = document.querySelectorAll('.badge.bg-danger');
        cartBadges.forEach(function(badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    // ===========================================
    // TOOLTIP INITIALIZATION
    // Enable Bootstrap tooltips
    // ===========================================
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // ===========================================
    // SMOOTH SCROLL
    // Smooth scrolling for anchor links
    // ===========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    console.log('JustFee JavaScript loaded');
});
