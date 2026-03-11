import { useState, useEffect } from 'react';
import { Smartphone, Ghost, ShieldAlert, CheckCircle2, ListMinus, Play, Pause, Trash2, Rocket, MessageSquare } from 'lucide-react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import toast from 'react-hot-toast';

const QRCodeComponent = QRCode as any;

export function Dispatcher({ queue, onRemove }: { queue: any[], onRemove: (num: string) => void }) {
    const [status, setStatus] = useState({ isReady: false, qr: null });
    const [formData, setFormData] = useState({
        message: '' // Deixando vazio conforme solicitado
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
                // Aguarda entre 10 e 20 segundos para simular humano
                const delay = Math.random() * 10000 + 10000;
                await new Promise(r => setTimeout(r, delay));
            }
        }

        setSending(false);
        toast.success('Envio finalizado!');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-[#0A0A0A] p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col h-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                    <Rocket size={300} />
                </div>

                <div className="flex items-start justify-between mb-8 gap-4 relative z-10">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black mb-2 tracking-tighter flex items-center gap-2 text-white uppercase">
                            <Ghost className="text-cyan-400" /> Motor de Disparo
                        </h3>
                        <p className="text-white/40 text-sm md:text-base max-w-sm font-medium">Processamento humanizado em lote com proteção anti-ban.</p>
                    </div>

                    <div className={`px-4 py-2 flex items-center gap-2 rounded-xl text-[10px] uppercase tracking-widest font-black border shrink-0 transition-all ${status.isReady ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        <Smartphone size={14} />
                        {status.isReady ? 'Online' : 'Offline'}
                    </div>
                </div>

                <div className="space-y-6 flex-1 flex flex-col relative z-10">
                    <div className="relative">
                        <label className="flex items-center gap-2 text-[10px] font-black mb-3 text-white/30 uppercase tracking-[0.2em]">
                            <MessageSquare size={14} className="text-cyan-400" /> Script da Campanha (Suporta Spintax)
                        </label>
                        <textarea
                            rows={5}
                            placeholder="Escreva sua mensagem aqui... Use {Oi|Olá} para variações."
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:ring-2 ring-cyan-500/30 transition-all text-base font-medium leading-relaxed placeholder:text-white/10"
                        />
                        <div className="absolute bottom-4 right-6 text-[10px] font-mono text-white/20">
                            {formData.message.length} caracteres
                        </div>
                    </div>

                    <div className="mt-2 flex-1 bg-black/40 rounded-3xl border border-white/10 flex flex-col overflow-hidden min-h-[300px]">
                        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ListMinus size={16} /> Fila de Transmissão ({queue.length})
                            </span>
                            {queue.length > 0 && !sending && (
                                <button
                                    onClick={() => { queue.forEach(l => onRemove(l.whatsapp)); toast.success("Fila limpa!"); }}
                                    className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                                >
                                    Esvaziar
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
                            {queue.length === 0 ? (
                                <div className="text-center text-white/10 py-20 flex flex-col items-center gap-4">
                                    <ListMinus size={40} className="opacity-20" />
                                    <span className="text-sm font-bold uppercase tracking-widest opacity-40">Aguardando Leads...</span>
                                </div>
                            ) : queue.map(l => (
                                <div key={l.whatsapp} className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between group transition-all">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold truncate text-white uppercase tracking-tight">{l.name}</div>
                                        <div className="text-[10px] font-mono text-white/40 tracking-widest mt-0.5">{l.whatsapp}</div>
                                    </div>
                                    <button
                                        onClick={() => onRemove(l.whatsapp)}
                                        disabled={sending}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto">
                        <div className="text-[10px] text-white/30 max-w-[280px] flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <ShieldAlert size={18} className="text-amber-500 shrink-0" />
                            <span className="font-medium leading-normal tracking-wide italic">
                                Proteção Ativa: Intervalos randômicos de 10-20s entre disparos para simular digitação humana.
                            </span>
                        </div>
                        <button
                            onClick={handleStartQueue}
                            disabled={!status.isReady || sending || queue.length === 0}
                            className={`relative group h-[64px] min-w-[240px] rounded-2xl font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 overflow-hidden ${sending ? 'bg-amber-500 text-black' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_10px_30px_rgba(6,182,212,0.2)]'}`}
                        >
                            {sending ? (
                                <><Pause size={22} className="animate-pulse" /> Disparando {progressCount}/{queue.length}</>
                            ) : (
                                <><Play size={22} /> Iniciar Campanha</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-[#0A0A0A] p-10 rounded-3xl flex flex-col items-center justify-center border border-white/10 text-center h-fit shadow-2xl relative overflow-hidden">
                {!status.isReady ? (
                    <>
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-[50px] rounded-full" />
                            <h4 className="relative font-black text-xl mb-2 text-white uppercase tracking-tighter">Auth WhatsApp</h4>
                            <p className="relative text-white/40 text-xs font-bold uppercase tracking-widest">Digitalização Segura</p>
                        </div>

                        {status.qr ? (
                            <div className="bg-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
                                <QRCodeComponent value={status.qr} size={220} />
                                <div className="mt-4 text-[10px] text-black font-black uppercase tracking-widest opacity-40">Aguardando Leitura...</div>
                            </div>
                        ) : (
                            <div className="w-[220px] h-[220px] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center bg-white/5 gap-3">
                                <Smartphone size={32} className="text-white/10 animate-bounce" />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] animate-pulse">Sincronizando...</span>
                            </div>
                        )}

                        <div className="mt-10 flex flex-col gap-3 w-full">
                            <button
                                onClick={() => axios.post('/api/wa/restart')}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Reiniciar Driver
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-500/10 text-green-500 border border-green-500/20 rounded-[40px] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
                            <CheckCircle2 size={48} />
                        </div>
                        <h4 className="font-black text-2xl mb-2 text-white uppercase tracking-tighter">Conexão Ativa</h4>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Criptografia Ponta-a-Ponta</p>

                        <button
                            onClick={() => axios.post('/api/wa/restart')}
                            className="mt-10 text-[10px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                            Desconectar Sessão
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
