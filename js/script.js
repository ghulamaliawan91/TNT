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
// Yahan apni Google Apps Script ki Web App URL paste karein
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-7FP9Tt8QeKlHa2-kV2GL7Sg5OGWIUfS6NnPraHbECgxETGdCwLbL0H3UwiL_4mOEhQ/exec"; 

// --- STATE ---
let currentUser = localStorage.getItem('app_user') || null;
let globalData = []; // Saara data yahan store hoga taake search aasani se ho
let myChart = null;  // Chart ka instance

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('item-date').valueAsDate = new Date();

    if (currentUser) {
        showApp();
    } else {
        showAuth();
    }
});


// --- AUTH (Same as before) ----
function toggleAuthMode() {
    const isLogin = document.getElementById('auth-btn').textContent === "Login";
    document.getElementById('auth-title').textContent = isLogin ? "Create Account" : "Welcome Back";
    document.getElementById('auth-btn').textContent = isLogin ? "Sign Up" : "Login";
    document.getElementById('switch-text').textContent = isLogin ? "Already have an account? " : "Don't have an account? ";
    document.getElementById('switch-link').textContent = isLogin ? "Login" : "Sign Up";
}

function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    if (username) {
        currentUser = username;
        localStorage.setItem('app_user', currentUser);
        showApp();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('app_user');
    showAuth();
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

function showAuth() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-display').textContent = currentUser;
    loadData();
}

// --- DATA FUNCTIONS ---

async function addItem() {
    const name = document.getElementById('item-name').value;
    const category = document.getElementById('item-category').value;
    const price = document.getElementById('item-price').value;
    const date = document.getElementById('item-date').value;

    if (!name || !price || !date) return alert("Please fill all fields");

    const payload = {
        username: currentUser,
        itemName: name,
        category: category, // Naya field
        price: parseFloat(price),
        date: date
    };

    const btn = document.querySelector('.btn-success');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        alert("Saved!");
        document.getElementById('item-name').value = '';
        document.getElementById('item-price').value = '';
        loadData();
    } catch (error) {
        console.error(error);
        alert("Error saving");
    } finally {
        btn.innerHTML = originalText;
    }
}

async function loadData() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        
        // Filter for current user
        globalData = data.filter(item => item.username === currentUser);
        // Sort by date
        globalData.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderList(globalData); // Pehli baar saara data dikhayein
        updateChart(globalData);  // Chart update karein

    } catch (error) {
        console.error(error);
        list.innerHTML = '<div class="empty-state">Error loading data.</div>';
    }
}

// --- SEARCH FUNCTION ---
function filterData() {
    const query = document.getElementById('search-input').value.toLowerCase();
    
    // Global data se filter karein
    const filtered = globalData.filter(item => 
        item.itemName.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );
    
    renderList(filtered);
}

// --- RENDER LIST ---
function renderList(dataToRender) {
    const list = document.getElementById('history-list');
    if (dataToRender.length === 0) {
        list.innerHTML = '<div class="empty-state">No items found.</div>';
        return;
    }

    let html = '';
    dataToRender.forEach(item => {
        html += `
            <div class="item-row">
                <div>
                    <span class="item-name">${item.itemName}</span>
                    <span class="cat-badge">${item.category || 'General'}</span>
                    <div class="item-date">${new Date(item.date).toDateString()}</div>
                </div>
                <div class="item-price">BD${item.price}</div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// --- CHART ANALYTICS ---
function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Category wise total calculate karein
    const categoryTotals = {};
    data.forEach(item => {
        const cat = item.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(item.price);
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    // Agar pehle se chart hai to destroy karein taake overlap na ho
    if (myChart) {
        myChart.destroy();
    }

    // Naya Chart banayein
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// --- EXPORT TO CSV ---
function downloadCSV() {
    if(globalData.length === 0) return alert("No data to export!");

    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,Date,Item,Category,Price\n";

    // CSV Rows
    globalData.forEach(row => {
        csvContent += `${row.date},"${row.itemName}","${row.category}",${row.price}\n`;
    });

    // Download trigger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "my_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// --- PASSWORD RESET FUNCTIONS ---

// 1. Reset View ko dikhane ke liye
function showResetPassword() {
    document.getElementById('auth-container').classList.add('hidden'); // Login form chupa do
    document.getElementById('reset-view').classList.remove('hidden');  // Reset form dikhao
}

// 2. Wapas Login par jane ke liye
function showLogin() {
    document.getElementById('reset-view').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    // Reset form ko saaf karein
    document.getElementById('reset-email').value = '';
}

// 3. Email bhejne ka function (Firebase Magic)
function sendResetEmail() {
    const email = document.getElementById('reset-email').value;

    if (!email) {
        alert("Please apna email likhein.");
        return;
    }

    // Firebase ka built-in function use kar rahe hain
    auth.sendPasswordResetEmail(email)
        .then(() => {
            // Success
            alert("Password reset link aapke email inbox mein bhej diya gaya hai. Kindly check karein.");
            showLogin(); // Wapas login screen par le jao
        })
        .catch((error) => {
            // Error
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === 'auth/user-not-found') {
                alert("Yeh email system mein registered nahi hai.");
            } else {
                alert("Error: " + errorMessage);
            }
        });
}