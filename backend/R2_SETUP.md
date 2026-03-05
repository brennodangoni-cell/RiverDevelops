# Cloudflare R2 – Vídeos > 50MB

O Supabase free tem limite de **50MB por arquivo**. Para vídeos maiores (ex: 70MB), use **Cloudflare R2** (grátis, 10GB de armazenamento).

## 1. Criar bucket no Cloudflare

1. Acesse [cloudflare.com](https://cloudflare.com) → **R2** → **Create bucket**
2. Nome do bucket: ex. `rivertasks-uploads`
3. **Settings** do bucket → **Public access** → **Allow Access** → escolha **R2.dev subdomain**
4. Copie a URL pública (ex: `https://pub-xxxxx.r2.dev`)

## 2. Criar API Token

1. R2 → **Manage R2 API Tokens** → **Create API token**
2. Permissões: **Object Read & Write**
3. Copie **Access Key ID** e **Secret Access Key**

## 3. Account ID

No dashboard do Cloudflare, na barra lateral direita da página R2, copie o **Account ID**.

## 4. Variáveis no .env do backend

```env
R2_ACCOUNT_ID=seu_account_id
R2_ACCESS_KEY_ID=access_key_do_token
R2_SECRET_ACCESS_KEY=secret_key_do_token
R2_BUCKET_NAME=rivertasks-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## 5. Reiniciar o backend

Após configurar, reinicie o servidor. Arquivos > 50MB passarão a ser enviados automaticamente para o R2.
