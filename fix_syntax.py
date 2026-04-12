import os

files = ['./src/components/ModalCreateCell.jsx', './src/components/ModalPromoteLeader.jsx']
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Reemplazar barra + acento grave por acento grave
    content = content.replace('\\`', '`')
    # Reemplazar barra + dólar + llave por dólar + llave
    content = content.replace('\\${', '${')
    
    with open(f, 'w') as file:
        file.write(content)

print('Fixed backticks and interpolation.')
