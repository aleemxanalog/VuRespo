import os
import sqlite3
import uuid
from flask import Flask, request, jsonify, session, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'westrowear_dev_key_change_in_prod_2026')
CORS(app, supports_credentials=True)

DB_FILE = 'database.db'
UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- USER AUTHENTICATION ---
@app.route('/api/register', methods=['POST'])
def register():
    # Attempt to handle both JSON and Form data to be safe
    data = request.json if request.is_json else request.form
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not all([name, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    hashed_password = generate_password_hash(password)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", (name, email, hashed_password))
        conn.commit()
        user_id = cursor.lastrowid
        
        # Log them in automatically
        session['user_id'] = user_id
        session['is_admin'] = 0
        
        return jsonify({'success': True, 'user': {'id': user_id, 'name': name, 'email': email, 'is_admin': 0}}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 409
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json if request.is_json else request.form
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Missing username/email or password'}), 400
        
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ? OR name = ?", (email, email)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['is_admin'] = user['is_admin']
        return jsonify({
            'success': True, 
            'user': {
                'id': user['id'], 
                'name': user['name'], 
                'email': user['email'], 
                'is_admin': user['is_admin']
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify({'user': None}), 401
        
    conn = get_db_connection()
    user = conn.execute("SELECT id, name, email, is_admin FROM users WHERE id = ?", (session['user_id'],)).fetchone()
    conn.close()
    
    if user:
        return jsonify({'user': dict(user)})
    return jsonify({'user': None}), 401

# --- CHECKOUT ---
@app.route('/api/checkout', methods=['POST'])
def checkout():
    if 'user_id' not in session:
        return jsonify({'error': 'Must be logged in to checkout'}), 401
        
    data = request.json
    name = data.get('name')
    address = f"{data.get('address', '')}, {data.get('city', '')} {data.get('zip', '')}"
    total = data.get('total')
    
    if not name or not address or total is None:
        return jsonify({'error': 'Missing shipping details'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders (user_id, name, address, total) VALUES (?, ?, ?, ?)",
                  (session['user_id'], name, address, total))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# --- PRODUCT API ROUTES ---
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM products').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in products])

@app.route('/api/products/<int:id>', methods=['GET'])
def get_product(id):
    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (id,)).fetchone()
    conn.close()
    if product:
        return jsonify(dict(product))
    return jsonify({'error': 'Product not found'}), 404

@app.route('/api/products', methods=['POST'])
def add_product():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
        
    name = request.form.get('name')
    price = request.form.get('price')
    
    if not name or not price:
        return jsonify({'error': 'Name and price are required'}), 400
        
    try:
        price = float(price)
    except ValueError:
        return jsonify({'error': 'Price must be a number'}), 400

    image_path = ''
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(file_path)
            image_path = f"uploads/{unique_filename}"
            
    if not image_path and request.form.get('imageUrl'):
        image_path = request.form.get('imageUrl')
        
    if not image_path:
        return jsonify({'error': 'Image file or Image URL is required'}), 400

    colors = request.form.get('colors', 'WHITE,RED,BLUE')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO products (name, price, image, colors) VALUES (?, ?, ?, ?)', 
                   (name, price, image_path, colors))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': new_id, 'name': name, 'price': price, 'image': image_path, 'colors': colors}), 201

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM products WHERE id = ?', (id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    
    if deleted:
        return jsonify({'success': True})
    return jsonify({'error': 'Product not found'}), 404

# --- STATIC ROUTES & ADMIN GATE ---
@app.route('/dashboard.html')
def dashboard():
    if not session.get('is_admin'):
        return "<h1>Unauthorized. Admin login required.</h1><br><p><a href='/'>Go back to Store</a></p>", 403
    return app.send_static_file('dashboard.html')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def catch_all(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

if __name__ == '__main__':
   app.run(host='0.0.0.0', port=3000, debug=True)
