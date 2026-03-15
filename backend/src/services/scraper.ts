import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Scraper 2.0 - No-Puppeteer Strategy
 * Uses Gemini AI with Google Search Grounding to generate leads in real-time.
 */
export async function scrapeGoogleMaps(query: string, limit = 20) {
    console.log(`[Sales Engine] Iniciando busca IA Grounding para: "${query}" (Limite: ${limit})`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Erro de Configuração: GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do Render.");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-pro-preview",
            tools: [{ googleSearch: {} }] as any
        } as any);

        const prompt = `Você é um especialista em prospecção B2B (Março de 2026).
        Sua tarefa é usar a Pesquisa Google AGORA para encontrar EXATAMENTE ${limit} empresas ativas correspondentes a: "${query}".
        
        IMPORTANTE: Você deve encontrar dados REAIS e ATUAIS. Não invente empresas.
        
        Para cada empresa, extraia rigorosamente:
        1. name: Nome oficial da empresa.
        2. phone: Telefone de contato formatado (ex: (11) 99999-9999).
        3. whatsapp: Apenas os números com prefixo 55 (ex: 5511999999999). Se o telefone for celular, use-o como WhatsApp.
        4. instagram: O @perfil do Instagram se disponível, ou "Não Listado".
        5. city: Cidade onde a empresa está localizada.
        6. state: Sigla do estado (ex: SP, RJ, MG).
        7. address: Endereço completo da empresa se disponível.
        8. website: Site da empresa se disponível.
        
        SAÍDA OBRIGATÓRIA:
        Retorne APENAS um array JSON puro, sem markdown, sem explicações.
        Se encontrar menos que ${limit}, retorne o máximo possível.
        
        EXEMPLO:
        [{"name": "Exemplo LTDA", "phone": "(11) 98888-7777", "whatsapp": "5511988887777", "instagram": "@exemplo", "city": "São Paulo", "state": "SP", "address": "Rua Exemplo 123, Centro", "website": "https://exemplo.com.br"}]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("[Sales Engine] Resposta Bruta da IA:", text.substring(0, 300));

        // Limpeza do JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            console.error("[Sales Engine] Resposta sem formato JSON:", text);
            throw new Error("A IA não conseguiu formatar os dados. Tente um termo de busca mais específico.");
        }

        const leads = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(leads) || leads.length === 0) {
            console.warn(`[Sales Engine] 0 leads encontrados para: ${query}`);
            throw new Error("Nenhum lead encontrado para este nicho nesta localização. Tente mudar o nicho ou a cidade.");
        }

        // Adicionar categoria baseada na busca
        const enrichedLeads = leads.map((l: any) => ({
            ...l,
            category: query.split(' em ')[0] || 'Geral'
        }));

        console.log(`[Sales Engine] Extração concluída: ${enrichedLeads.length} leads.`);
        return enrichedLeads;

    } catch (error: any) {
        console.error("[Sales Engine] Erro no Scraper:", error);

        if (error.message?.includes("404") || error.message?.includes("model")) {
            throw new Error(`O modelo gemini-3-flash-preview pode estar indisponível ou em manutenção. Erro: ${error.message}`);
        }

        if (error.message?.includes("quota")) {
            throw new Error("Limite de uso da API atingido. Aguarde alguns minutos.");
        }

        throw new Error("Falha no Radar IA: " + (error.message || "Erro de conexão"));
    }
}
