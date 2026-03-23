import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SALES ENGINE 4.0 - PERFECT REFACTOR
 * Objetivo: Mineração de leads via IA de alta performance sem dependência de APIs de Mapas.
 */

// Função interna de auxílio para extração bruta da web
async function fetchWebSnippets(query: string) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + ' "whatsapp" OR "wa.me/"')}`;
    try {
        const res = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            },
            timeout: 8000
        });
        return res.data;
    } catch (e) {
        return "";
    }
}

export async function scrapeGoogleMaps(query: string, limit = 20) {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY ausente no Render.");

    console.log(`[Sales Engine 4.0] Iniciando Refatoração Perfeita para: "${query}"`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

        // Coleta contexto real da web (snippets)
        const htmlContext = await fetchWebSnippets(query);

        const prompt = `
            Você é um LeadScraper Expert. Sua missão é extrair ou gerar leads reais de empresas/contatos para: "${query}".
            Use este contexto da web capturado agora: "${htmlContext.slice(0, 5000)}"

            MANDATOS:
            1. Encontre exatamente ${limit} leads.
            2. WhatsApp formato 55 + DDD + Numero (ex: 5511999999999).
            3. Descubra nome, whatsapp, instagram, cidade e site. 
            4. Se não houver dados reais no contexto, use sua base de conhecimento para sugerir empresas reais do ramo nessa cidade.
            
            RETORNE APENAS O ARRAY JSON PURO:
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

        console.log(`[Sales Engine 4.0] Resposta da IA (Raw):`, responseText.slice(0, 500));

        // Extrator de JSON por Regex (Blindado)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("[Sales Engine 4.0] IA não retornou um formato JSON válido.");
            throw new Error(`A IA retornou um formato inválido. Ela disse: ${responseText.slice(0, 100)}...`);
        }

        const jsonStr = jsonMatch[0];
        const leads = JSON.parse(jsonStr);

        console.log(`[Sales Engine 4.0] Sucesso: ${leads.length} leads minerados.`);

        return leads.map((l: any) => ({
            ...l,
            phone: l.whatsapp,
            state: 'BRA',
            address: l.city || 'Brasil',
            source: 'Gemini AI Pro 4.0',
            category: query.split(' em ')[0] || 'Geral'
        }));

    } catch (e: any) {
        const errorMsg = e.message || "Erro desconhecido na rede";
        console.error(`[Sales Engine 4.0] Erro Real Detector:`, errorMsg);

        // Passamos o erro REAL para o frontend agora
        throw new Error(`Instabilidade na IA: ${errorMsg}`);
    }
}

// Mantemos o nome da função antiga apenas para não quebrar as rotas do backend
export async function scrapeFreeLeads(query: string, limit = 20) {
    return await scrapeGoogleMaps(query, limit);
}
