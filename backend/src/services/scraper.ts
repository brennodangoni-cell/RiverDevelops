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

        const prompt = `Você é um ROBÔ DE PRECISÃO CIRÚRGICA focado em dados REAIS. (Março de 2026).
        Sua tarefa é encontrar EXATAMENTE ${limit} empresas para: "${query}".

        ⚠️ REGRAS DE OURO (NÃO DESOBEDEÇA):
        1. ZERO ALUCINAÇÃO: Não invente arrobas baseados no nome da loja.
        2. FONTE ÚNICA: O Instagram SÓ PODE ser preenchido se você encontrar o LINK REAL no "Painel de Conhecimento" (Knowledge Panel) do Google ou no rodapé do site oficial.
        3. VERIFICAÇÃO: No painel do Google, vá na seção "Perfis" (onde tem os ícones coloridos). Se o ícone do Instagram não estiver lá, o campo "instagram" DEVE ficar vazio "".
        4. LINKS REAIS: Eu quero o arroba que está no final do link (ex: instagram.com/loja_real -> @loja_real).

        Para cada uma das ${limit} empresas, extraia:
        1. name: Nome oficial.
        2. phone: Telefone (ex: (11) 99999-9999).
        3. whatsapp: Apenas números (prefixo 55).
        4. instagram: O @perfil REAL extraído do link oficial. Se não tiver link no painel/site, deixe VAZIO "".
        5. city: Cidade.
        6. state: Sigla.
        7. website: URL oficial. Se não tiver, vazio "".

        PROIBIÇÃO: É proibido colocar "Não Listado", "N/A" ou chutar nomes. Se não tem o botão/ícone de Instagram no Google, o resultado deve ser "".

        SAÍDA (JSON PURO):
        [{"name": "Nome", "phone": "...", "whatsapp": "...", "instagram": "@perfil_real_da_loja", "city": "...", "state": "...", "website": "..."}]`;

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
