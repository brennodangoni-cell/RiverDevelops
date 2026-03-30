import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

/**
 * SALES ENGINE 4.0 - PERFECT REFACTOR
 * Objetivo: Mineração de leads via IA de alta performance SEM alucinações (inventar números/instagram).
 */

// Função interna de auxílio para extração bruta da web via Yahoo + Cheerio
async function fetchWebSnippets(query: string) {
    const searchUrl = 'https://br.search.yahoo.com/search?p=';
    const enhancedQuery = query + ' "whatsapp" OR "wa.me"';
    try {
        const res = await axios.get(searchUrl + encodeURIComponent(enhancedQuery), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 8000
        });
        const $ = cheerio.load(res.data);
        const results: string[] = [];
        $('.algo').each((i, el) => {
            const title = $(el).find('h3').text().trim();
            const snippet = $(el).find('.compTitle ~ div').text().trim();
            if (title || snippet) {
                results.push(`Título: ${title}\nContexto: ${snippet}`);
            }
        });
        return results.join('\n\n');
    } catch (e: any) {
        console.warn("[Sales Engine 4.0] Erro ao buscar snippets no Yahoo:", e.message);
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

        // Coleta contexto real da web (snippets puros, filtrados)
        const htmlContext = await fetchWebSnippets(query);

        const prompt = `
            Você é um LeadScraper Expert. Sua missão é extrair leads REAIS de empresas/contatos para: "${query}".
            Use ESTES DADOS DA WEB capturados agora (E APENAS ELES):
            
            """
            ${htmlContext.slice(0, 8000)}
            """

            INSTRUÇÕES CRÍTICAS E OBRIGATÓRIAS:
            1. Encontre até ${limit} leads baseando-se RIGOROSAMENTE nos resultados da web acima. Se houver APENAS 1 ou 2 leads no texto, retorne apenas 1 ou 2. Retorne o máximo que conseguir SEM inventar.
            2. WhatsApp formato 55 + DDD + Numero (ex: 5511999999999).
            3. Descubra nome, whatsapp, instagram, cidade e o ESTADO (apenas a sigla, ex: SP, MG, RJ). 
            4. PROIBIDO INVENTAR OU ALUCINAR DADOS. Retorne APENAS informações (números de telefone, nomes, instagrams) que aparecerem no texto da web fornecido.
            5. Se algum dado (como instagram, whatsapp ou cidade) não for encontrado para uma empresa no texto, deixe em branco "". Porém, todo lead PRECISA ter pelo menos Nome E WhatsApp.
            6. NÃO invente telefones aleatórios. NÃO invente instagrams. A informação DEVE refletir estritamente o texto recebido.
            
            RETORNE APENAS O ARRAY JSON PURO E ESTRITAMENTE FORMATADO:
            [
              {
                "name": "Nome da Empresa real do texto",
                "whatsapp": "55XXXXXXXXXXX",
                "instagram": "@empresa ou vazio",
                "city": "Cidade ou vazia",
                "state": "UF ou vazio",
                "website": "Site ou Link ou vazio"
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
            return [];
        }

        const jsonStr = jsonMatch[0];
        const leads = JSON.parse(jsonStr);

        console.log(`[Sales Engine 4.0] Sucesso: ${leads.length} leads minerados no Yahoo.`);

        return leads.map((l: any) => ({
            ...l,
            phone: l.whatsapp,
            state: l.state || 'ND',
            address: l.city || 'Brasil',
            source: 'Gemini IA (Yahoo)',
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
