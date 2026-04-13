// Global state
let currentUser = null;
let books = [];
let news = [];
let articles = [];
let deleteTarget = null;
let favorites = [];

// Helper function to format date safely
function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ar');
    } catch {
        return '';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadFavorites();
    checkAuth();
});

// Theme functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'brown') {
        document.body.classList.add('light-theme');
        updateThemeIcon();
    } else if (savedTheme === 'white') {
        document.body.classList.add('white-theme');
        updateThemeIcon();
    }
}

function toggleTheme() {
    const body = document.body;
    if (!body.classList.contains('light-theme') && !body.classList.contains('white-theme')) {
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'brown');
    } else if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('white-theme');
        localStorage.setItem('theme', 'white');
    } else {
        body.classList.remove('white-theme');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        const body = document.body;
        if (body.classList.contains('white-theme')) {
            icon.textContent = '☀️';
        } else if (body.classList.contains('light-theme')) {
            icon.textContent = '🟤';
        } else {
            icon.textContent = '🌙';
        }
    }
}

// Favorites functions
function loadFavorites() {
    const saved = localStorage.getItem('favorites');
    if (saved) {
        favorites = JSON.parse(saved);
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function toggleFavorite(bookId, event) {
    event.stopPropagation();
    if (favorites.includes(bookId)) {
        favorites = favorites.filter(id => id !== bookId);
        showToast('تمت إزالة من المفضلة', 'success');
    } else {
        favorites.push(bookId);
        showToast('تمت الإضافة للمفضلة', 'success');
    }
    saveFavorites();
    renderBooks(books);
    renderFavorites();
}

function isFavorite(bookId) {
    return favorites.includes(bookId);
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    const isAdmin = isAdminUser();
    const favoriteBooks = books.filter(b => favorites.includes(b.id));

    if (favoriteBooks.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>❤️</span>
                <p>لا توجد كتب في المفضلة</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = favoriteBooks.map(book => `
        <div class="book-card" onclick="viewBook('${book.id}')">
            <div class="book-cover">
                ${book.coverUrl ? 
                    `<img src="${getOptimizedUrl(book.coverUrl)}" alt="${book.title}" loading="lazy">` : 
                    '📖'}
                <button class="favorite-btn ${isFavorite(book.id) ? 'active' : ''}" 
                    onclick="toggleFavorite('${book.id}', event)">
                    ${isFavorite(book.id) ? '❤️' : '🤍'}
                </button>
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <span class="category">${book.category}</span>
                ${isAdmin ? `
                    <div class="book-actions">
                        <button class="edit-btn" onclick="event.stopPropagation(); editBook('${book.id}')">✏️ تعديل</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteItem('book', '${book.id}')">🗑️ حذف</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Mobile menu
function toggleMobileMenu() {
    document.getElementById('mobile-nav').classList.toggle('active');
}

function closeMobileMenu() {
    document.getElementById('mobile-nav').classList.remove('active');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const nav = document.getElementById('mobile-nav');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (nav && nav.classList.contains('active')) {
        if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
            closeMobileMenu();
        }
    }
});

// Also close when clicking on a nav button
document.querySelectorAll('.dashboard-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', closeMobileMenu);
});

// Check authentication status
function checkAuth() {
    if (isAdminUser()) {
        showDashboard(true);
        return;
    }

    const userName = localStorage.getItem('userName');
    if (userName) {
        currentUser = { name: userName };
        showDashboard(false);
        return;
    }

    showAuth();
}

// Show auth section
function showAuth() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

// Show dashboard
function showDashboard(isAdmin) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    if (isAdmin) {
        document.body.classList.add('is-admin');
        document.getElementById('user-name').textContent = 'مدير النظام';
        loadAdmins(); // Load admins list
    } else if (currentUser) {
        document.body.classList.remove('is-admin');
        document.getElementById('user-name').textContent = currentUser.name;
    }

    loadBooks();
    loadNews();
    loadArticles();
    renderFavorites();
    showSection('books');
}

// Auth form switching
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('admin-form').classList.add('hidden');
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('admin-form').classList.add('hidden');
}

