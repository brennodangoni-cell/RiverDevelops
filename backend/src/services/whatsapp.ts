import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';

let client: Client;
let qrCodeData: string | null = null;
let isReady = false;

// Helper function to simulate human typing delay
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const initWhatsApp = () => {
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../../whatsapp-session') }),
        puppeteer: {
            // Running without sandbox to avoid issues on cloud platforms like Render
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            headless: true
        }
    });

    client.on('qr', (qr: string) => {
        qrCodeData = qr;
        isReady = false;
        console.log('WhatsApp QR Code generated.');
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
        qrCodeData = null; // Clear QR code as it's ready
        isReady = true;
    });

    client.on('disconnected', (reason: string) => {
        console.log('WhatsApp Client was disconnected', reason);
        isReady = false;
        // Re-initialize after disconnection
        client.destroy();
        client.initialize();
    });

    client.initialize();
};

export const getQrCode = () => qrCodeData;
export const getStatus = () => isReady;

/**
 * Sends a message mimicking human behavior
 */
export const sendCampaignMessage = async (number: string, spintaxMessage: string, videoPath?: string | null) => {
    if (!isReady || !client) throw new Error("WhatsApp client is not ready");

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

            const media = MessageMedia.fromFilePath(videoPath);
            await client.sendMessage(chatId, media, { caption: 'Dê uma olhada nisto!' });
        }

        console.log(`Mensagem enviada com sucesso para ${formattedNumber}`);
        return { success: true, message: parsedMessage };

    } catch (error: any) {
        console.error(`Erro ao enviar mensagem para ${formattedNumber}:`, error);
        return { success: false, error: error.message };
    }
}
