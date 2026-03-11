const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

puppeteer.use(StealthPlugin());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// ========== SELETORES (Google Maps muda frequentemente - múltiplos fallbacks) ==========
const SELECTORS = {
    // Links dos resultados na sidebar (ordem: mais estável primeiro)
    businessLinks: [
        'a.hfpxzc',
        'a[href*="/maps/place/"]',
        'a[data-tooltip="Abrir no Google Maps"]',
        '[role="feed"] a[href*="place"]'
    ],
    // Container do sidebar para scroll
    sidebar: [
        'div[role="feed"]',
        '.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd',
        '[role="main"] [role="feed"]'
    ],
    // Painel de detalhes da loja
    detailPanel: [
        '.e07Vkf.kA9KIf',
        '.dS8AEf.ecceSd',
        '[role="main"]'
    ],
    // Botões para expandir seção (Instagram pode estar aqui)
    expandButtons: [
        'button[aria-label*="Sobre"]',
        'button[aria-label*="About"]',
        '[data-item-id="authority"]',
        'button:has-text("Sobre")',
        '[role="button"]:has-text("Links")'
    ]
};

// ========== EXTRAÇÃO DIRETA (não depende da IA) ==========
function extractFromDOM(html, text, links) {
    const result = { name: null, phone: null, whatsapp: null, instagram: null };

    // 0. Nome - primeira linha do texto (padrão Google Maps: "Nome - Rating - Categoria")
    const firstLine = text.split('\n').find(l => l.trim().length > 2);
    if (firstLine) {
        const namePart = firstLine.split(' - ')[0] || firstLine.split(' · ')[0];
        if (namePart && namePart.length > 2 && namePart.length < 120) {
            result.name = namePart.trim();
        }
    }

    // 1. WhatsApp - prioridade para links wa.me (mais confiável)
    const waMatch = links.match(/wa\.me\/(\d+)/) || html.match(/wa\.me\/(\d+)/);
    if (waMatch) {
        let num = waMatch[1].replace(/\D/g, '');
        if (num.length >= 10 && !num.startsWith('55')) num = '55' + num;
        result.whatsapp = num;
    }

    // 2. Instagram - links diretos (instagram.com ou l.instagram.com)
    const igMatch = (links + '\n' + html).match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
    if (igMatch) {
        let handle = igMatch[1].replace(/\/$/, '').split('?')[0];
        if (handle && !['p', 'reel', 'stories', 'direct'].includes(handle)) {
            result.instagram = handle.startsWith('@') ? handle : '@' + handle;
        }
    }

    // 3. Instagram - @handle no texto
    if (!result.instagram) {
        const atMatch = text.match(/@([a-zA-Z0-9_.]{1,30})(?:\s|$|,|\.)/);
        if (atMatch) result.instagram = '@' + atMatch[1];
    }

    // 4. Telefone - tel: ou padrão brasileiro
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

// ========== IA (fallback e enriquecimento) ==========
async function extractWithAI(bundle) {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
        const prompt = `Você é um extrator de dados de negócios no Google Maps.
Analise o CONTEÚDO abaixo (texto + links) e extraia:

1. name: Nome do estabelecimento (primeira linha/título geralmente)
2. phone: Telefone no formato (XX) XXXXX-XXXX ou similar
3. instagram: Handle do Instagram - procure por:
   - Links como instagram.com/usuario
   - Menções com @usuario no texto
   - Se não encontrar, retorne null

Retorne APENAS JSON puro, sem markdown:
{"name": "string ou null", "phone": "string ou null", "instagram": "@handle ou null"}

CONTEÚDO:
${bundle.substring(0, 12000)}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```|\n/g, "").trim();
        const parsed = JSON.parse(text);
        return parsed;
    } catch (e) {
        console.error("[IA] Erro:", e.message);
        return null;
    }
}