function showAdminLogin() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('admin-form').classList.remove('hidden');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const snapshot = await db.collection('users').where('username', '==', username).where('password', '==', password).get();

        if (snapshot.empty) {
            showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
            return;
        }

        const userData = snapshot.docs[0].data();
        localStorage.setItem('userName', userData.name);
        currentUser = { name: userData.name };

        showToast('تم تسجيل الدخول بنجاح', 'success');
        showDashboard(false);
    } catch (error) {
        showToast('خطأ في تسجيل الدخول: ' + error.message, 'error');
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const password = document.getElementById('signup-password').value;

    try {
        const snapshot = await db.collection('users').where('username', '==', name).get();
        
        if (!snapshot.empty) {
            showToast('اسم المستخدم موجود بالفعل', 'error');
            return;
        }

        await db.collection('users').add({
            name: name,
            username: name,
            password: password,
            createdAt: FieldValue.serverTimestamp()
        });

        localStorage.setItem('userName', name);
        currentUser = { name: name };

        showToast('تم إنشاء الحساب بنجاح', 'success');
        showDashboard(false);
    } catch (error) {
        showToast('خطأ في إنشاء الحساب: ' + error.message, 'error');
    }
}

// Handle admin login
async function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    try {
        // Check first in Firestore admins collection
        const snapshot = await db.collection('admins').where('username', '==', username).where('password', '==', password).get();
        
        if (!snapshot.empty) {
            const adminData = snapshot.docs[0].data();
            setAdminStatus('true', snapshot.docs[0].id, adminData.name || username);
            showToast('تم تسجيل دخول المدير بنجاح', 'success');
            showDashboard(true);
            return;
        }

        // Fallback to hardcoded admin
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            setAdminStatus('true', 'main-admin', 'anas');
            showToast('تم تسجيل دخول المدير بنجاح', 'success');
            showDashboard(true);
        } else {
            showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    } catch (error) {
        // Fallback to hardcoded if Firestore fails
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            setAdminStatus('true', 'main-admin', 'anas');
            showToast('تم تسجيل دخول المدير بنجاح', 'success');
            showDashboard(true);
        } else {
            showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    }
}

// Logout
function logout() {
    clearAuthData();
    currentUser = null;
    showToast('تم تسجيل الخروج بنجاح', 'success');
    showAuth();
}

// Section switching
function showSection(section) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(section + '-section').classList.remove('hidden');

    // Load stats when admin section is shown
    if (section === 'admin' && isAdminUser()) {
        loadStats();
    }

    // Load profile when profile section is shown
    if (section === 'profile') {
        loadProfile();
    }
}

// Load profile data
function loadProfile() {
    if (isAdminUser()) {
        const adminName = localStorage.getItem('adminName') || 'مدير النظام';
        document.getElementById('profile-name').textContent = adminName;
        return;
    }

    if (!currentUser) {
        showToast('سجل دخول أولاً', 'error');
        showSection('books');
        return;
    }

    document.getElementById('profile-name').textContent = currentUser.name;
}

// Show change password form
function showChangePassword() {
    document.getElementById('change-password-form').classList.add('show');
}

// Hide change password form
function hideChangePassword() {
    document.getElementById('change-password-form').classList.remove('show');
    document.getElementById('change-password-form').querySelector('form').reset();
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }

    try {
        // If admin
        if (isAdminUser()) {
            const adminId = getCurrentAdminId();
            if (adminId === 'main-admin') {
                showToast('لا يمكن تغيير كلمة مرور المدير الرئيسي', 'error');
                return;
            }
            const snapshot = await db.collection('admins').doc(adminId).get();
            if (snapshot.exists) {
                await db.collection('admins').doc(adminId).update({ password: newPassword });
                showToast('تم تغيير كلمة المرور بنجاح', 'success');
                hideChangePassword();
            }
            return;
        }

        // Regular user
        const snapshot = await db.collection('users')
            .where('username', '==', currentUser.name)
            .where('password', '==', currentPassword)
            .get();

        if (snapshot.empty) {
            showToast('كلمة المرور الحالية غير صحيحة', 'error');
            return;
        }

        // Update password
        await db.collection('users').doc(snapshot.docs[0].id).update({
            password: newPassword
        });

        showToast('تم تغيير كلمة المرور بنجاح', 'success');
        hideChangePassword();
    } catch (error) {
        showToast('خطأ في تغيير كلمة المرور', 'error');
    }
}

// Show edit name form
function showEditName() {
    document.getElementById('edit-name-form').classList.add('show');
}

// Hide edit name form
function hideEditName() {
    document.getElementById('edit-name-form').classList.remove('show');
    document.getElementById('edit-name-form').querySelector('form').reset();
}

