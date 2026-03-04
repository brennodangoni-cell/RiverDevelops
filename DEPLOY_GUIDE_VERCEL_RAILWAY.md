# 🚀 Guia de Deploy Oficial (Vercel + Railway)

Esse projeto está separado em Front-end (React/Vite) na Vercel e Back-end (Node.js/SQLite) no Railway. Nenhuma configuração da Hostinger é necessária.

## 1. 🌐 FRONT-END (Vercel)
O seu Front-end é hospedado na **Vercel**, conectada no seu **GitHub**.

### Como funciona:
Toda vez que uma alteração é salva no Github (`git push origin main`), a Vercel percebe a mudança, executa o Build (`npm run build`) e sobe a nova versão pro ar automaticamente.

**Nota importante sobre Erros:**
A Vercel executa uma verificação rigorosa de Typescript. Se houver falhas tipo imports não usados ou erros de tipo, o deploy da Vercel falha e as alterações *não* vão pro ar! Por isso, assegure-se de que não tem erros rodando `npm run build` localmente antes.

---

## 2. ⚙️ BACK-END (Railway)
A API Node.js (banco de dados SQLite com as tarefas e vídeos) roda no **Railway**.
O deploy do backend foi desvinculado do GitHub principal (estúdio de vídeos) para não sujar o Front-end, então o deploy dele é feito via **Railway CLI**.

### Como atualizar a API:
1. Abra o terminal.
2. Navegue até a pasta do backend: `cd backend`
3. Execute o comando:
```bash
railway up
```
4. O Railway fará o upload dos arquivos apenas do backend e rodará sua API.

### Variáveis de Ambiente do Railway:
O seu front-end aponta as requisições para a API do Railway graças ao arquivo `vercel.json` na pasta do frontend, que diz que tudo que começar com `/api/*` vai ser jogado para:
`https://river-tasks-production.up.railway.app/api/*`

Se por algum motivo a URL do Railway mudar no futuro, é no **vercel.json** que você altera!

## Resumo Operacional:
- **Alterou o Front (telas, css, botões)?** `git add .`, `git commit -m "update"`, `git push`. A Vercel puxa do Github e resolve.
- **Alterou o Back (banco de dados, rotas de API)?** Entra na pasta `/backend` pelo terminal e digita `railway up`. 
