import { useState, useEffect } from 'react';
import { Smartphone, Send, Ghost, ShieldAlert, CheckCircle2, ListMinus, Play, Pause, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import axios from 'axios';

export function Dispatcher({ queue, onRemove }: { queue: any[], onRemove: (num: string) => void }) {
    const [status, setStatus] = useState({ isReady: false, qr: null });
    const [formData, setFormData] = useState({ message: '{Oi|Olá|Opa} tudo bem? Meu nome é Brenno. Eu trabalho criando vídeos profissionais para produtos de lojas e e-commerces. Vamos conversar? Posso te mostrar alguns exemplos de clientes recentes.' });
    const [sending, setSending] = useState(false);
    const [progressCount, setProgressCount] = useState(0);

    useEffect(() => {
        const fetchStatus = () => {
            axios.get('http://localhost:3001/api/wa/status')
                .then(res => setStatus(res.data))
                .catch(() => { });
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleStartQueue = async () => {
        if (queue.length === 0) return alert("Fila vazia. Rastrei leads primeiro no Radar!");
        if (!status.isReady) return alert("Conecte o WhatsApp primeiro escaneando o QR Code.");

        setSending(true);
        setProgressCount(0);

        for (let i = 0; i < queue.length; i++) {
            const lead = queue[i];

            try {
                await axios.post('http://localhost:3001/api/wa/send', {
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
        alert('✅ Envio finalizado!');
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="glass-panel p-6 md:p-8 rounded-3xl flex flex-col h-full border border-[#27272A]">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight flex items-center gap-2">
                            <Ghost className="text-primary" /> Motor de Disparo
                        </h3>
                        <p className="text-[#A1A1AA] text-sm md:text-base max-w-md">Os leads adicionados no Radar serão processados aqui um por um, simulando interação real.</p>
                    </div>

                    <div className={`px-4 py-2 flex items-center gap-2 rounded-xl text-sm font-semibold border shrink-0 ${status.isReady ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        <Smartphone size={16} />
                        {status.isReady ? 'Conectado e Online' : 'Aguardando Login'}
                    </div>
                </div>

                <div className="space-y-6 flex-1 flex flex-col">
                    <div>
                        <label className="block text-xs font-bold mb-2 text-[#A1A1AA] uppercase tracking-wider">Spintax (Corpo da Mensagem de Vendas)</label>
                        <textarea
                            rows={4}
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            className="w-full bg-[#121214] border border-[#27272A] rounded-xl py-3 px-4 text-[#FAFAFA] focus:outline-none focus:ring-2 ring-primary/50 transition-colors text-sm font-mono leading-relaxed"
                        />
                        <p className="text-xs text-[#52525B] font-medium mt-2">Dica: Use {"{A|B}"} para ramificar as palavras e evitar bloqueio automático do WhatsApp.</p>
                    </div>

                    {/* Fila Display */}
                    <div className="mt-2 flex-1 bg-[#09090B] rounded-2xl border border-[#27272A] flex flex-col overflow-hidden min-h-[250px] max-h-[350px]">
                        <div className="px-5 py-3.5 border-b border-[#27272A] flex justify-between items-center bg-[#18181B]">
                            <span className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2"><ListMinus size={16} /> Fila de Espera ({queue.length})</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {queue.length === 0 ? (
                                <div className="text-center text-[#52525B] py-14 flex flex-col items-center">
                                    A lista de disparo está limpa.
                                </div>
                            ) : queue.map(l => (
                                <div key={l.whatsapp} className="bg-[#18181B] border border-[#27272A] rounded-xl px-4 py-3 flex items-center justify-between group">
                                    <div className="text-sm font-semibold w-full max-w-[200px] truncate text-[#FAFAFA]">{l.name}</div>
                                    <div className="text-xs font-mono text-[#71717A] tracking-wider">{l.whatsapp}</div>
                                    <button onClick={() => onRemove(l.whatsapp)} disabled={sending} className="text-[#52525B] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
                        <div className="text-xs text-[#A1A1AA] max-w-[300px] flex items-start gap-2 bg-[#18181B] p-3 rounded-lg border border-[#27272A]">
                            <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                            Delay automático injetado. O algoritmo vai variar entre 5 a 15s de espera após ler cada nova linha para simular digitação real.
                        </div>
                        <button
                            onClick={handleStartQueue}
                            disabled={!status.isReady || sending || queue.length === 0}
                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-base shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]"
                        >
                            {sending ? <><Pause size={20} className="animate-pulse" /> Disparando {progressCount}/{queue.length}</> : <><Play size={20} /> Iniciar Campanha ({queue.length})</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6 flex flex-col">
                <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center h-full text-center border border-[#27272A]">
                    {!status.isReady ? (
                        <>
                            <div className="w-16 h-16 bg-[#18181B] border border-[#27272A] rounded-2xl flex items-center justify-center mb-6">
                                <Smartphone className="text-[#52525B]" size={24} />
                            </div>
                            <h4 className="font-bold text-lg mb-2 text-[#FAFAFA]">Requer Vinculação</h4>
                            <p className="text-[#A1A1AA] text-sm mb-8">Escaneie o código abaixo com um número de operação comercial. <b>Nunca use seu pessoal.</b></p>

                            {status.qr ? (
                                <div className="bg-white p-4 rounded-3xl border-4 border-[#121214]">
                                    <QRCode value={status.qr} size={200} />
                                </div>
                            ) : (
                                <div className="w-[200px] h-[200px] border-2 border-dashed border-[#27272A] rounded-3xl flex items-center justify-center bg-[#121214]">
                                    <span className="text-[#A1A1AA] text-sm font-semibold animate-pulse">Iniciando Driver...</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full">
                            <div className="w-24 h-24 bg-green-500/10 text-green-500 border border-green-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(34,197,94,0.5)]">
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 className="font-bold text-xl mb-2 text-[#FAFAFA]">WhatsApp Operacional</h4>
                            <p className="text-[#A1A1AA] text-sm font-medium">Sessão injetada com sucesso. Os envios serão disparados assumindo o perfil da conta pareada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
