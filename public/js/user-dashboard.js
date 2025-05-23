console.log('[DEBUG] Starting user-dashboard.js initialization');

let currentUser = null;
let userProfile = null;
let profilePhotoUrl = '';
let currentFoodFilter = 'all';
let selectedItem = null;
let currentOrder = null;
let pendingPayments = {};
let paymentTimeoutIds = {};


let lastSeenTimestamp = {};
let typingStatus = {};
let notificationSound = new Audio('/sounds/notification.mp3');

let shownNotifications = new Set();

document.addEventListener('DOMContentLoaded', () => {
  
    const savedNotifications = localStorage.getItem('userShownNotifications');
    if (savedNotifications) {
        shownNotifications = new Set(JSON.parse(savedNotifications));
    }
});

function saveShownNotifications() {
    localStorage.setItem('userShownNotifications', JSON.stringify([...shownNotifications]));
}

document.addEventListener('DOMContentLoaded', function() {
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) {
        paymentModal.addEventListener('click', function(event) {
            if (event.target === paymentModal) {
                hidePaymentModal();
            }
        });
        console.log('[DEBUG] Payment modal initialized');
    } else {
        console.error('[ERROR] Payment modal not found');
    }
});


let stripe;
let elements;

async function initializeStripe() {
    try {
        const response = await fetch('/api/stripe-config');
        const config = await response.json();
        stripe = Stripe(config.publishableKey);
    } catch (error) {
        console.error('Error initializing Stripe:', error);
    }
}

initializeStripe();

function log(message, type = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    if (data) {
        console.log(logMessage, {
            ...data,
            userId: currentUser?.uid,
            userName: currentUser?.displayName,
            timestamp: timestamp
        });
    } else {
        console.log(logMessage);
    }
}

console.log('[DEBUG] Script dependencies check:');
console.log('[DEBUG] Firebase:', typeof firebase !== 'undefined' ? 'Loaded' : 'Not loaded');
console.log('[DEBUG] Cloudinary:', typeof cloudinary !== 'undefined' ? 'Loaded' : 'Not loaded');
console.log('[DEBUG] html2pdf:', typeof html2pdf !== 'undefined' ? 'Loaded' : 'Not loaded');

try {
    console.log('[DEBUG] Initializing Cloudinary...');
    const cloudinary = window.cloudinary;
    cloudinary.setCloudName('dqaygduva');
    console.log('[DEBUG] Cloudinary initialized successfully');
} catch (error) {
    console.error('[ERROR] Failed to initialize Cloudinary:', error);
}


console.log('[DEBUG] Setting up Firebase auth state listener...');
auth.onAuthStateChanged(async (user) => {
    console.log('[DEBUG] Auth state changed:', user ? 'User logged in' : 'No user');
    
    if (user) {
        log('User authenticated', 'info', { uid: user.uid });
        currentUser = user;
        try {
            console.log('[DEBUG] Loading user profile...');
            await loadUserProfile();
            console.log('[DEBUG] Loading food items...');
            await loadFoodItems();
            console.log('[DEBUG] Loading orders...');
            await loadOrders();
            console.log('[DEBUG] Initial data load complete');
        } catch (error) {
            console.error('[ERROR] Failed to load initial data:', error);
        }
    } else {
        log('User not authenticated, redirecting to login', 'warning');
        try {
            console.log('[DEBUG] Redirecting to login page...');
            window.location.href = '/index.html';
        } catch (error) {
            console.error('[ERROR] Failed to redirect:', error);
        }
    }
});


window.addEventListener('error', function(event) {
    console.error('[ERROR] Global error caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('[ERROR] Unhandled promise rejection:', event.reason);
});


document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOM fully loaded');
    console.log('[DEBUG] Checking required elements:');
    
    const requiredElements = [
        'profile-modal',
        'orders-modal',
        'item-details-modal',
        'cart-modal',
        'wishlist-modal',
        'review-modal',
        'loading-spinner'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`[DEBUG] Element #${id}:`, element ? 'Found' : 'Not found');
    });
});


async function loadUserProfile() {
    log('Loading user profile');
    showSpinner();
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}`).once('value');
        userProfile = snapshot.val();
        
        if (userProfile && userProfile.fullName && userProfile.phone && userProfile.address) {
            log('Profile loaded successfully', 'success');
            updateProfileUI();
        } else {
            log('No profile found or incomplete profile, showing profile modal', 'info');
            showProfile();
        }
    } catch (error) {
        log('Error loading profile', 'error', { error: error.message });
        alert('Error loading profile. Please try again.');
    }
    hideSpinner();
}

function updateProfileUI() {
    if (userProfile) {
        document.getElementById('user-name').textContent = userProfile.fullName || 'User';
        document.getElementById('welcome-message').textContent = `Hi, ${userProfile.fullName}!`;
        document.getElementById('user-avatar').src = userProfile.photoURL || 'images/default-avatar.png';
    }
}

function showProfile() {
    log('Showing profile modal');
    if (userProfile) {
        document.getElementById('full-name').value = userProfile.fullName || '';
        document.getElementById('phone').value = userProfile.phone || '';
        document.getElementById('address').value = userProfile.address || '';
        document.getElementById('profile-photo-preview').src = userProfile.photoURL || 'images/default-avatar.png';
        profilePhotoUrl = userProfile.photoURL || '';
    } else {
        // Clear form fields if no profile exists
        document.getElementById('full-name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('address').value = '';
        document.getElementById('profile-photo-preview').src = 'images/default-avatar.png';
        profilePhotoUrl = '';
    }
    document.getElementById('profile-modal').classList.remove('hidden');
}

function hideProfileModal() {
    log('Hiding profile modal');
    document.getElementById('profile-modal').classList.add('hidden');
}

function uploadProfilePhoto() {
    log('Opening Cloudinary widget for profile photo upload');
    const widget = cloudinary.createUploadWidget({
        cloudName: 'dqaygduva',
        uploadPreset: 'EatKaro',
        sources: ['local', 'camera'],
        multiple: false,
        maxFiles: 1,
        resourceType: 'image'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            log('Profile photo uploaded successfully', 'success', { url: result.info.secure_url });
            profilePhotoUrl = result.info.secure_url;
            document.getElementById('profile-photo-preview').src = profilePhotoUrl;
        }
    });
    widget.open();
}


document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    log('Profile form submission started');
    showSpinner();

    const profileData = {
        fullName: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        photoURL: profilePhotoUrl,
        updatedAt: new Date().toISOString()
    };

    try {
        await database.ref(`users/${currentUser.uid}`).update(profileData);
        userProfile = { ...userProfile, ...profileData };
        log('Profile updated successfully', 'success');
        updateProfileUI();
        hideProfileModal();
    } catch (error) {
        log('Error updating profile', 'error', { error: error.message });
        alert('Error updating profile. Please try again.');
    }
    hideSpinner();
});


async function loadFoodItems() {
    log('Loading food items');
    showSpinner();
    try {
        const snapshot = await database.ref('items').once('value');
        const items = [];
        snapshot.forEach(child => {
            items.push({ id: child.key, ...child.val() });
        });
        
        log('Food items loaded', 'success', { itemCount: items.length });
        displayFoodItems(items);
    } catch (error) {
        log('Error loading food items', 'error', { error: error.message });
        alert('Error loading food items. Please refresh the page.');
    }
    hideSpinner();
}

function displayFoodItems(items) {
    log('Displaying food items', 'info', { count: items.length });
    const container = document.getElementById('food-items');
    const filteredItems = currentFoodFilter === 'all' 
        ? items 
        : items.filter(item => item.foodType === currentFoodFilter);

    container.innerHTML = filteredItems.map(item => `
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="relative">
                <img src="${item.thumbnail}" alt="${item.name}" class="w-full h-48 object-cover">
                <div class="absolute top-2 right-2 flex space-x-2">
                    <button id="wishlist-btn-${item.id}" onclick="toggleWishlist('${item.id}')" class="wishlist-btn bg-white bg-opacity-80 p-1 rounded-full shadow-md hover:bg-opacity-100 transition-all">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                    </button>
                    ${item.foodType === 'veg' 
                        ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">🟢 Veg</span>'
                        : '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">🔴 Non-Veg</span>'
                    }
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-lg font-medium text-gray-900">${item.name}</h3>
                <p class="text-gray-500 text-sm mt-1">${item.description}</p>
                <div class="mt-4 flex justify-between items-center">
                    <span class="text-indigo-600 font-medium">₹${item.price.toFixed(2)}</span>
                    <div class="flex space-x-2">
                        <button onclick="addToCart('${item.id}')" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Add to Cart
                        </button>
                        <button onclick="showItemDetails('${item.id}')" class="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');


    filteredItems.forEach(item => updateWishlistButton(item.id));
}

function filterFood(type) {
    log('Filtering food items', 'info', { type });
    currentFoodFilter = type;
    
  
    document.getElementById('all-food').className = `px-4 py-2 rounded-full ${type === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`;
    document.getElementById('veg-food').className = `px-4 py-2 rounded-full ${type === 'veg' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`;
    document.getElementById('non-veg-food').className = `px-4 py-2 rounded-full ${type === 'non-veg' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`;
    
    loadFoodItems();
}


