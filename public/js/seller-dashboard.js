let currentUser = null;
let sellerProfile = null;
let thumbnailUrl = '';
let itemImages = [];
let editingItemId = null;
let profilePhotoUrl = '';
let currentPaymentAmount = 0;
let currentOrderId = null;
let pendingPayments = {};

let lastSeenTimestamp = {};
let typingStatus = {};
let notificationSound = new Audio('/sounds/notification.mp3');

let notificationTimeouts = {};
let shownNotifications = new Set();

function initializeNotifications() {
  
    const savedNotifications = localStorage.getItem('shownNotifications');
    if (savedNotifications) {
        shownNotifications = new Set(JSON.parse(savedNotifications));
    }

  
    database.ref('orders').on('child_added', (snapshot) => {
        const order = snapshot.val();
        const notificationId = `order-${order.id}`;
        if (order.sellerId === currentUser.uid && 
            order.status === 'pending' && 
            !shownNotifications.has(notificationId)) {
            showNewOrderNotification(order);
            shownNotifications.add(notificationId);
            saveShownNotifications();
        }
    });


    database.ref('chats').on('child_added', (snapshot) => {
        const chatRef = snapshot.ref;
        chatRef.on('child_added', (messageSnapshot) => {
            const message = messageSnapshot.val();
            const notificationId = `chat-${snapshot.key}-${messageSnapshot.key}`;
            if (message.senderId !== currentUser.uid && 
                !shownNotifications.has(notificationId)) {
                showNewChatNotification(snapshot.key, message);
                shownNotifications.add(notificationId);
                saveShownNotifications();
            }
        });
    });
}

function saveShownNotifications() {
    localStorage.setItem('shownNotifications', JSON.stringify([...shownNotifications]));
}

function showNewOrderNotification(order) {
    const notificationId = `order-${order.id}`;
    

    const badge = document.createElement('div');
    badge.id = `notification-${notificationId}`;
    badge.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs animate-bounce';
    badge.textContent = '1';
    

    const ordersButton = document.querySelector('button[onclick="showOrders()"]');
    if (ordersButton) {
        ordersButton.classList.add('relative');
        ordersButton.appendChild(badge);
    }
    
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 translate-y-0 z-50 cursor-pointer';
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
            </div>
            <div>
                <p class="font-medium">New Order Received</p>
                <p class="text-sm opacity-90">Order #${order.id}</p>
            </div>
        </div>
    `;
    
    toast.onclick = () => {
        showOrders();
        showOrderTab('active');
        toast.remove();
    };
    
    document.body.appendChild(toast);
    
    setNotificationCleanup(notificationId, badge, toast);
    
    showNotification('New Order', `New order received: #${order.id}`);
}

function showNewChatNotification(orderId, message) {
    const notificationId = `chat-${orderId}-${message.id}`;
    
    let badge = document.getElementById(`notification-${notificationId}`);
    if (!badge) {
        badge = document.createElement('div');
        badge.id = `notification-${notificationId}`;
        badge.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs animate-bounce';
        badge.textContent = '1';
        
      
        const chatButton = document.querySelector(`button[onclick*="initializeChat('${orderId}')"]`);
        if (chatButton) {
            chatButton.classList.add('relative');
            chatButton.appendChild(badge);
        }
    } else {
        const count = parseInt(badge.textContent) + 1;
        badge.textContent = count.toString();
    }
    
    const toast = document.createElement('div');
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
                <p class="text-sm opacity-90">${message.text}</p>
            </div>
        </div>
    `;
    
  
    toast.onclick = () => {
        document.getElementById('chat-modal').classList.remove('hidden');
        initializeChat(orderId);
        toast.remove();
    };
    
    document.body.appendChild(toast);
    
    setNotificationCleanup(notificationId, badge, toast);
    
    showNotification('New Message', `New message from ${message.senderName || 'Customer'}`);
}

function setNotificationCleanup(notificationId, badge, toast) {
   
    if (notificationTimeouts[notificationId]) {
        clearTimeout(notificationTimeouts[notificationId]);
    }
    
  
    notificationTimeouts[notificationId] = setTimeout(() => {
        if (badge) badge.remove();
        if (toast) {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }
        delete notificationTimeouts[notificationId];
    }, 2 * 60 * 1000);
}

function showNotification(title, message) {
    if (!("Notification" in window)) {
        console.log('Notifications not supported');
        return;
    }
    
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: message,
            icon: '/images/logo.png'
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, {
                    body: message,
                    icon: '/images/logo.png'
                });
            }
        });
    }
}

function playNotificationSound() {
    try {
        notificationSound.currentTime=0; 
        notificationSound.play().catch(err => {
            log('Error playing notification sound', 'error', { error: err.message });
        });
    } catch (error) {
        log('Error with notification sound', 'error', { error: error.message });
    }
}


function showPaymentModal(amount, orderId) {
    log('Showing payment modal', 'info', { amount, orderId });
    currentPaymentAmount = amount;
    currentOrderId = orderId;
    document.getElementById('payment-amount').textContent = `₹${amount.toFixed(2)}`;
    document.getElementById('payment-modal').classList.remove('hidden');
    
   
    pendingPayments[orderId] = {
        amount: amount,
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    
   
    updatePaymentStatus(orderId);
}

function hidePaymentModal() {
    log('Hiding payment modal');
    document.getElementById('payment-modal').classList.add('hidden');
    currentPaymentAmount = 0;
    currentOrderId = null;
}


function updatePaymentStatus(orderId) {
    const statusElement = document.getElementById('payment-status');
    const payment = pendingPayments[orderId];
    
    if (!payment) return;
    
    switch (payment.status) {
        case 'pending':
            statusElement.innerHTML = `
                <i class="fas fa-clock text-yellow-500"></i>
                <span class="text-gray-700">Waiting for payment verification</span>
            `;
            break;
        case 'verified':
            statusElement.innerHTML = `
                <i class="fas fa-check-circle text-green-500"></i>
                <span class="text-gray-700">Payment verified</span>
            `;
            break;
        case 'rejected':
            statusElement.innerHTML = `
                <i class="fas fa-times-circle text-red-500"></i>
                <span class="text-gray-700">Payment not received</span>
            `;
            break;
    }
}

function showVerifyPaymentModal(orderId) {
    log('Showing verify payment modal', 'info', { orderId });
    const payment = pendingPayments[orderId];
    if (!payment) return;
    
    document.getElementById('verify-order-id').textContent = orderId;
    document.getElementById('verify-amount').textContent = `₹${payment.amount.toFixed(2)}`;
    document.getElementById('verify-customer').textContent = 'Customer Name'; 
    
    document.getElementById('verify-payment-modal').classList.remove('hidden');
}

function hideVerifyPaymentModal() {
    log('Hiding verify payment modal');
    document.getElementById('verify-payment-modal').classList.add('hidden');
}

async function verifyPayment(orderId, isVerified) {
    log('Verifying payment', 'info', { orderId, isVerified });
    
  
    const modals = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-50');
    modals.forEach(modal => {
        if (modal) {
            modal.remove();
        }
    });
    
    try {
    showSpinner();
        const paymentRequestRef = database.ref(`payment_requests/${orderId}`);
        const orderRef = database.ref(`orders/${orderId}`);
        
        if (isVerified) {

            await paymentRequestRef.update({
                status: 'verified',
                verifiedAt: new Date().toISOString()
            });
            
        
            await orderRef.update({
                status: 'preparing',
                paymentStatus: 'paid',
                updatedAt: new Date().toISOString()
            });
            
           
            if (pendingPayments[orderId]) {
                pendingPayments[orderId].status = 'verified';
                updatePaymentStatus(orderId);
            }
            
            log('Payment verified successfully', 'success');
        } else {
           
            await paymentRequestRef.update({
                status: 'rejected',
                rejectedAt: new Date().toISOString()
            });
            
          
            await orderRef.update({
                status: 'cancelled',
                paymentStatus: 'failed',
                updatedAt: new Date().toISOString()
            });
            
           
            if (pendingPayments[orderId]) {
                pendingPayments[orderId].status = 'rejected';
                updatePaymentStatus(orderId);
            }
            
            log('Payment rejected', 'info');
        }
        
      
        showTab('orders');
        showOrderTab('active');
        
     
        if (window.ordersListener) {
            database.ref('orders').off('value', window.ordersListener);
        }
        await loadOrders();
        
    } catch (error) {
        log('Error verifying payment', 'error', { error: error.message });
        alert('Failed to verify payment. Please try again.');
    } finally {
    hideSpinner();
    }
}


function log(message, type = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

const cloudinary = window.cloudinary;
cloudinary.setCloudName('dqaygduva'); 


auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            currentUser = user; 
            log('User authenticated', 'info', { uid: user.uid });
            
           
            const sellerSnapshot = await database.ref(`sellers/${user.uid}`).once('value');
            if (!sellerSnapshot.exists()) {
              
                const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
                if (userSnapshot.exists()) {
                    alert('Access denied. This is a seller dashboard. Please use the user dashboard.');
                    await auth.signOut();
                    window.location.href = '/index.html';
                    return;
                }
            }
            
       
            await loadSellerProfile();
            await loadInventory();
            await loadOrders();
            await loadReviews();
        } catch (error) {
            console.error('Error checking user role:', error);
            alert('Error verifying user role. Please try again.');
            await auth.signOut();
            window.location.href = '/index.html';
        }
    } else {
        currentUser = null;
        log('User signed out', 'info');
        window.location.href = '/index.html';
    }
});

function checkAuth() {
    if (!currentUser) {
        log('No authenticated user found', 'error');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

function showSection(section) {
    log(`Showing section: ${section}`);
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${section}-section`).classList.remove('hidden');
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-indigo-500', 'text-indigo-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-indigo-500', 'text-indigo-600');
}

