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

        const prompt = `Você é um especialista em prospecção B2B (Março de 2026) focado em precisão cirúrgica.
        Sua tarefa é usar a Pesquisa Google AGORA para encontrar EXATAMENTE ${limit} empresas correspondentes a: "${query}".
        
        ESTRATÉGIA DE EXTRAÇÃO (CRITICAL):
        Para cada empresa encontrada nos resultados do Google Maps/Search, você deve:
        1. Localizar o "Painel de Conhecimento" (Knowledge Panel) ou o "Perfil da Empresa no Google".
        2. Ir até a seção "Perfis" ou "Social Profiles" no final do painel (onde aparecem ícones de Instagram, Facebook, etc).
        3. Extrair o link/username do INSTAGRAM diretamente de lá. Essa é a fonte mais confiável.
        4. Se não houver painel lateral, procure no rodapé do site oficial da empresa.
        
        Para cada empresa, extraia rigorosamente:
        1. name: Nome oficial da empresa.
        2. phone: Telefone (ex: (11) 99999-9999).
        3. whatsapp: Apenas números com prefixo 55 (ex: 5511999999999). 
        4. instagram: O username REAL (ex: @lojaexemplo). Se o Google mostrar no painel de "Perfis", use ESSE. Se não encontrar de jeito nenhum, deixe VAZIO "".
        5. city: Cidade.
        6. state: Sigla do estado.
        7. address: Endereço completo.
        8. website: Site oficial. Se não houver, deixe vazio "".
        
        MANDATO: Dê preferência total a empresas que o Google Search mostra com perfis sociais vinculados ou site oficial. 
        
        SAÍDA: APENAS um array JSON puro.
        EXEMPLO: [{"name": "Citerol", "phone": "(34) 3219-6559", "whatsapp": "553432196559", "instagram": "@citeroloficial", ...}]`;

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
