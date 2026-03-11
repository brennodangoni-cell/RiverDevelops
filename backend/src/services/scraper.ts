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
            // Required for 2026 searching
            tools: [{ googleSearch: {} }]
        } as any); // Cast as any if TS types for tools are not latest

        const prompt = `Atue como um especialista em prospecção B2B (Data: Março de 2026).
        Pesquise por estabelecimentos/empresas de: "${query}".
        Extraia uma lista de EXATAMENTE ${limit} empresas.
        
        IMPORTANTE: Use sua busca do Google (Grounding) para encontrar dados REAIS desse ano.
        Para cada empresa, eu preciso:
        1. name: Nome fantasia
        2. phone: Telefone (ex: +55DDDNÚMERO)
        3. whatsapp: Apenas os dígitos (ex: 5534999999999)
        4. instagram: Handle do instagram (@usuario)
        
        Retorne APENAS um JSON puro no formato de array de objetos:
        [
          {"name": "...", "phone": "...", "whatsapp": "55...", "instagram": "@..."}
        ]
        Não inclua markdown nem textos fora do JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let textResult = response.text();

        // Safety cleanup for common AI responses
        textResult = textResult.replace(/```json|```|\[json\]/g, "").trim();

        const leads = JSON.parse(textResult);

        console.log(`[Gemini Engine] Encontrados ${leads.length} leads.`);
        return leads;

    } catch (error: any) {
        console.error("[Gemini Engine] Erro na busca:", error);
        return [];
    }
}
