import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Caminho do arquivo HTML local
    const filePath = 'file://' + path.resolve(__dirname, 'index.html');
    const outputPath = path.join('C:\\Users\\Brenno\\.gemini\\antigravity\\brain\\6c282375-007d-4600-ab92-6ec5e6008fe0', 'PROPOSTA_BRENNO_DANGONI.pdf');

    await page.goto(filePath, { waitUntil: 'networkidle' });

    // Gerar o PDF com as configurações ideais de 1 página A4
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        scale: 0.94
    });

    console.log('✅ PDF gerado com sucesso em: ' + outputPath);
    await browser.close();
})();
