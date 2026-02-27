import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller);

const INPUT_VIDEO = path.join(__dirname, '../public/1080.mp4');
const OUTPUT_DIR = path.join(__dirname, '../public/hero-sequence');
const TEMP_DIR = path.join(__dirname, '../temp_frames');

// Configuration
const TOTAL_FRAMES = 151; // Target number of frames

async function generateSequence() {
    console.log('🚀 Starting extraction process...');

    // 1. Clean directories
    if (fs.existsSync(OUTPUT_DIR)) {
        console.log('Cleaning output directory...');
        const files = fs.readdirSync(OUTPUT_DIR);
        for (const file of files) {
            fs.unlinkSync(path.join(OUTPUT_DIR, file));
        }
    } else {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR);

    // 2. Extract frames using FFmpeg
    console.log('📸 Extracting high-quality PNG frames...');

    await new Promise((resolve, reject) => {
        ffmpeg(INPUT_VIDEO)
            .outputOptions([
                `-vframes ${TOTAL_FRAMES}`, // Extract exact number of frames
                '-q:v 2' // High quality for PNG
            ])
            .output(path.join(TEMP_DIR, 'frame-%03d.png'))
            .on('end', () => {
                console.log('✅ Extraction complete.');
                resolve();
            })
            .on('error', (err) => {
                console.error('❌ FFmpeg Error:', err);
                reject(err);
            })
            .run();
    });

    // 3. Convert PNGs to WebP with Sharp
    console.log('✨ Converting to optimized WebP...');

    const frameFiles = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.png')).sort();

    if (frameFiles.length === 0) {
        console.error('❌ No frames extracted!');
        return;
    }

    for (let i = 0; i < frameFiles.length; i++) {
        const inputPath = path.join(TEMP_DIR, frameFiles[i]);
        // Rename to ezgif-frame-001 format to match current code
        const frameNum = (i + 1).toString().padStart(3, '0');
        const outputPath = path.join(OUTPUT_DIR, `ezgif-frame-${frameNum}.webp`);

        process.stdout.write(`Processing frame ${i + 1}/${frameFiles.length}\r`);

        await sharp(inputPath)
            .resize(1920, 1080, { // Standard 1080p is usually enough for web and much lighter
                fit: 'cover',
                withoutEnlargement: true
            })
            .webp({
                quality: 90,
                smartSubsample: true,
                effort: 6 // Max compression effort
            })
            .toFile(outputPath);
    }

    // 4. Cleanup
    console.log('\n🧹 Cleaning up temp files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('🎉 Done! Sequence updated successfully.');
}

generateSequence().catch(console.error);