async function showItemDetails(itemId) {
    log('Showing item details', 'info', { itemId });
    showSpinner();
    try {
        const snapshot = await database.ref(`items/${itemId}`).once('value');
        const item = snapshot.val();
        
        if (!item) {
            throw new Error('Item not found');
        }

        selectedItem = { id: itemId, ...item };
        
        document.getElementById('item-name').textContent = item.name;
        document.getElementById('item-description').textContent = item.description;
        document.getElementById('item-price').textContent = `₹${item.price.toFixed(2)}`;
        document.getElementById('item-type').textContent = item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian';
        document.getElementById('item-type').className = `px-3 py-1 rounded-full text-sm font-medium ${
            item.foodType === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`;
        
       
        const reviewsSnapshot = await database.ref(`reviews/${item.sellerId}`).once('value');
        const reviews = [];
        let totalRating = 0;
        let reviewCount = 0;

        if (reviewsSnapshot.exists()) {
            reviewsSnapshot.forEach((child) => {
                const review = child.val();
      
                if (review.itemId === itemId) {
                    reviews.push({
                        id: child.key,
                        ...review
                    });
                    totalRating += review.rating;
                    reviewCount++;
                }
            });
        }

        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;

        document.getElementById('item-rating').innerHTML = generateStarRating(averageRating);
        document.getElementById('item-rating-count').textContent = `(${reviewCount} reviews)`;

        const reviewsList = document.getElementById('item-reviews-list');
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-gray-500 text-center">No reviews yet</p>';
        } else {
            reviewsList.innerHTML = reviews.map(review => `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="font-medium text-gray-900">${review.userName || 'Anonymous User'}</span>
                            <div class="flex items-center">
                                ${generateStarRating(review.rating)}
                            </div>
                        </div>
                        <span class="text-sm text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p class="text-gray-600">${review.comment}</p>
                    ${review.reply ? `
                        <div class="mt-3 p-3 bg-white rounded border">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-medium text-gray-900">Restaurant's Reply</h5>
                                    <span class="text-sm text-gray-500">
                                        ${new Date(review.repliedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <p class="mt-2 text-gray-600">${review.reply}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }
        
        const imagesContainer = document.getElementById('item-images');
        imagesContainer.innerHTML = `
            <div class="relative h-full">
                <img src="${item.thumbnail}" alt="${item.name}" class="w-full h-full object-cover rounded-lg">
                ${item.images && item.images.length > 0 ? `
                    <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg">
                        <button onclick="showImage('${item.thumbnail}')" class="w-12 h-12 rounded-lg overflow-hidden">
                            <img src="${item.thumbnail}" alt="${item.name}" class="w-full h-full object-cover">
                        </button>
                        ${item.images.map(img => `
                            <button onclick="showImage('${img}')" class="w-12 h-12 rounded-lg overflow-hidden">
                                <img src="${img}" alt="${item.name}" class="w-full h-full object-cover">
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('quantity').value = '1';
        
        document.getElementById('coupon-code').value = '';
        document.getElementById('coupon-applied').classList.add('hidden');
        document.getElementById('coupon-discount').classList.add('hidden');
        selectedItem.couponApplied = false;
        selectedItem.couponCode = null;
        selectedItem.discount = 0;
        
        updatePriceCalculations();
        
        const actionButtons = document.getElementById('item-action-buttons');
        actionButtons.innerHTML = `
            <div class="flex space-x-4 w-full">
                <button onclick="addToCart('${itemId}')" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Add to Cart
                </button>
                <button onclick="toggleWishlist('${itemId}')" id="wishlist-btn-${itemId}" class="wishlist-btn px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                </button>
                <button onclick="proceedToCheckout('${itemId}')" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    Proceed to Checkout
                </button>
            </div>
        `;
        
        updateWishlistButton(itemId);
        
        document.getElementById('item-details-modal').classList.remove('hidden');
    } catch (error) {
        log('Error loading item details', 'error', { error: error.message });
        alert('Error loading item details. Please try again.');
    }
    hideSpinner();
}

function updatePriceCalculations() {
    if (!selectedItem) return;
    
    const quantity = parseInt(document.getElementById('quantity').value);
    const subtotal = selectedItem.price * quantity;
    const total = subtotal - (selectedItem.discount || 0);
    
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('final-total').textContent = `₹${total.toFixed(2)}`;
}

function showImage(imageUrl) {
    const imagesContainer = document.getElementById('item-images');
    imagesContainer.innerHTML = `
        <img src="${imageUrl}" alt="${selectedItem.name}" class="w-full h-full object-cover rounded-lg">
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg">
            <button onclick="showImage('${selectedItem.thumbnail}')" class="w-12 h-12 rounded-lg overflow-hidden">
                <img src="${selectedItem.thumbnail}" alt="${selectedItem.name}" class="w-full h-full object-cover">
            </button>
            ${selectedItem.images ? selectedItem.images.map(img => `
                <button onclick="showImage('${img}')" class="w-12 h-12 rounded-lg overflow-hidden">
                    <img src="${img}" alt="${selectedItem.name}" class="w-full h-full object-cover">
                </button>
            `).join('') : ''}
        </div>
    `;
}

function hideItemDetailsModal() {
    log('Hiding item details modal');
    document.getElementById('item-details-modal').classList.add('hidden');
    selectedItem = null;
}

function incrementQuantity() {
    const input = document.getElementById('quantity');
    input.value = parseInt(input.value) + 1;
    updatePriceCalculations();
}

function decrementQuantity() {
    const input = document.getElementById('quantity');
    const newValue = parseInt(input.value) - 1;
    if (newValue >= 1) {
        input.value = newValue;
        updatePriceCalculations();
    }
}


function updateOrderStats(orders) {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    const activeOrders = orders.filter(order => 
        ['pending', 'preparing', 'ready', 'out_for_delivery', 'pending_payment'].includes(order.status)
    ).length;

  
    const statsContainer = document.getElementById('order-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Total Orders</h3>
                    <p class="text-2xl font-bold text-indigo-600">${totalOrders}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Active Orders</h3>
                    <p class="text-2xl font-bold text-blue-600">${activeOrders}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Completed</h3>
                    <p class="text-2xl font-bold text-green-600">${completedOrders}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Cancelled</h3>
                    <p class="text-2xl font-bold text-red-600">${cancelledOrders}</p>
                </div>
            </div>
        `;
    }
}

function showOrderTab(tab) {
    log('Showing order tab', 'info', { tab });
    
    const ordersModal = document.getElementById('orders-modal');
    if (!ordersModal) {
        console.error('Orders modal not found');
        return;
    }

    if (!document.getElementById('active-orders')) {
        const activeOrdersDiv = document.createElement('div');
        activeOrdersDiv.id = 'active-orders';
        activeOrdersDiv.className = 'space-y-4';
        ordersModal.appendChild(activeOrdersDiv);
    }

    if (!document.getElementById('completed-orders')) {
        const completedOrdersDiv = document.createElement('div');
        completedOrdersDiv.id = 'completed-orders';
        completedOrdersDiv.className = 'space-y-4';
        ordersModal.appendChild(completedOrdersDiv);
    }

    const activeOrders = document.getElementById('active-orders');
    const completedOrders = document.getElementById('completed-orders');
    
    if (activeOrders) activeOrders.classList.add('hidden');
    if (completedOrders) completedOrders.classList.add('hidden');
    
    if (tab === 'active' && activeOrders) {
        activeOrders.classList.remove('hidden');
    } else if (tab === 'history' && completedOrders) {
        completedOrders.classList.remove('hidden');
    }
    
    const tabs = document.querySelectorAll('#orders-modal nav button');
    tabs.forEach(button => {
        if (button.getAttribute('onclick').includes(tab)) {
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-indigo-500', 'text-indigo-600');
        } else {
            button.classList.remove('border-indigo-500', 'text-indigo-600');
            button.classList.add('border-transparent', 'text-gray-500');
        }
    });
}

function showOrders() {
    log('Showing orders modal');
    const ordersModal = document.getElementById('orders-modal');
    if (!ordersModal) {
        console.error('Orders modal not found');
        return;
    }

    if (!ordersModal.querySelector('nav')) {
        ordersModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Your Orders</h2>
                    <button onclick="hideOrdersModal()" class="text-gray-400 hover:text-gray-500">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <nav class="flex space-x-4 border-b mb-6">
                    <button onclick="showOrderTab('active')" class="px-4 py-2 border-b-2 border-indigo-500 text-indigo-600">
                        Active Orders
                    </button>
                    <button onclick="showOrderTab('history')" class="px-4 py-2 border-b-2 border-transparent text-gray-500">
                        Order History
                    </button>
                </nav>
                <div id="order-stats" class="mb-6"></div>
                <div id="active-orders" class="space-y-4"></div>
                <div id="completed-orders" class="space-y-4 hidden"></div>
            </div>
        `;
    }

    ordersModal.classList.remove('hidden');

    loadOrders().then(() => {
       
        showOrderTab('active');
    });
}

function hideOrdersModal() {
    log('Hiding orders modal');
    document.getElementById('orders-modal').classList.add('hidden');
}

async function loadOrders() {
    log('Loading orders');
    showSpinner();
    try {
        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        if (window.ordersListener) {
            database.ref('orders').off('value', window.ordersListener);
        }

        window.ordersListener = database.ref('orders')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .on('value', async (snapshot) => {
                const orders = [];
                let previousOrders = {};
                
                if (window.previousOrdersState) {
                    previousOrders = window.previousOrdersState;
                }
                
                if (snapshot.exists()) {
                    for (const [orderId, orderData] of Object.entries(snapshot.val())) {
                        const order = { 
                            id: orderId,
                            ...orderData,
                            createdAt: orderData.createdAt || new Date().toISOString()
                        };
                        
                        if (previousOrders[orderId] && previousOrders[orderId].status !== order.status) {
                            const notificationType = 
                                order.status === 'completed' ? 'success' :
                                order.status === 'cancelled' ? 'error' :
                                order.status === 'pending_payment' ? 'warning' :
                                'info';
                            
                            showNotification(
                                `Order #${orderId.slice(-6)} Status Update`,
                                getStatusNotificationMessage(order.status, orderId),
                                notificationType
                            );
                        }
                        
                        if (order.status === 'completed') {
                            const reviewsSnapshot = await database.ref(`reviews/${order.sellerId}`).once('value');
                            if (reviewsSnapshot.exists()) {
                                const reviews = reviewsSnapshot.val();
                                
                                const reviewData = Object.values(reviews).find(review => review.orderId === order.id);
                                if (reviewData) {
                                    order.reviewed = true;
                                    order.rating = reviewData.rating;
                                    order.reviewComment = reviewData.comment;
                                    order.reviewReply = reviewData.reply;
                                    order.reviewReplyDate = reviewData.repliedAt;
                                    order.reviewDate = reviewData.createdAt;
                                }
                            }
                        }
                        
                        orders.push(order);
                    }
                }
                
                window.previousOrdersState = orders.reduce((acc, order) => {
                    acc[order.id] = order;
                    return acc;
                }, {});
               
                const activeOrders = orders.filter(order => 
                    ['pending', 'preparing', 'ready', 'out_for_delivery', 'pending_payment'].includes(order.status)
                );
               
                const completedOrders = orders.filter(order => 
                    ['completed', 'cancelled'].includes(order.status)
                );
                
                log('Orders loaded', 'info', {
                    total: orders.length,
                    active: activeOrders.length,
                    completed: completedOrders.length
                });
              
                const activeContainer = document.getElementById('active-orders');
                const completedContainer = document.getElementById('completed-orders');
                
                if (activeContainer) {
                    displayOrders(activeOrders, 'active-orders');
                } else {
                    log('Active orders container not found', 'error');
                }
                
                if (completedContainer) {
                    displayOrders(completedOrders, 'completed-orders');
                } else {
                    log('Completed orders container not found', 'error');
                }
                
                updateOrderStats(orders);
            });
    } catch (error) {
        log('Error loading orders', 'error', { error: error.message });
        alert('Error loading orders. Please try again.');
    } finally {
        hideSpinner();
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'preparing':
            return 'bg-blue-100 text-blue-800';
        case 'ready':
            return 'bg-purple-100 text-purple-800';
        case 'out_for_delivery':
            return 'bg-indigo-100 text-indigo-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-red-100 text-red-800';
        case 'pending_payment':
            return 'bg-orange-100 text-orange-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function displayOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        log('Container not found', 'error', { containerId });
        return;
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No orders found</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">Order #${order.id}</h3>
                    <p class="text-sm text-gray-500">${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div class="flex items-center space-x-2">
                    ${order.status === 'completed' ? `
                        <button onclick="downloadOrderBill('${order.id}')" class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            <span>Download Bill</span>
                        </button>
                    ` : ''}
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}">
                        ${order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>
            </div>

            <div class="space-y-4">
                ${order.items?.map(item => `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div class="flex items-center space-x-2">
                            <img src="${item.thumbnail || 'https://via.placeholder.com/50'}" alt="${item.name}" class="w-12 h-12 object-cover rounded">
                            <div>
                                <p class="font-medium">${item.name}</p>
                                <p class="text-sm text-gray-500">Quantity: ${item.quantity}</p>
                            </div>
                        </div>
                        <p class="font-medium">₹${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                    </div>
                `).join('') || 'No items found'}

                ${order.status === 'completed' && order.reviewed ? `
                    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-medium text-gray-900">Your Review</h4>
                                <div class="flex items-center mt-1">
                                    ${generateStarRating(order.rating)}
                                    <span class="text-sm text-gray-500 ml-2">
                                        ${new Date(order.reviewDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p class="mt-2 text-gray-600">${order.reviewComment}</p>
                        ${order.reviewReply ? `
                            <div class="mt-4 p-3 bg-white rounded border">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <h5 class="font-medium text-gray-900">Restaurant's Reply</h5>
                                        <span class="text-sm text-gray-500">
                                            ${new Date(order.reviewReplyDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <p class="mt-2 text-gray-600">${order.reviewReply}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${order.status === 'out_for_delivery' ? `
                    <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 class="font-medium text-blue-900 mb-2">Delivery Information</h4>
                        <p class="text-blue-800">Delivery Person: ${order.deliveryPerson || 'N/A'}</p>
                        <p class="text-blue-800">Contact: ${order.deliveryPersonPhone || 'N/A'}</p>
                    </div>
                ` : ''}

                <div class="mt-4 flex flex-wrap gap-2">
                    ${order.status === 'completed' && !order.reviewed ? `
                        <button onclick="showReviewModal('${order.sellerId}', '${order.sellerName}', '${order.id}', '${order.items && order.items.length === 1 ? order.items[0].id : ''}')"
                                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Write a Review
                        </button>
                    ` : ''}
                    <button onclick="document.getElementById('chat-modal').classList.remove('hidden'); initializeChat('${order.id}')"
                            class="relative px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        <span class="chat-button-text">Chat with Restaurant</span>
                        <span id="chat-notification-${order.id}" class="hidden absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs animate-bounce">1</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    orders.forEach(order => {
        initializeChatNotifications(order.id);
    });
}


function initializeChatNotifications(orderId) {
    const chatRef = database.ref(`chats/${orderId}`);
    chatRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        const notificationId = `chat-${orderId}-${snapshot.key}`;
        
        if (message.senderId !== currentUser.uid && 
            !message.seen && 
            !shownNotifications.has(notificationId)) {
            
            const chatButton = document.querySelector(`button[onclick*="initializeChat('${orderId}')"]`);
            if (chatButton) {
                let badge = chatButton.querySelector('.notification-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notification-badge absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs';
                    chatButton.classList.add('relative');
                    chatButton.appendChild(badge);
                }
                const count = parseInt(badge.textContent || '0') + 1;
                badge.textContent = count;
            }

            showToastNotification(orderId, message.text);
            
            shownNotifications.add(notificationId);
            saveShownNotifications();
        }
    });
}

function showToastNotification(orderId, message) {
    const notificationId = `toast-${orderId}-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = notificationId;
    toast.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-0 z-50 cursor-pointer';
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
            </div>
            <div>
                <p class="font-medium">New Message</p>
                <p class="text-sm opacity-90">${message}</p>
            </div>
        </div>
    `;

    toast.onclick = () => {
        document.getElementById('chat-modal').classList.remove('hidden');
        initializeChat(orderId);
        toast.remove();
    };

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

async function downloadOrderHistoryPDF() {
    log('Generating order history PDF', 'info');
    showSpinner();
    
    try {
        const snapshot = await database.ref('orders')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');
        
        const orders = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const order = child.val();
                if (order.status === 'completed') {
                    orders.push({ id: child.key, ...order });
                }
            });
        }

        if (orders.length === 0) {
            alert('No completed orders found to generate PDF.');
            hideSpinner();
            return;
        }

        const container = document.createElement('div');
        container.className = 'p-8 bg-white';
        container.innerHTML = `
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-indigo-600 mb-2">EatKaro</h1>
                <p class="text-gray-600">Order History Report</p>
                <p class="text-sm text-gray-500">Generated on ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="mb-8">
                <h2 class="text-xl font-semibold mb-4">Customer Information</h2>
                <p class="text-gray-700">Name: ${userProfile?.fullName || 'N/A'}</p>
                <p class="text-gray-700">Phone: ${userProfile?.phone || 'N/A'}</p>
                <p class="text-gray-700">Address: ${userProfile?.address || 'N/A'}</p>
            </div>

            <div class="space-y-6">
                ${orders.map(order => `
                    <div class="border rounded-lg p-4 mb-4">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-medium">Order #${order.id}</h3>
                                <p class="text-sm text-gray-500">${new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                COMPLETED
                            </span>
                        </div>

                        <div class="space-y-4">
                            <table class="w-full">
                                <thead>
                                    <tr class="bg-gray-50">
                                        <th class="px-4 py-2 text-left">Item</th>
                                        <th class="px-4 py-2 text-center">Quantity</th>
                                        <th class="px-4 py-2 text-right">Price</th>
                                        <th class="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Array.isArray(order.items) ? order.items.map(item => `
                                        <tr class="border-b border-gray-200">
                                            <td class="px-4 py-3">
                                                <div class="flex items-center">
                                                    <img src="${item.thumbnail || 'images/default-food.png'}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg mr-3">
                                                    <div>
                                                        <p class="font-medium text-gray-900">${item.name}</p>
                                                        <p class="text-sm text-gray-500">${item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 text-center">${item.quantity || 1}</td>
                                            <td class="px-4 py-3 text-right">₹${(item.price || 0).toFixed(2)}</td>
                                            <td class="px-4 py-3 text-right font-medium">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                        </tr>
                                    `).join('') : ''}
                                </tbody>
                                <tfoot>
                                    <tr class="border-t">
                                        <td colspan="3" class="px-4 py-2 text-right font-medium">Subtotal:</td>
                                        <td class="px-4 py-2 text-right">₹${order.subtotal.toFixed(2)}</td>
                                    </tr>
                                    ${order.discount > 0 ? `
                                        <tr>
                                            <td colspan="3" class="px-4 py-2 text-right font-medium text-green-600">Discount:</td>
                                            <td class="px-4 py-2 text-right text-green-600">-₹${order.discount.toFixed(2)}</td>
                                        </tr>
                                    ` : ''}
                                    <tr class="border-t">
                                        <td colspan="3" class="px-4 py-2 text-right font-bold">Total:</td>
                                        <td class="px-4 py-2 text-right font-bold">₹${order.total.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            ${order.reviewed ? `
                                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 class="font-medium mb-2">Your Review</h4>
                                    <div class="flex items-center mb-2">
                                        ${generateStarRating(order.rating)}
                                        <span class="text-sm text-gray-500 ml-2">
                                            ${new Date(order.reviewDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p class="text-gray-600">${order.reviewComment}</p>
                                    ${order.reviewReply ? `
                                        <div class="mt-4 p-3 bg-white rounded border">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <h5 class="font-medium mb-2">Restaurant's Reply</h5>
                                                    <span class="text-sm text-gray-500">
                                                        ${new Date(order.reviewReplyDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p class="mt-2 text-gray-600">${order.reviewReply}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="mt-8 text-center text-gray-500 text-sm">
                <p>Thank you for choosing EatKaro!</p>
                <p>This is a computer-generated document and does not require a signature.</p>
            </div>
        `;


        const opt = {
            margin: 1,
            filename: `eatkaro-order-history-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

      
        await html2pdf().set(opt).from(container).save();
        
        log('PDF generated successfully', 'success');
    } catch (error) {
        log('Error generating PDF', 'error', { error: error.message });
        alert('Error generating PDF. Please try again.');
    }
    
    hideSpinner();
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        ${Array(fullStars).fill('<span class="text-yellow-400">★</span>').join('')}
        ${hasHalfStar ? '<span class="text-yellow-400">★</span>' : ''}
        ${Array(emptyStars).fill('<span class="text-gray-300">★</span>').join('')}
    `;
}


window.addEventListener('beforeunload', () => {
    console.log('[DEBUG] Page unloading, cleaning up...');
    if (window.ordersListener) {
        console.log('[DEBUG] Removing orders listener');
        database.ref('orders').off('value', window.ordersListener);
    }
    console.log('[DEBUG] Cleanup complete');
});


async function applyCouponCode(couponCode) {
    log('Applying coupon code', 'info', { couponCode });
    showSpinner();
    try {
        const snapshot = await database.ref(`coupons/${couponCode}`).once('value');
        const coupon = snapshot.val();
        
        if (!coupon) {
            throw new Error('Invalid coupon code');
        }

      
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            throw new Error('Coupon has expired');
        }

      
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new Error('Coupon usage limit reached');
        }

      
        const userCouponsSnapshot = await database.ref(`users/${currentUser.uid}/usedCoupons/${couponCode}`).once('value');
        if (userCouponsSnapshot.exists()) {
            throw new Error('You have already used this coupon');
        }

      
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (selectedItem.price * parseInt(document.getElementById('quantity').value) * coupon.discountValue) / 100;
        } else {
            discount = coupon.discountValue;
        }

      
        const subtotal = selectedItem.price * parseInt(document.getElementById('quantity').value);
        const total = subtotal - discount;
        
        document.getElementById('coupon-applied').classList.remove('hidden');
        document.getElementById('coupon-code-display').textContent = couponCode;
        document.getElementById('discount-amount').textContent = `-₹${discount.toFixed(2)}`;
        document.getElementById('final-total').textContent = `₹${total.toFixed(2)}`;

       
        selectedItem.couponApplied = true;
        selectedItem.couponCode = couponCode;
        selectedItem.discount = discount;

        await database.ref(`coupons/${couponCode}`).transaction((currentCoupon) => {
            if (currentCoupon) {
                currentCoupon.usageCount = (currentCoupon.usageCount || 0) + 1;
                currentCoupon.lastUsedAt = new Date().toISOString();
            }
            return currentCoupon;
        });

        await database.ref(`users/${currentUser.uid}/usedCoupons/${couponCode}`).set({
            usedAt: new Date().toISOString(),
            discount: discount
        });

        const updatedCoupon = await database.ref(`coupons/${couponCode}`).once('value');
        log('Coupon applied successfully', 'success', { 
            coupon: updatedCoupon.val(),
            discount,
            newUsageCount: updatedCoupon.val().usageCount
        });
    } catch (error) {
        log('Error applying coupon', 'error', { error: error.message });
        alert(error.message);
    }
    hideSpinner();
}

document.body.insertAdjacentHTML('beforeend', `
    <div id="payment-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <h3 class="text-lg font-medium text-gray-900">Complete Payment</h3>
                <div class="mt-4">
                    <div id="payment-options" class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Amount to Pay:</span>
                            <span id="payment-amount" class="text-lg font-medium text-gray-900">₹0.00</span>
                        </div>
                        <div class="space-y-4">
                            <button onclick="handlePaymentMethod('online')" 
                                    class="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                                <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                </svg>
                                <span class="text-left">
                                    <span class="block font-medium text-gray-900">Online Payment</span>
                                    <span class="block text-sm text-gray-500">Pay using card, UPI, or net banking</span>
                                </span>
                            </button>
                            <button onclick="handlePaymentMethod('cod')" 
                                    class="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                                <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <span class="text-left">
                                    <span class="block font-medium text-gray-900">Cash on Delivery</span>
                                    <span class="block text-sm text-gray-500">Pay when you receive your order</span>
                                </span>
                            </button>
                        </div>
                    </div>
                    <div id="qr-code-section" class="hidden">
                        <div class="text-center">
                            <div id="payment-status" class="mb-4">
                                <i class="fas fa-clock text-yellow-500"></i>
                                <span class="text-gray-700">Waiting for payment verification</span>
                            </div>
                            <div class="bg-gray-100 p-4 rounded-lg">
                                <p class="text-sm text-gray-600 mb-2">Scan QR code to pay</p>
                                <img src="images/qr-code.png" alt="Payment QR Code" class="mx-auto w-48 h-48">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="hidePaymentModal()" 
                            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
`);

async function proceedToCheckout(itemId = null) {
    log('Proceeding to checkout', 'info', { itemId });
    showSpinner();
    try {
        let totalAmount = 0;
        
        if (itemId) {
            const snapshot = await database.ref(`items/${itemId}`).once('value');
            const item = snapshot.val();
            
            if (!item) {
                throw new Error('Item not found');
            }

            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            
          
            if (quantity > item.quantity) {
                throw new Error('Requested quantity is not available in stock');
            }

            totalAmount = item.price * quantity;
            
            if (selectedItem && selectedItem.couponApplied) {
                totalAmount -= selectedItem.discount;
            }
        } else {
         
            const cartSnapshot = await database.ref(`users/${currentUser.uid}/cart`).once('value');
            const cart = cartSnapshot.val() || {};
            
            for (const [itemId, cartItem] of Object.entries(cart)) {
                const itemSnapshot = await database.ref(`items/${itemId}`).once('value');
                const item = itemSnapshot.val();
                
                if (!item) {
                    throw new Error(`Item ${itemId} not found`);
                }
                
                if (cartItem.quantity > item.quantity) {
                    throw new Error(`Only ${item.quantity} units of ${item.name} are available in stock`);
                }
            }
            
            totalAmount = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        const tempOrderId = 'temp_' + Date.now();
        showPaymentModal(totalAmount, tempOrderId);
        
    } catch (error) {
        log('Error proceeding to checkout', 'error', { error: error.message });
        alert(error.message || 'Error proceeding to checkout. Please try again.');
    }
    hideSpinner();
}

async function handlePaymentMethod(method) {
    log('Payment method selected', 'info', { method, timestamp: new Date().toISOString() });
    
    try {
       
        const amountStr = document.getElementById('payment-amount').textContent.replace('₹', '');
        const amount = parseFloat(amountStr);
        
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Invalid payment amount');
        }

        if (method === 'online') {
            log('Initializing online payment flow', 'info', {
                method,
                amount,
                userEmail: currentUser?.email,
                timestamp: new Date().toISOString()
            });

         
            const paymentOptions = document.getElementById('payment-options');
            const qrCodeSection = document.getElementById('qr-code-section');
            
            if (paymentOptions && qrCodeSection) {
                log('Updating payment UI elements', 'debug', {
                    paymentOptionsVisible: !paymentOptions.classList.contains('hidden'),
                    qrCodeSectionVisible: !qrCodeSection.classList.contains('hidden')
                });

                paymentOptions.classList.add('hidden');
                qrCodeSection.classList.remove('hidden');
                
          
                await processPayment('online', amount);
            }
        } else if (method === 'cod') {
            log('Cash on delivery selected', 'info', {
                amount,
                timestamp: new Date().toISOString()
            });
        
            await processPayment('cod', amount);
            hidePaymentModal();
            alert('Order placed successfully! Pay on delivery.');
        }
    } catch (error) {
        log('Error handling payment method', 'error', {
            error: error.message,
            stack: error.stack,
            method,
            timestamp: new Date().toISOString()
        });
        alert('Error processing payment. Please try again.');
    }
}


async function initializeStripe() {
    try {
         stripe = Stripe('pk_test_51YOUR_PUBLISHABLE_KEY');
        
       
        const clientSecret = await getPaymentIntent();
        elements = stripe.elements({ clientSecret });
        
   
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        
        log('Stripe initialized successfully', 'success');
    } catch (error) {
        log('Error initializing Stripe', 'error', { error: error.message });
        alert('Error initializing payment system. Please try again.');
    }
}

async function getPaymentIntent() {
    try {
 
        const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: calculateTotalAmount(), 
                currency: 'inr'
            })
        });
        
        const data = await response.json();
        return data.clientSecret;
    } catch (error) {
        log('Error creating payment intent', 'error', { error: error.message });
        throw error;
    }
}

