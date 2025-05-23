let currentRole='';
let isSignUp=false;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

firebase.initializeApp(firebaseConfig);
const auth=firebase.auth();
const database=firebase.database();

const loginForm=document.getElementById('login-form');
const signupForm=document.getElementById('signup-form');
const toggleAuth=document.getElementById('toggle-auth');
const toggleText=document.getElementById('toggle-text');
const loadingSpinner=document.getElementById('loading-spinner');
const errorModal=document.getElementById('error-modal');
const errorMessage=document.getElementById('error-message');
const forgotPasswordLink=document.querySelector('a[href="#"]');

function log(message,type='info',data=null) {
    const timestamp=new Date().toISOString();
    const logMessage=`[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    if(data){
        console.log(logMessage,data);
    }else{
        console.log(logMessage);
    }

    const logs=JSON.parse(localStorage.getItem('auth_logs')||'[]');
    logs.push({
        timestamp,
        type,
        message,
        data:data?JSON.stringify(data):null
    });
    localStorage.setItem('auth_logs',JSON.stringify(logs.slice(-100))); 
}

function showAuthForm(role) {
    log(`Showing auth form for role:${role}`);
    currentRole=role;
    
  
    document.getElementById('role-selection').classList.add('hidden');
    
 
    document.getElementById('auth-forms').classList.remove('hidden');
    
 
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    

    document.getElementById('toggle-text').textContent = "Don't have an account?";
    document.getElementById('toggle-auth').textContent = "Sign up";
  
    isSignUp=false;
}

function toggleAuthMode() {
    isSignUp=!isSignUp;
    log(`Toggled auth mode to: ${isSignUp ?'Sign Up':'Sign In'}`);
    
    const toggleText=document.getElementById('toggleAuthText');
    const buttonText=document.getElementById('authButtonText');
    
    if(isSignUp){
        toggleText.textContent='Already have an account? Sign in';
        buttonText.textContent='Sign up';
    } else {
        toggleText.textContent='Need an account? Sign up';
        buttonText.textContent='Sign in';
    }
}

function showError(message){
    log(`Showing error: ${message}`,'error');
    
    let errorDiv=document.getElementById('error-message');
    if(!errorDiv){
        log('Creating new error message element');
        errorDiv=document.createElement('div');
        errorDiv.id='error-message';
        errorDiv.className='mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded';
        document.querySelector('#authForms').insertBefore(errorDiv, document.querySelector('#authForms button'));
    }
    errorDiv.textContent=message;
    errorDiv.classList.remove('hidden');
}

function clearError(){
    log('Clearing error message');
    const errorDiv=document.getElementById('error-message');
    if (errorDiv){
        errorDiv.classList.add('hidden');
    }
}

async function handleAuth() {
    log('Starting authentication process','info',{ isSignUp,currentRole });
    clearError();
    
    const email=document.getElementById('email').value;
    const password=document.getElementById('password').value;

    if (!email||!password) {
        log('Empty fields detected','error',{ email:!!email,password:!!password });
        showError('Please fill in all fields');
        return;
    }

    try {
        if(isSignUp){
            log('Attempting to create new account', 'info',{email,role:currentRole});
            
    
            const userCredential=await auth.createUserWithEmailAndPassword(email, password);
            const user=userCredential.user;
            log('User account created successfully', 'success',{uid:user.uid });
            
           
            const userData={
                email:email,
                role:currentRole,
                createdAt: new Date().toISOString()
            };
            log('Storing user data in database','info',userData);
            
            await database.ref(`${currentRole}s/${user.uid}`).set(userData);
            log('User data stored successfully', 'success');

            const redirectUrl=currentRole==='user'?'/user-dashboard.html':'/seller-dashboard.html';
            log('Redirecting user', 'info', { redirectUrl });
            window.location.href = redirectUrl;
        } else {
            log('Attempting to sign in', 'info', { email, role: currentRole });
            
        
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            log('User signed in successfully', 'success', { uid: user.uid });
            
         
            log('Checking user role in database', 'info', { uid: user.uid, expectedRole: currentRole });
            const snapshot = await database.ref(`${currentRole}s/${user.uid}`).once('value');
            
            if (snapshot.exists()) {
                log('User role verified', 'success', { role: currentRole });
                const redirectUrl = currentRole === 'user' ? '/user-dashboard.html' : '/seller-dashboard.html';
                log('Redirecting user', 'info', { redirectUrl });
                window.location.href = redirectUrl;
            } else {
                log('User role mismatch detected', 'error', { uid: user.uid, attemptedRole: currentRole });
                
            
                const otherRole = currentRole === 'user' ? 'seller' : 'user';
                log('Checking alternative role', 'info', { otherRole });
                
                const otherSnapshot = await database.ref(`${otherRole}s/${user.uid}`).once('value');
                
                if (otherSnapshot.exists()) {
                    log('User found in alternative role', 'info', { actualRole: otherRole });
                    showError(`This account is registered as a ${otherRole}. Please select the correct role.`);
                    await auth.signOut();
                    log('User signed out due to role mismatch');
                } else {
                    log('User not found in any role', 'error', { uid: user.uid });
                    showError('Account not found. Please sign up first.');
                    await auth.signOut();
                    log('User signed out due to no role found');
                }
            }
        }
    } catch (error) {
        log('Authentication error occurred', 'error', { 
            code: error.code, 
            message: error.message,
            stack: error.stack 
        });
        
        let errorMessage = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please sign in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters long.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
        }
        
        showError(errorMessage);
    }
}
function showSpinner() {
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('flex');
}

function hideSpinner() {
    loadingSpinner.classList.add('hidden');
    loadingSpinner.classList.remove('flex');
}

function showErrorModal(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
    errorModal.classList.add('flex');
}

function hideErrorModal() {
    errorModal.classList.add('hidden');
    errorModal.classList.remove('flex');
}

function showSuccessModal(message) {
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-message');
    successMessage.textContent = message;
    successModal.classList.remove('hidden');
    successModal.classList.add('flex');
}

function hideSuccessModal() {
    const successModal = document.getElementById('success-modal');
    successModal.classList.add('hidden');
    successModal.classList.remove('flex');
}

toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    const isLoginForm = loginForm.classList.contains('hidden');
    
    if (isLoginForm) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        toggleText.textContent = "Don't have an account?";
        toggleAuth.textContent = "Sign up";
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        toggleText.textContent = "Already have an account?";
        toggleAuth.textContent = "Sign in";
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showSpinner();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    try {
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        const snapshot = await database.ref(`${currentRole}s/${userCredential.user.uid}`).once('value');
        
        if (snapshot.exists()) {
            const redirectUrl = currentRole === 'user' ? '/user-dashboard.html' : '/seller-dashboard.html';
            window.location.href = redirectUrl;
        } else {
            const otherRole = currentRole === 'user' ? 'seller' : 'user';
            const otherSnapshot = await database.ref(`${otherRole}s/${userCredential.user.uid}`).once('value');
            
            if (otherSnapshot.exists()) {
                showErrorModal(`This account is registered as a ${otherRole}. Please select the correct role.`);
                await auth.signOut();
            } else {
                showErrorModal('Account not found. Please sign up first.');
                await auth.signOut();
            }
        }
    } catch (error) {
        let errorMessage = 'An error occurred during sign in.';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
        }
        showErrorModal(errorMessage);
    } finally {
        hideSpinner();
    }
});

signupForm.addEventListener('submit', signup);

async function signup(event) {
    event.preventDefault();
    showSpinner();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const termsAccepted = document.getElementById('terms-checkbox').checked;

    if (!name || !email || !password || !confirmPassword) {
        showErrorModal('Please fill in all fields');
        hideSpinner();
        return;
    }

    if (password !== confirmPassword) {
        showErrorModal('Passwords do not match');
        hideSpinner();
        return;
    }

    if (!termsAccepted) {
        showErrorModal('Please accept the Terms of Service and Privacy Policy');
        hideSpinner();
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await database.ref(`${currentRole}s/${user.uid}`).set({
            name: name,
            email: email,
            role: currentRole,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        log('Signup successful', 'success');
        const redirectUrl = currentRole === 'user' ? '/user-dashboard.html' : '/seller-dashboard.html';
        window.location.href = redirectUrl;
    } catch (error) {
        log('Error during signup', 'error', { error: error.message });
        let errorMessage = 'An error occurred during sign up.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please sign in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters long.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
        }
        showErrorModal(errorMessage);
    } finally {
        hideSpinner();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    
    if (!email) {
        showErrorModal("Please enter your email address");
        return;
    }

    showSpinner();
    try {
        await auth.sendPasswordResetEmail(email, {
            url: window.location.origin + '/index.html',
            handleCodeInApp: true
        });
        hideErrorModal();
        showSuccessModal("Password reset email sent! Please check your inbox and follow the instructions to reset your password.");
    } catch (error) {
        let errorMessage = 'An error occurred while sending the password reset email.';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many attempts. Please try again later.';
                break;
        }
        showErrorModal(errorMessage);
    } finally {
        hideSpinner();
    }
}

document.getElementById('forgot-password').addEventListener('click', handleForgotPassword);


auth.onAuthStateChanged((user) => {
    log('Auth state changed', 'info', { 
        isSignedIn: !!user,
        uid: user?.uid,
        currentRole 
    });
    
    if (user) {
        log('Checking user role for redirect', 'info', { uid: user.uid, currentRole });
        database.ref(`${currentRole}s/${user.uid}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const redirectUrl = currentRole === 'user' ? '/user-dashboard.html' : '/seller-dashboard.html';
                    log('Redirecting authenticated user', 'info', { redirectUrl });
                    window.location.href = redirectUrl;
                } else {
                    log('No matching role found for authenticated user', 'warning', { uid: user.uid, currentRole });
                }
            })
            .catch(error => {
                log('Error checking user role', 'error', { 
                    error: error.message,
                    uid: user.uid,
                    currentRole 
                });
            });
    }
}); 