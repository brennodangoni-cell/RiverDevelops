# 🚀 Como Fazer o Deploy do RiverTasks na Hostinger

Olá! Como combinamos, aqui estão as dicas perfeitas para colocar o seu novo sistema **RiverTasks** no ar na Hostinger, juntamente com o site.

## 1. Topologia Recomendada

O seu site React gera uma pasta `dist` após você rodar `npm run build`. 
O `backend` foi feito em Node.js com SQLite para rodar lindamente local, mas na Hostinger (produção), você tem duas opções principais:

### Opção A: CPanel (Hospedagem Compartilhada)
1. **Banco de Dados**: Se preferir não usar o SQLite local em produção, crie um **MySQL Database** pelo painel da Hostinger.
   - *Dica:* Mas o nosso código atual usa o SQLite (`rivertasks.db`). A Hostinger roda arquivos SQLite localmente na pasta sem problemas através do Node App! Apenas garanta que ele não seja acessível pela URL.
2. **Frontend (React)**: Pegue todo o conteúdo da pasta `dist/` recém buildada e envie para a raiz do seu site: `public_html/`.
3. **Backend (Node.js)**: 
   - No painel da Hostinger, procure por **Node.js App**.
   - Crie uma aplicação Node e marque a pasta raiz (ex: `/home/user/backend`).
   - Copie a pasta `backend` para essa raiz e instale as dependências.
   - Certifique-se de compilar o Node (`npm run build` ou `npx tsc`) e apontar o painel para iniciar pelo `dist/index.js`.
   - **Importante:** Como seu domínio do React vai bater no `meusite.com` e sua API rodará internamente na Hostinger, você precisa garantir que o React chame a sua API. Se for colocar tudo na Hostinger e configurar o React, você pode precisar usar `https://api.meusite.com` nas requisições do seu painel e lá configurar o Node.js App.

---

## 2. Dica de Ouro Se Você Quiser Facilitar (Server Unificado)

Para facilitar ainda mais o deploy: se você rodar o seu app Node na Hostinger como serviço web (na Porta 80 via NodeJS App Cpanel) ou via VPS (`PM2`), você pode compilar o Frontend e apontar o Express (`backend/src/index.ts`) para servir a pasta estática `/dist` do frontend na mesma url do Node App!

```typescript
// Adicione isso no seu index.ts do backend no futuro se quiser server Tudo-em-um:
import path from 'path';
// ...depois de app.use() das apis...
app.use(express.static(path.join(__dirname, '../../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});
```

E voilà! Basta colocar a porta da Hostinger, subir a pasta de backend com sua base, subir o `dist`, e ele entregará tanto a API quanto a landing page + o painel `/admin`!

## 3. Resumo Pra Você Testar Localmente AGORA
Você precisa de *duas* janelas de terminal abertas na pasta do projeto:
1. `cd backend && npm run dev` -> Irá rodar a API (RiverTasks) na porta 3000.
2. `npm run dev` -> Irá rodar o Site na porta 5173 (ou 3001) e usar a API internamente via Proxy.

Acesse: `http://localhost:3001/admin/login` e tente logar com `Turbalada`, senha: `admin123`. Todo o design "River" estará ativo!

Boa sorte! A River vai dominar! 🌊🚀
