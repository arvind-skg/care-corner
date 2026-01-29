const API_BASE = 'http://localhost:5000/api';
// Data storage
let currentUser = null;
let currentPostId = null;
let selectedCategory = 'All';

// Bad words filter
const offensiveWords = [
    'stupid', 'idiot', 'dumb', 'hate', 'kill', 'die', 'loser', 'worthless', 
    'pathetic', 'ugly', 'fat', 'disgusting', 'retard', 'moron', 'failure',
    'useless', 'trash', 'garbage', 'freak', 'crazy', 'insane', 'psycho','fuck','bitch'
];

function containsOffensiveLanguage(text) {
    const lowerText = text.toLowerCase();
    return offensiveWords.some(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'i');
        return regex.test(lowerText);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuth();
});

// Setup all event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Auth
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('showSignup').addEventListener('click', () => showPage('signup'));
    document.getElementById('showLogin').addEventListener('click', () => showPage('login'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigation
    document.getElementById('homeBtn').addEventListener('click', () => showPage('home'));
    document.getElementById('dashboardBtn').addEventListener('click', () => showPage('dashboard'));
    document.getElementById('newPostBtn').addEventListener('click', () => showPage('newPost'));
    document.getElementById('backBtn').addEventListener('click', () => showPage('home'));
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', handleCategoryFilter);
    
    // Forms
    document.getElementById('postForm').addEventListener('submit', handlePostSubmit);
    document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
}

// Handle category filter
function handleCategoryFilter(e) {
    selectedCategory = e.target.value;
    loadPosts();
}

// Check authentication
async function checkAuth() {
    // Try to get user from sessionStorage
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showAppInterface();
    } else {
        showPage('login');
    }
}

// Show app interface
function showAppInterface() {
    document.getElementById('appHeader').style.display = 'block';
    document.getElementById('userMenu').classList.add('show');
    document.getElementById('userName').textContent = currentUser.name;
    showPage('home');
}

// Hide app interface
function hideAppInterface() {
    document.getElementById('appHeader').style.display = 'none';
    document.getElementById('userMenu').classList.remove('show');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result;
            sessionStorage.setItem('user', JSON.stringify(result));
            showAppInterface();
            document.getElementById('loginForm').reset();
        } else {
            alert(result.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to connect to server. Please try again later.');
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result;
            sessionStorage.setItem('user', JSON.stringify(result));
            showAppInterface();
            document.getElementById('signupForm').reset();
        } else {
            alert(result.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Failed to connect to server. Please try again later.');
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('user');
    hideAppInterface();
    showPage('login');
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
}

// Page navigation
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (page === 'login') {
        document.getElementById('loginPage').classList.add('active');
    } else if (page === 'signup') {
        document.getElementById('signupPage').classList.add('active');
    } else if (page === 'home') {
        document.getElementById('homePage').classList.add('active');
        document.getElementById('homeBtn').classList.add('active');
        loadPosts();
    } else if (page === 'dashboard') {
        document.getElementById('dashboardPage').classList.add('active');
        document.getElementById('dashboardBtn').classList.add('active');
        loadDashboard();
    } else if (page === 'newPost') {
        document.getElementById('newPostPage').classList.add('active');
        document.getElementById('newPostBtn').classList.add('active');
    } else if (page === 'postDetail') {
        document.getElementById('postDetailPage').classList.add('active');
    }
}

// Handle post submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value.trim();
    const isAnonymous = document.getElementById('postAnonymous').checked;
    
    if (!category || !content) {
        alert('Please fill in all required fields.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title || 'Untitled',
                category,
                content,
                author_id: currentUser.user_id,
                is_anonymous: isAnonymous
            })
        });
        
        const newPost = await response.json();
        
        if (newPost.id) {
            document.getElementById('postForm').reset();
            showPage('home');
        } else {
            alert('Failed to create post. Please try again.');
        }
    } catch (error) {
        console.error('Post submission error:', error);
        alert('Failed to connect to server. Please try again later.');
    }
}

