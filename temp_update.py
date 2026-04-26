import sqlite3

conn = sqlite3.connect('database.db')
try:
    conn.execute("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT 'WHITE,RED,BLUE'")
    conn.commit()
    print("Added colors column successfully.")
except sqlite3.OperationalError as e:
    print(f"Error (maybe column exists): {e}")
finally:
    conn.close()
