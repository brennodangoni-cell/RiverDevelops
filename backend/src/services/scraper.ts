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

        const prompt = `Você é um ESPECIALISTA EM INVESTIGAÇÃO DIGITAL e Prospecção B2B (Março de 2026).
        Sua missão é localizar EXATAMENTE ${limit} empresas para: "${query}".

        🕵️ PROTOCOLO DE PESQUISA PROFUNDA (Obrigatório):
        Para cada empresa candidata, use o seu "Google Search Grounding" para:
        1. Pesquisar especificamente: "[Nome da Empresa] [Cidade] Instagram".
        2. Identificar se existe uma conta LOCAL da loja (ex: @loja_saopaulo) em vez da conta nacional da franquia.
        3. Se encontrar um site oficial, verifique o rodapé ou página de contato em busca do link social real.
        4. SÓ EXTRAIA o Instagram se o perfil mencionar explicitamente a CIDADE ou o ENDEREÇO no bio/postagens.

        🚨 REGRAS DE OURO CONTRA ALUCINAÇÃO:
        - NUNCA invente usernames.
        - Se o link do Instagram no Google abrir uma página que não existe (404) ou for uma conta pessoal, deixe VAZIO "".
        - Se o perfil for de uma franquia nacional e não da loja local específica, tente achar a local; se não achar a local, deixe VAZIO "".
        - Não use "Não Listado". Se não tem certeza absoluta que é a loja certa na cidade certa, deixe "".

        Para cada uma das ${limit} empresas, retorne:
        1. name: Nome oficial da unidade local.
        2. phone: Telefone local (ex: (11) 99999-9999).
        3. whatsapp: Apenas números (prefixo 55).
        4. instagram: O @perfil LOCAL verificado. SE NÃO TIVER CERTEZA, DEIXE "".
        5. city: Cidade da unidade.
        6. state: Sigla do estado (ex: MG).
        7. address: Endereço completo verificado.
        8. website: URL oficial da unidade ou da marca.

        SAÍDA (JSON PURO):
        [{"name": "Vila Sapatos", "phone": "(11) 98888-7777", "whatsapp": "5511988887777", "instagram": "@vilasapatos_sp", "city": "São Paulo", "state": "SP", "address": "Av. Paulista, 1000", "website": "https://vilasapatos.com.br"}]`;

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