// ========== SCROLL ==========
async function autoScrollSidebar(page, targetCount) {
    await page.evaluate(async (target) => {
        const sidebar = document.querySelector('div[role="feed"]') || document.querySelector('.m6QErb') || document.body;
        if (!sidebar) return;
        await new Promise((resolve) => {
            let count = 0;
            const timer = setInterval(() => {
                sidebar.scrollBy?.(0, 400);
                const links = document.querySelectorAll('a.hfpxzc, a[href*="/maps/place/"]');
                if (links.length >= target || count++ > 50) {
                    clearInterval(timer);
                    resolve();
                }
            }, 500);
            setTimeout(() => { clearInterval(timer); resolve(); }, 25000);
        });
    }, targetCount);
}

/**
 * Scroll inteligente: encontra TODOS os elementos scrolláveis e rola até o fim.
 * Combina: (1) jump ao fim + (2) scroll incremental para trigger lazy-load.
 */
async function scrollAllScrollablesToBottom(page) {
    await page.evaluate(async () => {
        const scrollables = [];
        const walk = (el) => {
            if (!el || scrollables.includes(el)) return;
            if (el.scrollHeight > el.clientHeight + 10) scrollables.push(el);
            for (const child of el.children || []) walk(child);
        };
        walk(document.body);
        const all = [...new Set([...scrollables, document.documentElement, document.body])];

        for (let round = 0; round < 4; round++) {
            for (const el of all) {
                if (el.scrollHeight <= el.clientHeight) continue;
                el.scrollTop = el.scrollHeight;
                el.scrollBy?.(0, 99999);
            }
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(r => setTimeout(r, 400));
        }
        // Scroll incremental no maior container (trigger lazy-load que só ativa ao rolar)
        const main = all.find(e => e.scrollHeight > 2000) || document.body;
        if (main && main.scrollHeight > main.clientHeight) {
            for (let i = 0; i < 25; i++) {
                main.scrollTop = Math.min(main.scrollTop + 500, main.scrollHeight);
                main.scrollBy?.(0, 500);
                await new Promise(r => setTimeout(r, 300));
            }
        }
    });
    await new Promise(r => setTimeout(r, 2000));
}

// ========== EXPANDIR SEÇÕES (Instagram pode estar em botões expandíveis) ==========
async function expandBusinessSections(page) {
    try {
        const buttons = await page.$$('button[aria-expanded="false"], [role="button"][aria-expanded="false"]');
        for (let i = 0; i < Math.min(buttons.length, 6); i++) {
            try {
                await buttons[i].click();
                await new Promise(r => setTimeout(r, 800));
            } catch (_) {}
        }
        await scrollAllScrollablesToBottom(page);
        await new Promise(r => setTimeout(r, 2000));
    } catch (_) {}
}

// ========== OBTER LINKS DO DOM (inclui data-href, onclick, etc) ==========
async function getPageBundle(page) {
    return await page.evaluate(() => {
        const allLinks = [];
        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href') || '';
            if (href.includes('instagram') || href.includes('wa.me') || href.includes('whatsapp') || href.startsWith('tel:')) {
                allLinks.push(href);
            }
        });
        document.querySelectorAll('[data-url], [data-href], [data-uri]').forEach(el => {
            const url = el.getAttribute('data-url') || el.getAttribute('data-href') || el.getAttribute('data-uri') || '';
            if (url.includes('instagram') || url.includes('wa.me')) allLinks.push(url);
        });
        // Buscar instagram.com em todo o HTML (links em JSON, data-attrs, etc)
        const html = document.body?.innerHTML || '';
        const igUrls = html.match(/https?:\/\/[^"'\s<>]*instagram\.com\/[a-zA-Z0-9_.]+/g) || [];
        igUrls.forEach(u => allLinks.push(u));
        const linksText = allLinks.join('\n');
        const bodyText = document.body?.innerText || '';
        const bodyHTML = document.body?.innerHTML || '';
        // Nome do negócio - h1 ou primeiro título visível
        let domName = null;
        const h1 = document.querySelector('h1');
        if (h1?.innerText?.trim()) domName = h1.innerText.trim();
        if (!domName) {
            const firstLine = bodyText.split('\n').find(l => l.trim().length > 3);
            if (firstLine) domName = (firstLine.split(' - ')[0] || firstLine.split(' · ')[0] || firstLine).trim();
        }
        return { text: bodyText, html: bodyHTML.substring(0, 50000), links: linksText, domName };
    });
}