async function handlePayment(event) {
    event.preventDefault();
    showSpinner();
    
    try {
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment-success.html`,
            }
        });

        if (error) {
            throw error;
        }
        
        await placeOrder();
    } catch (error) {
        log('Payment failed', 'error', { error: error.message });
        alert('Payment failed. Please try again.');
    }
    hideSpinner();
}

function calculateTotalAmount() {
   
    const total = parseFloat(document.getElementById('cart-total').textContent.replace('₹', '')) * 100;
    return Math.round(total);
}


async function toggleWishlist(itemId) {
    log('Toggling wishlist', 'info', { itemId });
    showSpinner();
    try {
        const wishlistRef = database.ref(`users/${currentUser.uid}/wishlist/${itemId}`);
        const snapshot = await wishlistRef.once('value');
        const buttons = document.querySelectorAll(`#wishlist-btn-${itemId}`);
        
        if (snapshot.exists()) {
            buttons.forEach(button => {
                button.classList.add('animate-heart-out');
            });
            
            setTimeout(async () => {
                await wishlistRef.remove();
                log('Item removed from wishlist', 'success');
                updateWishlistButton(itemId);
            }, 300);
        } else {
        
            buttons.forEach(button => {
                button.classList.add('animate-heart-in');
            });
            
            setTimeout(async () => {
                await wishlistRef.set({
                    addedAt: new Date().toISOString()
                });
                log('Item added to wishlist', 'success');
                updateWishlistButton(itemId);
            }, 300);
        }
        
   
        const wishlistSnapshot = await database.ref(`users/${currentUser.uid}/wishlist`).once('value');
        const wishlist = wishlistSnapshot.val() || {};
        const itemCount = Object.keys(wishlist).length;
        const wishlistCount = document.getElementById('wishlist-count');
        
        if (itemCount > 0) {
            wishlistCount.textContent = itemCount;
            wishlistCount.classList.remove('hidden');
        } else {
            wishlistCount.classList.add('hidden');
        }
        
 
        if (!document.getElementById('wishlist-modal').classList.contains('hidden')) {
            loadWishlistItems();
        }
    } catch (error) {
        log('Error toggling wishlist', 'error', { error: error.message });
        alert('Error updating wishlist. Please try again.');
    }
    hideSpinner();
}

