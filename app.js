// Global state
let currentUser = null;
let books = [];
let news = [];
let articles = [];
let deleteTarget = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Check authentication status
function checkAuth() {
    if (isAdminUser()) {
        showDashboard(true);
        return;
    }

    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    if (userEmail) {
        currentUser = { email: userEmail, name: userName };
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
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const snapshot = await db.collection('users').where('email', '==', email).where('password', '==', password).get();

        if (snapshot.empty) {
            showToast('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
            return;
        }

        const userData = snapshot.docs[0].data();
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', userData.name);
        currentUser = { email: email, name: userData.name };

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
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const snapshot = await db.collection('users').where('email', '==', email).get();
        
        if (!snapshot.empty) {
            showToast('هذا البريد الإلكتروني موجود بالفعل', 'error');
            return;
        }

        await db.collection('users').add({
            name: name,
            email: email,
            password: password,
            createdAt: FieldValue.serverTimestamp()
        });

        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name);
        currentUser = { email: email, name: name };

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
            setAdminStatus('true', snapshot.docs[0].id);
            showToast('تم تسجيل دخول المدير بنجاح', 'success');
            showDashboard(true);
            return;
        }

        // Fallback to hardcoded admin
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            setAdminStatus('true', 'main-admin');
            showToast('تم تسجيل دخول المدير بنجاح', 'success');
            showDashboard(true);
        } else {
            showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    } catch (error) {
        // Fallback to hardcoded if Firestore fails
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            setAdminStatus('true', 'main-admin');
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
            <span>📅 ${item.date ? new Date(item.date).toLocaleDateString('ar') : ''}</span>
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
            <span>📅 ${item.date ? new Date(item.date).toLocaleDateString('ar') : ''}</span>
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
            <p class="meta">${item.date ? new Date(item.date).toLocaleDateString('ar') : ''}</p>
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
            <p class="meta">كاتب: ${item.author} ${item.date ? ' - ' + new Date(item.date).toLocaleDateString('ar') : ''}</p>
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
                <span class="created">تاريخ الإنشاء: ${admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('ar') : 'غير معروف'}</span>
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

// Make functions global
window.previewImage = previewImage;