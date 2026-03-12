import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    delay as baileysDelay,
    WASocket,
    Browsers,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

let sock: WASocket | null = null;
let qrCodeData: string | null = null;
let isReady = false;
let isInitializing = false;
let debugLogs: string[] = [];
const VERSION = "v2.1-MAC-FINAL";

function addLog(msg: string) {
    const log = `[${new Date().toLocaleTimeString()}] [${VERSION}] ${msg}`;
    console.log(log);
    debugLogs.push(log);
    if (debugLogs.length > 50) debugLogs.shift();
}

export const getDebugLogs = () => debugLogs;

// Logger for Baileys
const logger = pino({ level: 'silent' });

export const initWhatsApp = async () => {
    if (isInitializing) {
        addLog('Já existe uma inicialização em curso. Ignorando...');
        return;
    }
    isInitializing = true;
    addLog('Iniciando serviço WhatsApp...');

    const sessionDir = path.resolve(process.cwd(), 'whatsapp-session');

    if (sock) {
        addLog('Encerrando socket anterior...');
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.end(undefined);
            sock = null;
        } catch (e: any) {
            addLog(`Erro ao fechar socket: ${e.message}`);
        }
    }

    if (!fs.existsSync(sessionDir)) {
        addLog('Criando diretório de sessão...');
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    addLog('Carregando credenciais de sessão...');
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    addLog('Criando socket Baileys...');
    sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), // Tentar Ubuntu padrão
        version: [2, 3000, 1015901307],
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 15000,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            isReady = false;
            addLog('NOVO QR CODE DISPONÍVEL PARA ESCANEAMENTO');
        }

        if (connection === 'close') {
            isInitializing = false;
            const error = lastDisconnect?.error as Boom;
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            let reason = `Status: ${statusCode}`;
            if (statusCode === 405) reason = "CONEXÃO SUBSTITUÍDA (Sessão aberta em outro lugar ou reinício duplo)";
            if (statusCode === 401) reason = "SESSÃO DESLOGADA (Precisa escanear novamente)";

            addLog(`Conexão fechada. ${reason}`);

            isReady = false;
            qrCodeData = null;

            if (shouldReconnect) {
                setTimeout(() => initWhatsApp(), 10000);
            }
        } else if (connection === 'open') {
            isInitializing = false;
            addLog('WHATSAPP CONECTADO E PRONTO!');
            qrCodeData = null;
            isReady = true;
        } else if (connection === 'connecting') {
            addLog('Conectando ao WhatsApp...');
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

export const disconnectWhatsApp = async () => {
    addLog('Solicitando desconexão manual e limpeza de sessão...');
    const sessionDir = path.resolve(process.cwd(), 'whatsapp-session');

    if (sock) {
        try {
            await sock.logout();
            sock.end(undefined);
        } catch (e) { }
        sock = null;
    }

    if (fs.existsSync(sessionDir)) {
        addLog('Limpando pasta de sessão permanentemente...');
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    isReady = false;
    qrCodeData = null;

    // Reinicia do zero absoluto
    setTimeout(() => initWhatsApp(), 3000);
};
