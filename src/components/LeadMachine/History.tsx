import { useState, useEffect } from 'react';
import { Database, History as HistoryIcon, Clock, Filter, Phone, Instagram, Search, PlusCircle, MinusCircle, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export function History({ onQueue, queue, onRemove }: { onQueue: (l: any) => void, queue: any[], onRemove: (num: string) => void }) {
    const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');

    useEffect(() => {
        axios.get('/api/history')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-white/40 animate-pulse text-center py-20 font-medium font-mono text-xs tracking-widest uppercase">Consultando Arquivos Centrais...</div>;

    const categories = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => l.category || 'Geral')))] as string[];

    const filteredLeads = data.leads.filter((l: any) => {
        const matchesSearch = l.name.toLowerCase().includes(filter.toLowerCase()) || l.whatsapp.includes(filter);
        const matchesCategory = categoryFilter === 'Todas' || (l.category || 'Geral') === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const isInQueue = (num: string) => queue.some(q => q.whatsapp === num);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] p-7 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Lead Bank</p>
                        <h2 className="text-4xl font-black tracking-tighter text-white italic">{data.leads.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20"><Database size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-7 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Total Enviado</p>
                        <h2 className="text-4xl font-black tracking-tighter text-white italic">{data.sent.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20"><Phone size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-7 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-xl">
                    <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-black mb-2">Escaneamentos</p>
                        <h2 className="text-4xl font-black tracking-tighter text-white italic">{data.searches.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20"><HistoryIcon size={28} /></div>
                </div>
            </div>

            <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-8 md:p-10 border-b border-white/10 bg-white/[0.02] flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div>
                        <h3 className="font-black text-2xl text-white uppercase tracking-tighter italic">Dossiê Estratégico</h3>
                        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">Histórico de Inteligência Comercial</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                placeholder="Filtrar por nome ou zap..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 w-full md:w-64 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 appearance-none w-full md:w-48 cursor-pointer transition-all uppercase tracking-widest"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-black">
                            <tr className="border-b border-white/10 text-white/20 text-[10px] uppercase tracking-[0.25em] font-black">
                                <th className="py-6 px-10">Lead / Empresa</th>
                                <th className="py-6 px-10">Categoria</th>
                                <th className="py-6 px-10">Inteligência / Contato</th>
                                <th className="py-6 px-10 text-right">Central de Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
                                        <Database className="mx-auto mb-4 text-white/10 w-12 h-12" />
                                        <p className="text-white/20 font-black uppercase tracking-widest text-xs">Nenhum rastro encontrado.</p>
                                    </td>
                                </tr>
                            )}
                            {filteredLeads.map((l: any, i: number) => {
                                const inQueue = isInQueue(l.whatsapp);
                                return (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-all group border-b border-transparent hover:border-cyan-500/10">
                                        <td className="py-7 px-10">
                                            <div className="font-black text-white text-base group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{l.name}</div>
                                            <div className="text-white/30 font-bold text-[10px] flex items-center gap-1.5 mt-2 uppercase tracking-widest">
                                                <Clock size={10} className="text-cyan-500/50" /> Extraído em {new Date(l.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="py-7 px-10">
                                            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 font-black uppercase text-[9px] tracking-[0.2em]">{l.category || 'Geral'}</span>
                                        </td>
                                        <td className="py-7 px-10">
                                            <div className="space-y-2">
                                                <div className="text-white/60 font-mono font-bold text-xs flex items-center gap-2 group/link">
                                                    <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center text-green-500"><Phone size={12} /></div>
                                                    {l.whatsapp}
                                                </div>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <div className="text-white/40 text-[11px] flex items-center gap-2 font-black uppercase tracking-widest">
                                                        <div className="w-6 h-6 rounded-md bg-pink-500/10 flex items-center justify-center text-pink-500"><Instagram size={12} /></div>
                                                        {l.instagram}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-7 px-10 text-right">
                                            <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        if (inQueue) {
                                                            onRemove(l.whatsapp);
                                                            toast("Removido do Lançador.");
                                                        } else {
                                                            onQueue(l);
                                                            toast.success("Adicionado ao Lançador!");
                                                        }
                                                    }}
                                                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${inQueue ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-cyan-500 hover:text-black hover:border-cyan-500'}`}
                                                    title={inQueue ? "Remover do Lançador" : "Adicionar ao Lançador"}
                                                >
                                                    {inQueue ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                                                </button>
                                                <a
                                                    href={`https://wa.me/${l.whatsapp}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                                                    title="WhatsApp Direct"
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <a
                                                        href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"
                                                        title="Instagram Direct"
                                                    >
                                                        <Instagram size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
