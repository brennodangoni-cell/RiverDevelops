const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initWhatsApp, getQrCode, getStatus, sendCampaignMessage } = require('./whatsapp');
const { scrapeGoogleMaps } = require('./scraper');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'history.json');
const getDB = () => {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ searches: [], leads: [], sent: [] }));
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
getDB(); // Init

console.log("Iniciando motor do WhatsApp...");
initWhatsApp();

app.get('/api/wa/status', (req, res) => {
    res.json({ isReady: getStatus(), qr: getQrCode() });
});

app.post('/api/wa/disconnect', async (req, res) => {
    const { disconnectWhatsApp } = require('./whatsapp');
    const success = await disconnectWhatsApp();
    res.json({ success });
});

app.post('/api/wa/send', async (req, res) => {
    const { number, message, video, leadName } = req.body;
    if (!number || !message) return res.status(400).json({ error: "Missing number or message" });

    const result = await sendCampaignMessage(number, message, video ? `./videos/${video}` : null);

    const db = getDB();
    db.sent.unshift({
        name: leadName || "Desconhecido",
        number,
        status: result.success ? "Sucesso" : "Falhou (" + result.error + ")",
        date: new Date().toISOString()
    });
    if (db.sent.length > 500) db.sent.length = 500;
    saveDB(db);

    res.json(result);
});

app.post('/api/scraper/maps', async (req, res) => {
    // Agora aceita a Chave do Google para burlar raspagem visual pesada
    const { query, limit, apiKey } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    try {
        const leads = await scrapeGoogleMaps(query, Number(limit) || 20, apiKey);

        const db = getDB();
        db.searches.unshift({ query, count: leads.length, date: new Date().toISOString() });
        if (db.searches.length > 50) db.searches.length = 50;

        leads.forEach(l => {
            if (!db.leads.find(x => x.whatsapp === l.whatsapp)) {
                db.leads.push({ ...l, source: query, date: new Date().toISOString() });
            }
        });
        saveDB(db);

        res.json({ success: true, count: leads.length, leads });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/history', (req, res) => {
    res.json(getDB());
});

app.listen(port, () => console.log(`Backend Lead Machine rodando na porta ${port}`));
