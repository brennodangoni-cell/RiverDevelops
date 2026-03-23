import axios from 'axios';

/**
 * Scraper 3.0 - Official Google Places API (100% Reliable, 0% AI Hallucination)
 */
export async function scrapeGoogleMaps(query: string, limit = 20) {
    console.log(`[Sales Engine] Iniciando Busca Oficial Places API para: "${query}" (Limite: ${limit})`);

    if (!query || query.trim().length === 0) {
        throw new Error("O termo de busca (query) está vazio. Por favor, digite o que deseja buscar.");
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        throw new Error("Chave API ausente. Adicione GOOGLE_PLACES_API_KEY no painel de Environment Variables do Render.");
    }

    try {
        const leads: any[] = [];
        let nextPageToken = '';
        const categoryMatch = query.split(' em ')[0] || 'Geral';

        while (leads.length < limit) {
            let url: string;

            // CRITICAL: Para requisições de próxima página, a URL DEVE conter APENAS o pagetoken e a Key.
            // Qualquer outro parâmetro extra (como query ou language) causa INVALID_REQUEST.
            if (nextPageToken) {
                console.log(`[Sales Engine] Solicitando próxima página (token ativado)...`);
                url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
                // O Google exige um delay (cooldown) antes de permitir usar o nextPageToken
                await new Promise(r => setTimeout(r, 2000));
            } else {
                url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR`;
            }

            const searchRes = await axios.get(url);
            const apiStatus = searchRes.data.status;

            if (apiStatus !== 'OK' && apiStatus !== 'ZERO_RESULTS') {
                const apiError = searchRes.data.error_message || "Sem mensagem detalhada do Google.";
                console.error(`[Sales Engine] Google API Error Status: ${apiStatus}`);
                console.error(`[Sales Engine] Google API Error Message: ${apiError}`);

                if (apiStatus === 'INVALID_REQUEST') {
                    throw new Error(`Busca Rejeitada (INVALID_REQUEST). Possíveis causas: Query malformada ou uso incorreto do Token de Página. Detalhe: ${apiError}`);
                }
                if (apiStatus === 'REQUEST_DENIED') {
                    throw new Error(`Acesso Negado (REQUEST_DENIED). Verifique se a 'Places API' está ATIVA no Console do Google Cloud e se não há restrições de IP vinculadas à chave. Detalhe: ${apiError}`);
                }

                throw new Error(`Erro na API do Google (${apiStatus}): ${apiError}`);
            }

            const results = searchRes.data.results || [];
            if (results.length === 0) {
                console.log("[Sales Engine] A página de resultados veio vazia.");
                break;
            }

            console.log(`[Sales Engine] Processando ${results.length} resultados...`);

            for (const place of results) {
                if (leads.length >= limit) break;
                if (!place.place_id) continue;

                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,international_phone_number,website,address_component&language=pt-BR&key=${apiKey}`;

                try {
                    const responseDetails = await axios.get(detailsUrl);

                    if (responseDetails.data.status !== 'OK') {
                        console.warn(`[Sales Engine] Pulei lead "${place.name}" pois os detalhes falharam: ${responseDetails.data.status}`);
                        continue;
                    }

                    const det = responseDetails.data.result;
                    if (!det) continue;

                    const phone = det.international_phone_number || '';
                    let whatsapp = '';

                    if (phone) {
                        whatsapp = phone.replace(/\D/g, '');
                        if (whatsapp.length >= 10 && !whatsapp.startsWith('55')) {
                            whatsapp = '55' + whatsapp;
                        }
                    } else {
                        // Se não tem telefone, para o robô de vendas é lead morto
                        continue;
                    }

                    let instagram = '';
                    const website = det.website || '';
                    if (website.includes('instagram.com/')) {
                        const match = website.match(/instagram\.com\/([^/?\s]+)/);
                        if (match && match[1]) instagram = '@' + match[1];
                    }

                    let city = '';
                    let state = '';
                    if (det.address_components) {
                        for (const comp of det.address_components) {
                            if (comp.types.includes("administrative_area_level_2")) city = comp.long_name;
                            if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
                        }
                    }

                    leads.push({
                        name: det.name || place.name,
                        phone: phone,
                        whatsapp: whatsapp,
                        instagram: instagram || "Não Listado",
                        city: city || "Desconhecida",
                        state: state || "ND",
                        address: det.formatted_address || place.formatted_address || "Não Listado",
                        website: website || "Não Listado",
                        category: categoryMatch
                    });

                } catch (e) {
                    console.error("[Sales Engine] Falha interna em detalhe de PlaceID:", place.place_id);
                }
            }

            // Atribui o novo token para o próximo loop
            nextPageToken = searchRes.data.next_page_token;
            if (!nextPageToken) break;

            console.log(`[Sales Engine] Leads parciais: ${leads.length}/${limit}. Carregando próxima leva...`);
        }

        console.log(`[Sales Engine] Extração Concluída total: ${leads.length} leads qualificados.`);

        if (leads.length === 0) {
            throw new Error(`As buscas para "${query}" no Google não retornaram estabelecimentos com telefones de contato expostos.`);
        }

        return leads;

    } catch (error: any) {
        console.error("[Sales Engine] Erro Crítico Scraper:", error);
        throw new Error(error.message || "Falha desconhecida na conexão com o Google Maps");
    }
}
