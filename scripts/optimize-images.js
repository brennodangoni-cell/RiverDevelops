import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const imagesToConvert = [
    { input: 'imagetest.png', output: 'imagetest.webp', quality: 85 },
    { input: 'arbusto.png', output: 'arbusto.webp', quality: 85 },
    { input: 'rio.png', output: 'rio.webp', quality: 85 },
    { input: 'fotonova.png', output: 'fotonova.webp', quality: 85 },
];

async function optimizeImages() {
    console.log('🖼️  Otimizando imagens PNG para WebP...\n');

    for (const { input, output, quality } of imagesToConvert) {
        const inputPath = path.join(publicDir, input);
        const outputPath = path.join(publicDir, output);

        if (!fs.existsSync(inputPath)) {
            console.log(`⚠️  ${input} não encontrado, pulando...`);
            continue;
        }

        try {
            const stats = fs.statSync(inputPath);
            const originalSize = (stats.size / 1024 / 1024).toFixed(2);

            console.log(`📸 Convertendo ${input}...`);
            
            await sharp(inputPath)
                .webp({ 
                    quality,
                    smartSubsample: true,
                    effort: 6
                })
                .toFile(outputPath);

            const newStats = fs.statSync(outputPath);
            const newSize = (newStats.size / 1024 / 1024).toFixed(2);
            const reduction = ((1 - newStats.size / stats.size) * 100).toFixed(1);

            console.log(`✅ ${output} criado!`);
            console.log(`   Tamanho: ${originalSize} MB → ${newSize} MB (${reduction}% menor)\n`);
        } catch (error) {
            console.error(`❌ Erro ao converter ${input}:`, error.message);
        }
    }

    console.log('🎉 Conversão concluída!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique se as imagens WebP foram criadas');
    console.log('   2. Execute npm run build novamente');
    console.log('   3. Os arquivos PNG ainda estarão no build, mas você pode removê-los depois');
}

optimizeImages().catch(console.error);
