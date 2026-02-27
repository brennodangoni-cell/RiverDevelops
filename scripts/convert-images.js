import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputDir = path.join(__dirname, '../public/hero-sequence');

async function convertImages() {
    try {
        if (!fs.existsSync(inputDir)) {
            console.error(`Directory not found: ${inputDir}`);
            return;
        }

        const files = fs.readdirSync(inputDir);
        const jpgFiles = files.filter(file => file.toLowerCase().endsWith('.jpg'));

        console.log(`Found ${jpgFiles.length} JPG files to convert.`);

        if (jpgFiles.length === 0) {
            console.log('No JPG files found in public/hero-sequence.');
            return;
        }

        for (const file of jpgFiles) {
            const inputPath = path.join(inputDir, file);
            const outputPath = path.join(inputDir, file.replace(/\.jpg$/i, '.webp'));

            console.log(`Converting: ${file} -> ${path.basename(outputPath)}`);

            await sharp(inputPath)
                .webp({
                    quality: 95,
                    smartSubsample: true,
                    effort: 6
                })
                .toFile(outputPath);

            // Delete original JPG
            fs.unlinkSync(inputPath);
        }

        console.log('Conversion complete! JPGs have been replaced with high-quality WEBPs.');

    } catch (err) {
        console.error('Error during conversion:', err);
    }
}

await convertImages();