async function updateWishlistButton(itemId) {
    const buttons = document.querySelectorAll(`#wishlist-btn-${itemId}`);
    if (buttons.length === 0) return;
    
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/wishlist/${itemId}`).once('value');
        const isInWishlist = snapshot.exists();
        
        buttons.forEach(button => {
            if (isInWishlist) {
                button.classList.remove('text-gray-400');
                button.classList.add('text-red-500', 'animate-heart');
                button.innerHTML = `
                    <svg class="w-6 h-6 transform scale-110" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                    </svg>
                `;
            } else {
                button.classList.remove('text-red-500', 'animate-heart');
                button.classList.add('text-gray-400');
                button.innerHTML = `
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                `;
            }
        });
    } catch (error) {
        log('Error updating wishlist button', 'error', { error: error.message });
    }
}


async function addToCart(itemId) {
    log('Adding item to cart', 'info', { itemId });
    showSpinner();
    try {
        const snapshot = await database.ref(`items/${itemId}`).once('value');
        const item = snapshot.val();
        
        if (!item) {
            throw new Error('Item not found');
        }

  
        if (item.quantity <= 0) {
            throw new Error('Item is out of stock');
        }

        const cartRef = database.ref(`users/${currentUser.uid}/cart`);
        const cartSnapshot = await cartRef.once('value');
        const cart = cartSnapshot.val() || {};

  
        const currentCartQuantity = cart[itemId]?.quantity || 0;
        if (currentCartQuantity + 1 > item.quantity) {
            throw new Error('Cannot add more items than available in stock');
        }

        if (cart[itemId]) {
            cart[itemId].quantity += 1;
        } else {
            cart[itemId] = {
                name: item.name,
                price: item.price,
                quantity: 1,
                thumbnail: item.thumbnail,
                foodType: item.foodType,
                addedAt: new Date().toISOString()
            };
        }

        await cartRef.set(cart);
        log('Item added to cart', 'success');

        const cartCount = document.getElementById('cart-count');
        const itemCount = Object.keys(cart).length;
        if (itemCount > 0) {
            cartCount.textContent = itemCount;
            cartCount.classList.remove('hidden');
        }

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-0';
        toast.textContent = 'Item added to cart!';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }, 2000);

    } catch (error) {
        log('Error adding to cart', 'error', { error: error.message });
        alert(error.message || 'Error adding item to cart. Please try again.');
    }
    hideSpinner();
}


function showCart() {
    log('Showing cart modal');
    document.getElementById('cart-modal').classList.remove('hidden');
    loadCartItems();
}

function hideCart() {
    log('Hiding cart modal');
    document.getElementById('cart-modal').classList.add('hidden');
}

async function loadCartItems() {
    log('Loading cart items');
    showSpinner();
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/cart`).once('value');
        const cart = snapshot.val() || {};
        
      
        const itemCount = Object.keys(cart).length;
        const cartCount = document.getElementById('cart-count');
        if (itemCount > 0) {
            cartCount.textContent = itemCount;
            cartCount.classList.remove('hidden');
        } else {
            cartCount.classList.add('hidden');
        }
        
      
        displayCartItems(cart);
    } catch (error) {
        log('Error loading cart items', 'error', { error: error.message });
        alert('Error loading cart items. Please try again.');
    }
    hideSpinner();
}

