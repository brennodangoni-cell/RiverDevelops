const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const query = 'site:instagram.com "dentista" "são paulo" "chat.whatsapp.com" OR "wa.me"';
    try {
        const res = await axios.get('https://www.bing.com/search?q=' + encodeURIComponent(query), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];
        $('.b_algo').each((i, el) => {
            const title = $(el).find('h2').text().trim();
            const snippet = $(el).find('.b_caption p').text().trim();
            results.push({ title, snippet });
        });
        console.log("Bing Snippets:", results.length);
        console.log(results.slice(0, 3));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
