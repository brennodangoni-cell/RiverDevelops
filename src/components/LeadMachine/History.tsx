import { useState, useEffect } from 'react';
import { Database, History as HistoryIcon, Clock, Filter, Phone, Instagram, Search } from 'lucide-react';
import axios from 'axios';

export function History() {
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Lead Bank</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.leads.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20"><Database size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Total Enviado</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.sent.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20"><Phone size={28} /></div>
                </div>
                <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between shadow-2xl">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Escaneamentos</p>
                        <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.searches.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20"><HistoryIcon size={28} /></div>
                </div>
            </div>

            <div className="bg-[#0A0A0A] rounded-3xl border border-white/10 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <h3 className="font-extrabold text-xl text-white uppercase tracking-tighter">Banco de Dados de Leads</h3>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="Filtrar por nome ou zap..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 ring-cyan-500/50 w-full md:w-64"
                            />
                        </div>
                        <div className="relative">
                            <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-xl py-2.5 pl-11 pr-10 text-sm text-white focus:outline-none focus:ring-2 ring-cyan-500/50 appearance-none w-full md:w-48 cursor-pointer"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#050505]">
                            <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
                                <th className="py-5 px-8">Lead / Empresa</th>
                                <th className="py-5 px-8">Categoria</th>
                                <th className="py-5 px-8">Contato</th>
                                <th className="py-5 px-8 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-white/20 font-medium">
                                        Nenhum lead encontrado com esses filtros.
                                    </td>
                                </tr>
                            )}
                            {filteredLeads.map((l: any, i: number) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-6 px-8">
                                        <div className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{l.name}</div>
                                        <div className="text-white/40 font-mono text-xs flex items-center gap-1.5 mt-1">
                                            <Clock size={12} /> Descoberto em {new Date(l.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="py-6 px-8 text-sm">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 font-bold uppercase text-[10px] tracking-widest">{l.category || 'Geral'}</span>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-green-400 font-mono font-bold text-sm flex items-center gap-2">
                                                <Phone size={14} /> {l.whatsapp}
                                            </div>
                                            {l.instagram && l.instagram !== 'Não Listado' && (
                                                <div className="text-pink-400 text-xs flex items-center gap-2 font-medium">
                                                    <Instagram size={14} /> {l.instagram}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-6 px-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <a
                                                href={`https://wa.me/${l.whatsapp}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                                                title="Abrir WhatsApp"
                                            >
                                                <Phone size={18} />
                                            </a>
                                            {l.instagram && l.instagram !== 'Não Listado' && (
                                                <a
                                                    href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all"
                                                    title="Ver Instagram"
                                                >
                                                    <Instagram size={18} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
