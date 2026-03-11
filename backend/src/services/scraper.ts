import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Scraper 2.0 - No-Puppeteer Strategy
 * Uses Gemini 2.0 Flash with Google Search Grounding (Available in 2026)
 * to find leads directly without a browser.
 */
export async function scrapeGoogleMaps(query: string, limit = 20) {
    console.log(`[Gemini Engine] Radar scanning for "${query}" (limit: ${limit})`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY missing!");
        return [];
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // Define model with Google Search Tool enabled
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{ googleSearch: {} }]
        } as any);

        const prompt = `Atue como um especialista em prospecção de vendas B2B (Março de 2026).
        Sua tarefa é encontrar empresas reais através do Google Search Grounding.
        Query de busca: "${query}".
        Encontre ${limit} resultados.
        
        Para cada empresa, extraia:
        - name: Nome do local
        - phone: Telefone com DDD (ex: (34) 99999-9999)
        - whatsapp: Apenas números com prefixo 55 (ex: 5534999999999)
        - instagram: Username do instagram (@perfil)
        
        IMPORTANTE: Retorne APENAS um bloco de código JSON contendo um array de objetos. 
        Não explique nada, não dê introduções.
        Formato esperado: [{"name": "...", "phone": "...", "whatsapp": "...", "instagram": "..."}]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        console.log("[Gemini Raw Response]:", rawText.substring(0, 500) + "...");

        // Robust JSON Extraction
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("[Gemini Engine] Nenhum JSON encontrado na resposta.");
            return [];
        }

        const leads = JSON.parse(jsonMatch[0]);
        console.log(`[Gemini Engine] Sucesso: ${leads.length} leads extraídos.`);
        return leads;

    } catch (error: any) {
        console.error("[Gemini Engine] Erro fatal:", error);
        return [];
    }
}
