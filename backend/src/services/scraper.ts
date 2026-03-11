const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleGenerativeAI } = require("@google/generative-ai");

puppeteer.use(StealthPlugin());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ========== SELECTORS (Google Maps often changes) ==========
const SELECTORS = {
    businessLinks: [
        'a.hfpxzc',
        'a[href*="/maps/place/"]',
        'a[data-tooltip="Abrir no Google Maps"]',
        '[role="feed"] a[href*="place"]'
    ]
};

// ========== DATA EXTRACTION FROM DOM ==========
function extractFromDOM(html: string, text: string, links: string) {
    const result: any = { name: null, phone: null, whatsapp: null, instagram: null };

    // Name - first line of text
    const firstLine = text.split('\n').find(l => l.trim().length > 2);
    if (firstLine) {
        const namePart = firstLine.split(' - ')[0] || firstLine.split(' · ')[0];
        if (namePart && namePart.length > 2 && namePart.length < 120) {
            result.name = namePart.trim();
        }
    }

    // WhatsApp - wa.me links
    const waMatch = links.match(/wa\.me\/(\d+)/) || html.match(/wa\.me\/(\d+)/);
    if (waMatch) {
        let num = waMatch[1].replace(/\D/g, '');
        if (num.length >= 10 && !num.startsWith('55')) num = '55' + num;
        result.whatsapp = num;
    }

    // Instagram
    const igMatch = (links + '\n' + html).match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
    if (igMatch) {
        let handle = igMatch[1].replace(/\/$/, '').split('?')[0];
        if (handle && !['p', 'reel', 'stories', 'direct'].includes(handle)) {
            result.instagram = handle.startsWith('@') ? handle : '@' + handle;
        }
    }

    // Phone / Alternative Whatsapp
    const telMatch = html.match(/tel:([+\d\s\-()]+)/) || text.match(/\(?\d{2}\)?\s*\d{4,5}[\s\-]?\d{4}/);
    if (telMatch) {
        const raw = (telMatch[1] || telMatch[0]).replace(/\D/g, '');
        if (raw.length >= 10) {
            result.phone = telMatch[1] || telMatch[0];
            if (!result.whatsapp) {
                let w = raw;
                if (!w.startsWith('55')) w = '55' + w;
                result.whatsapp = w;
            }
        }
    }

    return result;
}

// ========== AI EXTRACTION (Fallback) ==========
async function extractWithAI(bundle: string) {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
        const prompt = `Analise o CONTEÚDO abaixo (texto + links) e extraia:
1. name: Nome do estabelecimento
2. phone: Telefone
3. instagram: Handle (@handle) do Instagram

Retorne APENAS JSON puro:
{"name": "string ou null", "phone": "string ou null", "instagram": "@handle ou null"}

CONTEÚDO:
${bundle.substring(0, 10000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```|\n/g, "").trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("[IA] Erro:", e);
        return null;
    }
}

async function autoScrollSidebar(page: any, target: number) {
    await page.evaluate(async (targetCount: number) => {
        const sidebar = document.querySelector('div[role="feed"]') || document.querySelector('.m6QErb') || document.body;
        if (!sidebar) return;
        await new Promise((resolve) => {
            let count = 0;
            const timer = setInterval(() => {
                sidebar.scrollBy?.(0, 400);
                const links = document.querySelectorAll('a.hfpxzc, a[href*="/maps/place/"]');
                if (links.length >= targetCount || count++ > 30) {
                    clearInterval(timer);
                    resolve(true);
                }
            }, 500);
            setTimeout(() => { clearInterval(timer); resolve(false); }, 15000);
        });
    }, target);
}

export async function scrapeGoogleMaps(query: string, limit = 20) {
    console.log(`[Scraper] Searching for "${query}" (limit: ${limit})`);

    const browser = await puppeteer.launch({
        headless: true, // Render fails on headless: false
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        await autoScrollSidebar(page, limit);

        const businessLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('a.hfpxzc, a[href*="/maps/place/"]');
            return Array.from(new Set(Array.from(links).map((a: any) => a.href))).filter(h => h.includes('place'));
        });

        const leads = [];
        const toProcess = businessLinks.slice(0, limit);

        for (const url of toProcess) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await new Promise(r => setTimeout(r, 2000));

                const bundle = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href]')).map((a: any) => a.href).join('\n');
                    const text = document.body.innerText;
                    const html = document.body.innerHTML.substring(0, 30000);
                    return { text, html, links };
                });

                const direct = extractFromDOM(bundle.html, bundle.text, bundle.links);
                const aiData = await extractWithAI(bundle.text + "\n" + bundle.links);

                const finalName = aiData?.name || direct.name || "Desconhecido";
                const lead = {
                    name: finalName,
                    phone: direct.phone || aiData?.phone || "Não Listado",
                    whatsapp: direct.whatsapp || (direct.phone ? direct.phone.replace(/\D/g, '') : ""),
                    instagram: direct.instagram || aiData?.instagram || "Não Listado"
                };

                if (lead.name !== "Desconhecido") leads.push(lead);
            } catch (_) { }
        }

        await browser.close();
        return leads;
    } catch (e) {
        console.error("[Scraper] Fatal error:", e);
        try { await browser.close(); } catch (_) { }
        return [];
    }
}
