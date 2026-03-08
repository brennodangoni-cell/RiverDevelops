const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static('processed'));

// Ensure directories exist
const dirs = ['uploads', 'processed'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

app.post('/api/remove-watermark', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Falta o link do vídeo.' });
    }

    const id = uuidv4();
    const inputPath = path.join(__dirname, 'uploads', `${id}_input.mp4`);
    const outputPath = path.join(__dirname, 'processed', `${id}_clean.mp4`);

    let finalVideoUrl = videoUrl;

    try {
        console.log(`[1/4] Recebido pedido para vídeo: ${videoUrl}`);

        // Se for um link de página do Sora, tentamos extrair o link direto do .mp4
        if (videoUrl.includes('sora.chatgpt.com/p/')) {
            console.log('[LOG] Link de página detectado. Extraindo link direto do vídeo...');
            const pageRes = await axios.get(videoUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });

            // Regex para buscar o link do MP4 no HTML de forma bruta
            const mp4Match = pageRes.data.match(/https:\/\/[^"]+\.mp4[^"]*/);
            if (mp4Match) {
                finalVideoUrl = mp4Match[0].replace(/\\u0026/g, '&'); // Corrige escapes comuns em JSON
                console.log('[LOG] Link direto extraído:', finalVideoUrl);
            } else {
                console.log('[AVISO] Link .mp4 não encontrado no HTML. Tentando processar URL original...');
            }
        }

        const response = await axios({
            method: 'GET',
            url: finalVideoUrl,
            responseType: 'stream',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                console.error('Erro ao escrever arquivo de input:', err);
                reject(err);
            });
        });

        console.log('[2/4] Vídeo baixado com sucesso. Verificando integridade...');

        if (!fs.existsSync(inputPath) || fs.statSync(inputPath).size === 0) {
            throw new Error('Arquivo baixado está vazio ou não existe.');
        }

        console.log('[3/4] Iniciando FFmpeg Engine (Ryzen 5 Turbo Mode)...');

        ffmpeg(inputPath)
            .videoFilters([
                {
                    filter: 'delogo',
                    options: {
                        x: 'main_w-170',
                        y: 'main_h-75',
                        w: 160,
                        h: 70,
                        band: 1,
                        show: 0
                    }
                }
            ])
            .outputOptions([
                '-c:v libx264',
                '-crf 18',
                '-preset ultrafast',
                '-threads 0',
                '-movflags +faststart'
            ])
            .on('start', (cmd) => {
                console.log('[LOG] Comando FFmpeg executado:', cmd);
            })
            .on('progress', (progress) => {
                console.log(`[PROGRESS] Processando: ${Math.round(progress.percent || 0)}% completo`);
            })
            .on('error', (err) => {
                console.error('[ERRO FFmpeg] Detalhes:', err.message);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                res.status(500).json({ error: `Erro no processamento FFmpeg: ${err.message}` });
            })
            .on('end', () => {
                console.log('[4/4] Processamento Concluído! Limpando arquivos temporários.');
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                res.json({ downloadUrl: `http://localhost:3006/downloads/${id}_clean.mp4` });
            })
            .save(outputPath);

    } catch (error) {
        console.error('[ERRO GERAL] Detalhes:', error.message);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).json({ error: `Falha crítica: ${error.message}` });
    }
});

const PORT = 3006;
app.listen(PORT, () => {
    console.log(`🚀 Watermark Remover rodando em http://localhost:${PORT}`);
});