// ========== OBTER LINKS DE NEGÓCIOS ==========
async function getBusinessLinks(page) {
    return await page.evaluate(() => {
        const selectors = ['a.hfpxzc', 'a[href*="/maps/place/"]'];
        const seen = new Set();
        for (const sel of selectors) {
            try {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    const href = el?.href;
                    if (href && href.includes('/maps/place/') && !seen.has(href)) {
                        seen.add(href);
                    }
                }
            } catch (_) {}
        }
        return Array.from(seen);
    });
}

// ========== MERGE DADOS (extração direta + IA) ==========
function mergeLeadData(direct, aiData, domName = null, defaultName = "Desconhecido") {
    const name = domName || aiData?.name || direct.name || defaultName;
    const phone = direct.phone || aiData?.phone || "Não Listado";
    let whatsapp = direct.whatsapp;
    if (!whatsapp && phone !== "Não Listado") {
        whatsapp = String(phone).replace(/\D/g, '');
        if (whatsapp.length >= 10 && !whatsapp.startsWith('55')) whatsapp = '55' + whatsapp;
    }
    const instagram = direct.instagram || aiData?.instagram || "Não Listado";
    return { name, phone, whatsapp: whatsapp || "", instagram };
}

// ========== SCRAPER PRINCIPAL ==========
async function scrapeGoogleMaps(query, limit = 20, _apiKey = null) {
    console.log(`[LeadMachine] Iniciando: "${query}" (limite: ${limit})`);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,1024'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Aguardar resultados - tentar múltiplos seletores
        let found = false;
        for (const sel of SELECTORS.businessLinks) {
            try {
                await page.waitForSelector(sel, { timeout: 5000 });
                found = true;
                break;
            } catch (_) {}
        }
        if (!found) {
            console.error("[Erro] Nenhum resultado encontrado. O Google Maps pode ter mudado a estrutura.");
            await browser.close();
            return [];
        }

        await autoScrollSidebar(page, limit);
        await new Promise(r => setTimeout(r, 1500));

        const businessLinks = await getBusinessLinks(page);
        if (!businessLinks.length) {
            console.error("[Erro] Nenhum link de negócio encontrado.");
            await browser.close();
            return [];
        }

        console.log(`[LeadMachine] ${businessLinks.length} negócios encontrados. Extraindo dados...`);

        const leads = [];
        const toProcess = businessLinks.slice(0, limit);

        for (let i = 0; i < toProcess.length; i++) {
            const url = toProcess[i];
            try {
                console.log(`[${i + 1}/${toProcess.length}] Processando...`);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await new Promise(r => setTimeout(r, 3000));

                await expandBusinessSections(page);

                await new Promise(r => setTimeout(r, 1500));
                const bundle = await getPageBundle(page);
                const direct = extractFromDOM(bundle.html, bundle.text, bundle.links);

                const fullBundle = bundle.text + "\n--- LINKS ---\n" + bundle.links;
                const aiData = await extractWithAI(fullBundle);

                const lead = mergeLeadData(direct, aiData, bundle.domName);
                if (lead.name && lead.name !== "Desconhecido") {
                    leads.push({
                        name: lead.name,
                        phone: lead.phone,
                        whatsapp: lead.whatsapp,
                        instagram: lead.instagram,
                        raw: bundle.text.substring(0, 500)
                    });
                    console.log(`  ✓ ${lead.name} | Tel: ${lead.phone !== "Não Listado" ? "✓" : "✗"} | Insta: ${lead.instagram !== "Não Listado" ? lead.instagram : "✗"}`);
                }
            } catch (err) {
                console.log(`  ✗ Erro no lead ${i + 1}: ${err.message}`);
            }
        }

        await browser.close();
        console.log(`[LeadMachine] Concluído: ${leads.length} leads extraídos.`);
        return leads;
    } catch (e) {
        console.error("[Erro fatal]", e);
        try { await browser.close(); } catch (_) {}
        return [];
    }
}

module.exports = { scrapeGoogleMaps };
