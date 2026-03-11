import { useState, useEffect } from 'react';
import { Smartphone, ShieldAlert, CheckCircle2, ListMinus, Play, Pause, Trash2, Rocket, MessageSquare, Activity, Zap, Command } from 'lucide-react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const QRCodeComponent = QRCode as any;

export function Dispatcher({ queue, onRemove }: { queue: any[], onRemove: (num: string) => void }) {
    const [status, setStatus] = useState({ isReady: false, qr: null });
    const [formData, setFormData] = useState({
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [progressCount, setProgressCount] = useState(0);

    useEffect(() => {
        const fetchStatus = () => {
            axios.get('/api/wa/status')
                .then(res => setStatus(res.data))
                .catch(() => { });
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleStartQueue = async () => {
        if (!formData.message.trim()) return toast.error("Escreva uma mensagem antes de disparar!");
        if (queue.length === 0) return toast.error("Fila vazia!");
        if (!status.isReady) return toast.error("Conecte o WhatsApp primeiro!");

        setSending(true);
        setProgressCount(0);

        const leadsToProcess = [...queue];

        for (let i = 0; i < leadsToProcess.length; i++) {
            const lead = leadsToProcess[i];

            try {
                await axios.post('/api/wa/send', {
                    number: lead.whatsapp,
                    message: formData.message,
                    leadName: lead.name
                });
                onRemove(lead.whatsapp);
                setProgressCount(prev => prev + 1);
            } catch (e: any) {
                console.error("Falha ao enviar lead:", lead.name);
                toast.error(`Erro no lead ${lead.name}`);
            }

            if (i < leadsToProcess.length - 1) {
                const delay = Math.random() * 10000 + 10000;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        setSending(false);
        toast.success('Envio finalizado!');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 pb-32">
            {/* Primary Command Center */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none rotate-12">
                    <Rocket size={400} />
                </div>

                <div className="flex flex-col md:flex-row items-start justify-between mb-12 gap-8 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                            <Zap size={14} /> Batch Processor v5
                        </div>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Dispatcher <br /><span className="text-white/20">Nexus</span></h1>
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest max-w-sm leading-relaxed">Transmissão humanizada com arquitetura anti-ban integrada.</p>
                    </div>

                    <div className={`px-6 py-4 rounded-2xl flex items-center gap-4 border transition-all duration-500 ${status.isReady ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${status.isReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Conexão WhatsApp</p>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">{status.isReady ? 'CONECTADO' : 'DESCONECTADO'}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 relative z-10">
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-2">
                            <MessageSquare size={14} className="text-cyan-500" /> Mensagem
                        </label>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-all" />
                            <textarea
                                rows={6}
                                placeholder="Defina sua abordagem estratégica aqui..."
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                className="relative w-full bg-black/60 border border-white/5 rounded-[2rem] py-8 px-10 text-white focus:outline-none focus:border-cyan-500/40 transition-all text-lg font-bold placeholder:text-white/5 shadow-2xl resize-none"
                            />
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col min-h-[400px] shadow-2xl">
                        <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <ListMinus size={18} className="text-cyan-500" />
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fila de Envio ({queue.length})</span>
                            </div>
                            {queue.length > 0 && !sending && (
                                <button
                                    onClick={() => { queue.forEach(l => onRemove(l.whatsapp)); toast.success("Fila limpa!"); }}
                                    className="text-[9px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl border border-transparent hover:border-red-500/20"
                                >
                                    Limpar Fila
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-6 space-y-3 custom-scrollbar">
                            <AnimatePresence>
                                {queue.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/5 py-32 flex flex-col items-center gap-6">
                                        <Activity size={60} className="opacity-10" />
                                        <span className="text-xs font-black uppercase tracking-[0.5em] opacity-20">Fila vazia</span>
                                    </motion.div>
                                ) : queue.map((l, idx) => (
                                    <motion.div
                                        key={l.whatsapp}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl px-6 py-5 flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white uppercase italic tracking-tighter">{l.name}</span>
                                            <span className="text-[9px] font-bold text-white/30 tracking-[0.2em] mt-1">{l.whatsapp}</span>
                                        </div>
                                        <button
                                            onClick={() => onRemove(l.whatsapp)}
                                            disabled={sending}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
                        <div className="flex items-start gap-4 flex-1">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <ShieldAlert size={18} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic leading-relaxed">
                                Proteção Ativa: <br /><span className="text-white/40">Intervalo de 10-20s entre envios</span>
                            </p>
                        </div>
                        <button
                            onClick={handleStartQueue}
                            disabled={!status.isReady || sending || queue.length === 0}
                            className={`h-[72px] min-w-[300px] rounded-[1.8rem] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 text-xs shadow-2xl ${sending ? 'bg-amber-500 text-black' : 'bg-white text-black hover:bg-cyan-400'}`}
                        >
                            {sending ? (
                                <><Pause size={20} className="animate-pulse" /> Enviando {progressCount}/{queue.length}</>
                            ) : (
                                <><Play size={20} className="fill-current" /> Iniciar Envio</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Authentication Matrix */}
            <div className="space-y-8">
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden h-fit">
                    {!status.isReady ? (
                        <>
                            <div className="mb-10">
                                <div className="p-4 rounded-[2rem] bg-white/5 border border-white/5 w-fit mx-auto mb-6">
                                    <Smartphone size={32} className="text-cyan-500" />
                                </div>
                                <h4 className="font-black text-2xl text-white uppercase tracking-tighter italic">Conectar WhatsApp</h4>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mt-2">Escaneie o QR Code</p>
                            </div>

                            {status.qr ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10 border-[10px] border-white"
                                >
                                    <QRCodeComponent value={status.qr} size={240} />
                                    <div className="mt-8 flex flex-col items-center gap-2">
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-black/20" />)}
                                        </div>
                                        <span className="text-[10px] text-black/40 font-black uppercase tracking-widest">Escaneie para conectar</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="w-[300px] h-[300px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center bg-white/[0.01] gap-4">
                                    <Loader2 size={32} className="text-white/10 animate-spin" />
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Gerando Token...</span>
                                </div>
                            )}

                            <div className="mt-12 flex flex-col gap-4 w-full">
                                <button
                                    onClick={() => axios.post('/api/wa/restart')}
                                    className="w-full bg-white/[0.03] border border-white/5 hover:border-white/20 text-white/40 hover:text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                                >
                                    Reiniciar Driver
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center py-12">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-32 h-32 bg-green-500/10 text-green-500 border border-green-500/20 rounded-[48px] flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(34,197,94,0.15)]"
                            >
                                <CheckCircle2 size={56} />
                            </motion.div>
                            <h4 className="font-black text-3xl text-white uppercase italic tracking-tighter">Conectado</h4>
                            <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">WhatsApp Ativo</p>

                            <button
                                onClick={() => axios.post('/api/wa/restart')}
                                className="mt-16 text-[9px] font-black text-red-500/30 hover:text-red-500 uppercase tracking-[0.3em] transition-colors border border-transparent hover:border-red-500/10 px-6 py-3 rounded-xl"
                            >
                                Desconectar
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2.5rem] p-10 text-black shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 -rotate-12 transition-transform duration-700 group-hover:scale-125">
                        <Command size={100} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-xl font-black uppercase italic tracking-tighter">Como Funciona</h4>
                        <p className="text-[11px] font-bold uppercase leading-relaxed opacity-70">
                            O sistema utiliza intervalos aleatórios entre 10 e 20 segundos para simular digitação humana e proteger seu número.
                        </p>
                        <div className="pt-4 flex items-center gap-4">
                            <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-black/30" />
                            </div>
                            <span className="text-[10px] font-black uppercase">Seguro</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size || 24}
            height={size || 24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`animate-spin ${className}`}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
