const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// Use puppeteer-extra with stealth plugin
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let client;
let qrCodeData = null;
let isReady = false;

// Helper function to simulate human typing delay
const delay = ms => new Promise(res => setTimeout(res, ms));

const initWhatsApp = () => {
    if (client) return; // Prevent multiple initializations

    // Limpar SingletonLock se existir (previne travamento no Windows se o processo anterior caiu)
    const lockPath = path.join(__dirname, 'whatsapp-session', 'Default', 'SingletonLock');
    if (fs.existsSync(lockPath)) {
        try { fs.unlinkSync(lockPath); } catch (e) { }
    }

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, 'whatsapp-session') }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            headless: true,
        }
    });

    client.on('qr', (qr) => {
        qrCodeData = qr;
        isReady = false;
        console.log('>>> [WA] QR Code recebido! Scan no frontend.');
    });

    client.on('ready', () => {
        console.log('>>> [WA] WhatsApp está pronto e conectado!');
        qrCodeData = null;
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log('>>> [WA] Autenticado com sucesso.');
        qrCodeData = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('>>> [WA] Falha na autenticação:', msg);
        isReady = false;
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`>>> [WA] Carregando: ${percent}% - ${message}`);
    });

    client.on('disconnected', async (reason) => {
        console.log('>>> [WA] Desconectado:', reason);
        isReady = false;
        qrCodeData = null;
        try {
            await client.destroy();
        } catch (e) { }
        client = null;
        console.log('>>> [WA] Tentando reconectar em 5 segundos...');
        setTimeout(initWhatsApp, 5000); // Re-init after 5s
    });

    console.log('>>> [WA] Inicializando cliente...');
    client.initialize().catch(err => {
        console.error('>>> [WA] Erro crítico na inicialização:', err);
        client = null;
    });
};

const disconnectWhatsApp = async () => {
    if (client) {
        try {
            await client.logout();
            await client.destroy();
            client = null;
            isReady = false;
            qrCodeData = null;
            // Clear session data if needed
            const sessionDir = path.join(__dirname, 'whatsapp-session');
            if (fs.existsSync(sessionDir)) {
                // Not deleting to allow persistent auth if session is alive, 
                // but client.logout() usually clears it.
            }
            initWhatsApp(); // Restart to get new QR
            return true;
        } catch (e) {
            console.error('Error disconnecting:', e);
            return false;
        }
    }
    return false;
};

const getQrCode = () => qrCodeData;
const getStatus = () => isReady;

/**
 * Sends a message mimicking human behavior
 */
const sendCampaignMessage = async (number, spintaxMessage, videoPath) => {
    if (!isReady) throw new Error("WhatsApp client is not ready");

    // Format number to international format, Brazilian numbers usually 55 + DDD + Number
    let formattedNumber = number.replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) formattedNumber = `55${formattedNumber}`;
    const chatId = `${formattedNumber}@c.us`;

    try {
        // Parse simple spintax for variation {Oi|Olá}
        const parsedMessage = spintaxMessage.replace(/\{([^{}]+)\}/g, (match, contents) => {
            const options = contents.split('|');
            return options[Math.floor(Math.random() * options.length)];
        });

        const chat = await client.getChatById(chatId);

        // Simulate reading history and thinking
        await delay(Math.random() * 2000 + 1000);

        // Simulate typing
        await chat.sendStateTyping();

        // Simulating actual human typing speed (roughly calculated based on message length)
        const typingDelay = Math.min(parsedMessage.length * 50, 10000); // max 10s of typing indication
        await delay(typingDelay);
        await chat.clearState();

        // Send text message
        await client.sendMessage(chatId, parsedMessage);

        // If a video exists, send it
        if (videoPath && fs.existsSync(videoPath)) {
            await delay(Math.random() * 3000 + 2000); // pause before sending file

            // Re-simulate typing/uploading state for media (though sendStateRecording is usually audio)
            const media = MessageMedia.fromFilePath(videoPath);
            await client.sendMessage(chatId, media, { caption: 'Dê uma olhada nesta amostra!' });
        }

        console.log(`Mensagem enviada com sucesso para ${formattedNumber}`);
        return { success: true, message: parsedMessage };

    } catch (error) {
        console.error(`Erro ao enviar mensagem para ${formattedNumber}:`, error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initWhatsApp,
    getQrCode,
    getStatus,
    sendCampaignMessage,
    disconnectWhatsApp,
    delay
};
