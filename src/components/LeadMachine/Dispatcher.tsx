import { useState, useEffect } from 'react';
import { Smartphone, Ghost, ShieldAlert, CheckCircle2, ListMinus, Play, Pause, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import toast from 'react-hot-toast';

const QRCodeComponent = QRCode as any;

export function Dispatcher({ queue, onRemove }: { queue: any[], onRemove: (num: string) => void }) {
    const [status, setStatus] = useState({ isReady: false, qr: null });
    const [formData, setFormData] = useState({ message: '{Oi|Olá|Opa} tudo bem? Meu nome é Brenno. Eu trabalho criando vídeos profissionais para produtos de lojas e e-commerces. Vamos conversar? Posso te mostrar alguns exemplos de clientes recentes.' });
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
        if (queue.length === 0) return toast.error("Fila vazia!");
        if (!status.isReady) return toast.error("Conecte o WhatsApp primeiro!");

        setSending(true);
        setProgressCount(0);

        for (let i = 0; i < queue.length; i++) {
            const lead = queue[i];

            try {
                await axios.post('/api/wa/send', {
                    number: lead.whatsapp,
                    message: formData.message,
                    leadName: lead.name
                });
                onRemove(lead.whatsapp);
                setProgressCount(prev => prev + 1);
            } catch (e) {
                console.error("Falha ao enviar lead:", lead.name);
            }

            if (i < queue.length - 1) {
                await new Promise(r => setTimeout(r, Math.random() * 5000 + 5000));
            }
        }

        setSending(false);
        toast.success('Envio finalizado!');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-[#0A0A0A] p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight flex items-center gap-2 text-white">
                            <Ghost className="text-cyan-400" /> Motor de Disparo
                        </h3>
                        <p className="text-white/40 text-sm md:text-base max-w-md">Processamento humanizado de leads.</p>
                    </div>

                    <div className={`px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-semibold border shrink-0 ${status.isReady ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        <Smartphone size={16} />
                        {status.isReady ? 'Online' : 'Desconectado'}
                    </div>
                </div>

                <div className="space-y-6 flex-1 flex flex-col">
                    <div>
                        <label className="block text-xs font-bold mb-2 text-white/40 uppercase tracking-wider">Mensagem (Spintax)</label>
                        <textarea
                            rows={4}
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-[#111] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 ring-cyan-500/50 transition-colors text-sm font-mono leading-relaxed"
                        />
                    </div>

                    <div className="mt-2 flex-1 bg-[#0A0A0A] rounded-2xl border border-white/10 flex flex-col overflow-hidden min-h-[250px] max-h-[350px]">
                        <div className="px-5 py-3.5 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <span className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center gap-2"><ListMinus size={16} /> Fila ({queue.length})</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {queue.length === 0 ? (
                                <div className="text-center text-white/20 py-14 flex flex-col items-center">Fila vazia</div>
                            ) : queue.map(l => (
                                <div key={l.whatsapp} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between group">
                                    <div className="text-sm font-semibold truncate text-white">{l.name}</div>
                                    <div className="text-xs font-mono text-white/40 tracking-wider">{l.whatsapp}</div>
                                    <button onClick={() => onRemove(l.whatsapp)} disabled={sending} className="text-white/20 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
                        <div className="text-xs text-white/40 max-w-[300px] flex items-start gap-2 bg-white/5 p-3 rounded-lg border border-white/10">
                            <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                            Delay automático injetado para evitar bloqueios.
                        </div>
                        <button
                            onClick={handleStartQueue}
                            disabled={!status.isReady || sending || queue.length === 0}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                        >
                            {sending ? <><Pause size={20} className="animate-pulse" /> Disparando {progressCount}/{queue.length}</> : <><Play size={20} /> Iniciar Campanha</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-[#0A0A0A] p-8 rounded-3xl flex flex-col items-center justify-center border border-white/10 text-center h-fit">
                {!status.isReady ? (
                    <>
                        <h4 className="font-bold text-lg mb-2 text-white">Conectar WhatsApp</h4>
                        <p className="text-white/40 text-sm mb-8">Escaneie o QR Code para parear.</p>

                        {status.qr ? (
                            <div className="bg-white p-4 rounded-xl">
                                <QRCodeComponent value={status.qr} size={200} />
                            </div>
                        ) : (
                            <div className="w-[200px] h-[200px] border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center bg-white/5">
                                <span className="text-white/20 text-sm animate-pulse">Iniciando...</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={40} />
                        </div>
                        <h4 className="font-bold text-xl mb-2 text-white">WhatsApp Pronto</h4>
                        <p className="text-white/40 text-sm">Sessão ativa e funcional.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
