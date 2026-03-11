import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    delay as baileysDelay,
    WASocket,
    Browsers
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
    // Proactively close old socket to avoid conflicts on restart
    if (sock) {
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.logout();
            sock.end(undefined);
            sock = null;
        } catch (e) {
            console.error('[WhatsApp] Erro ao fechar socket antigo:', e);
        }
    }

    const sessionDir = path.join(__dirname, '../../whatsapp-session');

    // Ensure session dir exists
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    console.log('[WhatsApp] Iniciando instância Baileys...');

    sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        mobile: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            isReady = false;
            console.log('[WhatsApp] Novo QR Code gerado.');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`[WhatsApp] Conexão fechada. Status: ${statusCode}. Erro: ${lastDisconnect?.error}. Reconectando: ${shouldReconnect}`);

            isReady = false;
            qrCodeData = null;

            if (shouldReconnect) {
                // Delay before reconnecting to avoid infinite loops and rate limits
                setTimeout(() => initWhatsApp(), 5000);
            } else {
                console.log('[WhatsApp] Deslogado ou Sessão Inválida. Limpando credenciais...');
                // Optional: clear session folder if logged out
                // fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        } else if (connection === 'open') {
            console.log('[WhatsApp] Conexão estabelecida com sucesso!');
            qrCodeData = null;
            isReady = true;
        }
    });

    return sock;
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
        await baileysDelay(Math.random() * 2000 + 2000);
        await sock.sendPresenceUpdate('composing', jid);
        const typingDelay = Math.min(parsedMessage.length * 50, 6000);
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
                caption: ''
            });
        }

        console.log(`[WhatsApp] Mensagem enviada para ${formattedNumber}`);
        return { success: true, message: parsedMessage };

    } catch (error: any) {
        console.error(`[WhatsApp] Erro ao enviar para ${formattedNumber}:`, error);
        return { success: false, error: error.message };
    }
}
