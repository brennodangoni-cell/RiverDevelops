import { useState, useEffect } from 'react';
import { MessageSquare, Play, Pause, Smartphone, Loader2, Trash2, ShieldCheck, X, LogOut } from 'lucide-react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

export function Dispatcher({ queue, onRemove }: { queue: any[]; onRemove: (num: string) => void }) {
    const [msg, setMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [progressCount, setProgressCount] = useState(0);
    const [status, setStatus] = useState({ isReady: false, qr: '' });
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const check = async () => {
            try {
                const r = await axios.get('/api/wa/status');
                setStatus(r.data);

                // Buscar logs apenas se estiver tentando conectar
                if (!r.data.isReady) {
                    const l = await axios.get('/api/wa/debug');
                    setLogs(l.data.logs || []);
                }

                setError(null);
            } catch (err: any) {
                if (err.code === 'ERR_NETWORK' || err.response?.status === 503) {
                    setError("Acordando servidor... aguarde 15s");
                } else if (err.response?.status === 401) {
                    setError("Sessão expirada. Logue novamente.");
                } else {
                    setError("Erro de conexão");
                }
                console.error("Erro ao buscar status WA:", err);
            }
        };
        check();
        const i = setInterval(check, 4000);
        return () => clearInterval(i);
    }, []);

    const handleSend = async () => {
        if (!msg.trim()) return toast.error("Escreva a mensagem");
        if (queue.length === 0) return toast.error("Adicione leads à fila");
        if (sending) { setSending(false); return; }

        setSending(true);
        toast.success("Iniciando campanha...");

        for (let i = 0; i < queue.length; i++) {
            // Check if user stopped manually
            setProgressCount(i);
            const lead = queue[i];

            try {
                await axios.post('/api/wa/send', {
                    number: lead.whatsapp.replace(/\D/g, ''),
                    message: msg,
                    leadName: lead.name
                });
                onRemove(lead.whatsapp);
            } catch (err: any) {
                toast.error(`Erro ao enviar para ${lead.name}`);
                console.error("Erro envio:", err);
            }

            if (i < queue.length - 1) {
                // Delay entre envios
                const wait = 6000 + Math.random() * 8000;
                await new Promise(r => setTimeout(r, wait));
            }
        }

        setSending(false);
        toast.success("Envio finalizado!");
    };

    const handleLogout = async () => {
        if (!confirm("Deseja desconectar sua conta do WhatsApp?")) return;
        try {
            await axios.post('/api/wa/restart');
            setStatus({ isReady: false, qr: '' });
            toast.success("Sessão encerrada");
        } catch (err) {
            toast.error("Erro ao desconectar");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Esquerda: Mensagem + Fila */}
            <div className="lg:col-span-2 space-y-6">
                {/* Mensagem */}
                <div className="bg-[#131313] border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <MessageSquare size={16} className="text-cyan-400" /> Mensagem
                        </h2>
                        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${status.isReady ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full ${status.isReady ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {status.isReady ? 'Conectado' : 'Desconectado'}
                        </div>
                    </div>
                    <textarea
                        rows={5}
                        placeholder="Escreva sua mensagem aqui..."
                        className="w-full bg-[#111] border border-white/[0.06] rounded-xl p-4 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/15 transition-all"
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                    />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs text-white/25">
                            <ShieldCheck size={14} className="text-cyan-400" />
                            Intervalo de 10-20s entre envios (proteção anti-ban)
                        </div>
                        <div className="flex-1" />
                        <button
                            onClick={handleSend}
                            disabled={!status.isReady || queue.length === 0}
                            className={`h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${sending ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
                        >
                            {sending ? <><Pause size={16} /> Enviando {progressCount}/{queue.length}</> : <><Play size={16} /> Iniciar Envio</>}
                        </button>
                    </div>
                </div>

                {/* Fila */}
                <div className="bg-[#131313] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Fila de envio ({queue.length})</h3>
                        {queue.length > 0 && !sending && (
                            <button onClick={() => queue.forEach(l => onRemove(l.whatsapp))}
                                className="text-xs text-red-400/50 hover:text-red-400 transition-colors font-medium flex items-center gap-1.5">
                                <Trash2 size={12} /> Limpar tudo
                            </button>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
                        {queue.length === 0 ? (
                            <div className="py-16 text-center text-white/20 text-sm">
                                Nenhum lead na fila. Adicione pelo Radar ou Banco de Leads.
                            </div>
                        ) : queue.map((l, idx) => (
                            <div key={idx} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.015] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[11px] font-semibold shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{l.name}</div>
                                        <div className="text-[11px] text-white/25">{l.whatsapp}</div>
                                    </div>
                                </div>
                                {!sending && (
                                    <button onClick={() => onRemove(l.whatsapp)} className="text-white/15 hover:text-red-400 p-1 transition-colors shrink-0">
                                        <X size={15} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Direita: WhatsApp */}
            <div className="space-y-6">
                <div className="bg-[#131313] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-4">
                        <Smartphone size={22} className="text-[#25D366]" />
                    </div>

                    {!status.isReady ? (
                        <>
                            <h4 className="text-base font-semibold text-white mb-1">Conectar WhatsApp</h4>
                            <p className="text-xs text-white/25 mb-6 text-center">Escaneie o QR Code com seu celular</p>
                            {status.qr ? (
                                <div className="bg-white rounded-3xl p-6 w-fit mx-auto shadow-2xl border-4 border-black/5">
                                    {/* @ts-ignore */}
                                    <QRCode value={status.qr} size={200} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                                    <Loader2 size={32} className="animate-spin text-cyan-500/50" />
                                    <span className="text-xs text-white/20 font-medium px-6">{error || "Gerando nova sessão... Isso pode levar até 1 minuto no Render."}</span>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await axios.post('/api/wa/restart', { clean: true });
                                                toast.success("Limpando tudo e reiniciando...");
                                            } catch {
                                                toast.error("Erro ao solicitar reinício");
                                            }
                                        }}
                                        className="mt-4 text-[10px] text-white/20 hover:text-cyan-500 transition-colors uppercase tracking-widest font-bold bg-white/5 border border-white/5 px-6 py-2.5 rounded-xl"
                                    >
                                        Hard Reset (Limpar Sessão)
                                    </button>

                                    {logs.length > 0 && (
                                        <div className="mt-8 w-full max-w-[280px] text-left space-y-1 opacity-40">
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter mb-2">Logs do Motor:</p>
                                            {logs.slice(-4).map((l, idx) => (
                                                <div key={idx} className="text-[9px] font-mono text-white/50 truncate border-l border-white/10 pl-2">
                                                    {l}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-4 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] border border-emerald-500/20">
                                <WhatsAppIcon size={32} className="text-emerald-400" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">Conta Ativa</h4>
                            <p className="text-[11px] text-emerald-400/70 font-medium mb-6 px-4">Conectado e pronto para realizar disparos em massa.</p>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all text-[11px] font-bold uppercase tracking-wider"
                            >
                                <LogOut size={14} /> Encerrar Sessão
                            </button>
                        </>
                    )}
                </div>

                {/* Info */}
                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-5">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">Como funciona</h4>
                    <p className="text-xs text-white/35 leading-relaxed">
                        O sistema envia as mensagens com intervalos aleatórios entre 10 e 20 segundos para simular comportamento humano e proteger seu número.
                    </p>
                </div>
            </div>
        </div>
    );
}