// Change name
async function changeName(event) {
    event.preventDefault();
    
    const newName = document.getElementById('new-name').value;
    if (!newName.trim()) {
        showToast('الرجاء إدخال اسم صحيح', 'error');
        return;
    }

    try {
        // If admin
        if (isAdminUser()) {
            const adminId = getCurrentAdminId();
            if (adminId === 'main-admin') {
                showToast('لا يمكن تغيير اسم المدير الرئيسي', 'error');
                return;
            }
            await db.collection('admins').doc(adminId).update({ name: newName });
            localStorage.setItem('adminName', newName);
            document.getElementById('profile-name').textContent = newName;
            document.getElementById('user-name').textContent = newName;
            showToast('تم تغيير الاسم بنجاح', 'success');
            hideEditName();
            return;
        }

        // Regular user
        const snapshot = await db.collection('users')
            .where('username', '==', currentUser.name)
            .get();

        if (snapshot.empty) {
            showToast('المستخدم غير موجود', 'error');
            return;
        }

        // Update name and username
        await db.collection('users').doc(snapshot.docs[0].id).update({
            name: newName,
            username: newName
        });

        // Update local storage and current user
        currentUser.name = newName;
        localStorage.setItem('userName', newName);
        
        // Update displayed name
        document.getElementById('profile-name').textContent = newName;
        document.getElementById('user-name').textContent = newName;
        
        showToast('تم تغيير الاسم بنجاح', 'success');
        hideEditName();
    } catch (error) {
        showToast('خطأ في تغيير الاسم', 'error');
    }
}

