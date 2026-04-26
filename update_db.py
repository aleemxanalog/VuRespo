import sqlite3
from werkzeug.security import generate_password_hash

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

admin_password = generate_password_hash("aleem123")
cursor.execute('UPDATE users SET name = "aleemrao", password = ? WHERE is_admin = 1', (admin_password,))
conn.commit()

# Ensure there's an admin if not existing
cursor.execute('SELECT COUNT(*) FROM users WHERE is_admin = 1')
if cursor.fetchone()[0] == 0:
    cursor.execute('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)', 
                   ("aleemrao", "admin@brandsfitz.com", admin_password, 1))
    conn.commit()

conn.close()
print("Updated admin successfully in existing DB")
