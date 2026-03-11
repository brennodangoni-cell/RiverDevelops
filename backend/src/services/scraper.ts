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

        // Migrando para Gemini 3 conforme solicitado (Março de 2026)
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            tools: [{ googleSearch: {} }] as any
        } as any);

        const prompt = `Você é uma ferramenta de busca B2B de alta precisão. (Data Atual: Março de 2026).
        Sua missão é PESQUISAR no Google agora e encontrar exatamente ${limit} empresas de "${query}".
        
        Para cada empresa encontrada, você DEVE extrair:
        1. name: Nome fantasia da empresa
        2. phone: Telefone (formato legível, ex: (34) 99999-9999)
        3. whatsapp: Apenas números com prefixo 55 (ex: 5534999999999)
        4. instagram: Handle (@perfil) ou "Não Listado"
        
        REGRAD DE OURO:
        - Retorne APENAS um array JSON.
        - Não escreva textos explicativos antes ou depois.
        - Se não encontrar os ${limit}, retorne o máximo que conseguir.
        
        FORMATO DO JSON:
        [{"name": "Empresa X", "phone": "(11) 98888-7777", "whatsapp": "5511988887777", "instagram": "@empresa_x"}]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("[Sales Engine] Resposta Bruta da IA (Primeiros 200 caracteres):", text.substring(0, 200));

        // Limpeza agressiva para garantir que só o JSON entre no parser
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
            console.error("[Sales Engine] Resposta sem formato JSON:", text);
            throw new Error("A IA respondeu mas os dados não vieram no formato correto. Verifique o termo de busca.");
        }

        const leads = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error("Busca concluída, mas 0 resultados reais foram encontrados para este nicho/cidade.");
        }

        console.log(`[Sales Engine] Extração concluída com sucesso: ${leads.length} leads.`);
        return leads;

    } catch (error: any) {
        console.error("[Sales Engine] Erro Crítico no Scraper:", error);

        // Se for erro de quota ou segurança da Google
        if (error.message?.includes("quota") || error.message?.includes("Safety")) {
            throw new Error("A API do Gemini parou por limite de uso ou restrição de conteúdo. Tente novamente em instantes.");
        }

        throw new Error("Falha no Radar IA: " + (error.message || "Erro desconhecido na conexão com a Google AI"));
    }
}
