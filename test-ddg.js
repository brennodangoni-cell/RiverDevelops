const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const query = '"dentista" "são paulo" "wa.me"';
    try {
        const res = await axios.post('https://lite.duckduckgo.com/lite/', 'q=' + encodeURIComponent(query), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const $ = cheerio.load(res.data);
        const results = [];

        $('tr').each((i, el) => {
            const snippet = $(el).find('.result-snippet').text();
            const title = $(el).find('.result-title').text();
            const link = $(el).find('.result-snippet').attr('href') || $(el).find('.result-title').attr('href') || '';

            if (snippet) {
                results.push(title + " | " + snippet);
            }
        });
        console.log(results.slice(0, 5));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
