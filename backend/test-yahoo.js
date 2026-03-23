const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    console.log("Starting test...");
    const query = 'site:instagram.com "dentista" "são paulo" "chat.whatsapp.com" OR "wa.me"';
    try {
        const res = await axios.get('https://br.search.yahoo.com/search?p=' + encodeURIComponent(query), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];
        $('.algo').each((i, el) => {
            const title = $(el).find('h3').text().trim();
            const snippet = $(el).find('.compTitle ~ div').text().trim();
            results.push({ title, snippet });
        });
        console.log("Yahoo Snippets:", results.length);
        console.log(results.slice(0, 3));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
