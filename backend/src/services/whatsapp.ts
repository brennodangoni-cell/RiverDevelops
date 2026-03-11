import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    delay as baileysDelay,
    WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

let sock: WASocket | null = null;
let qrCodeData: string | null = null;
let isReady = false;

// Logger for Baileys
const logger = pino({ level: 'silent' });

export const initWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '../../whatsapp-session'));

    sock = makeWASocket({
        auth: state,
        logger,
        browser: ['Sales Engine', 'Chrome', '1.0.0'],
        mobile: false,
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            isReady = false;
            console.log('WhatsApp QR Code generated (Baileys).');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            isReady = false;
            if (shouldReconnect) {
                initWhatsApp(); // Try to reconnect
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Client is ready (Baileys)!');
            qrCodeData = null;
            isReady = true;
        }
    });
};

export const getQrCode = () => qrCodeData;
export const getStatus = () => isReady;

export const sendCampaignMessage = async (number: string, spintaxMessage: string, videoPath?: string | null) => {
    if (!sock || !isReady) throw new Error("WhatsApp client is not ready");

    // Format number for Baileys (International digits @s.whatsapp.net)
    let formattedNumber = number.replace(/\D/g, '');
    if (!formattedNumber.startsWith('55')) formattedNumber = `55${formattedNumber}`;
    const jid = `${formattedNumber}@s.whatsapp.net`;

    try {
        // Parse simple spintax for variation {Oi|Olá}
        const parsedMessage = spintaxMessage.replace(/\{([^{}]+)\}/g, (match, contents) => {
            const options = contents.split('|');
            return options[Math.floor(Math.random() * options.length)];
        });

        // Human simulation
        await baileysDelay(Math.random() * 2000 + 1000);
        await sock.sendPresenceUpdate('composing', jid);
        const typingDelay = Math.min(parsedMessage.length * 50, 8000);
        await baileysDelay(typingDelay);
        await sock.sendPresenceUpdate('paused', jid);

        // Send text
        await sock.sendMessage(jid, { text: parsedMessage });

        // If video path exists
        if (videoPath && fs.existsSync(videoPath)) {
            await baileysDelay(3000);
            const videoBuffer = fs.readFileSync(videoPath);
            await sock.sendMessage(jid, {
                video: videoBuffer,
                caption: spintaxMessage.length < 20 ? 'Dê uma olhada!' : ''
            });
        }

        console.log(`Mensagem Baileys enviada com sucesso para ${formattedNumber}`);
        return { success: true, message: parsedMessage };

    } catch (error: any) {
        console.error(`Erro ao enviar mensagem via Baileys para ${formattedNumber}:`, error);
        return { success: false, error: error.message };
    }
}