function displayCartItems(cart) {
    log('Displaying cart items', 'info', { itemCount: Object.keys(cart).length });
    const container = document.getElementById('cart-items');
    
    if (Object.keys(cart).length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Your cart is empty</p>';
        document.getElementById('cart-subtotal').textContent = '₹0.00';
        document.getElementById('cart-total').textContent = '₹0.00';
        return;
    }
    
    let subtotal = 0;
    container.innerHTML = Object.entries(cart).map(([itemId, item]) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        return `
            <div class="flex items-center space-x-4 p-4 border rounded-lg">
                <img src="${item.thumbnail}" alt="${item.name}" class="w-24 h-24 object-cover rounded-lg">
                <div class="flex-1">
                    <h4 class="text-lg font-medium text-gray-900">${item.name}</h4>
                    <p class="text-sm text-gray-500">${item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</p>
                    <div class="mt-2 flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <button onclick="updateCartQuantity('${itemId}', ${item.quantity - 1})" class="px-2 py-1 border rounded-md hover:bg-gray-100">-</button>
                            <span class="w-8 text-center">${item.quantity}</span>
                            <button onclick="updateCartQuantity('${itemId}', ${item.quantity + 1})" class="px-2 py-1 border rounded-md hover:bg-gray-100">+</button>
                        </div>
                        <span class="text-gray-600">₹${item.price.toFixed(2)} × ${item.quantity} = ₹${itemTotal.toFixed(2)}</span>
                    </div>
                </div>
                <button onclick="removeFromCart('${itemId}')" class="text-red-600 hover:text-red-800">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');
    
 
    document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `₹${subtotal.toFixed(2)}`;
}

async function updateCartQuantity(itemId, newQuantity) {
    log('Updating cart quantity', 'info', { itemId, newQuantity });
    if (newQuantity < 1) {
        await removeFromCart(itemId);
        return;
    }
    
    showSpinner();
    try {
    
        const itemSnapshot = await database.ref(`items/${itemId}`).once('value');
        const item = itemSnapshot.val();
        
        if (!item) {
            throw new Error('Item not found');
        }

        if (newQuantity > item.quantity) {
            throw new Error('Cannot add more items than available in stock');
        }

        const cartRef = database.ref(`users/${currentUser.uid}/cart/${itemId}`);
        await cartRef.update({ quantity: newQuantity });
        await loadCartItems();
    } catch (error) {
        log('Error updating cart quantity', 'error', { error: error.message });
        alert(error.message || 'Error updating quantity. Please try again.');
    }
    hideSpinner();
}

async function removeFromCart(itemId) {
    log('Removing item from cart', 'info', { itemId });
    showSpinner();
    try {
        await database.ref(`users/${currentUser.uid}/cart/${itemId}`).remove();
        await loadCartItems();
    } catch (error) {
        log('Error removing item from cart', 'error', { error: error.message });
        alert('Error removing item. Please try again.');
    }
    hideSpinner();
}

function showWishlist() {
    log('Showing wishlist modal');
    document.getElementById('wishlist-modal').classList.remove('hidden');
    loadWishlistItems();
}

function hideWishlist() {
    log('Hiding wishlist modal');
    document.getElementById('wishlist-modal').classList.add('hidden');
}

async function loadWishlistItems() {
    log('Loading wishlist items');
    showSpinner();
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/wishlist`).once('value');
        const wishlist = snapshot.val() || {};
        
    
        const itemCount = Object.keys(wishlist).length;
        const wishlistCount = document.getElementById('wishlist-count');
        if (itemCount > 0) {
            wishlistCount.textContent = itemCount;
            wishlistCount.classList.remove('hidden');
        } else {
            wishlistCount.classList.add('hidden');
        }
        
        const items = [];
        for (const itemId of Object.keys(wishlist)) {
            const itemSnapshot = await database.ref(`items/${itemId}`).once('value');
            const item = itemSnapshot.val();
            if (item) {
                items.push({ id: itemId, ...item });
            }
        }
        
        displayWishlistItems(items);
    } catch (error) {
        log('Error loading wishlist items', 'error', { error: error.message });
        alert('Error loading wishlist items. Please try again.');
    }
    hideSpinner();
}

function displayWishlistItems(items) {
    log('Displaying wishlist items', 'info', { itemCount: items.length });
    const container = document.getElementById('wishlist-items');
    
    if (items.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 col-span-full">Your wishlist is empty</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="relative">
                <img src="${item.thumbnail}" alt="${item.name}" class="w-full h-48 object-cover">
                <div class="absolute top-2 right-2 flex space-x-2">
                    <button onclick="toggleWishlist('${item.id}')" class="text-red-500">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                    ${item.foodType === 'veg' 
                        ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">🟢 Veg</span>'
                        : '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">🔴 Non-Veg</span>'
                    }
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-lg font-medium text-gray-900">${item.name}</h3>
                <p class="text-gray-500 text-sm mt-1">${item.description}</p>
                <div class="mt-4 flex justify-between items-center">
                    <span class="text-indigo-600 font-medium">₹${item.price.toFixed(2)}</span>
                    <div class="flex space-x-2">
                        <button onclick="addToCart('${item.id}')" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Add to Cart
                        </button>
                        <button onclick="showItemDetails('${item.id}')" class="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}


async function showReviewModal(sellerId, sellerName, orderId, itemId) {
    log('Showing review modal', 'info', { sellerId, sellerName, orderId, itemId });
    const modal = document.getElementById('review-modal');
    modal.dataset.sellerId = sellerId;
    modal.dataset.sellerName = sellerName;
    modal.dataset.orderId = orderId;
    modal.dataset.itemId = itemId;
    modal.classList.remove('hidden');
}

function hideReviewModal() {
    log('Hiding review modal');
    document.getElementById('review-modal').classList.add('hidden');
    document.getElementById('review-form').reset();
}

function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star-rating');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-yellow-400');
        } else {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        }
    });
    document.getElementById('rating-value').value = rating;
}

async function submitReview(event) {
    event.preventDefault();
    log('Submitting review');
    showSpinner();

    const modal = document.getElementById('review-modal');
    const sellerId = modal.dataset.sellerId;
    const orderId = modal.dataset.orderId;
    const itemId = modal.dataset.itemId;
    const rating = parseInt(document.getElementById('rating-value').value);
    const comment = document.getElementById('review-comment').value.trim();

    if (!rating || !comment) {
        alert('Please provide both rating and comment');
        hideSpinner();
        return;
    }

    try {
        const reviewData = {
            rating,
            comment,
            orderId,
            itemId,
            userName: currentUser.displayName,
            userPhotoURL: currentUser.photoURL,
            createdAt: new Date().toISOString()
        };
        const reviewRef = await database.ref(`reviews/${sellerId}`).push(reviewData);
        
        const sellerRef = database.ref(`sellers/${sellerId}`);
        const sellerSnapshot = await sellerRef.once('value');
        const seller = sellerSnapshot.val();
        
        const newTotalRatings = (seller.totalRatings || 0) + 1;
        const newRating = ((seller.rating || 0) * (seller.totalRatings || 0) + rating) / newTotalRatings;
        
        await sellerRef.update({
            rating: newRating,
            totalRatings: newTotalRatings
        });

        await database.ref(`orders/${orderId}`).update({
            reviewed: true
        });

        log('Review submitted successfully', 'success');
        hideReviewModal();
        loadOrders(); 
    } catch (error) {
        log('Error submitting review', 'error', { error: error.message });
        alert('Error submitting review. Please try again.');
    }
    hideSpinner();
}

