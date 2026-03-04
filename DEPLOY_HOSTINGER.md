# Guia de Deploy na Hostinger

## Passo a Passo

### 1. Fazer o Build do Projeto

Execute o comando de build:

```bash
npm run build
```

Isso vai gerar os arquivos otimizados na pasta `dist/`.

### 2. Preparar os Arquivos

Após o build, você terá na pasta `dist/`:
- `index.html` (arquivo principal)
- `assets/` (JS, CSS e outros recursos)
- Outros arquivos estáticos (imagens, etc.)

### 3. Upload para Hostinger

**Opção A: Via File Manager (cPanel)**

1. Acesse o **File Manager** no painel da Hostinger
2. Navegue até a pasta `public_html` (ou `htdocs` dependendo da configuração)
3. **Limpe o conteúdo** da pasta `public_html` (se houver arquivos antigos)
4. Faça upload de **TODOS os arquivos e pastas** da pasta `dist/` para `public_html/`
   - Selecione todos os arquivos dentro de `dist/` (não a pasta dist em si)
   - Faça upload mantendo a estrutura de pastas

**Opção B: Via FTP**

1. Use um cliente FTP (FileZilla, WinSCP, etc.)
2. Conecte-se ao servidor da Hostinger
3. Navegue até `public_html`
4. Faça upload de todos os arquivos da pasta `dist/` para `public_html/`

### 4. Verificar o .htaccess (Opcional mas Recomendado)

Para garantir que o React Router funcione corretamente (se você usar rotas), crie um arquivo `.htaccess` na pasta `public_html` com:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 5. Verificar o Site

Acesse seu domínio no navegador e verifique se tudo está funcionando corretamente.

## Estrutura Final na Hostinger

```
public_html/
├── index.html
├── assets/
│   ├── index-*.js
│   ├── index-*.css
│   └── ...
├── logo.webp
├── fotonova.png
└── ... (outros arquivos estáticos)
```

## ⚠️ Otimização de Tamanho

**IMPORTANTE:** Se o build estiver muito grande (>10MB), verifique:

1. **Arquivos não utilizados na pasta `public/`**: O Vite copia tudo de `public/` para `dist/`
2. **Vídeos locais**: Se você usa Cloudinary ou CDN, remova vídeos locais de `public/`
3. **Imagens grandes**: Use formatos otimizados (WebP) e comprima imagens antes de colocar em `public/`
4. **Frames de vídeo**: Se você extraiu frames de um vídeo, mas não está usando, remova-os

**Tamanho ideal:** Um site React/Vite deve ter entre **1-5MB** após o build. Se estiver acima disso, há arquivos desnecessários sendo incluídos.

## Dicas Importantes

- ✅ **Sempre faça backup** antes de fazer upload
- ✅ Certifique-se de fazer upload de **todos os arquivos** da pasta `dist/`
- ✅ Mantenha a **estrutura de pastas** (especialmente a pasta `assets/`)
- ✅ Se usar rotas no React, não esqueça do arquivo `.htaccess`
- ✅ Após o upload, limpe o cache do navegador (Ctrl+F5) para ver as mudanças
- ✅ **Verifique o tamanho do build** antes de fazer upload (deve ser <10MB)

## Comandos Úteis

```bash
# Build do projeto
npm run build

# Preview local (para testar antes de fazer upload)
npm run preview
```
