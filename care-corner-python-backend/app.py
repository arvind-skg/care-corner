# --------------------------------------------------------------
# backend/app.py
# --------------------------------------------------------------
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# --------------------------------------------------------------
# App & Security Setup
# --------------------------------------------------------------
app = Flask(__name__)
# For local dev, allow all. For production, restrict to your Vercel frontend URL.
# Example for production:
# CORS(app, resources={r"/api/*": {"origins": ["https://your-care-corner-frontend.vercel.app"]}})
CORS(app) # Broad CORS for easy setup, restrict later in production

# Argon2 password hasher (high-security, memory-hard)
ph = PasswordHasher()

# --------------------------------------------------------------
# Database Helper
# --------------------------------------------------------------
def get_db_connection():
    """
    Returns a psycopg2 connection using the DATABASE_URL env var (for Railway)
    or local credentials (for local development).
    """
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        # Railway (and most PaaS) provides DATABASE_URL in a format psycopg2 understands
        return psycopg2.connect(db_url)
    else:
        # Fallback for local development if DATABASE_URL is not set
        # IMPORTANT: Replace 'your_local_password' with your actual PostgreSQL password
        print("Using local PostgreSQL connection. Make sure your local DB is running.")
        return psycopg2.connect(
            host='localhost',
            database='care_corner',
            user='postgres',
            password='arvind28' # <--- CHANGE THIS FOR LOCAL DEV
        )

# --------------------------------------------------------------
# Utility Functions
# --------------------------------------------------------------
def format_timestamp(ts):
    """Return ISO-8601 string (UTC) for JSON responses."""
    if isinstance(ts, datetime):
        return ts.isoformat()
    return ts

