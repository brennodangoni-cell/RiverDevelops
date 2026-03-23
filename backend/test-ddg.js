const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    console.log("Starting test...");
    const url = 'https://html.duckduckgo.com/html/';

    try {
        const query = 'site:instagram.com "dentista" "são paulo" "chat.whatsapp.com" OR "wa.me"';
        const res = await axios.post(url, 'q=' + encodeURIComponent(query), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];
        $('.result__body').each((i, el) => {
            const title = $(el).find('.result__title').text().trim();
            const snippet = $(el).find('.result__snippet').text().trim();
            results.push({ title, snippet });
        });
        console.log("Found:", results.length);
        console.log(results.slice(0, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
