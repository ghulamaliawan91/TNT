const firebaseConfig = {
  apiKey: "AIzaSyCgmfHwjKiz_I5SsXy3hmxjZiBfJifKvYY",
  authDomain: "tnng-6ac48.firebaseapp.com",
  projectId: "tnng-6ac48",
  storageBucket: "tnng-6ac48.firebasestorage.app",
  messagingSenderId: "745274397704",
  appId: "1:745274397704:web:1173c7935fd1ebec5aedbd",
  measurementId: "G-CMR5CW8F71"
};
// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-7FP9Tt8QeKlHa2-kV2GL7Sg5OGWIUfS6NnPraHbECgxETGdCwLbL0H3UwiL_4mOEhQ/exec"; 
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// --- INIT ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let currentUser = null;
let globalData = [];
let myChart = null;
let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('item-date').valueAsDate = new Date();
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user.email;
            showApp();
        } else {
            currentUser = null;
            showAuthScreen(); // Default to auth screen
        }
    });
});

// --- SCREEN NAVIGATION ---
function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('reset-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

function showResetScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('reset-screen').classList.remove('hidden');
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('reset-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-display').textContent = currentUser.split('@')[0]; // Show only name part
    loadData();
}

// --- AUTH LOGIC ---
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').textContent = isLoginMode ? "Welcome Back" : "Create Account";
    document.getElementById('auth-subtitle').textContent = isLoginMode ? "Login to track your expenses" : "Sign up to get started";
    document.getElementById('auth-btn').textContent = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('switch-text').textContent = isLoginMode ? "Don't have an account? " : "Already have an account? ";
    document.getElementById('switch-link').textContent = isLoginMode ? "Sign Up" : "Login";
}

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (isLoginMode) {
        auth.signInWithEmailAndPassword(email, password).catch(error => alert(error.message));
    } else {
        auth.createUserWithEmailAndPassword(email, password).catch(error => alert(error.message));
    }
}

function logout() {
    auth.signOut();
}

// --- RESET PASSWORD ---
function sendResetEmail() {
    const email = document.getElementById('reset-email').value;
    if(!email) return alert("Please enter email");
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("Reset link sent to your email!");
            showAuthScreen();
        })
        .catch(error => alert(error.message));
}

// --- DATA LOGIC ---
async function addItem() {
    const name = document.getElementById('item-name').value;
    const category = document.getElementById('item-category').value;
    const price = document.getElementById('item-price').value;
    const date = document.getElementById('item-date').value;

    if (!name || !price || !date) return alert("Fill all fields");

    const payload = { username: currentUser, itemName: name, category: category, price: parseFloat(price), date: date };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        alert("Saved!");
        document.getElementById('item-name').value = '';
        document.getElementById('item-price').value = '';
        loadData();
    } catch (e) { alert("Error saving"); }
}

async function loadData() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        globalData = data.filter(item => item.username === currentUser).sort((a, b) => new Date(b.date) - new Date(a.date));
        renderList(globalData);
        updateChart(globalData);
    } catch (e) { console.error(e); }
}

function filterData() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = globalData.filter(i => i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    renderList(filtered);
}

function renderList(data) {
    const list = document.getElementById('history-list');
    if(data.length === 0) { list.innerHTML = '<div class="empty-state">No items found.</div>'; return; }
    
    let html = '';
    data.forEach(item => {
        html += `
            <div class="item-row">
                <div>
                    <span style="font-weight:500">${item.itemName}</span>
                    <span class="cat-badge">${item.category}</span>
                </div>
                <div style="font-weight:700; color:var(--success)">$${item.price}</div>
            </div>`;
    });
    list.innerHTML = html;
}

function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const totals = {};
    data.forEach(i => totals[i.category] = (totals[i.category] || 0) + parseFloat(i.price));
    
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(totals),
            datasets: [{ data: Object.values(totals), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
}

function downloadCSV() {
    if(globalData.length === 0) return alert("No data");
    let csv = "Date,Item,Category,Price\n";
    globalData.forEach(r => csv += `${r.date},"${r.itemName}","${r.category}",${r.price}\n`);
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = "expenses.csv";
    link.click();
}