# --------------------------------------------------------------
# 1️⃣ Authentication End-points (No changes here, already Argon2)
# --------------------------------------------------------------
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not (name and email and password):
        return jsonify({'success': False,
                        'message': 'Name, email and password are required'}), 400

    # Hash the password with Argon2
    try:
        hashed_pw = ph.hash(password)
    except Exception as e:
        return jsonify({'success': False,
                        'message': f'Password hashing failed: {str(e)}'}), 500

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (name, email, password) "
            "VALUES (%s, %s, %s) RETURNING id",
            (name, email, hashed_pw)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'success': True,
                        'user_id': user_id,
                        'name': name}), 201
    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'success': False,
                        'message': 'Email already exists'}), 409
    except Exception as e:
        conn.rollback()
        print('Register error:', e)
        return jsonify({'success': False,
                        'message': 'Registration failed'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not (email and password):
        return jsonify({'success': False,
                        'message': 'Email and password required'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, name, password FROM users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()
        if not user:
            return jsonify({'success': False,
                            'message': 'Invalid credentials'}), 401

        user_id, user_name, stored_hash = user
        try:
            ph.verify(stored_hash, password)
        except VerifyMismatchError:
            return jsonify({'success': False,
                            'message': 'Invalid credentials'}), 401

        # Optional: re-hash if Argon2 parameters changed
        if ph.check_needs_rehash(stored_hash):
            new_hash = ph.hash(password)
            cur.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (new_hash, user_id)
            )
            conn.commit()

        return jsonify({'success': True,
                        'user_id': user_id,
                        'name': user_name}), 200
    except Exception as e:
        print('Login error:', e)
        return jsonify({'success': False,
                        'message': 'Login failed'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --------------------------------------------------------------
# 2️⃣ Post Management End-points
# --------------------------------------------------------------
@app.route('/api/posts', methods=['GET'])
def get_posts():
    """
    Returns a list of all posts (most recent first).
    Each post includes a minimal comment count.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT p.id, p.title, p.category, p.content,
                   p.timestamp, p.author_id, p.is_anonymous,
                   u.name AS author_name,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_cnt
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.timestamp DESC
        """)
        rows = cur.fetchall()
        posts = []
        for r in rows:
            post = {
                'id': r[0],
                'title': r[1] or 'Untitled',
                'category': r[2],
                'content': r[3],
                'timestamp': format_timestamp(r[4]),
                'author_id': r[5],
                'is_anonymous': r[6],
                'author_name': r[7] if not r[6] else 'Anonymous',
                'comment_count': r[8]
            }
            posts.append(post)
        return jsonify(posts), 200
    except Exception as e:
        print('Get posts error:', e)
        return jsonify({'success': False,
                        'message': 'Failed to fetch posts'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/posts', methods=['POST'])
def create_post():
    """
    Expected JSON:
    {
        "title": "optional title",
        "category": "Mental Health|Career|Academics|Relationships|General",
        "content": "post body",
        "author_id": <int>,
        "is_anonymous": true|false
    }
    """
    data = request.get_json()
    title = data.get('title') or 'Untitled'
    category = data.get('category')
    content = data.get('content')
    author_id = data.get('author_id')
    is_anonymous = data.get('is_anonymous', False)

    if not (category and content and author_id):
        return jsonify({'success': False,
                        'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO posts (title, category, content,
                               author_id, is_anonymous)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, timestamp
            """,
            (title, category, content, author_id, is_anonymous)
        )
        post_id, ts = cur.fetchone()
        conn.commit()
        return jsonify({
            'id': post_id,
            'title': title,
            'category': category,
            'content': content,
            'timestamp': format_timestamp(ts),
            'author_id': author_id,
            'is_anonymous': is_anonymous
        }), 201
    except Exception as e:
        conn.rollback()
        print('Create post error:', e)
        return jsonify({'success': False,
                        'message': 'Failed to create post'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/posts/<int:post_id>', methods=['GET'])
def get_post_detail(post_id):
    """
    Returns a single post with its full comment list.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Post data
        cur.execute("""
            SELECT p.id, p.title, p.category, p.content,
                   p.timestamp, p.author_id, p.is_anonymous,
                   u.name AS author_name
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = %s
        """, (post_id,))
        post_row = cur.fetchone()
        if not post_row:
            return jsonify({'success': False,
                            'message': 'Post not found'}), 404

        post = {
            'id': post_row[0],
            'title': post_row[1] or 'Untitled',
            'category': post_row[2],
            'content': post_row[3],
            'timestamp': format_timestamp(post_row[4]),
            'author_id': post_row[5],
            'is_anonymous': post_row[6],
            'author_name': post_row[7] if not post_row[6] else 'Anonymous'
        }

        # Comments data
        cur.execute("""
            SELECT c.id, c.content, c.timestamp, u.name AS author_name
            FROM comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.post_id = %s
            ORDER BY c.timestamp ASC
        """, (post_id,))
        comment_rows = cur.fetchall()
        comments = []
        for cr in comment_rows:
            comments.append({
                'id': cr[0],
                'content': cr[1],
                'timestamp': format_timestamp(cr[2]),
                'author_name': cr[3] or 'Anonymous Friend' # Comments are always 'Anonymous Friend'
            })
        post['comments'] = comments

        return jsonify(post), 200
    except Exception as e:
        print('Get post detail error:', e)
        return jsonify({'success': False,
                        'message': 'Failed to fetch post details'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """
    Deletes a post. (Needs author_id check if user is logged in).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
        post_exists = cur.fetchone()
        if not post_exists:
            return jsonify({'success': False,
                            'message': 'Post not found'}), 404
        
        # In a real app, you'd verify author_id == current_user_id
        # For this simplified app, we allow deletion if post exists.
        cur.execute("DELETE FROM posts WHERE id = %s", (post_id,))
        conn.commit()
        return jsonify({'success': True}), 204
    except Exception as e:
        conn.rollback()
        print('Delete post error:', e)
        return jsonify({'success': False,
                        'message': 'Failed to delete post'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --------------------------------------------------------------
# 3️⃣ Comment Management End-points
# --------------------------------------------------------------
@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    """
    Adds a comment to a post.
    Expected JSON:
    {
        "content": "comment body",
        "author_id": <int>
    }
    """
    data = request.get_json()
    content = data.get('content')
    author_id = data.get('author_id')

    if not (content and author_id):
        return jsonify({'success': False,
                        'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Verify post exists
        cur.execute("SELECT id FROM posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            return jsonify({'success': False,
                            'message': 'Post not found'}), 404

        cur.execute(
            "INSERT INTO comments (post_id, content, author_id) "
            "VALUES (%s, %s, %s) "
            "RETURNING id, timestamp",
            (post_id, content, author_id)
        )
        comment_id, ts = cur.fetchone()
        conn.commit()
        return jsonify({
            'id': comment_id,
            'content': content,
            'timestamp': format_timestamp(ts),
            'author_name': 'Anonymous Friend'
        }), 201
    except Exception as e:
        conn.rollback()
        print('Add comment error:', e)
        return jsonify({'success': False,
                        'message': 'Failed to add comment'}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --------------------------------------------------------------
# Flask App Runner (for local development or Gunicorn on Railway)
# --------------------------------------------------------------
if __name__ == '__main__':
    # Railway (and other PaaS) sets the PORT env var.
    # We default to 5000 for local development.
    port = int(os.getenv('PORT', 5000))
    # '0.0.0.0' makes the app accessible externally (e.g., from your phone on the same network)
    # debug=False in production, but can be True for local dev (reloads on code changes)
    app.run(host='0.0.0.0', port=port, debug=True)