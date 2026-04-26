import os

replacements = {
    "Brandzfit": "Brandsfitz",
    "BRANDZFIT": "BRANDSFITZ",
    "brandzfit": "brandsfitz"
}

files = [
    r"c:\Users\Aleem\Desktop\gravity\server.py",
    r"c:\Users\Aleem\Desktop\gravity\init_db.py",
    r"c:\Users\Aleem\Desktop\gravity\update_db.py",
    r"c:\Users\Aleem\Desktop\gravity\static\product.html",
    r"c:\Users\Aleem\Desktop\gravity\static\index.html",
    r"c:\Users\Aleem\Desktop\gravity\static\dashboard.html"
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        for old, new in replacements.items():
            content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Replacement complete.")
