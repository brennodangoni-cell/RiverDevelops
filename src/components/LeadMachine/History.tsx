import { useState, useEffect } from 'react';
import { Database, History as HistoryIcon, Clock, Mail, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

export function History() {
    const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/history')
            .then(res => { setData(res.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    if (loading) return <div className="text-white/40 animate-pulse text-center py-20 font-medium font-mono">RECUPERANDO DOSSIÊ...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Total Leads</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.leads.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-cyan-400 border border-white/10"><Database size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Mensagens</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.sent.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20"><Mail size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Buscas</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.searches.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20"><HistoryIcon size={28} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
                <div className="bg-[#0A0A0A] overflow-hidden rounded-3xl border border-white/10">
                    <div className="flex justify-between items-center px-8 py-6 border-b border-white/10 bg-white/5">
                        <h3 className="font-extrabold text-xl text-white">Log de Operações</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#111]">
                                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-widest font-bold">
                                    <th className="py-4 px-6">Lead</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {data.sent.length === 0 ? <tr><td colSpan={3} className="py-12 text-center text-white/20">Nenhum disparo registrado.</td></tr> : null}
                                {data.sent.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-white text-base">{s.name}</div>
                                            <div className="text-white/40 font-mono text-sm tracking-wider">{s.number}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {s.status.includes('Sucesso') ?
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold uppercase tracking-wider"><CheckCircle size={14} /> Sucesso</span> :
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider"><XCircle size={14} /> Erro</span>
                                            }
                                        </td>
                                        <td className="py-4 px-6 text-right text-white/40 font-mono text-xs">
                                            {new Date(s.created_at || s.date).toLocaleString('pt-BR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] p-8 rounded-3xl border border-white/10">
                    <h3 className="font-extrabold text-xl mb-6 text-white text-center uppercase tracking-tighter">Histórico de Buscas</h3>
                    <div className="space-y-4">
                        {data.searches.length === 0 ? <div className="text-white/20 text-sm text-center py-6">Nenhuma busca.</div> : null}
                        {data.searches.map((s: any, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                                <div className="pr-4">
                                    <div className="font-bold text-sm mb-1.5 line-clamp-1 text-white uppercase tracking-wider">{s.query}</div>
                                    <div className="text-xs text-white/40 flex items-center gap-1.5"><Clock size={14} /> {new Date(s.created_at || s.date).toLocaleString()}</div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-extrabold text-sm border border-cyan-500/20">
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