// Handle comment submission
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    const content = document.getElementById('commentContent').value.trim();
    const warningDiv = document.getElementById('commentWarning');
    
    if (!content) {
        alert('Please enter a comment.');
        return;
    }
    
    // Check for offensive language
    if (containsOffensiveLanguage(content)) {
        warningDiv.innerHTML = '<div class="warning-message">Please be kind — hurtful or abusive comments are not allowed 💖</div>';
        setTimeout(() => {
            warningDiv.innerHTML = '';
        }, 5000);
        return;
    }
    
    warningDiv.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                author_id: currentUser.user_id
            })
        });
        
        const newComment = await response.json();
        
        if (newComment.id) {
            document.getElementById('commentContent').value = '';
            showPost(currentPostId); // Refresh the post to get updated comments
        } else {
            alert('Failed to add comment. Please try again.');
        }
    } catch (error) {
        console.error('Comment submission error:', error);
        alert('Failed to connect to server. Please try again later.');
    }
}

// Load posts
async function loadPosts() {
    const container = document.getElementById('postsContainer');
    
    try {
        const response = await fetch(`${API_BASE}/posts`);
        const posts = await response.json();
        
        // Filter posts by category
        let filteredPosts = posts;
        if (selectedCategory !== 'All') {
            filteredPosts = posts.filter(p => p.category === selectedCategory);
        }
        
        // Update post count
        const countElement = document.getElementById('postCount');
        if (countElement) {
            countElement.textContent = `${filteredPosts.length} ${filteredPosts.length === 1 ? 'post' : 'posts'}`;
        }
        
        if (filteredPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Posts Found</h3>
                    <p>${selectedCategory === 'All' ? 'Be the first to share your thoughts!' : `No posts in ${selectedCategory} category yet.`}</p>
                    <button class="btn" onclick="showPage('newPost')">Share Your Story</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="posts-grid">
                ${filteredPosts.map(post => `
                    <div class="post-card" onclick="showPost(${post.id})">
                        <div class="post-header">
                            <span class="post-category ${getCategoryClass(post.category)}">${post.category}</span>
                            <span class="post-time">${formatTime(post.timestamp)}</span>
                        </div>
                        <div class="post-title">${escapeHtml(post.title)}</div>
                        <div class="post-preview">${escapeHtml(truncateText(post.content, 150))}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Connection Error</h3>
                <p>Failed to load posts. Please check your internet connection and try again.</p>
                <button class="btn" onclick="loadPosts()">Retry</button>
            </div>
        `;
    }
}

// Load dashboard
async function loadDashboard() {
    const container = document.getElementById('myPostsContainer');

    try {
        const response = await fetch(`${API_BASE}/posts`);
        let posts = await response.json();

        // Filter posts that belong to the current user
        let userPosts = posts.filter(p => p.author_id === currentUser.user_id);

        // If posts returned by /api/posts do not include comments, fetch details for each user post
        // (This ensures we have comment arrays to read .length from)
        const needDetails = userPosts.some(p => !Array.isArray(p.comments));
        if (needDetails && userPosts.length > 0) {
            const detailPromises = userPosts.map(p =>
                fetch(`${API_BASE}/posts/${postId}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
            const details = await Promise.all(detailPromises);
            userPosts = userPosts.map((p, idx) => {
                const d = details[idx];
                if (d && Array.isArray(d.comments)) p.comments = d.comments;
                else p.comments = p.comments || [];
                return p;
            });
        } else {
            // ensure comments is an array for every post
            userPosts = userPosts.map(p => { p.comments = p.comments || []; return p; });
        }

        const totalComments = userPosts.reduce((sum, post) => sum + (post.comments.length || 0), 0);
        const anonymousPosts = userPosts.filter(p => p.is_anonymous).length;

        document.getElementById('totalPosts').textContent = userPosts.length;
        document.getElementById('totalComments').textContent = totalComments;
        document.getElementById('anonymousPosts').textContent = anonymousPosts;

        if (userPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Posts Yet</h3>
                    <p>Start sharing your thoughts with the community!</p>
                    <button class="btn" onclick="showPage('newPost')">Create Your First Post</button>
                </div>
            `;
            return;
        }

        container.innerHTML = userPosts.map(post => `
            <div class="my-post-card">
                <div class="my-post-header">
                    <div class="my-post-info">
                        <div class="my-post-title">${escapeHtml(post.title)}</div>
                        <div class="my-post-meta">
                            <span class="post-category ${getCategoryClass(post.category)}">${post.category}</span>
                            ${post.is_anonymous ? '<span class="anonymous-badge">Anonymous</span>' : ''}
                            <span class="post-time">${formatTime(post.timestamp)}</span>
                            <span class="post-time">${post.comments.length} comment${post.comments.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="my-post-actions">
                        ${post.comments.length > 0 ? `<button type="button" class="view-comments-btn" onclick="event.stopPropagation(); toggleComments(${post.id});">View Comments</button>` : ''}
                        <button type="button" class="delete-btn" onclick="event.stopPropagation(); deletePost(${post.id});">Delete</button>
                    </div>
                </div>
                <div class="post-preview">${escapeHtml(truncateText(post.content, 200))}</div>
                <div class="my-post-comments" id="comments-${post.id}">
                    ${post.comments.length ? `<h4>💬 Comments (${post.comments.length})</h4>` : ''}
                    ${post.comments.map(comment => `
                        <div class="mini-comment">
                            <div class="mini-comment-meta">${comment.author_name || 'Anonymous Friend'} • ${formatTime(comment.timestamp)}</div>
                            <div class="mini-comment-content">${escapeHtml(comment.content)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Connection Error</h3>
                <p>Failed to load dashboard data. Please check your connection and try again.</p>
                <button class="btn" onclick="loadDashboard()">Retry</button>
            </div>
        `;
    }
}

// Toggle comments visibility
function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    if (commentsDiv) {
        commentsDiv.classList.toggle('show');
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Correct API endpoint - use DELETE on /api/posts/{id}
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 204) {
            // Success - no content returned
            loadDashboard();
            alert('Post deleted successfully!');
        } else {
            const errorData = await response.json();
            alert(`Failed to delete post: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Post deletion error:', error);
        alert('Failed to connect to server. Please try again later.');
    }
}
// Show post detail
async function showPost(postId) {
    const container = document.getElementById('postDetailContent');
    currentPostId = postId;
    
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`);
        const post = await response.json();
        
        const authorDisplay = post.is_anonymous ? 'Anonymous' : post.author_name || 'Anonymous';
        
        container.innerHTML = `
            <div class="post-detail-header">
                <div class="post-detail-title">${escapeHtml(post.title)}</div>
                <div class="post-detail-meta">
                    <span class="post-category ${getCategoryClass(post.category)}">${post.category}</span>
                    <span class="post-time">By ${authorDisplay}</span>
                    <span class="post-time">${formatTime(post.timestamp)}</span>
                </div>
            </div>
            <div class="post-detail-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
        `;
        
        loadComments(post.comments || []);
        showPage('postDetail');
    } catch (error) {
        console.error('Error showing post:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>Failed to load post details. Please try again.</p>
                <button class="btn" onclick="showPage('home')">Back to Home</button>
            </div>
        `;
    }
}

// Load comments
function loadComments(comments) {
    const container = document.getElementById('commentsContainer');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px; margin-top: 20px;">No responses yet. Be the first to offer support! 💙</p>';
        return;
    }
    
    container.innerHTML = `<div style="margin-top: 30px;">` + comments.map(comment => `
        <div class="comment">
            <div class="comment-meta">${comment.author_name || 'Anonymous Friend'} • ${formatTime(comment.timestamp)}</div>
            <div class="comment-content">${escapeHtml(comment.content).replace(/\n/g, '<br>')}</div>
        </div>
    `).join('') + `</div>`;
}

// Helper functions
function getCategoryClass(category) {
    return 'category-' + category.toLowerCase().replace(/\s+/g, '-');
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}