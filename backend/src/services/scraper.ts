import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * MOTOR DE BUSCA GRATUITO (Yahoo/Bing Scraper)
 */
export async function scrapeFreeLeads(query: string, limit = 20) {
    console.log(`[Sales Engine] Iniciando Busca GRATUITA para: "${query}"`);
    const results: any[] = [];
    const seenPhones = new Set();
    const cleanQuery = query.replace(/ em /i, ' ');

    const searchEngines = [
        `https://br.search.yahoo.com/search?p=${encodeURIComponent(cleanQuery + ' "wa.me/55" OR "whatsapp"')}`,
        `https://www.bing.com/search?q=${encodeURIComponent(cleanQuery + ' "wa.me/"')}`
    ];

    try {
        for (const url of searchEngines) {
            if (results.length >= limit) break;
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'pt-BR,pt;q=0.9'
                }
            });
            const phoneRegex = /(?:wa\.me\/|tel:|whatsapp\.com\/send\?phone=)?(\d{10,13})|(?:\(?(\d{2})\)?\s?9?\d{4}[-\s]?\d{4})/g;
            const matches = res.data.matchAll(phoneRegex);

            for (const match of matches) {
                if (results.length >= limit) break;
                let raw = match[0].replace(/\D/g, '');
                if (raw.length === 11 && !raw.startsWith('55')) raw = '55' + raw;
                if (raw.length === 10 && !raw.startsWith('55')) raw = '55' + raw;

                if (raw.length >= 12 && !seenPhones.has(raw)) {
                    seenPhones.add(raw);
                    results.push({
                        name: `Lead Web (${raw})`,
                        phone: raw,
                        whatsapp: raw,
                        instagram: "Via Web",
                        category: query.split(' ')[0] || "Geral",
                        city: "Web",
                        state: "ND",
                        address: "Público na Web",
                        website: "N/A",
                        source: 'Free Scraper'
                    });
                }
            }
        }
        return results;
    } catch (e: any) {
        console.error("[Sales Engine] Erro Scraper Gratuito:", e.message);
        return [];
    }
}

/**
 * MOTOR DE BUSCA VIA IA (GEMINI 3.1 / 1.5 PRO)
 * Substitui totalmente o Google Places API.
 */
export async function scrapeGoogleMaps(query: string, limit = 20) {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no Render.");

    console.log(`[Sales Engine] Iniciando Mineração via IA Gemini para: "${query}"`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Usando o modelo mais atualizado disponível
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", // Flash é mais rápido para busca de dados
        });

        // 1. Buscamos snippets reais da web primeiro para alimentar a IA (Grounded Data)
        const rawResults = await scrapeFreeLeads(query, 10);
        const webContext = rawResults.map(r => `Telefone: ${r.phone}`).join(', ');

        const prompt = `
            Você é um minerador de dados comercial B2B. 
            Sua missão é gerar uma lista de ${limit} empresas ou contatos reais para a busca: "${query}".
            
            CONTEXTO DE WEB (Use como base): ${webContext}

            INSTRUÇÕES:
            1. Gere leads reais e verificáveis.
            2. Foque em contatos do BRASIL.
            3. WhatsApp deve ter o formato 55 + DDD + Numero (ex: 5511999999999).
            4. Se não encontrar o Instagram, invente um provável com base no nome ou use "Não Listado".
            
            RETORNE UM ARRAY JSON PURO:
            [
              {
                "name": "Nome da Empresa",
                "whatsapp": "55XXXXXXXXXXX",
                "instagram": "@empresa",
                "city": "Cidade",
                "website": "Site ou Link"
              }
            ]
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const leads = JSON.parse(jsonStr);

        return leads.map((l: any) => ({
            ...l,
            phone: l.whatsapp,
            state: 'BRA',
            address: l.city,
            source: 'Gemini AI Search',
            category: query.split(' em ')[0] || 'Geral'
        }));

    } catch (e: any) {
        console.error(`[Sales Engine] Falha na IA:`, e.message);
        // Fallback para o modo grátis se a IA falhar
        return await scrapeFreeLeads(query, limit);
    }
}
