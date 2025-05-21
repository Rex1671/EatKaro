
let currentUser = null;
let userProfile = null;
let cartItems = [];
let appliedCoupon = null;
let sellers = {};


function log(message,type='info',data=null) {
    const timestamp=new Date().toISOString();
    const logMessage=`[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    if(data){
        console.log(logMessage, data);
    }else{
        console.log(logMessage);
    }
}


auth.onAuthStateChanged(async(user)=>{
    if(user){
        log('User authenticated','info',{ uid: user.uid });
        currentUser=user;
        await loadUserProfile();
        await loadCheckoutItems();
    }else{
        log('User not authenticated, redirecting to login', 'warning');
        window.location.href = '/index.html';
    }
});

async function loadUserProfile() {
    log('Loading user profile');
    showSpinner();
    try {
        const snapshot=await database.ref(`users/${currentUser.uid}`).once('value');
        userProfile=snapshot.val();
        
        if (userProfile) {
            log('Profile loaded successfully', 'success');
            updateProfileUI();
        }else{
            log('No profile found','warning');
            window.location.href = '/user-dashboard.html';
        }
    } catch(error){
        log('Error loading profile', 'error', { error: error.message });
        alert('Error loading profile. Please try again.');
    }
    hideSpinner();
}

function updateProfileUI() {
    if (userProfile){
        document.getElementById('user-name').textContent = userProfile.fullName || 'User';
        document.getElementById('full-name').value = userProfile.fullName || '';
        document.getElementById('phone').value = userProfile.phone || '';
        document.getElementById('address').value = userProfile.address || '';
    }
}


async function loadCheckoutItems() {
    log('Loading checkout items');
    showSpinner();
    try {
        const isSingleItemCheckout = sessionStorage.getItem('isSingleItemCheckout') === 'true';
        
        if (isSingleItemCheckout) {
          
            const tempCart = JSON.parse(sessionStorage.getItem('tempCart') || '{}');
            cartItems = Object.entries(tempCart).map(([id, item]) => ({
                id,
                ...item
            }));
           
            const storedCoupon = sessionStorage.getItem('appliedCoupon');
            if (storedCoupon) {
                appliedCoupon = JSON.parse(storedCoupon);
            }
        } else {
          
            const snapshot = await database.ref(`users/${currentUser.uid}/cart`).once('value');
            const cart = snapshot.val() || {};
         
            cartItems = [];
            for (const [itemId, item] of Object.entries(cart)) {
                const itemSnapshot = await database.ref(`items/${itemId}`).once('value');
                const itemDetails = itemSnapshot.val();
                if (itemDetails) {
                    cartItems.push({
                        id: itemId,
                        ...itemDetails,
                        quantity: item.quantity
                    });
                }
            }
        }

        if (cartItems.length === 0) {
            throw new Error('No items to checkout');
        }

        await loadSellerInformation();

        displayCheckoutItems();
    } catch (error) {
        log('Error loading checkout items', 'error', { error: error.message });
        alert('Error loading checkout items. Please try again.');
    }
    hideSpinner();
}

async function loadSellerInformation() {
    log('Loading seller information');
    const sellerIds = new Set(cartItems.map(item => item.sellerId));
    
    for (const sellerId of sellerIds) {
        try {
            const snapshot = await database.ref(`sellers/${sellerId}`).once('value');
            const seller = snapshot.val();
            if (seller) {
                sellers[sellerId] = seller;
            } else {
                log('Seller not found', 'warning', { sellerId });
            }
        } catch (error) {
            log('Error loading seller information', 'error', { error: error.message, sellerId });
        }
    }
}

function displayCheckoutItems() {
    log('Displaying checkout items', 'info', { itemCount: cartItems.length });
    const container = document.getElementById('sellers-container');
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No items to checkout</p>';
        return;
    }

   
    const itemsBySeller = {};
    cartItems.forEach(item => {
        if (!itemsBySeller[item.sellerId]) {
            itemsBySeller[item.sellerId] = [];
        }
        itemsBySeller[item.sellerId].push(item);
    });

   
    container.innerHTML = Object.entries(itemsBySeller).map(([sellerId, items]) => {
        const seller = sellers[sellerId];
        let sellerSubtotal = 0;
        const sellerItems = items.map(item => {
            const itemTotal = item.price * item.quantity;
            sellerSubtotal += itemTotal;
            return `
                <div class="flex items-center space-x-4">
                    <img src="${item.thumbnail}" alt="${item.name}" class="w-20 h-20 object-cover rounded-lg">
                    <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900">${item.name}</h3>
                        <p class="text-sm text-gray-500">${item.foodType === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</p>
                        <div class="mt-1 flex justify-between items-center">
                            <span class="text-gray-600">Quantity: ${item.quantity}</span>
                            <span class="text-gray-900">₹${itemTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="seller-section">
                <div class="seller-header">
                    <img src="${seller.photoURL || 'images/default-seller.png'}" alt="${seller.name}" class="seller-avatar">
                    <div class="seller-info">
                        <h3 class="seller-name">${seller.name}</h3>
                        <div class="seller-rating">
                            ${seller.rating ? `⭐ ${seller.rating.toFixed(1)}` : 'New Seller'}
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    ${sellerItems}
                </div>
                <div class="mt-6 border-t pt-4 space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Subtotal:</span>
                        <span class="text-gray-900">₹${sellerSubtotal.toFixed(2)}</span>
                    </div>
                    ${appliedCoupon ? `
                        <div class="flex justify-between text-green-600">
                            <span>Coupon Discount:</span>
                            <span>-₹${appliedCoupon.discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between font-medium">
                        <span class="text-gray-900">Total:</span>
                        <span class="text-indigo-600">₹${(sellerSubtotal - (appliedCoupon ? appliedCoupon.discount : 0)).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function placeOrder() {
    log('Starting order placement');
    showSpinner();
    
    try {
     
        const form = document.getElementById('delivery-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

   
        const deliveryDetails = {
            fullName: document.getElementById('full-name').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            instructions: document.getElementById('instructions').value
        };

      
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

     
        const itemsBySeller = {};
        cartItems.forEach(item => {
            if (!itemsBySeller[item.sellerId]) {
                itemsBySeller[item.sellerId] = [];
            }
            itemsBySeller[item.sellerId].push(item);
        });


        const orderPromises = Object.entries(itemsBySeller).map(async ([sellerId, items]) => {
            let subtotal = 0;
            const orderItems = items.map(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                return {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    foodType: item.foodType,
                    thumbnail: item.thumbnail
                };
            });

            const totalOrderValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const sellerDiscount = appliedCoupon ? (subtotal / totalOrderValue) * appliedCoupon.discount : 0;

        
            const orderData = {
                userId: currentUser.uid,
                sellerId: sellerId,
                userName: deliveryDetails.fullName,
                userPhone: deliveryDetails.phone,
                deliveryAddress: deliveryDetails.address,
                deliveryInstructions: deliveryDetails.instructions,
                items: orderItems,
                subtotal: subtotal,
                discount: sellerDiscount,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                total: subtotal - sellerDiscount,
                paymentMethod: paymentMethod,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

    
            return database.ref('orders').push(orderData);
        });

   
        const orderRefs = await Promise.all(orderPromises);
        log('Orders placed successfully', 'success', { orderIds: orderRefs.map(ref => ref.key) });
 // Clear cart if not single item checkout
        if (sessionStorage.getItem('isSingleItemCheckout') !== 'true') {
            await database.ref(`users/${currentUser.uid}/cart`).remove();
        }

 
        sessionStorage.removeItem('tempCart');
        sessionStorage.removeItem('isSingleItemCheckout');
        sessionStorage.removeItem('appliedCoupon');

      
        alert('Orders placed successfully! You can track your orders in the Orders section.');
        
       
        window.location.href = '/user-dashboard.html';

    } catch (error) {
        log('Error placing order', 'error', { error: error.message });
        alert('Error placing order. Please try again.');
    }
    
    hideSpinner();
}


function showSpinner() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideSpinner() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

async function handleSignOut() {
    log('Signing out user');
    try {
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        log('Error signing out', 'error', { error: error.message });
        alert('Error signing out. Please try again.');
    }
} 