// Load statistics
async function loadStats() {
    try {
        const [booksSnap, newsSnap, articlesSnap, usersSnap] = await Promise.all([
            db.collection('books').get(),
            db.collection('news').get(),
            db.collection('articles').get(),
            db.collection('users').get()
        ]);

        document.getElementById('stat-books').textContent = booksSnap.size;
        document.getElementById('stat-news').textContent = newsSnap.size;
        document.getElementById('stat-articles').textContent = articlesSnap.size;
        document.getElementById('stat-users').textContent = usersSnap.size;

        // Load users list
        loadUsersList(usersSnap);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load users list
function loadUsersList(usersSnap) {
    const list = document.getElementById('users-list');
    const users = [];
    usersSnap.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
    });

    if (users.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">لا يوجد مستخدمين</p>';
        return;
    }

    list.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="info">
                <span class="name">${user.name}</span>
                <span class="created">تاريخ التسجيل: ${formatDate(user.createdAt) || 'غير معروف'}</span>
            </div>
        </div>
    `).join('');
}

// Load books
async function loadBooks() {
    const grid = document.getElementById('books-grid');
    grid.innerHTML = '<div class="loading">جاري التحميل</div>';

    try {
        const snapshot = await db.collection('books').orderBy('createdAt', 'desc').get();
        books = [];
        snapshot.forEach(doc => {
            books.push({ id: doc.id, ...doc.data() });
        });
        renderBooks(books);
    } catch (error) {
        renderBooks([]);
    }
}

// Render books
function renderBooks(booksToRender) {
    const grid = document.getElementById('books-grid');
    const isAdmin = isAdminUser();

    if (booksToRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span>📚</span>
                <p>لا توجد كتب متاحة</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = booksToRender.map(book => `
        <div class="book-card" onclick="viewBook('${book.id}')">
            <div class="book-cover">
                ${book.coverUrl ? 
                    `<img src="${getOptimizedUrl(book.coverUrl)}" alt="${book.title}" loading="lazy">` : 
                    '📖'}
                <button class="favorite-btn ${isFavorite(book.id) ? 'active' : ''}" 
                    onclick="toggleFavorite('${book.id}', event)">
                    ${isFavorite(book.id) ? '❤️' : '🤍'}
                </button>
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <span class="category">${book.category}</span>
                ${isAdmin ? `
                    <div class="book-actions">
                        <button class="edit-btn" onclick="event.stopPropagation(); editBook('${book.id}')">✏️ تعديل</button>
                        <button class="delete-btn" onclick="event.stopPropagation(); deleteItem('book', '${book.id}')">🗑️ حذف</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Filter books
function filterBooks() {
    const searchQuery = document.getElementById('book-search').value.toLowerCase();

    const filtered = books.filter(book => {
        return !searchQuery || 
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery) ||
            book.category.toLowerCase().includes(searchQuery);
    });

    renderBooks(filtered);
}

// Search books
function searchBooks() {
    const query = document.getElementById('book-search').value.toLowerCase();
    const filtered = books.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query)
    );
    renderBooks(filtered);
}

// View book details
function viewBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const details = document.getElementById('book-details');
    details.innerHTML = `
        ${book.coverUrl ? 
            `<img class="cover" src="${getOptimizedUrl(book.coverUrl)}" alt="${book.title}">` : 
            '<div class="book-cover" style="max-width:250px;margin:0 auto;height:200px;">📖</div>'}
        <h2>${book.title}</h2>
        <p class="author">تأليف: ${book.author}</p>
        <div class="meta">
            <span>${book.category}</span>
            ${book.year ? `<span>${book.year}</span>` : ''}
        </div>
        ${book.description ? `<p class="description">${book.description}</p>` : ''}
    `;

    document.getElementById('book-modal').classList.remove('hidden');
}

// Close book modal
function closeBookModal(event) {
    if (!event || event.target.classList.contains('modal')) {
        document.getElementById('book-modal').classList.add('hidden');
    }
}

// Unified close modal function
function closeModal(event) {
    if (!event || event.target.classList.contains('modal')) {
        document.getElementById('book-modal').classList.add('hidden');
        document.getElementById('news-modal').classList.add('hidden');
        document.getElementById('article-modal').classList.add('hidden');
    }
}

// View book details (detailed)
function viewBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const details = document.getElementById('book-details');
    details.innerHTML = `
        ${book.coverUrl ? 
            `<img class="cover" src="${book.coverUrl}" alt="${book.title}">` : 
            '<div class="book-cover" style="max-width:250px;margin:0 auto;height:200px;display:flex;align-items:center;justify-content:center;font-size:60px;background:var(--bg-tertiary);border-radius:12px;">📖</div>'}
        <h2>${book.title}</h2>
        <p class="author">تأليف: ${book.author}</p>
        <div class="meta">
            <span>📚 ${book.category}</span>
            ${book.year ? `<span>📅 ${book.year}</span>` : ''}
        </div>
        ${book.description ? `<div class="description"><h3 style="color:var(--text-primary);margin-bottom:10px;">الوصف</h3><p>${book.description}</p></div>` : ''}
    `;

    document.getElementById('book-modal').classList.remove('hidden');
}

// View news details (detailed)
function viewNews(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;

    const details = document.getElementById('news-details');
    details.innerHTML = `
        ${item.imageUrl ? 
            `<div class="image-section"><img src="${item.imageUrl}" alt="${item.title}"></div>` : ''}
        <h2>${item.title}</h2>
        <div class="meta">
            <span>📅 ${formatDate(item.date)}</span>
        </div>
        <div class="content">
            <p style="white-space: pre-wrap;">${item.content}</p>
        </div>
    `;

    document.getElementById('news-modal').classList.remove('hidden');
}

// View article details (detailed)
function viewArticle(articleId) {
    const item = articles.find(a => a.id === articleId);
    if (!item) return;

    const details = document.getElementById('article-details');
    details.innerHTML = `
        ${item.imageUrl ? 
            `<div class="image-section"><img src="${item.imageUrl}" alt="${item.title}"></div>` : ''}
        <h2>${item.title}</h2>
        <p class="author">✍️ كاتب: ${item.author}</p>
        <div class="meta">
            <span>📅 ${formatDate(item.date)}</span>
        </div>
        <div class="content">
            <p style="white-space: pre-wrap;">${item.content}</p>
        </div>
    `;

    document.getElementById('article-modal').classList.remove('hidden');
}

// Edit book
function editBook(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('book-id').value = bookId;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-category').value = book.category;
    document.getElementById('book-year').value = book.year || '';
    document.getElementById('book-description').value = book.description || '';
    document.getElementById('book-form-title').textContent = 'تعديل الكتاب';
    
    if (book.coverUrl) {
        document.getElementById('book-preview').innerHTML = `<img src="${book.coverUrl}" alt="cover">`;
    }

    showSection('admin');
    document.getElementById('book-title').focus();
}

// Reset book form
function resetBookForm() {
    document.getElementById('book-id').value = '';
    document.getElementById('book-title').value = '';
    document.getElementById('book-author').value = '';
    document.getElementById('book-category').value = '';
    document.getElementById('book-year').value = '';
    document.getElementById('book-description').value = '';
    document.getElementById('book-form-title').textContent = 'إضافة كتاب جديد';
    document.getElementById('book-preview').innerHTML = '';
    document.getElementById('book-cover').value = '';
}

// Save book (add or update)
async function saveBook(event) {
    event.preventDefault();

    const bookId = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const category = document.getElementById('book-category').value;
    const year = document.getElementById('book-year').value;
    const description = document.getElementById('book-description').value;
    const coverInput = document.getElementById('book-cover');

    try {
        let coverUrl = '';

        // Get existing cover URL if not uploading new
        if (!coverInput.files[0] && bookId) {
            const existingBook = books.find(b => b.id === bookId);
            coverUrl = existingBook ? existingBook.coverUrl : '';
        }

        // Upload new cover if selected
        if (coverInput.files[0]) {
            const result = await uploadToCloudinary(coverInput.files[0]);
            coverUrl = result.optimizedUrl;
        }

        const bookData = {
            title,
            author,
            category,
            year: year || '',
            description: description || '',
            coverUrl
        };

        if (bookId) {
            // Update existing
            await db.collection('books').doc(bookId).update(bookData);
            showToast('تم تحديث الكتاب بنجاح', 'success');
        } else {
            // Add new
            bookData.createdAt = FieldValue.serverTimestamp();
            await db.collection('books').add(bookData);
            showToast('تمت إضافة الكتاب بنجاح', 'success');
        }

        resetBookForm();
        loadBooks();
    } catch (error) {
        showToast('خطأ: ' + error.message, 'error');
    }
}

// Delete book
async function deleteBook(bookId) {
    try {
        await db.collection('books').doc(bookId).delete();
        showToast('تم حذف الكتاب بنجاح', 'success');
        loadBooks();
    } catch (error) {
        showToast('خطأ في الحذف: ' + error.message, 'error');
    }
}

// Load news
async function loadNews() {
    const list = document.getElementById('news-list');
    list.innerHTML = '<div class="loading">جاري التحميل</div>';

    try {
        const snapshot = await db.collection('news').orderBy('createdAt', 'desc').get();
        news = [];
        snapshot.forEach(doc => {
            news.push({ id: doc.id, ...doc.data() });
        });
        renderNews();
    } catch (error) {
        renderNews();
    }
}

// Render news
function renderNews() {
    const list = document.getElementById('news-list');
    const isAdmin = isAdminUser();

    if (news.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>📰</span>
                <p>لا توجد أخبار متاحة</p>
            </div>
        `;
        return;
    }

    list.innerHTML = news.map(item => `
        <div class="article-card" onclick="viewNews('${item.id}')">
            ${item.imageUrl ? `<img src="${getOptimizedUrl(item.imageUrl)}" alt="${item.title}">` : ''}
            <h3>${item.title}</h3>
            <p class="meta">${formatDate(item.date)}</p>
            <p class="content">${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}</p>
            ${isAdmin ? `
                <div class="article-actions" onclick="event.stopPropagation()">
                    <button class="edit-btn" onclick="editNews('${item.id}')">✏️ تعديل</button>
                    <button class="delete-btn" onclick="deleteItem('news', '${item.id}')">🗑️ حذف</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Edit news
function editNews(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;

    document.getElementById('news-id').value = newsId;
    document.getElementById('news-title').value = item.title;
    document.getElementById('news-content').value = item.content;
    document.getElementById('news-form-title').textContent = 'تعديل الخبر';
    
    if (item.imageUrl) {
        document.getElementById('news-preview').innerHTML = `<img src="${item.imageUrl}" alt="news">`;
    }

    showSection('admin');
    document.getElementById('news-title').focus();
}

// Reset news form
function resetNewsForm() {
    document.getElementById('news-id').value = '';
    document.getElementById('news-title').value = '';
    document.getElementById('news-content').value = '';
    document.getElementById('news-form-title').textContent = 'إضافة خبر جديد';
    document.getElementById('news-preview').innerHTML = '';
    document.getElementById('news-image').value = '';
}

// Save news (add or update)
async function saveNews(event) {
    event.preventDefault();

    const newsId = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value;
    const content = document.getElementById('news-content').value;
    const imageInput = document.getElementById('news-image');

    try {
        let imageUrl = '';

        if (!imageInput.files[0] && newsId) {
            const existingNews = news.find(n => n.id === newsId);
            imageUrl = existingNews ? existingNews.imageUrl : '';
        }

        if (imageInput.files[0]) {
            const result = await uploadToCloudinary(imageInput.files[0]);
            imageUrl = result.optimizedUrl;
        }

        const newsData = {
            title,
            content,
            imageUrl,
            date: new Date().toISOString()
        };

        if (newsId) {
            await db.collection('news').doc(newsId).update(newsData);
            showToast('تم تحديث الخبر بنجاح', 'success');
        } else {
            newsData.createdAt = FieldValue.serverTimestamp();
            await db.collection('news').add(newsData);
            showToast('تمت إضافة الخبر بنجاح', 'success');
        }

        resetNewsForm();
        loadNews();
    } catch (error) {
        showToast('خطأ: ' + error.message, 'error');
    }
}

// Delete news
async function deleteNews(newsId) {
    try {
        await db.collection('news').doc(newsId).delete();
        showToast('تم حذف الخبر بنجاح', 'success');
        loadNews();
    } catch (error) {
        showToast('خطأ في الحذف: ' + error.message, 'error');
    }
}

// Load articles
async function loadArticles() {
    const list = document.getElementById('articles-list');
    list.innerHTML = '<div class="loading">جاري التحميل</div>';

    try {
        const snapshot = await db.collection('articles').orderBy('createdAt', 'desc').get();
        articles = [];
        snapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        renderArticles();
    } catch (error) {
        renderArticles();
    }
}

// Render articles
function renderArticles() {
    const list = document.getElementById('articles-list');
    const isAdmin = isAdminUser();

    if (articles.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>📝</span>
                <p>لا توجد مقالات متاحة</p>
            </div>
        `;
        return;
    }

    list.innerHTML = articles.map(item => `
        <div class="article-card" onclick="viewArticle('${item.id}')">
            ${item.imageUrl ? `<img src="${getOptimizedUrl(item.imageUrl)}" alt="${item.title}">` : ''}
            <h3>${item.title}</h3>
            <p class="meta">كاتب: ${item.author} ${item.date ? ' - ' + formatDate(item.date) : ''}</p>
            <p class="content">${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}</p>
            ${isAdmin ? `
                <div class="article-actions" onclick="event.stopPropagation()">
                    <button class="edit-btn" onclick="editArticle('${item.id}')">✏️ تعديل</button>
                    <button class="delete-btn" onclick="deleteItem('article', '${item.id}')">🗑️ حذف</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Edit article
function editArticle(articleId) {
    const item = articles.find(a => a.id === articleId);
    if (!item) return;

    document.getElementById('article-id').value = articleId;
    document.getElementById('article-title').value = item.title;
    document.getElementById('article-author').value = item.author;
    document.getElementById('article-content').value = item.content;
    document.getElementById('article-form-title').textContent = 'تعديل المقالة';
    
    if (item.imageUrl) {
        document.getElementById('article-preview').innerHTML = `<img src="${item.imageUrl}" alt="article">`;
    }

    showSection('admin');
    document.getElementById('article-title').focus();
}

// Reset article form
function resetArticleForm() {
    document.getElementById('article-id').value = '';
    document.getElementById('article-title').value = '';
    document.getElementById('article-author').value = '';
    document.getElementById('article-content').value = '';
    document.getElementById('article-form-title').textContent = 'إضافة مقالة جديدة';
    document.getElementById('article-preview').innerHTML = '';
    document.getElementById('article-image').value = '';
}

// Save article (add or update)
async function saveArticle(event) {
    event.preventDefault();

    const articleId = document.getElementById('article-id').value;
    const title = document.getElementById('article-title').value;
    const author = document.getElementById('article-author').value;
    const content = document.getElementById('article-content').value;
    const imageInput = document.getElementById('article-image');

    try {
        let imageUrl = '';

        if (!imageInput.files[0] && articleId) {
            const existingArticle = articles.find(a => a.id === articleId);
            imageUrl = existingArticle ? existingArticle.imageUrl : '';
        }

        if (imageInput.files[0]) {
            const result = await uploadToCloudinary(imageInput.files[0]);
            imageUrl = result.optimizedUrl;
        }

        const articleData = {
            title,
            author,
            content,
            imageUrl,
            date: new Date().toISOString()
        };

        if (articleId) {
            await db.collection('articles').doc(articleId).update(articleData);
            showToast('تم تحديث المقالة بنجاح', 'success');
        } else {
            articleData.createdAt = FieldValue.serverTimestamp();
            await db.collection('articles').add(articleData);
            showToast('تمت إضافة المقالة بنجاح', 'success');
        }

        resetArticleForm();
        loadArticles();
    } catch (error) {
        showToast('خطأ: ' + error.message, 'error');
    }
}

// Delete article
async function deleteArticle(articleId) {
    try {
        await db.collection('articles').doc(articleId).delete();
        showToast('تم حذف المقالة بنجاح', 'success');
        loadArticles();
    } catch (error) {
        showToast('خطأ في الحذف: ' + error.message, 'error');
    }
}

// Show delete confirmation
function deleteItem(type, id) {
    deleteTarget = { type, id };
    const messages = {
        book: 'هل أنت متأكد من حذف هذا الكتاب؟',
        news: 'هل أنت متأكد من حذف هذا الخبر؟',
        article: 'هل أنت متأكد من حذف هذه المقالة؟'
    };
    document.getElementById('confirm-message').textContent = messages[type];
    document.getElementById('confirm-modal').classList.remove('hidden');
}

// Confirm delete
function confirmDelete() {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'book') {
        deleteBook(deleteTarget.id);
    } else if (deleteTarget.type === 'news') {
        deleteNews(deleteTarget.id);
    } else if (deleteTarget.type === 'article') {
        deleteArticle(deleteTarget.id);
    }
    
    closeConfirmModal();
}

// Close confirm modal
function closeConfirmModal(event) {
    if (!event || event.target.classList.contains('modal')) {
        document.getElementById('confirm-modal').classList.add('hidden');
        deleteTarget = null;
    }
}

// Preview image
function previewImage(event, previewId) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById(previewId);
    if (preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Load admins list
async function loadAdmins() {
    const list = document.getElementById('admins-list');
    list.innerHTML = '<div class="loading">جاري التحميل</div>';

    try {
        const snapshot = await db.collection('admins').orderBy('createdAt', 'desc').get();
        const admins = [];
        snapshot.forEach(doc => {
            admins.push({ id: doc.id, ...doc.data() });
        });
        renderAdmins(admins);
    } catch (error) {
        list.innerHTML = '<p style="color: var(--text-muted);">لا يوجد مديرين إضافيين</p>';
    }
}

// Render admins
function renderAdmins(admins) {
    const list = document.getElementById('admins-list');
    const currentAdminId = getCurrentAdminId();

    if (admins.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">لا يوجد مديرين إضافيين</p>';
        return;
    }

    list.innerHTML = admins.map(admin => `
        <div class="admin-item">
            <div class="info">
                <span class="name">${admin.name}</span>
                <span class="created">تاريخ الإنشاء: ${formatDate(admin.createdAt) || 'غير معروف'}</span>
            </div>
            <div class="actions">
                <button class="delete-btn" onclick="deleteAdmin('${admin.id}')">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
}

// Add new admin
async function addAdmin(event) {
    event.preventDefault();
    
    const name = document.getElementById('new-admin-name').value;
    const password = document.getElementById('new-admin-password').value;

    // Generate username from name (remove spaces, lowercase)
    const username = name.replace(/\s+/g, '').toLowerCase();

    try {
        // Check if username already exists
        const snapshot = await db.collection('admins').where('username', '==', username).get();
        
        if (!snapshot.empty) {
            showToast('اسم المدير موجود بالفعل', 'error');
            return;
        }

        // Add new admin
        await db.collection('admins').add({
            name: name,
            username: username,
            password: password,
            createdAt: FieldValue.serverTimestamp()
        });

        showToast('تم إضافة المدير بنجاح', 'success');
        event.target.reset();
        loadAdmins();
    } catch (error) {
        showToast('خطأ في إضافة المدير: ' + error.message, 'error');
    }
}

// Delete admin
async function deleteAdmin(adminId) {
    if (!confirm('هل أنت متأكد من حذف هذا المدير؟')) return;

    try {
        await db.collection('admins').doc(adminId).delete();
        showToast('تم حذف المدير بنجاح', 'success');
        loadAdmins();
    } catch (error) {
        showToast('خطأ في حذف المدير: ' + error.message, 'error');
    }
}

// Loading functions
function showLoading() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-spinner').classList.add('hidden');
}

// Make functions global
window.previewImage = previewImage;
window.toggleTheme = toggleTheme;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleFavorite = toggleFavorite;