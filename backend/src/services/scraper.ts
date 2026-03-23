import axios from 'axios';

/**
 * Scraper 3.0 - Official Google Places API (100% Reliable, 0% AI Hallucination)
 */
export async function scrapeGoogleMaps(query: string, limit = 20) {
    console.log(`[Sales Engine] Iniciando Busca Oficial Places API para: "${query}" (Limite: ${limit})`);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        throw new Error("Chave API ausente. Adicione GOOGLE_PLACES_API_KEY no painel de Environment Variables do Render.");
    }

    try {
        const leads: any[] = [];
        let nextPageToken = '';
        const categoryMatch = query.split(' em ')[0] || 'Geral';

        while (leads.length < limit) {
            let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR`;
            if (nextPageToken) {
                url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}&language=pt-BR`;
                // Padrão do Google: o token de próxima página leva um tempo para ficar ativo
                await new Promise(r => setTimeout(r, 2000));
            }

            const searchRes = await axios.get(url);

            if (searchRes.data.status !== 'OK' && searchRes.data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Places API falhou na busca: ${searchRes.data.status} - ${searchRes.data.error_message || ''}`);
            }

            const results = searchRes.data.results || [];
            if (results.length === 0) break;

            for (const place of results) {
                if (leads.length >= limit) break;
                if (!place.place_id) continue;

                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,international_phone_number,website,address_component&language=pt-BR&key=${apiKey}`;

                try {
                    const responseDetails = await axios.get(detailsUrl);
                    const det = responseDetails.data.result;

                    if (!det) continue;

                    const phone = det.international_phone_number || '';
                    let whatsapp = '';

                    if (phone) {
                        whatsapp = phone.replace(/\D/g, '');
                        // Adicionar 55 se o número for BR e não tiver (Google costuma devolver +55)
                        if (whatsapp.length >= 10 && !whatsapp.startsWith('55')) {
                            whatsapp = '55' + whatsapp;
                        }
                    } else {
                        // Sem telefone, pulamos o lead (nosso foco é WhatsApp)
                        continue;
                    }

                    let instagram = '';
                    const website = det.website || '';

                    // Extrai o instagram direto do site se a URL já for do insta (comum no Brasil)
                    if (website.includes('instagram.com/')) {
                        const match = website.match(/instagram\.com\/([^/?]+)/);
                        if (match && match[1]) {
                            instagram = '@' + match[1];
                        }
                    }

                    // Extrair cidade e estado certinho pelo Place Details
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
                    console.error("[Sales Engine] Erro isolado ao puxar detalhes do lead:", place.name);
                }
            }

            nextPageToken = searchRes.data.next_page_token;
            if (!nextPageToken) break;
        }

        console.log(`[Sales Engine] Extração Concluída (${leads.length} leads 100% corretos obtidos via Places API)`);

        if (leads.length === 0) {
            throw new Error(`Nenhum negócio com telefone público cadastrado foi localizado para "${query}".`);
        }

        return leads;

    } catch (error: any) {
        console.error("[Sales Engine] Erro no Scraper da Google Places API:", error);
        throw new Error("Falha na Busca Via Google Geral: " + (error.response?.data?.error_message || error.message || "Erro de conexão API").slice(0, 150));
    }
}
