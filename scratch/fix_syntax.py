import sys

try:
    with open('app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the escaped backticks and template string variables
    content = content.replace('\\`', '`')
    content = content.replace('\\${', '${')

    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed app.js successfully.")
except Exception as e:
    print(f"Error: {e}")