document.getElementById('review-form').addEventListener('submit', submitReview);
document.querySelectorAll('.star-rating').forEach((star, index) => {
    star.addEventListener('click', () => updateStarRating(index + 1));
});

function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

if (!document.getElementById('loading-spinner')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="loading-spinner" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden flex items-center justify-center z-50">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    `);
}

function showPaymentModal(amount, orderId) {
    log('Showing payment modal', 'info', { amount, orderId });
    
    const modal = document.getElementById('payment-modal');
    if (!modal) {
        console.error('Payment modal not found');
        return;
    }
    
    const paymentOptions = document.getElementById('payment-options');
    const qrCodeSection = document.getElementById('qr-code-section');
    
    if (paymentOptions && qrCodeSection) {
        paymentOptions.classList.remove('hidden');
        qrCodeSection.classList.add('hidden');
    }
    
    const amountElement = document.getElementById('payment-amount');
    if (amountElement) {
        amountElement.textContent = `₹${amount.toFixed(2)}`;
    }
    
    modal.classList.remove('hidden');
}

function hidePaymentModal() {
    log('Hiding payment modal', 'info', {
        timestamp: new Date().toISOString()
    });

    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentOrder = null;

    const timeoutCount = Object.keys(paymentTimeoutIds).length;
    log('Cleaning up payment timeouts', 'debug', {
        timeoutCount,
        timeoutIds: Object.keys(paymentTimeoutIds),
        timestamp: new Date().toISOString()
    });

    Object.values(paymentTimeoutIds).forEach(timeoutId => clearTimeout(timeoutId));
    paymentTimeoutIds = {};

    log('Payment modal cleanup completed', 'info', {
        timestamp: new Date().toISOString()
    });
}

