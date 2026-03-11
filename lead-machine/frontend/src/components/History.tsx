import { useState, useEffect } from 'react';
import { Database, History as HistoryIcon, Clock, Mail, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

export function History() {
    const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:3001/api/history')
            .then(res => { setData(res.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    if (loading) return <div className="text-[#A1A1AA] animate-pulse text-center py-20 font-medium">Buscando documentos seguros do banco local...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-[#27272A]">
                    <div><p className="text-[#A1A1AA] text-xs uppercase tracking-widest font-bold mb-2">Reserva de Contatos</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-[#FAFAFA]">{data.leads.length} <span className="text-base font-semibold text-[#52525B]">Leads</span></h2></div>
                    <div className="w-16 h-16 bg-[#18181B] rounded-2xl flex items-center justify-center text-primary border border-[#27272A] shadow-inner"><Database size={28} /></div>
                </div>
                <div className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-[#27272A]">
                    <div><p className="text-[#A1A1AA] text-xs uppercase tracking-widest font-bold mb-2">Ofensiva de Envio</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-[#FAFAFA]">{data.sent.length} <span className="text-base font-semibold text-[#52525B]">Mensagens</span></h2></div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20 shadow-inner"><Mail size={28} /></div>
                </div>
                <div className="glass-panel p-6 rounded-3xl flex items-center justify-between border border-[#27272A]">
                    <div><p className="text-[#A1A1AA] text-xs uppercase tracking-widest font-bold mb-2">Escaneamentos</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-[#FAFAFA]">{data.searches.length} <span className="text-base font-semibold text-[#52525B]">Operações</span></h2></div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner"><HistoryIcon size={28} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                <div className="glass-panel overflow-hidden rounded-3xl border border-[#27272A]">
                    <div className="flex justify-between items-center mb-0 px-8 py-6 border-b border-[#27272A] bg-[#121214]">
                        <h3 className="font-extrabold text-xl text-[#FAFAFA]">Backlog de Disparos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#18181B]">
                                <tr className="border-b border-[#27272A] text-[#A1A1AA] text-xs uppercase tracking-widest font-bold">
                                    <th className="py-4 px-6">Identificação e Destino</th>
                                    <th className="py-4 px-6">Feedback Operacional</th>
                                    <th className="py-4 px-6 text-right">Carimbo (Data)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27272A] text-sm bg-[#09090B]">
                                {data.sent.length === 0 ? <tr><td colSpan={3} className="py-12 text-center text-[#52525B] font-medium">Você ainda não fuzilou nenhum lead.</td></tr> : null}
                                {data.sent.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-[#121214] transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-[#FAFAFA] text-base">{s.name}</div>
                                            <div className="text-[#A1A1AA] font-mono text-sm tracking-wider mt-1">{s.number}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {s.status.includes('Sucesso') ?
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold uppercase tracking-wider"><CheckCircle size={14} /> Entregue</span> :
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider" title={s.status}><XCircle size={14} /> Falhou</span>
                                            }
                                        </td>
                                        <td className="py-4 px-6 text-right text-[#71717A] font-mono text-xs tracking-wider">
                                            {new Date(s.date).toLocaleString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel p-8 rounded-3xl border border-[#27272A] bg-[#09090B]">
                    <h3 className="font-extrabold text-xl mb-6 text-[#FAFAFA]">Painel de Consultas Local</h3>
                    <div className="space-y-4">
                        {data.searches.length === 0 ? <div className="text-[#52525B] text-sm text-center py-6 font-medium">Nenhum cruzamento de base registrado.</div> : null}
                        {data.searches.map((s: any, i: number) => (
                            <div key={i} className="bg-[#121214] border border-[#27272A] rounded-2xl p-4 flex items-center justify-between group hover:bg-[#18181B] hover:border-[#3F3F46] hover:shadow-lg transition-all">
                                <div className="pr-4">
                                    <div className="font-bold text-sm mb-1.5 line-clamp-1 text-[#FAFAFA] uppercase tracking-wider">{s.query}</div>
                                    <div className="text-xs text-[#71717A] flex items-center gap-1.5 font-medium"><Clock size={14} className="text-[#52525B]" /> {new Date(s.date).toLocaleString()}</div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/20 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                                    {s.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
