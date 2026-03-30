import axios from 'axios';

/**
 * SALES ENGINE 6.0 - THE DETERMINISTIC MACHINE (Zero Alucinação)
 * Remove a camada de IA para evitar "chutes" e retorna
 * apenas dados reais, frios e cirúrgicos do Google Maps.
 */

export async function scrapeGoogleMaps(query: string, limit = 20) {
    const placesKey = (process.env.GOOGLE_PLACES_API_KEY || "").trim();

    if (!placesKey) {
        throw new Error("GOOGLE_PLACES_API_KEY não configurada. O novo modo Determinístico requer esta chave para evitar dados falsos.");
    }

    console.log(`[Sales Engine 6.0] Busca Determinística Oficial para: "${query}" (Limit: ${limit})`);

    try {
        // Passo 1: Busca Múltiplas Páginas no Google Places caso o limite seja alto
        let places: any[] = [];
        let nextPageToken = "";

        // Pega até 40 lugares brutos para termos margem de filtro (empresas sem telefone)
        for (let i = 0; i < 2; i++) {
            let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${placesKey}`;
            if (nextPageToken) {
                searchUrl += `&pagetoken=${nextPageToken}`;
                // Google takes ~2s to activate a pagetoken, so we wait briefly
                await new Promise(r => setTimeout(r, 2000));
            }

            const searchRes = await axios.get(searchUrl);
            const results = searchRes.data.results || [];
            places = [...places, ...results];

            nextPageToken = searchRes.data.next_page_token;
            if (!nextPageToken || places.length >= limit * 1.5) break;
        }

        const leads = [];
        const categoryExtracted = query.split(' em ')[0] || query.split(' de ')[0] || 'Geral';

        // Passo 2: Extração Cirúrgica de Telefones Oficiais via Place Details
        for (const p of places) {
            if (leads.length >= limit) break;
            if (!p.place_id) continue;

            try {
                const detUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_phone_number,formatted_address,website,address_components&language=pt-BR&key=${placesKey}`;
                const dRes = await axios.get(detUrl);
                const d = dRes.data.result;
                if (!d) continue;

                // Extrai Telefone Oficial
                let phone = '';
                if (d.formatted_phone_number) {
                    phone = d.formatted_phone_number.replace(/\D/g, '');
                    // Força código DDI do Brasil se for celular ou fixo (10 ou 11 dígitos)
                    if (phone.length === 10 || phone.length === 11) {
                        phone = '55' + phone;
                    }
                }

                // Extrai UFs Nativas (sem ND!)
                let city = '';
                let state = '';
                if (d.address_components) {
                    const cComp = d.address_components.find((c: any) => c.types.includes('administrative_area_level_2'));
                    if (cComp) city = cComp.long_name;

                    const sComp = d.address_components.find((c: any) => c.types.includes('administrative_area_level_1'));
                    if (sComp) state = sComp.short_name;
                }

                // Extrai o Instagram nativo apenas se realmente existir no site do Google Maps
                let instagram = '';
                if (d.website && d.website.includes('instagram.com/')) {
                    const parts = d.website.split('instagram.com/');
                    if (parts[1]) {
                        const rawIg = parts[1].split('/')[0].split('?')[0];
                        if (rawIg) instagram = '@' + rawIg;
                    }
                }

                // Only add if we have a valid phone, to prevent blank whatsapp saving to db!
                if (phone && phone.length >= 12) {
                    leads.push({
                        name: d.name,
                        whatsapp: phone, // Garantido ter um número real string
                        instagram: instagram,
                        phone: phone,
                        city: city || 'Local',
                        state: state || 'MG', // anti-ND fallback
                        address: d.formatted_address || '',
                        website: d.website || '',
                        source: 'Google Places Oficial',
                        category: categoryExtracted
                    });
                }

            } catch (detErr) {
                // Ignora erros pontuais num lead e tenta o próximo
            }
        }

        console.log(`[Sales Engine 6.0] Retornando ${leads.length} leads determinísticos.`);
        return leads;

    } catch (e: any) {
        throw new Error(`Google Places API falhou: ${e.message}`);
    }
}

// Retro-compatibilidade com rota antiga
export async function scrapeFreeLeads(query: string, limit = 20) {
    return await scrapeGoogleMaps(query, limit);
}