function showTab(tab) {
    log('Showing tab', 'info', { tab });
  
    document.getElementById('inventory-section').classList.add('hidden');
    document.getElementById('orders-section').classList.add('hidden');
    document.getElementById('reviews-section').classList.add('hidden');
    document.getElementById('coupons-section').classList.add('hidden');
    document.getElementById('payment-requests-section').classList.add('hidden');
    
 
    document.getElementById(`${tab}-section`).classList.remove('hidden');
    
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(button => {
        button.classList.remove('active');
        button.classList.remove('border-indigo-500', 'text-indigo-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
   
    const activeTab = document.querySelector(`button[onclick="showTab('${tab}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.classList.add('border-indigo-500', 'text-indigo-600');
        activeTab.classList.remove('border-transparent', 'text-gray-500');
    }
    
  
    if (tab === 'inventory') {
        loadInventory();
    } else if (tab === 'orders') {
        loadOrders();
    } else if (tab === 'reviews') {
        loadReviews();
    } else if (tab === 'coupons') {
        loadCoupons();
    } else if (tab === 'payment-requests') {
        loadPaymentRequests();
    }
}

function showAddItemModal() {
    log('Showing add item modal');
    document.getElementById('add-item-modal').classList.remove('hidden');
    resetForm();
}

function hideAddItemModal() {
    log('Hiding add item modal');
    document.getElementById('add-item-modal').classList.add('hidden');
    
    if (!editingItemId) {
        resetForm();
    }
}

function resetForm() {
    log('Resetting form');
    document.getElementById('add-item-form').reset();
    thumbnailUrl = '';
    itemImages = [];
   
    updateImagePreviews();
    document.querySelector('#add-item-modal h3').textContent = 'Add New Item';
}

async function editItem(itemId) {
    log('Editing item1', 'info', { itemId });
    editingItemId = itemId;
    log('Set editingItemId to1', 'info', { editingItemId });
    showSpinner();
    
    try {
        const snapshot = await database.ref(`items/${itemId}`).once('value');
        const item = snapshot.val();
        
        if (!item) {
            throw new Error('Item not found');
        }

        showAddItemModal();
        
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-description').value = item.description;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-type').value = item.foodType;
        document.getElementById('item-category').value = item.category || 'main-course';
        document.getElementById('item-quantity').value = item.quantity || 0;
   
        thumbnailUrl = item.thumbnail;
        itemImages = item.images || [];
        
        updateImagePreviews();
        
        document.querySelector('#add-item-modal h3').textContent = 'Edit Item';
        document.querySelector('#add-item-form button[type="submit"]').textContent = 'Update Item';
        
        log('Finished setting up edit mode1', 'info', { editingItemId });
    } catch (error) {
        log('Error loading item for editing', 'error', { error: error.message });
        alert('Error loading item. Please try again.');
        editingItemId = null;
    }
    hideSpinner();
}

function removeImage(index) {
    log('Removing image', 'info', { index });
    itemImages.splice(index, 1);
    updateImagePreviews();
}


function updateImagePreviews() {
    const thumbnailPreview = document.getElementById('thumbnail-preview');
    const imagePreview = document.getElementById('image-preview');
    
    if (!thumbnailPreview || !imagePreview) {
        log('Image preview containers not found', 'error');
        return;
    }

    if (thumbnailUrl) {
        thumbnailPreview.innerHTML = `
            <div class="relative">
                <img src="${thumbnailUrl}" alt="Thumbnail" class="w-full h-48 object-cover rounded-lg">
                <button type="button" onclick="uploadThumbnail()" 
                        class="absolute bottom-2 right-2 bg-white bg-opacity-75 p-2 rounded-full shadow hover:bg-opacity-100">
                    <i class="fas fa-camera text-gray-600"></i>
                </button>
            </div>
        `;
    } else {
        thumbnailPreview.innerHTML = `
            <button type="button" onclick="uploadThumbnail()" 
                    class="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500">
                <i class="fas fa-plus text-gray-400 text-2xl mb-2"></i>
                <span class="text-sm text-gray-500">Click to upload thumbnail</span>
            </button>
        `;
    }

    let imagesHtml = '';
    
    itemImages.forEach((url, index) => {
        imagesHtml += `
            <div class="relative">
                <img src="${url}" alt="Item image ${index + 1}" class="w-full h-32 object-cover rounded-lg">
                <button type="button" onclick="removeImage(${index})" 
                        class="absolute top-2 right-2 bg-white bg-opacity-75 p-2 rounded-full shadow hover:bg-opacity-100">
                    <i class="fas fa-times text-red-600"></i>
                </button>
            </div>
        `;
    });

    if (itemImages.length < 5) {
        imagesHtml += `
            <button type="button" onclick="uploadItemImages()" 
                    class="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500">
                <i class="fas fa-plus text-gray-400 text-xl mb-1"></i>
                <span class="text-sm text-gray-500">Add more images</span>
                <span class="text-xs text-gray-400">(${itemImages.length}/5)</span>
            </button>
        `;
    }

    imagePreview.innerHTML = imagesHtml;
}

function uploadThumbnail() {
    log('Opening Cloudinary widget for thumbnail upload');
    const widget = cloudinary.createUploadWidget({
        cloudName: 'dqaygduva',
        uploadPreset: 'EatKaro',
        sources: ['local', 'camera'],
        multiple: false,
        maxFiles: 1,
        resourceType: 'image',
        showAdvancedOptions: false,
        cropping: true,
        showSkipCropButton: false,
        croppingAspectRatio: 1,
        croppingDefaultSelectionRatio: 1,
        croppingShowDimensions: true,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
        maxImageFileSize: 2000000,
        theme: 'minimal'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            log('Thumbnail uploaded successfully', 'success', { url: result.info.secure_url });
            thumbnailUrl = result.info.secure_url;
            updateImagePreviews();
        } else if (error) {
            log('Error uploading thumbnail', 'error', { error: error.message });
            alert('Error uploading thumbnail. Please try again.');
        }
    });
    widget.open();
}

function uploadItemImages() {
    if (itemImages.length >= 5) {
        alert('Maximum 5 additional images allowed');
        return;
    }

    log('Opening Cloudinary widget for item images upload');
    const widget = cloudinary.createUploadWidget({
        cloudName: 'dqaygduva',
        uploadPreset: 'EatKaro',
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 5 - itemImages.length,
        resourceType: 'image',
        showAdvancedOptions: false,
        cropping: false, 
        showSkipCropButton: false,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
        maxImageFileSize: 2000000,
        theme: 'minimal',
        showUploadMoreButton: true, 
        showPoweredBy: false,
        styles: {
            palette: {
                window: "#FFFFFF",
                windowBorder: "#90A0B3",
                tabIcon: "#0078FF",
                menuIcons: "#5A616A",
                textDark: "#000000",
                textLight: "#FFFFFF",
                link: "#0078FF",
                action: "#FF620C",
                inactiveTabIcon: "#0E2F5A",
                error: "#F44235",
                inProgress: "#0078FF",
                complete: "#20B832",
                sourceBg: "#E4EBF1"
            }
        }
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            log('Item image uploaded successfully', 'success', { url: result.info.secure_url });
            itemImages.push(result.info.secure_url);
            updateImagePreviews();
        } else if (error) {
            log('Error uploading item image', 'error', { error: error.message });
            alert('Error uploading image. Please try again.');
        }
    });
    widget.open();
}

document.addEventListener('DOMContentLoaded', function() {
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showSpinner();
            
            try {
                const name = document.getElementById('item-name').value;
                const description = document.getElementById('item-description').value;
                const price = parseFloat(document.getElementById('item-price').value);
                const foodType = document.getElementById('item-type').value;
                const category = document.getElementById('item-category').value;
                const quantity = parseInt(document.getElementById('item-quantity').value) || 0;
                
                if (!name || !description || !price || !foodType || !thumbnailUrl) {
                    throw new Error('Please fill in all required fields including the thumbnail image');
                }

                const itemData = {
                    name,
                    description,
                    price,
                    foodType,
                    category,
                    quantity,
                    thumbnail: thumbnailUrl,
                    images: itemImages,
                    sellerId: currentUser.uid,
                    sellerName: sellerProfile?.name || 'Restaurant',
                    updatedAt: new Date().toISOString()
                };

                if (editingItemId) {
                    log('Updating existing item', 'info', { itemId: editingItemId });
                
                    try {
                        const itemRef = database.ref(`items/${editingItemId}`);
                        const snapshot = await itemRef.once('value');
                
                        if (!snapshot.exists()) {
                            throw new Error('Original item not found');
                        }
                
                        const originalData = snapshot.val();
                        itemData.createdAt = originalData.createdAt || new Date().toISOString();
                
                        await itemRef.set(itemData);
                        log('Item updated successfully', 'success', { itemId: editingItemId });
                
                      
                        editingItemId = null;
                        hideAddItemModal();
                        resetForm(); 
                    } catch (error) {
                        log('Error updating item', 'error', { error: error.message });
                        throw new Error('Failed to update item: ' + error.message);
                    }
                } else {
                   
                    itemData.createdAt = new Date().toISOString();
                    log('Creating new item', 'info');
                    await database.ref('items').push(itemData);
                    log('Item created successfully', 'success');
                    hideAddItemModal();
                    resetForm();
                }
                
                await loadInventory();
                alert(editingItemId ? 'Item updated successfully!' : 'Item added successfully!');
            } catch (error) {
                log('Error saving item', 'error', { error: error.message });
                alert(error.message || 'Error saving item. Please try again.');
            }
            hideSpinner();
        });
    }


    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            log('Profile form submission started');
            showSpinner();

            const profileData = {
                name: document.getElementById('restaurant-name').value,
                description: document.getElementById('description').value,
                address: document.getElementById('address').value,
                phone: document.getElementById('phone').value,
                cuisine: document.getElementById('cuisine-type').value,
                openingTime: document.getElementById('opening-time').value,
                closingTime: document.getElementById('closing-time').value,
                photoURL: profilePhotoUrl,
                updatedAt: new Date().toISOString()
            };

            try {
                if (!sellerProfile) {
                    profileData.createdAt = new Date().toISOString();
                    profileData.rating = 0;
                    profileData.totalRatings = 0;
                }

                await database.ref(`sellers/${currentUser.uid}`).set(profileData);
                sellerProfile = { ...sellerProfile, ...profileData };
                log('Profile updated successfully', 'success');
                updateProfileUI();
                hideProfileModal();

             
                if (!sellerProfile) {
                    loadInventory();
                    loadOrders();
                    loadHistory();
                }
            } catch (error) {
                log('Error updating profile', 'error', { error: error.message });
                alert('Error updating profile. Please try again.');
            }
            hideSpinner();
        });
    }

  
    const replyForm = document.getElementById('reply-form');
    if (replyForm) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reviewId = replyForm.dataset.reviewId;
            const replyText = document.getElementById('reply-text').value.trim();
            
            if (!replyText) {
                alert('Please enter a reply');
                return;
            }
            
            showSpinner();
            try {
                await database.ref(`reviews/${currentUser.uid}/${reviewId}`).update({
                    reply: replyText,
                    repliedAt: new Date().toISOString()
                });
                
                log('Reply submitted successfully', 'success');
                hideReplyModal();
                loadReviews();
            } catch (error) {
                log('Error submitting reply', 'error', { error: error.message });
                alert('Error submitting reply. Please try again.');
            }
            hideSpinner();
        });
    }


    const addCouponForm = document.getElementById('add-coupon-form');
    if (addCouponForm) {
        addCouponForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            log('Starting coupon creation process', 'info');
            
            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    log('No authenticated user found', 'error');
                    alert('Please sign in to add coupons');
                    return;
                }

               
                const code = document.getElementById('coupon-code').value.toUpperCase();
                const discountType = document.getElementById('discount-type').value;
                const discountValue = parseFloat(document.getElementById('discount-value').value);
                const usageLimit = document.getElementById('usage-limit').value ? parseInt(document.getElementById('usage-limit').value) : null;
                const expiryDate = document.getElementById('expiry-date').value;

                log('Form values collected', 'info', {
                    code,
                    discountType,
                    discountValue,
                    usageLimit,
                    expiryDate
                });

             
                if (!code || !discountType || !discountValue || !expiryDate) {
                    log('Missing required fields', 'error', {
                        code: !!code,
                        discountType: !!discountType,
                        discountValue: !!discountValue,
                        expiryDate: !!expiryDate
                    });
                    alert('Please fill in all required fields');
                    return;
                }

                if (discountType === 'percentage' && discountValue > 100) {
                    log('Invalid percentage value', 'error', { discountValue });
                    alert('Percentage discount cannot exceed 100%');
                    return;
                }

                showSpinner();
                
                log('Checking for existing coupon', 'info', { code });
              
                const existingCoupon = await database.ref(`coupons/${code}`).once('value');
                if (existingCoupon.exists()) {
                    log('Coupon code already exists', 'error', { code });
                    alert('This coupon code already exists. Please use a different code.');
                    hideSpinner();
                    return;
                }

             
                const couponData = {
                    discountType,
                    discountValue,
                    usageLimit,
                    usageCount: 0,
                    expiryDate,
                    createdAt: new Date().toISOString()
                };

                log('Attempting to save coupon to database', 'info', {
                    path: `coupons/${code}`,
                    data: couponData
                });

                const couponRef = database.ref(`coupons/${code}`);
                await couponRef.set(couponData);
                
                log('Coupon saved successfully', 'success', {
                    code,
                    path: couponRef.toString(),
                    data: couponData
                });

             
                const savedCoupon = await couponRef.once('value');
                if (savedCoupon.exists()) {
                    log('Coupon verification successful', 'success', {
                        code,
                        savedData: savedCoupon.val()
                    });
                    
                  
                    document.getElementById('add-coupon-form').reset();
                    hideAddCouponModal();
                    
                   
                    log('Reloading coupons list', 'info');
                    await loadCoupons();
                    
                   
                    alert('Coupon added successfully!');
                } else {
                    log('Coupon verification failed - data not found after save', 'error', { code });
                    throw new Error('Coupon was not saved properly');
                }
            } catch (error) {
                log('Error in coupon creation process', 'error', {
                    error: error.message,
                    stack: error.stack
                });
                alert('Failed to add coupon. Please try again.');
            } finally {
                hideSpinner();
            }
        });
    }


    const discountType = document.getElementById('discount-type');
    if (discountType) {
        discountType.addEventListener('change', function() {
            document.getElementById('discount-symbol').textContent = this.value === 'percentage' ? '%' : '₹';
        });
    }

    const editDiscountType = document.getElementById('edit-discount-type');
    if (editDiscountType) {
        editDiscountType.addEventListener('change', function() {
            document.getElementById('edit-discount-symbol').textContent = this.value === 'percentage' ? '%' : '₹';
        });
    }
});

async function loadInventory() {
    if (!checkAuth()) return;
    
    log('Loading inventory');
    showSpinner();
    try {
        const snapshot = await database.ref('items').orderByChild('sellerId').equalTo(currentUser.uid).once('value');
        const items = [];
        snapshot.forEach(child => {
            items.push({ id: child.key, ...child.val() });
        });
        
        log('Inventory loaded', 'success', { itemCount: items.length });
        displayInventory(items);
    } catch (error) {
        log('Error loading inventory', 'error', { error: error.message });
        alert('Error loading inventory. Please refresh the page.');
    }
    hideSpinner();
}

function displayInventory(items) {
    log('Displaying inventory items', 'info', { count: items.length });
    const container = document.getElementById('inventory-items');
    if (!container) {
        log('Inventory container not found', 'error');
        return;
    }
    container.innerHTML = items.map(item => `
        <div class="bg-white rounded-lg shadow p-4">
            <div class="relative">
                <img src="${item.thumbnail}" alt="${item.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                <div class="absolute top-2 right-2">
                    ${item.foodType === 'veg' 
                        ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">🟢 Veg</span>'
                        : '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">🔴 Non-Veg</span>'
                    }
                </div>
            </div>
            <h3 class="text-lg font-medium text-gray-900">${item.name}</h3>
            <p class="text-gray-500 text-sm mb-2">${item.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-indigo-600 font-medium">₹${item.price.toFixed(2)}</span>
                <span class="text-gray-500">Quantity: ${item.quantity}</span>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button onclick="editItem('${item.id}')" class="text-indigo-600 hover:text-indigo-800">Edit</button>
                <button onclick="deleteItem('${item.id}')" class="text-red-600 hover:text-red-800">Delete</button>
            </div>
        </div>
    `).join('');
}

async function loadOrders() {
    if (!checkAuth()) return;
    
    log('Loading orders');
    showSpinner();
    try {
        if (window.ordersListener) {
            database.ref('orders').off('value', window.ordersListener);
        }
      
        window.ordersListener = database.ref('orders')
            .orderByChild('sellerId')
            .equalTo(currentUser.uid)
            .on('value', (snapshot) => {
                const orders = [];
                let totalRevenue = 0;
                let totalOrders = 0;
                
                snapshot.forEach(child => {
                    const order = { id: child.key, ...child.val() };
                    orders.push(order);
                 
                    if (order.status === 'completed') {
                        totalRevenue += order.total || 0;
                    }
                  
                    if (order.status !== 'cancelled') {
                        totalOrders++;
                    }
                });
               
                orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              
                const activeOrders = orders.filter(order => 
                    ['pending_payment', 'pending', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)
                );
                const completedOrders = orders.filter(order => 
                    ['completed', 'cancelled'].includes(order.status)
                );
                
                log('Orders filtered', 'info', {
                    total: orders.length,
                    active: activeOrders.length,
                    completed: completedOrders.length
                });
                
                updateOrderStats(totalOrders, totalRevenue);
                displayOrders(activeOrders, 'active-orders');
                displayOrders(completedOrders, 'completed-orders');
            });
    } catch (error) {
        log('Error loading orders', 'error', { error: error.message });
        alert('Error loading orders. Please refresh the page.');
    }
    hideSpinner();
}

window.addEventListener('beforeunload', () => {
    if (window.ordersListener) {
        database.ref('orders').off('value', window.ordersListener);
    }
});

function updateOrderStats(totalOrders, totalRevenue) {
 
    const totalOrdersElement = document.getElementById('total-orders');
    if (totalOrdersElement) {
        totalOrdersElement.textContent = totalOrders;
    }

 
    const totalRevenueElement = document.getElementById('total-revenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = `₹${totalRevenue.toFixed(2)}`;
    }

  
    if (sellerProfile) {
        database.ref(`sellers/${currentUser.uid}`).update({
            totalOrders: totalOrders,
            totalRevenue: totalRevenue,
            updatedAt: new Date().toISOString()
        }).catch(error => {
            log('Error updating seller stats', 'error', { error: error.message });
        });
    }
}

function displayOrders(orders, containerId) {
    log('Displaying orders', 'info', { containerId, count: orders.length });
    const container = document.getElementById(containerId);
    if (!container) {
        log('Orders container not found', 'error', { containerId });
        return;
    }
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No orders found</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="bg-white rounded-lg shadow-md p-6 mb-4" id="order-${order.id}">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">Order #${order.id.slice(-6)}</h3>
                    <p class="text-gray-500">${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div class="flex flex-col items-end">
                    <span class="order-status px-3 py-1 rounded-full text-sm font-medium
                        ${order.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${order.status === 'pending' ? 'bg-blue-100 text-blue-800' : ''}
                        ${order.status === 'preparing' ? 'bg-purple-100 text-purple-800' : ''}
                        ${order.status === 'ready' ? 'bg-green-100 text-green-800' : ''}
                        ${order.status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-800' : ''}
                        ${order.status === 'completed' ? 'bg-gray-100 text-gray-800' : ''}
                        ${order.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}">
                        ${order.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                    ${order.estimatedDeliveryTime ? `
                        <span class="text-sm text-gray-500 mt-1">
                            Est. Delivery: ${new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Customer Details</h4>
                    <p class="text-gray-600">Name: ${order.userName || 'N/A'}</p>
                    <p class="text-gray-600">Phone: ${order.userPhone || 'N/A'}</p>
                    <p class="text-gray-600">Address: ${order.deliveryAddress || 'N/A'}</p>
                    ${order.deliveryInstructions ? `
                        <p class="text-gray-600">Instructions: ${order.deliveryInstructions}</p>
                    ` : ''}
                </div>
                <div>
                    <h4 class="font-medium text-gray-900 mb-2">Payment Details</h4>
                    <p class="text-gray-600">Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                    <p class="text-gray-600">Amount: ₹${order.total?.toFixed(2) || '0.00'}</p>
                    ${order.couponApplied ? `
                        <p class="text-gray-600">Coupon: ${order.couponCode} (-₹${order.discount?.toFixed(2) || '0.00'})</p>
                    ` : ''}
            </div>
                                </div>

            <div class="mb-4">
                <h4 class="font-medium text-gray-900 mb-2">Order Items</h4>
                <div class="space-y-2">
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
            </div>
                </div>
                </div>

            ${order.status === 'out_for_delivery' ? `
                <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="font-medium text-blue-900 mb-2">Delivery Information</h4>
                    <p class="text-blue-800">Delivery Person: ${order.deliveryPerson || 'N/A'}</p>
                    <p class="text-blue-800">Contact: ${order.deliveryPersonPhone || 'N/A'}</p>
                    </div>
                ` : ''}

            <div class="mt-4 flex flex-wrap gap-2">
                ${getStatusUpdateButtons(order)}
                <button onclick="document.getElementById('chat-modal').style.display = 'block'; initializeChat('${order.id}')" 
                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    <i class="fas fa-comments"></i> Chat with Customer
                </button>
            </div>
        </div>
    `).join('');
}

function getStatusUpdateButtons(order) {
    const buttons = [];
    
   
    const nextStatuses = {
        'pending_payment': ['pending'],
        'pending': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['out_for_delivery', 'cancelled'],
        'out_for_delivery': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
    };

    const statusLabels = {
        'pending': 'Accept Order',
        'preparing': 'Start Preparing',
        'ready': 'Mark as Ready',
        'out_for_delivery': 'Assign Delivery',
        'completed': 'Complete Order',
        'cancelled': 'Cancel Order'
    };

    const statusColors = {
        'pending': 'bg-blue-600 hover:bg-blue-700',
        'preparing': 'bg-purple-600 hover:bg-purple-700',
        'ready': 'bg-green-600 hover:bg-green-700',
        'out_for_delivery': 'bg-indigo-600 hover:bg-indigo-700',
        'completed': 'bg-gray-600 hover:bg-gray-700',
        'cancelled': 'bg-red-600 hover:bg-red-700'
    };

 
    nextStatuses[order.status]?.forEach(status => {
        buttons.push(`
            <button onclick="updateOrderStatus('${order.id}', '${status}')"
                    class="px-4 py-2 text-white rounded-md ${statusColors[status]}">
                ${statusLabels[status]}
            </button>
        `);
    });

    
    if (order.status === 'ready') {
        buttons.push(`
            <button onclick="showDeliveryAssignmentModal('${order.id}')"
                    class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                Assign Delivery Person
            </button>
        `);
    }

    return buttons.join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        showSpinner();
        
     
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
            note: `Status updated by seller`
        });

    
        await orderRef.update({
            status: newStatus,
            statusHistory: statusHistory,
            updatedAt: new Date().toISOString()
        });

        
        if (newStatus === 'cancelled') {
            await database.ref(`payment_requests/${orderId}`).update({
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            });
        }

       
        showSuccessMessage(`Order status updated to ${newStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`);
        
      
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        showErrorMessage('Failed to update order status');
    } finally {
        hideSpinner();
    }
}

function showDeliveryAssignmentModal(orderId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Assign Delivery Person</h3>
            <form id="delivery-assignment-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Delivery Person Name</label>
                    <input type="text" id="delivery-person-name" required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="tel" id="delivery-person-phone" required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Estimated Delivery Time</label>
                    <input type="datetime-local" id="estimated-delivery-time" required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                </div>
                <div class="flex justify-end space-x-3">
                    <button type="button" onclick="this.closest('.fixed').remove()"
                            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        Assign
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
                
   
    modal.querySelector('#delivery-assignment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const deliveryPerson = document.getElementById('delivery-person-name').value;
        const deliveryPersonPhone = document.getElementById('delivery-person-phone').value;
        const estimatedDeliveryTime = document.getElementById('estimated-delivery-time').value;

        try {
            showSpinner();
      
            await database.ref(`orders/${orderId}`).update({
                deliveryPerson,
                deliveryPersonPhone,
                estimatedDeliveryTime: new Date(estimatedDeliveryTime).toISOString(),
                status: 'out_for_delivery',
                updatedAt: new Date().toISOString()
            });

            const orderRef = database.ref(`orders/${orderId}`);
            const orderSnapshot = await orderRef.once('value');
            const order = orderSnapshot.val();
            
            const statusHistory = order.statusHistory || [];
            statusHistory.push({
                status: 'out_for_delivery',
                timestamp: new Date().toISOString(),
                note: `Assigned to delivery person: ${deliveryPerson}`
            });

            await orderRef.update({ statusHistory });

            showSuccessMessage('Delivery person assigned successfully');
            modal.remove();
            loadOrders();
        } catch (error) {
            console.error('Error assigning delivery person:', error);
            showErrorMessage('Failed to assign delivery person');
        } finally {
            hideSpinner();
            }
        });
}

async function loadHistory() {
    log('Loading order history');
    showSpinner();
    try {
        const snapshot = await database.ref('orders')
            .orderByChild('sellerId')
            .equalTo(currentUser.uid)
            .once('value');
        
        const orders = [];
        snapshot.forEach(child => {
            const order = child.val();
            if (order.status === 'completed' || order.status === 'cancelled') {
                orders.push({ id: child.key, ...order });
            }
        });
        
        log('Order history loaded', 'success', { orderCount: orders.length });
        displayHistory(orders);
    } catch (error) {
        log('Error loading order history', 'error', { error: error.message });
        alert('Error loading order history. Please refresh the page.');
    }
    hideSpinner();
}

function displayHistory(orders) {
    log('Displaying order history', 'info', { count: orders.length });
    const container = document.getElementById('history-list');
    container.innerHTML = orders.map(order => `
        <div class="bg-white rounded-lg shadow p-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">Order #${order.id.slice(-6)}</h3>
                    <p class="text-gray-500">${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                }">${order.status}</span>
            </div>
            <div class="mt-4">
                <h4 class="font-medium text-gray-900">Items:</h4>
                <ul class="mt-2 space-y-2">
                    ${order.items.map(item => `
                        <li class="flex justify-between">
                            <span>${item.name}</span>
                            <span>${item.quantity}x - ₹${item.price.toFixed(2)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="mt-4 text-right">
                <span class="text-lg font-medium text-gray-900">Total: ₹${order.total.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}


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

async function handleSignOut() {
    try {
        showSpinner();
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        log('Error signing out', 'error', { error: error.message });
        alert('Error signing out. Please try again.');
    } finally {
        hideSpinner();
    }
}

async function deleteItem(itemId) {
    log('Deleting item', 'info', { itemId });
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    showSpinner();
    try {
        await database.ref(`items/${itemId}`).remove();
        log('Item deleted successfully', 'success');
        loadInventory();
    } catch (error) {
        log('Error deleting item', 'error', { error: error.message });
        alert('Error deleting item. Please try again.');
    }
    hideSpinner();
}

function showAddCouponModal() {
    log('Showing add coupon modal');
    document.getElementById('add-coupon-modal').classList.remove('hidden');
    document.getElementById('add-coupon-form').reset();
    document.getElementById('discount-symbol').textContent = '%';
}

function hideAddCouponModal() {
    log('Hiding add coupon modal');
    document.getElementById('add-coupon-modal').classList.add('hidden');
    document.getElementById('add-coupon-form').reset();
}

function showEditCouponModal() {
    log('Showing edit coupon modal');
    document.getElementById('edit-coupon-modal').classList.remove('hidden');
}

function hideEditCouponModal() {
    log('Hiding edit coupon modal');
    document.getElementById('edit-coupon-modal').classList.add('hidden');
}

function loadCoupons() {
    log('Starting to load coupons', 'info');
    showSpinner();
    
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            log('No authenticated user found', 'error');
            throw new Error('User not authenticated');
        }

        
        if (window.couponsListener) {
            database.ref('coupons').off('value', window.couponsListener);
        }

    
        window.couponsListener = database.ref('coupons').on('value', (snapshot) => {
            const coupons = [];
            snapshot.forEach((childSnapshot) => {
                const couponData = childSnapshot.val();
                coupons.push({
                    code: childSnapshot.key,
                    ...couponData
                });
            });
            
            log('Coupons updated', 'success', {
                count: coupons.length,
                coupons: coupons.map(c => ({ 
                    code: c.code, 
                    type: c.discountType,
                    usageCount: c.usageCount || 0,
                    usageLimit: c.usageLimit
                }))
            });

            displayCoupons(coupons);
        });

    } catch (error) {
        log('Error loading coupons', 'error', {
            error: error.message,
            stack: error.stack
        });
        if (error.message === 'User not authenticated') {
            window.location.href = '/index.html';
        } else {
            alert('Failed to load coupons. Please try again.');
        }
    } finally {
        hideSpinner();
    }
}

function displayCoupons(coupons) {
    log('Starting to display coupons', 'info', { count: coupons.length });
    const container = document.getElementById('coupons-list');
    
    if (!container) {
        log('Coupons container not found', 'error');
        return;
    }
    
    if (coupons.length === 0) {
        log('No coupons to display', 'info');
        container.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No coupons found</td></tr>';
        return;
    }
    
    try {
        const html = coupons.map(coupon => {
            const isExpired = new Date(coupon.expiryDate) < new Date();
            const isUsageLimitReached = coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit;
            const status = isExpired ? 'Expired' : isUsageLimitReached ? 'Limit Reached' : 'Active';
            const statusClass = isExpired ? 'bg-red-100 text-red-800' : 
                              isUsageLimitReached ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800';
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${coupon.code}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${coupon.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${coupon.usageCount || 0}${coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' / ∞'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${new Date(coupon.expiryDate).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="deleteCoupon('${coupon.code}')" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = html;
        log('Coupons displayed successfully', 'success', { count: coupons.length });
    } catch (error) {
        log('Error displaying coupons', 'error', {
            error: error.message,
            stack: error.stack
        });
        container.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Error displaying coupons</td></tr>';
    }
}

function deleteCoupon(couponCode) {
    if (!confirm('Are you sure you want to delete this coupon?')) {
        return;
    }

    showSpinner();
    database.ref(`coupons/${couponCode}`).remove()
        .then(() => {
            log('Coupon deleted successfully', 'success');
            loadCoupons();
        })
        .catch((error) => {
            log('Error deleting coupon', 'error', { error: error.message });
            alert('Failed to delete coupon. Please try again.');
        })
        .finally(() => {
            hideSpinner();
        });
}


async function loadSellerProfile() {
    log('Loading seller profile');
    showSpinner();
    try {
        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        const snapshot = await database.ref(`sellers/${currentUser.uid}`).once('value');
        sellerProfile = snapshot.val();
        
        if (sellerProfile) {
            log('Profile loaded successfully', 'success', { profile: sellerProfile });
            updateProfileUI();
           
            loadInventory();
            loadOrders();
            loadReviews();
        } else {
            log('No profile found, showing profile modal', 'info');
            showProfile();
        }
    } catch (error) {
        log('Error loading profile', 'error', { error: error.message });
       
        console.error('Profile loading error:', error);
    } finally {
        hideSpinner();
    }
}

function updateProfileUI() {
    if (!sellerProfile) {
        log('No profile data to update UI', 'warning');
        return;
    }

    try {
       
        const sellerNameElement = document.getElementById('seller-name');
        if (sellerNameElement) {
            sellerNameElement.textContent = sellerProfile.name || 'Seller';
        }

      
        const sellerPhotoElement = document.getElementById('seller-photo');
        if (sellerPhotoElement) {
            if (sellerProfile.photoURL) {
                sellerPhotoElement.innerHTML = `<img src="${sellerProfile.photoURL}" alt="Profile" class="w-8 h-8 rounded-full object-cover">`;
            } else {
                sellerPhotoElement.innerHTML = `<i class="fas fa-user-circle text-2xl text-gray-400"></i>`;
            }
        }

       
        const totalOrdersElement = document.getElementById('total-orders');
        if (totalOrdersElement) {
            totalOrdersElement.textContent = sellerProfile.totalOrders || '0';
        }

        const averageRatingElement = document.getElementById('average-rating');
        if (averageRatingElement) {
            averageRatingElement.textContent = (sellerProfile.rating || 0).toFixed(1);
        }

        const totalRevenueElement = document.getElementById('total-revenue');
        if (totalRevenueElement) {
            totalRevenueElement.textContent = `₹${(sellerProfile.totalRevenue || 0).toFixed(2)}`;
        }

        log('Profile UI updated successfully', 'success');
    } catch (error) {
        log('Error updating profile UI', 'error', { error: error.message });
        console.error('Profile UI update error:', error);
    }
}

function showProfile() {
    log('Showing profile modal');
    document.getElementById('profile-modal').classList.remove('hidden');
    loadProfile();
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

function loadProfile() {
    log('Loading profile');
    if (sellerProfile) {
        document.getElementById('restaurant-name').value = sellerProfile.name || '';
        document.getElementById('description').value = sellerProfile.description || '';
        document.getElementById('address').value = sellerProfile.address || '';
        document.getElementById('phone').value = sellerProfile.phone || '';
        document.getElementById('cuisine-type').value = sellerProfile.cuisine || '';
        document.getElementById('opening-time').value = sellerProfile.openingTime || '';
        document.getElementById('closing-time').value = sellerProfile.closingTime || '';
  
        document.getElementById('profile-photo-preview').src = sellerProfile.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
        profilePhotoUrl = sellerProfile.photoURL || '';
    }
}

async function loadReviews() {
    if (!checkAuth()) return;
    
    log('Loading reviews');
    showSpinner();
    try {
        const snapshot = await database.ref(`reviews/${currentUser.uid}`).once('value');
        const reviews = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                reviews.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }
        
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        log('Reviews loaded', 'success', { count: reviews.length });
        displayReviews(reviews);
    } catch (error) {
        log('Error loading reviews', 'error', { error: error.message });
        alert('Error loading reviews. Please try again.');
    }
        hideSpinner();
}

function displayReviews(reviews) {
    log('Displaying reviews', 'info', { count: reviews.length });
    const container = document.getElementById('reviews-container');
    
    if (!container) {
        log('Reviews container not found', 'error');
        return;
    }
    
    try {
        if (!Array.isArray(reviews) || reviews.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">No reviews yet</p>';
        return;
    }
    
        container.innerHTML = reviews.map(review => {
            if (!review) return '';
            
            const userName = review.userName || 'Anonymous User';
            const userPhoto = review.userPhotoURL || 'images/default-avatar.png';
            const rating = review.rating || 0;
            const comment = review.comment || '';
            const createdAt = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Unknown date';
            const repliedAt = review.repliedAt ? new Date(review.repliedAt).toLocaleDateString() : '';
            
            return `
                <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                    <div class="flex items-start space-x-4">
                        <img src="${userPhoto}" 
                             alt="${userName}" 
                             class="w-12 h-12 rounded-full object-cover">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                    <div>
                                    <h4 class="text-lg font-medium text-gray-900">${userName}</h4>
                                    <div class="flex items-center mt-1">
                                        ${generateStarRating(rating)}
                                        <span class="text-sm text-gray-500 ml-2">
                                            ${createdAt}
                                        </span>
                    </div>
                </div>
                                ${!review.reply ? `
                                    <button onclick="showReplyModal('${review.id}')" 
                                            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                        Reply
                                    </button>
                                ` : ''}
                </div>
                            <p class="mt-2 text-gray-600">${comment}</p>
            ${review.reply ? `
                                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h5 class="font-medium text-gray-900">Your Reply</h5>
                                            <span class="text-sm text-gray-500">
                                                ${repliedAt}
                                            </span>
                </div>
                                        <button onclick="showReplyModal('${review.id}')" 
                                                class="text-indigo-600 hover:text-indigo-800">
                                            Edit Reply
                    </button>
                </div>
                                    <p class="mt-2 text-gray-600">${review.reply}</p>
        </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        log('Reviews displayed successfully', 'success');
    } catch (error) {
        log('Error displaying reviews', 'error', { error: error.message });
        container.innerHTML = '<p class="text-center text-red-500">Error loading reviews. Please try again.</p>';
    }
}

function generateStarRating(rating) {
    if (!rating || isNaN(rating)) {
        rating = 0;
    }
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        <div class="flex items-center">
            ${Array(fullStars).fill('<i class="fas fa-star text-yellow-400"></i>').join('')}
            ${hasHalfStar ? '<i class="fas fa-star-half-alt text-yellow-400"></i>' : ''}
            ${Array(emptyStars).fill('<i class="far fa-star text-yellow-400"></i>').join('')}
        <span class="ml-2 text-gray-600">${rating.toFixed(1)}</span>
        </div>
    `;
}

function showOrderTab(tab) {
    log('Showing order tab', 'info', { tab });
    
  
    document.getElementById('active-orders').classList.add('hidden');
    document.getElementById('completed-orders').classList.add('hidden');
    
    
    if (tab === 'active') {
        document.getElementById('active-orders').classList.remove('hidden');
    } else if (tab === 'completed') {
        document.getElementById('completed-orders').classList.remove('hidden');
    }
    
   
    const tabs = document.querySelectorAll('#orders-section button');
    tabs.forEach(button => {
        if (button.getAttribute('onclick').includes(tab)) {
            button.classList.remove('bg-gray-200', 'text-gray-700');
            button.classList.add('bg-indigo-600', 'text-white');
        } else {
            button.classList.remove('bg-indigo-600', 'text-white');
            button.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
}


function initializePaymentVerification() {
    log('Initializing payment verification listener');
    const paymentRequestsRef = database.ref('payment_requests');
  
    paymentRequestsRef.off();
    
    paymentRequestsRef.on('child_added', async (snapshot) => {
        const paymentRequest = {
            id: snapshot.key,
            ...snapshot.val()
        };
        
        log('Payment request received', 'info', { paymentRequest });
        
        if (paymentRequest.status === 'pending_verification') {
            try {
              
                const orderSnapshot = await database.ref(`orders/${paymentRequest.orderId}`).once('value');
                const order = orderSnapshot.val();
                
                log('Order details', 'info', { order });
                
                if (!order) {
                    log('Order not found', 'error', { orderId: paymentRequest.orderId });
                    return;
                }
                
                if (order.sellerId === currentUser.uid) {
                    log('Showing verification modal for seller', 'info', { 
                        sellerId: currentUser.uid,
                        orderSellerId: order.sellerId
                    });
                    showPaymentVerificationModal(paymentRequest);
                } else {
                    log('Order belongs to different seller', 'info', {
                        currentSellerId: currentUser.uid,
                        orderSellerId: order.sellerId
                    });
                }
            } catch (error) {
                log('Error processing payment request', 'error', { error: error.message });
            }
        }
    });
    
    paymentRequestsRef.on('child_changed', async (snapshot) => {
        const paymentRequest = {
            id: snapshot.key,
            ...snapshot.val()
        };
        
        try {
          
            const orderSnapshot = await database.ref(`orders/${paymentRequest.orderId}`).once('value');
            const order = orderSnapshot.val();
            
            if (order && order.sellerId === currentUser.uid) {
                log('Payment request updated', 'info', { paymentRequest });
                updatePaymentVerificationStatus(paymentRequest);
            }
        } catch (error) {
            log('Error processing payment request update', 'error', { error: error.message });
        }
    });
}

async function showPaymentVerificationModal(paymentRequest) {
    log('Showing payment verification modal', 'info', { paymentRequest });
    
    try {

        const orderSnapshot = await database.ref(`orders/${paymentRequest.orderId}`).once('value');
        const order = orderSnapshot.val();
        
        if (!order) {
            log('Order not found', 'error', { orderId: paymentRequest.orderId });
            return;
        }
        
     
        document.getElementById('verify-order-id').textContent = paymentRequest.orderId;
        document.getElementById('verify-amount').textContent = `₹${paymentRequest.amount}`;
        document.getElementById('verify-customer').textContent = paymentRequest.userName || 'Unknown';
        
      
        document.querySelectorAll('input[name="verification-status"]').forEach(radio => {
            radio.checked = false;
        });
        
      
        const modal = document.getElementById('verify-payment-modal');
        if (!modal) {
            log('Verification modal element not found', 'error');
            return;
        }
        
        modal.classList.remove('hidden');
        
        modal.dataset.paymentRequestId = paymentRequest.id;
        
        log('Payment verification modal shown successfully', 'info');
    } catch (error) {
        log('Error showing payment verification modal', 'error', { error: error.message });
    }
}

function updatePaymentVerificationStatus(paymentRequest) {
    const modal = document.getElementById('verify-payment-modal');
    if (!modal) {
        log('Verification modal element not found', 'error');
        return;
    }
    
    if (paymentRequest.status !== 'pending_verification') {
        modal.classList.add('hidden');
    }
}

async function submitPaymentVerification() {
    const modal = document.getElementById('verify-payment-modal');
    if (!modal) {
        log('Verification modal element not found', 'error');
        return;
    }
    
    const paymentRequestId = modal.dataset.paymentRequestId;
    const status = document.querySelector('input[name="verification-status"]:checked')?.value;
    
    if (!status) {
        alert('Please select a verification status');
        return;
    }
    
    try {
        const updates = {
            status: status === 'verified' ? 'verified' : 'rejected',
            verifiedAt: new Date().toISOString()
        };
        
        await database.ref(`payment_requests/${paymentRequestId}`).update(updates);
        
        if (status === 'verified') {
            const paymentRequest = (await database.ref(`payment_requests/${paymentRequestId}`).once('value')).val();
            await database.ref(`orders/${paymentRequest.orderId}`).update({
                status: 'preparing',
                paymentStatus: 'paid'
            });
        }
        
        modal.classList.add('hidden');
        showSuccessMessage('Payment verification submitted successfully');
    } catch (error) {
        log('Error submitting payment verification', 'error', { error: error.message });
        showErrorMessage('Failed to submit payment verification');
    }
}

function hideVerifyPaymentModal() {
    const modal = document.getElementById('verify-payment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initializePaymentVerification();
    initializeNotifications();
});


async function loadPaymentRequests() {
    log('Loading payment requests');
    showSpinner();
    try {
        const paymentRequestsRef = database.ref('payment_requests');
        const snapshot = await paymentRequestsRef
            .orderByChild('status')
            .equalTo('pending_verification')
            .once('value');
        
        const requests = [];
        snapshot.forEach(child => {
            const request = child.val();
        
            if (request.sellerId === currentUser.uid) {
                requests.push({ id: child.key, ...request });
            }
        });
        
        displayPaymentRequests(requests);
    } catch (error) {
        log('Error loading payment requests', 'error', { error: error.message });
        alert('Error loading payment requests. Please try again.');
    }
    hideSpinner();
}


function displayPaymentRequests(requests) {
    const container = document.getElementById('payment-requests-list');
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No pending payment requests</p>';
        return;
    }
    
    container.innerHTML = requests.map(request => `
        <div class="bg-white rounded-lg shadow p-4 mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-medium text-gray-900">Order #${request.orderId.slice(-6)}</h3>
                    <p class="text-gray-500">${new Date(request.timestamp).toLocaleString()}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Pending Verification
                </span>
            </div>
            <div class="mt-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-600">Amount:</span>
                    <span class="font-medium">₹${request.amount.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Customer:</span>
                    <span class="font-medium">${request.userName}</span>
                </div>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button onclick="verifyPayment('${request.orderId}', false)" 
                        class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Reject
                </button>
                <button onclick="verifyPayment('${request.orderId}', true)" 
                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    Verify Payment
                </button>
            </div>
        </div>
    `).join('');
}

function showReplyModal(reviewId) {
    log('Showing reply modal', 'info', { reviewId });
    const modal = document.getElementById('reply-modal');
    if (!modal) {
        log('Reply modal not found', 'error');
        return;
    }
    
   
    modal.dataset.reviewId = reviewId;
    
    const reviewRef = database.ref(`reviews/${currentUser.uid}/${reviewId}`);
    reviewRef.once('value').then((snapshot) => {
        const review = snapshot.val();
        if (review && review.reply) {
            document.getElementById('reply-text').value = review.reply;
        } else {
            document.getElementById('reply-text').value = '';
        }
    });
    
    modal.classList.remove('hidden');
}

function hideReplyModal() {
    log('Hiding reply modal');
    const modal = document.getElementById('reply-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('reply-text').value = '';
    }
}

async function submitReply(event) {
    event.preventDefault();
    log('Submitting reply');
    showSpinner();

    const modal = document.getElementById('reply-modal');
    if (!modal) {
        log('Reply modal not found', 'error');
        return;
    }

    const reviewId = modal.dataset.reviewId;
    if (!reviewId) {
        log('No review ID found', 'error');
        return;
    }

    const replyText = document.getElementById('reply-text').value.trim();
    if (!replyText) {
        alert('Please enter a reply');
        hideSpinner();
        return;
    }

    try {
        const reviewRef = database.ref(`reviews/${currentUser.uid}/${reviewId}`);
        
        await reviewRef.transaction((currentReview) => {
            if (currentReview) {
             
                return {
                    ...currentReview,
                    reply: replyText,
                    repliedAt: new Date().toISOString()
                };
            }
            return currentReview;
        });
        
        log('Reply submitted successfully', 'success');
        hideReplyModal();
        await loadReviews();
    } catch (error) {
        log('Error submitting reply', 'error', { error: error.message });
        alert('Error submitting reply. Please try again.');
    } finally {
        hideSpinner();
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const replyForm = document.getElementById('reply-form');
    if (replyForm) {
        replyForm.addEventListener('submit', submitReply);
    }
});

function renderChatModal() {
    log('Rendering chat modal', 'info');
    const chatModal = document.getElementById('chat-modal');
    if (!chatModal) {
        log('Chat modal element not found', 'error');
        return;
    }
    chatModal.classList.add('hidden');
    
    chatModal.innerHTML = `
        <div class="relative top-0 mx-auto p-0 w-full max-w-md">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[500px]">
                <div class="flex justify-between items-center px-4 py-3 border-b">
                    <h3 class="text-lg font-semibold text-gray-900">Order Chat</h3>
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
            playNotificationSound();
            showNotification('New Message', message.text);
        }
        
      
        if (message.senderId !== currentUser.uid) {
            markMessageAsSeen(orderId);
        }
    });
  
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) {
            log('Empty message, not sending', 'info');
            return;
        }
        
        try {
            log('Sending message', 'info', { text });
            const message = {
                text,
                senderId: currentUser.uid,
                senderName: sellerProfile?.name || 'Restaurant',
                timestamp: new Date().toISOString()
            };
            
            await chatRef.push(message);
            log('Message sent successfully', 'success');
            
            chatInput.value = '';
            chatInput.focus();
        } catch (error) {
            log('Error sending message', 'error', { error: error.message });
            alert('Failed to send message. Please try again.');
        }
    }

    sendButton.onclick = sendMessage;
    chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };
    

    setTimeout(() => chatInput.focus(), 200);
    
    
    function closeModal(e) {
        if (e.type === 'keydown' && e.key === 'Escape') {
            log('Closing chat modal (Escape key)', 'info');
            chatModal.classList.add('hidden');
        } else if (e.type === 'mousedown' && e.target === chatModal) {
            log('Closing chat modal (click outside)', 'info');
            chatModal.classList.add('hidden');
        }
    }
    
    document.addEventListener('keydown', closeModal);
    chatModal.addEventListener('mousedown', closeModal);

    chatModal.querySelector('.close-chat').onclick = function() {
        log('Closing chat modal (close button)', 'info');
        chatModal.classList.add('hidden');
        document.removeEventListener('keydown', closeModal);
        chatModal.removeEventListener('mousedown', closeModal);
    };
    
    log('Chat initialized successfully', 'success');
}


document.querySelector('#chat-modal .close').onclick = function() {
    document.getElementById('chat-modal').style.display = 'none';
};