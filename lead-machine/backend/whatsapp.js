const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

let client;
let qrCodeData = null;
let isReady = false;

// Helper function to simulate human typing delay
const delay = ms => new Promise(res => setTimeout(res, ms));

const initWhatsApp = () => {
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
        puppeteer: {
            // Running without sandbox to avoid issues on some OS
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        }
    });

    client.on('qr', (qr) => {
        // qrcode.generate(qr, { small: true }); // optional console view
        qrCodeData = qr;
        isReady = false;
        console.log('QR Code generated. Vist the frontend to scan it!');
    });

    client.on('ready', () => {
        console.log('WhatsApp Client is ready!');
        qrCodeData = null; // Clear QR code as it's ready
        isReady = true;
    });

    client.on('disconnected', (reason) => {
        console.log('WhatsApp Client was disconnected', reason);
        isReady = false;
        // Re-initialize after disconnection
        client.destroy();
        client.initialize();
    });

    client.initialize();
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
    delay
};