async function processPayment(method, amount) {
    log('Starting payment processing', 'info', {
        method,
        amount,
        userId: currentUser.uid,
        timestamp: new Date().toISOString()
    });
    
    try {
        if (!userProfile) {
            log('Loading user profile', 'info', { userId: currentUser.uid });
            const profileSnapshot = await database.ref(`users/${currentUser.uid}`).once('value');
            userProfile = profileSnapshot.val();
            log('User profile loaded', 'success', { 
                profile: {
                    name: userProfile?.fullName,
                    phone: userProfile?.phone,
                    address: userProfile?.address
                }
            });
        }

        let orderItems = [];
        let subtotal = 0;
        if (selectedItem) {
            log('Processing single item order', 'info', { itemId: selectedItem.id });
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            subtotal = selectedItem.price * quantity;
            
            orderItems.push({
                id: selectedItem.id,
                name: selectedItem.name,
                price: selectedItem.price,
                quantity: quantity,
                thumbnail: selectedItem.thumbnail,
                foodType: selectedItem.foodType,
                description: selectedItem.description,
                images: selectedItem.images || []
            });

            log('Single item processed', 'success', {
                itemId: selectedItem.id,
                name: selectedItem.name,
                price: selectedItem.price,
                quantity: quantity,
                itemTotal: subtotal
            });
        } else {
            log('Loading cart items', 'info', { userId: currentUser.uid });
            const cartSnapshot = await database.ref(`users/${currentUser.uid}/cart`).once('value');
            const cartItems = cartSnapshot.val() || {};
            log('Cart items loaded', 'success', { 
                itemCount: Object.keys(cartItems).length,
                items: Object.keys(cartItems)
        });

            if (Object.keys(cartItems).length === 0) {
                log('Cart is empty', 'error', { userId: currentUser.uid });
                throw new Error('Cart is empty');
    }

            log('Processing cart items', 'info', { itemCount: Object.keys(cartItems).length });
            for (const [itemId, cartItem] of Object.entries(cartItems)) {
                log('Processing item', 'info', { itemId, quantity: cartItem.quantity });
                
                const itemSnapshot = await database.ref(`items/${itemId}`).once('value');
                const itemDetails = itemSnapshot.val();
                
                if (itemDetails) {
                    const itemTotal = itemDetails.price * cartItem.quantity;
                    subtotal += itemTotal;
                    
                    orderItems.push({
                        id: itemId,
                        name: itemDetails.name,
                        price: itemDetails.price,
                        quantity: cartItem.quantity,
                        thumbnail: itemDetails.thumbnail,
                        foodType: itemDetails.foodType,
                        description: itemDetails.description,
                        images: itemDetails.images || []
                    });

                    log('Item processed', 'success', {
                        itemId,
                        name: itemDetails.name,
                        price: itemDetails.price,
                        quantity: cartItem.quantity,
                        itemTotal
                    });
                } else {
                    log('Item not found in database', 'error', { itemId });
                }
            }
        }

        log('Order items processed', 'success', {
            totalItems: orderItems.length,
            subtotal,
            orderItems
        });

        log('Loading seller information', 'info');
        let sellerId, sellerName;
        
        if (selectedItem) {
           
            const itemSnapshot = await database.ref(`items/${selectedItem.id}`).once('value');
            const itemData = itemSnapshot.val();
            sellerId = itemData.sellerId;
            
            const sellerSnapshot = await database.ref(`sellers/${sellerId}`).once('value');
            const sellerData = sellerSnapshot.val();
            sellerName = sellerData?.name || 'Restaurant';
        } else {
           
            const cartSnapshot = await database.ref(`users/${currentUser.uid}/cart`).once('value');
            const cartItems = cartSnapshot.val() || {};
            const firstItemId = Object.keys(cartItems)[0];
            
            const itemSnapshot = await database.ref(`items/${firstItemId}`).once('value');
            const itemData = itemSnapshot.val();
            sellerId = itemData.sellerId;
            
            const sellerSnapshot = await database.ref(`sellers/${sellerId}`).once('value');
            const sellerData = sellerSnapshot.val();
            sellerName = sellerData?.name || 'Restaurant';
        }

        log('Seller information loaded', 'success', { 
            sellerId,
            sellerName
        });

        const discount = selectedItem?.discount || 0;
        const total = subtotal - discount;
        log('Applied discount and calculated total', 'info', {
            subtotal,
            discount,
            total,
            couponApplied: selectedItem?.couponApplied,
            couponCode: selectedItem?.couponCode
        });

        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        log('Generated order ID', 'info', { orderId });

        let initialStatus = method === 'cod' ? 'pending' : 'pending_payment';
        log('Set initial order status', 'info', { status: initialStatus });

        const orderData = {
            orderId: orderId,
            userId: currentUser.uid,
            userName: userProfile?.fullName || 'Customer',
            sellerId: sellerId,
            sellerName: sellerName,
            status: initialStatus,
            statusHistory: [{
                status: initialStatus,
                timestamp: new Date().toISOString(),
                note: method === 'cod' ? 'Order placed' : 'Waiting for payment verification'
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userPhone: userProfile?.phone || '',
            deliveryAddress: userProfile?.address || '',
            deliveryInstructions: '',
            items: orderItems,
            paymentMethod: method,
            subtotal: subtotal,
            discount: discount,
            total: total,
            couponCode: selectedItem?.couponCode || null,
            couponApplied: selectedItem?.couponApplied || false,
            estimatedDeliveryTime: null,
            deliveryPerson: null,
            deliveryPersonPhone: null
        };

        log('Saving order to database', 'info', {
                orderId,
            itemCount: orderItems.length,
            total,
            status: initialStatus
        });

        await database.ref(`orders/${orderId}`).set(orderData);
        log('Order saved successfully', 'success', { orderId });

        const paymentRequest = {
            orderId: orderId,
            method: method,
            amount: total,
            status: method === 'cod' ? 'pending_delivery' : 'pending_verification',
            timestamp: new Date().toISOString(),
            userId: currentUser.uid,
            userName: userProfile?.fullName || 'Customer',
            sellerId: sellerId,
            sellerName: sellerName
        };

        log('Creating payment request', 'info', {
            orderId,
            method,
            amount: total,
            status: paymentRequest.status
        });

        await database.ref(`payment_requests/${orderId}`).set(paymentRequest);
        log('Payment request saved successfully', 'success', { orderId });
        
        if (method === 'online') {
            log('Setting up payment verification timeout', 'info', { orderId });
          
            const timeoutDuration = 15 * 60 * 1000;
            const timeoutId = setTimeout(async () => {
                log('Payment verification timeout triggered', 'warning', { orderId });
                const paymentSnapshot = await database.ref(`payment_requests/${orderId}`).once('value');
                const payment = paymentSnapshot.val();
                
                if (payment && payment.status === 'pending_verification') {
                    log('Payment expired', 'error', { orderId });
                    await database.ref(`payment_requests/${orderId}`).update({
                        status: 'expired',
            updatedAt: new Date().toISOString()
        });
                    alert('Payment verification time has expired. Please try again.');
                    hidePaymentModal();
                }
            }, timeoutDuration);
        
         
            paymentTimeoutIds[orderId] = timeoutId;
            log('Payment verification timeout set', 'success', { orderId });
        }
        
        if (!selectedItem) {
            log('Clearing user cart', 'info', { userId: currentUser.uid });
            await database.ref(`users/${currentUser.uid}/cart`).remove();
            log('Cart cleared successfully', 'success', { userId: currentUser.uid });
        }
        
        log('Payment processing completed successfully', 'success', {
            orderId,
            method,
            total,
            itemCount: orderItems.length
        });
        
        return orderId;
    } catch (error) {
        log('Error in payment processing', 'error', {
            error: error.message,
            stack: error.stack,
            method,
            amount,
            userId: currentUser.uid,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

async function updateOrderStatus(orderId, newStatus, note = '') {
    try {
        const orderRef = database.ref(`orders/${orderId}`);
        const orderSnapshot = await orderRef.once('value');
        const order = orderSnapshot.val();

        if (!order) {
            throw new Error('Order not found');
        }

        const statusHistory = order.statusHistory || [];
        statusHistory.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: note
        });

        await orderRef.update({
            status: newStatus,
            statusHistory: statusHistory,
            updatedAt: new Date().toISOString()
        });

        log('Order status updated', 'success', {
        orderId,
            newStatus,
            note,
        timestamp: new Date().toISOString()
    });

        return true;
    } catch (error) {
        log('Error updating order status', 'error', {
            error: error.message,
            orderId,
            newStatus,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

function initializePaymentVerification() {
    log('Initializing payment verification listener');
    const paymentRequestsRef = database.ref('payment_requests');
    
    paymentRequestsRef.on('child_changed', (snapshot) => {
        const paymentRequest = snapshot.val();
        if (paymentRequest.userId === currentUser.uid) {
            log('Payment request status updated', 'info', { paymentRequest });
            
            hidePaymentModal();
        
            if (paymentRequest.status === 'verified') {
                showSuccessMessage('Order placed successfully!');
          
                showOrders();
                showOrderTab('active');
            } else if (paymentRequest.status === 'rejected') {
                showErrorMessage('Payment was rejected. Please try again.');
            }
        }
    });
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-0 z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('translate-y-0');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-y-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-0 z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
   
    setTimeout(() => {
        toast.classList.add('translate-y-0');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-y-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    initializePaymentVerification();
});

function renderChatModal() {
    log('Rendering chat modal', 'info');
    const chatModal = document.getElementById('chat-modal');
    if (!chatModal) {
        log('Chat modal element not found', 'error');
        return;
    }
    
    chatModal.innerHTML = `
        <div class="relative top-0 mx-auto p-0 w-full max-w-md">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[500px]">
                <div class="flex justify-between items-center px-4 py-3 border-b">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">Order Chat</h3>
                        <p id="typing-status" class="text-sm text-gray-500 hidden">Seller is typing...</p>
                </div>
                    <button class="close-chat text-gray-400 hover:text-gray-500 focus:outline-none">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="chat-messages" class="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50"></div>
                <div class="flex items-center gap-2 px-4 py-3 border-t bg-white">
                    <input type="text" id="chat-input" placeholder="Type your message..." class="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none" />
                    <button id="send-message" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition">Send</button>
                </div>
            </div>
                </div>
            `;
    log('Chat modal rendered successfully', 'success');
}

function initializeChat(orderId) {
    log('Initializing chat', 'info', { orderId });
    
    if (!currentUser) {
        log('No authenticated user found', 'error');
        alert('Please sign in to use chat');
        return;
    }
    
    renderChatModal();
    
    const chatRef = database.ref(`chats/${orderId}`);
    const chatModal = document.getElementById('chat-modal');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const typingStatus = document.getElementById('typing-status');
    
    if (!chatModal || !chatMessages || !chatInput || !sendButton) {
        log('Required chat elements not found', 'error');
        return;
    }

    chatModal.classList.remove('hidden');
    
    chatMessages.innerHTML = '';
    
    if (window.currentChatListener) {
        chatRef.off('child_added', window.currentChatListener);
    }
    
    window.currentChatListener = chatRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        log('New message received', 'info', { message });
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'} mb-4`;
        
        const messageContent = document.createElement('div');
        messageContent.className = `message-content p-3 rounded-lg ${
            message.senderId === currentUser.uid 
                ? 'bg-green-600 text-white ml-auto' 
                : 'bg-gray-200 text-gray-800'
        }`;
        messageContent.textContent = message.text;
        
        const messageFooter = document.createElement('div');
        messageFooter.className = 'message-footer flex items-center justify-end gap-2 mt-1';
        
        const messageTime = document.createElement('span');
        messageTime.className = 'message-time text-xs text-gray-500';
        messageTime.textContent = new Date(message.timestamp).toLocaleTimeString();
        
        if (message.senderId === currentUser.uid) {
            const messageStatus = document.createElement('span');
            messageStatus.className = 'message-status';
            messageStatus.innerHTML = message.seen ? 
                '<i class="fas fa-check-double text-blue-500"></i>' : 
                '<i class="fas fa-check text-gray-400"></i>';
            messageFooter.appendChild(messageStatus);
        }
        
        messageFooter.appendChild(messageTime);
        messageElement.appendChild(messageContent);
        messageElement.appendChild(messageFooter);
        chatMessages.appendChild(messageElement);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (message.senderId !== currentUser.uid) {
            notificationSound.play().catch(err => log('Error playing notification sound', 'error', { error: err.message }));
            showNotification('New Message', message.text);
        }
    });
    
    const typingRef = database.ref(`typing/${orderId}`);
    typingRef.on('value', (snapshot) => {
        const typingData = snapshot.val();
        if (typingData && typingData.sellerId && typingData.isTyping) {
            typingStatus.classList.remove('hidden');
            setTimeout(() => {
                typingStatus.classList.add('hidden');
            }, 3000);
        } else {
            typingStatus.classList.add('hidden');
        }
    });
    
    const seenRef = database.ref(`seen/${orderId}`);
    seenRef.on('value', (snapshot) => {
        const seenData = snapshot.val();
        if (seenData && seenData.sellerSeen) {
            updateMessageStatus(orderId, true);
        }
    });
    
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        
        try {
            const message = {
                text,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || 'User',
                timestamp: new Date().toISOString(),
                seen: false
            };
            
            await chatRef.push(message);
            
            await typingRef.set({
                userId: currentUser.uid,
                isTyping: false,
        timestamp: new Date().toISOString()
    });
            
            chatInput.value = '';
            chatInput.focus();
        } catch (error) {
            log('Error sending message', 'error', { error: error.message });
            alert('Failed to send message. Please try again.');
        }
    }
    
    let typingTimeout;
    chatInput.addEventListener('input', async () => {
        clearTimeout(typingTimeout);
        
        await typingRef.set({
            userId: currentUser.uid,
            isTyping: true,
            timestamp: new Date().toISOString()
        });
        
        typingTimeout = setTimeout(async () => {
            await typingRef.set({
                userId: currentUser.uid,
                isTyping: false,
                timestamp: new Date().toISOString()
            });
        }, 1000);
    });
    
    sendButton.onclick = sendMessage;
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };
    
    setTimeout(() => chatInput.focus(), 200);
    
    function closeModal(e) {
        if (e.type === 'keydown' && e.key === 'Escape') {
            chatModal.classList.add('hidden');
        } else if (e.type === 'mousedown' && e.target === chatModal) {
            chatModal.classList.add('hidden');
        }
    }
    
    document.addEventListener('keydown', closeModal);
    chatModal.addEventListener('mousedown', closeModal);
    
    chatModal.querySelector('.close-chat').onclick = function() {
        chatModal.classList.add('hidden');
        document.removeEventListener('keydown', closeModal);
        chatModal.removeEventListener('mousedown', closeModal);
    };
}

function updateMessageStatus(orderId, seen) {
    const messageStatuses = document.querySelectorAll(`#chat-messages .message-status`);
    messageStatuses.forEach(status => {
        status.innerHTML = seen ? 
            '<i class="fas fa-check-double text-blue-500"></i>' : 
            '<i class="fas fa-check text-gray-400"></i>';
    });
}

function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-500 translate-x-full ${
        type === 'info' ? 'bg-blue-500' :
        type === 'success' ? 'bg-green-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-red-500'
    } text-white`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                ${type === 'info' ? '<i class="fas fa-info-circle"></i>' :
                  type === 'success' ? '<i class="fas fa-check-circle"></i>' :
                  type === 'warning' ? '<i class="fas fa-exclamation-circle"></i>' :
                  '<i class="fas fa-times-circle"></i>'}
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium">${title}</h3>
                <p class="text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 flex-shrink-0">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => notification.remove(), 5000);
    }, 5000);
}

function getStatusNotificationMessage(newStatus, orderId) {
    const statusMessages = {
        'pending': 'Your order has been placed and is waiting for confirmation.',
        'preparing': 'Your order is being prepared by the restaurant.',
        'ready': 'Your order is ready for delivery.',
        'out_for_delivery': 'Your order is out for delivery.',
        'completed': 'Your order has been delivered successfully.',
        'cancelled': 'Your order has been cancelled.',
        'pending_payment': 'Please complete the payment for your order.'
    };
    
    return statusMessages[newStatus] || `Your order status has been updated to ${newStatus.replace(/_/g, ' ')}`;
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    
    const chatButton = document.createElement('button');
    chatButton.className = 'chat-button';
    chatButton.innerHTML = '<i class="fas fa-comments"></i> Chat with Restaurant';
    chatButton.onclick = () => {
        document.getElementById('chat-modal').style.display = 'block';
        initializeChat(order.id);
    };
    
    card.appendChild(chatButton);
    return card;
}

// document.body.insertAdjacentHTML('beforeend', `
//     <div id="chat-modal" class="modal">
//         <div class="modal-content">
//             <div class="modal-header">
//                 <h3>Order Chat</h3>
//                 <span class="close">&times;</span>
//             </div>
//             <div id="chat-messages" class="chat-messages"></div>
//             <div class="chat-input-container">
//                 <input type="text" id="chat-input" placeholder="Type your message...">
//                 <button id="send-message">Send</button>
//             </div>
//         </div>
//     </div>
// `);

const style = document.createElement('style');
style.textContent = `
    .chat-button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
    }
    
    .chat-button:hover {
        background-color: #45a049;
    }
    
    .chat-messages {
        height: 400px;
        overflow-y: auto;
        padding: 20px;
        background-color: #f5f5f5;
    }
    
    .message {
        margin-bottom: 10px;
        max-width: 70%;
    }
    
    .message.sent {
        margin-left: auto;
    }
    
    .message.received {
        margin-right: auto;
    }
    
    .message-content {
        padding: 10px;
        border-radius: 10px;
        background-color: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .message.sent .message-content {
        background-color: #4CAF50;
        color: white;
    }
    
    .message-time {
        font-size: 0.8em;
        color: #666;
        margin-top: 5px;
    }
    
    .chat-input-container {
        display: flex;
        padding: 10px;
        background-color: white;
        border-top: 1px solid #ddd;
    }
    
    #chat-input {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-right: 10px;
    }
    
    #send-message {
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    #send-message:hover {
        background-color: #45a049;
    }
`;
document.head.appendChild(style);

document.querySelector('#chat-modal .close').onclick = function() {
    document.getElementById('chat-modal').style.display = 'none';
}; 

async function handleSignOut() {
    log('User signing out', 'info');
    showSpinner();
    try {
        await auth.signOut();
        log('User signed out successfully', 'success');
        window.location.href = '/index.html';
    } catch (error) {
        log('Error signing out', 'error', { error: error.message });
        alert('Error signing out. Please try again.');
    }
    hideSpinner();
}

async function downloadOrderBill(orderId) {
    log('Generating order bill PDF', 'info', { orderId });
    showSpinner();
    
    try {
        const snapshot = await database.ref(`orders/${orderId}`).once('value');
        const order = snapshot.val();
        
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== 'completed') {
            throw new Error('Order is not completed');
        }

        log('Order data retrieved', 'debug', {
            orderId,
            itemsCount: order.items ? order.items.length : 0,
            items: order.items
        });

        if (!order.items || !Array.isArray(order.items)) {
            throw new Error('Invalid order items data');
        }

        let container;
        if (order.items.length === 1) {
            container = await generateSingleItemBill(order, orderId);
        } else {
            container = await generateMultipleItemsBill(order, orderId);
        }

        const opt = {
            margin: 1,
            filename: `eatkaro-order-${orderId}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(container).save();
        
        log('Order bill PDF generated successfully', 'success', { orderId });
    } catch (error) {
        log('Error generating order bill PDF', 'error', { 
            error: error.message, 
            orderId,
            stack: error.stack 
        });
        alert('Error generating bill. Please try again.');
    }
    
    hideSpinner();
}

async function generateSingleItemBill(order, orderId) {
    const item = order.items[0];
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    const container = document.createElement('div');
    container.className = 'p-8 bg-white';
    
  
    let reviewSection = '';
    if (order.rating && order.reviewComment) {
        reviewSection = `
            <div class="mb-8 bg-gray-50 p-6 rounded-lg">
                <h2 class="text-2xl font-semibold mb-4 text-gray-700">Customer Review</h2>
                <div class="p-4 bg-white rounded-lg shadow-sm">
                    <div class="flex items-center mb-3">
                        ${generateStarRating(order.rating)}
                        <span class="text-sm text-gray-500 ml-2">
                            ${new Date(order.reviewDate).toLocaleDateString()}
                        </span>
                    </div>
                    <p class="text-gray-700">${order.reviewComment}</p>
                    ${order.reviewReply ? `
                        <div class="mt-4 p-4 bg-indigo-50 rounded-lg">
                            <h5 class="font-semibold text-indigo-700 mb-2">Restaurant's Reply</h5>
                            <p class="text-gray-700">${order.reviewReply}</p>
                            <p class="text-sm text-gray-500 mt-2">
                                Replied on ${new Date(order.reviewReplyDate).toLocaleDateString()}
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="text-center mb-8 border-b pb-6">
            <div class="flex justify-center mb-4">
                <img src="/images/logo.png" alt="EatKaro Logo" class="h-16">
            </div>
            <h1 class="text-4xl font-bold text-indigo-600 mb-2">EatKaro</h1>
            <p class="text-xl text-gray-600">Order Bill</p>
            <p class="text-sm text-gray-500 mt-2">Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="mb-8 bg-indigo-50 p-6 rounded-lg">
            <h2 class="text-2xl font-semibold mb-4 text-indigo-700">Order Information</h2>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Order ID:</span> ${orderId}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Date:</span> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Status:</span> <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">${order.status.toUpperCase()}</span></p>
                </div>
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Restaurant:</span> ${order.sellerName || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Payment Method:</span> ${(order.paymentMethod || 'N/A').toUpperCase()}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Delivery Address:</span> ${order.deliveryAddress || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Customer Information</h2>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Name:</span> ${userProfile?.fullName || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Phone:</span> ${userProfile?.phone || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Email:</span> ${currentUser?.email || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Address:</span> ${userProfile?.address || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="mb-8">
            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Order Details</h2>
            <div class="bg-white rounded-lg shadow-sm p-6">
                <div class="flex items-center space-x-4 mb-4">
                    <img src="${item.thumbnail || 'images/default-food.png'}" alt="${item.name || 'Item'}" class="w-24 h-24 object-cover rounded-lg">
                    <div>
                        <h3 class="text-lg font-medium text-gray-900">${item.name || 'Unnamed Item'}</h3>
                        <p class="text-sm text-gray-500">${item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</p>
                        <p class="text-sm text-gray-500">Quantity: ${item.quantity || 1}</p>
                    </div>
                </div>
                <div class="border-t pt-4">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-600">Price per item:</span>
                        <span class="text-gray-900">₹${(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-gray-600">Quantity:</span>
                        <span class="text-gray-900">${item.quantity || 1}</span>
                    </div>
                    <div class="flex justify-between items-center mt-2 font-medium">
                        <span class="text-gray-900">Subtotal:</span>
                        <span class="text-indigo-600">₹${itemTotal.toFixed(2)}</span>
                    </div>
                    ${order.discount > 0 ? `
                        <div class="flex justify-between items-center mt-2 text-green-600">
                            <span>Discount:</span>
                            <span>-₹${(order.discount || 0).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between items-center mt-4 pt-4 border-t font-bold">
                        <span class="text-gray-900">Total Amount:</span>
                        <span class="text-indigo-600">₹${(order.total || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>

        ${reviewSection}

        <div class="mt-8 text-center border-t pt-6">
            <p class="text-gray-600 mb-2">Thank you for choosing EatKaro!</p>
            <p class="text-sm text-gray-500">This is a computer-generated document and does not require a signature.</p>
            <div class="mt-4 flex justify-center space-x-4">
                <p class="text-sm text-gray-500">For any queries, contact us at:</p>
                <p class="text-sm text-indigo-600">support@eatkaro.com</p>
            </div>
        </div>
    `;

    return container;
}

async function generateMultipleItemsBill(order, orderId) {
    const container = document.createElement('div');
    container.className = 'p-8 bg-white';
    
  
    let reviewSection = '';
    if (order.rating && order.reviewComment) {
        reviewSection = `
            <div class="mb-8 bg-gray-50 p-6 rounded-lg">
                <h2 class="text-2xl font-semibold mb-4 text-gray-700">Customer Review</h2>
                <div class="p-4 bg-white rounded-lg shadow-sm">
                    <div class="flex items-center mb-3">
                        ${generateStarRating(order.rating)}
                        <span class="text-sm text-gray-500 ml-2">
                            ${new Date(order.reviewDate).toLocaleDateString()}
                        </span>
                    </div>
                    <p class="text-gray-700">${order.reviewComment}</p>
                    ${order.reviewReply ? `
                        <div class="mt-4 p-4 bg-indigo-50 rounded-lg">
                            <h5 class="font-semibold text-indigo-700 mb-2">Restaurant's Reply</h5>
                            <p class="text-gray-700">${order.reviewReply}</p>
                            <p class="text-sm text-gray-500 mt-2">
                                Replied on ${new Date(order.reviewReplyDate).toLocaleDateString()}
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    const itemsHtml = order.items.map(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        return `
            <tr class="border-b border-gray-200">
                <td class="px-4 py-3">
                    <div class="flex items-center">
                        <img src="${item.thumbnail || 'images/default-food.png'}" alt="${item.name || 'Item'}" class="w-12 h-12 object-cover rounded-lg mr-3">
                        <div>
                            <p class="font-medium text-gray-900">${item.name || 'Unnamed Item'}</p>
                            <p class="text-sm text-gray-500">${item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-center">${item.quantity || 1}</td>
                <td class="px-4 py-3 text-right">₹${(item.price || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right font-medium">₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="text-center mb-8 border-b pb-6">
            <div class="flex justify-center mb-4">
                <img src="/images/logo.png" alt="EatKaro Logo" class="h-16">
            </div>
            <h1 class="text-4xl font-bold text-indigo-600 mb-2">EatKaro</h1>
            <p class="text-xl text-gray-600">Order Bill</p>
            <p class="text-sm text-gray-500 mt-2">Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="mb-8 bg-indigo-50 p-6 rounded-lg">
            <h2 class="text-2xl font-semibold mb-4 text-indigo-700">Order Information</h2>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Order ID:</span> ${orderId}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Date:</span> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Status:</span> <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">${order.status.toUpperCase()}</span></p>
                </div>
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Restaurant:</span> ${order.sellerName || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Payment Method:</span> ${(order.paymentMethod || 'N/A').toUpperCase()}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Delivery Address:</span> ${order.deliveryAddress || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Customer Information</h2>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Name:</span> ${userProfile?.fullName || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Phone:</span> ${userProfile?.phone || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Email:</span> ${currentUser?.email || 'N/A'}</p>
                    <p class="text-gray-700 mb-2"><span class="font-semibold">Address:</span> ${userProfile?.address || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="mb-8">
            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Order Details</h2>
            <div class="bg-white rounded-lg shadow-sm overflow-hidden">
                <table class="w-full border-collapse">
                    <thead>
                        <tr class="bg-indigo-100">
                            <th class="px-4 py-3 text-left text-indigo-700 font-semibold">Item</th>
                            <th class="px-4 py-3 text-center text-indigo-700 font-semibold">Quantity</th>
                            <th class="px-4 py-3 text-right text-indigo-700 font-semibold">Price</th>
                            <th class="px-4 py-3 text-right text-indigo-700 font-semibold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-gray-300">
                            <td colspan="3" class="px-4 py-3 text-right font-medium text-gray-700">Subtotal:</td>
                            <td class="px-4 py-3 text-right font-medium">₹${(order.subtotal || 0).toFixed(2)}</td>
                        </tr>
                        ${order.discount > 0 ? `
                            <tr>
                                <td colspan="3" class="px-4 py-3 text-right font-medium text-green-600">Discount:</td>
                                <td class="px-4 py-3 text-right font-medium text-green-600">-₹${(order.discount || 0).toFixed(2)}</td>
                            </tr>
                        ` : ''}
                        <tr class="border-t-2 border-gray-300">
                            <td colspan="3" class="px-4 py-3 text-right font-bold text-gray-900">Total Amount:</td>
                            <td class="px-4 py-3 text-right font-bold text-indigo-600">₹${(order.total || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        ${reviewSection}

        <div class="mt-8 text-center border-t pt-6">
            <p class="text-gray-600 mb-2">Thank you for choosing EatKaro!</p>
            <p class="text-sm text-gray-500">This is a computer-generated document and does not require a signature.</p>
            <div class="mt-4 flex justify-center space-x-4">
                <p class="text-sm text-gray-500">For any queries, contact us at:</p>
                <p class="text-sm text-indigo-600">support@eatkaro.com</p>
            </div>
        </div>
    `;

    return container;
}