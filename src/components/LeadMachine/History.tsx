import { useState, useEffect } from 'react';
import { Database, Clock, Filter, MessageCircle, Instagram, Search, PlusCircle, MinusCircle, ExternalLink, Globe, MapPin, Tag } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export function History({ onQueue, queue, onRemove }: { onQueue: (l: any) => void, queue: any[], onRemove: (num: string) => void }) {
    const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [stateFilter, setStateFilter] = useState('Todos');
    const [cityFilter, setCityFilter] = useState('Todas');

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

    if (loading) return <div className="text-white/40 animate-pulse text-center py-24 font-black font-mono text-xs tracking-[0.3em] uppercase">Sincronizando Banco de Dados Central...</div>;

    // Extrair filtros únicos dos dados existentes
    const categories = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => l.category || 'Geral')))] as string[];

    // Extrair estados e cidades do campo 'source' (ex: "Academias em São Paulo SP")
    const states = ['Todos', ...Array.from(new Set(data.leads.map((l: any) => {
        const parts = l.source?.split(' ');
        return parts ? parts[parts.length - 1] : null;
    }).filter(Boolean)))] as string[];

    const cities = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => {
        const match = l.source?.match(/em (.*) [A-Z]{2}$/);
        return match ? match[1] : null;
    }).filter(Boolean)))] as string[];

    const filteredLeads = data.leads.filter((l: any) => {
        const searchStr = (l.name + l.whatsapp + (l.source || '')).toLowerCase();
        const matchesSearch = searchStr.includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'Todas' || (l.category || 'Geral') === categoryFilter;

        const leadState = l.source?.split(' ').pop();
        const matchesState = stateFilter === 'Todos' || leadState === stateFilter;

        const cityMatch = l.source?.match(/em (.*) [A-Z]{2}$/);
        const leadCity = cityMatch ? cityMatch[1] : null;
        const matchesCity = cityFilter === 'Todas' || leadCity === cityFilter;

        return matchesSearch && matchesCategory && matchesState && matchesCity;
    });

    const isInQueue = (num: string) => queue.some(q => q.whatsapp === num);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Lead Bank</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.leads.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform"><Database size={28} /></div>
                </div>
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Conversões</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.sent.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20 group-hover:scale-110 transition-transform"><MessageCircle size={28} /></div>
                </div>
                <div className="bg-[#050505] p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black mb-3">Escaneamentos</p>
                        <h2 className="text-5xl font-black tracking-tighter text-white italic leading-none">{data.searches.length}</h2>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform"><Globe size={28} /></div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-[#050505] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-10 lg:p-14 border-b border-white/10 bg-white/[0.01]">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-12">
                        <div>
                            <h3 className="font-black text-3xl text-white uppercase tracking-tighter italic leading-none">Dossiê Estratégico</h3>
                            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] mt-3 ml-1 opacity-60">Inteligência Comercial Centralizada</p>
                        </div>
                        <div className="relative w-full lg:w-[400px]">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text"
                                placeholder="Buscar nos registros táticos..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="bg-black border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 w-full transition-all placeholder:text-white/10 hover:border-white/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Nicho / Categoria</label>
                            <div className="relative group">
                                <Tag size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-cyan-400 transition-colors" />
                                <select
                                    value={categoryFilter}
                                    onChange={e => setCategoryFilter(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-4.5 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Unidade Federativa</label>
                            <div className="relative group">
                                <MapPin size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-cyan-400 transition-colors" />
                                <select
                                    value={stateFilter}
                                    onChange={e => setStateFilter(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-4.5 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                                >
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Geolocalização</label>
                            <div className="relative group">
                                <Globe size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-cyan-400 transition-colors" />
                                <select
                                    value={cityFilter}
                                    onChange={e => setCityFilter(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-4.5 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 appearance-none cursor-pointer transition-all hover:bg-white/[0.02]"
                                >
                                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-black">
                            <tr className="border-b border-white/10 text-white/20 text-[10px] uppercase tracking-[0.3em] font-black italic">
                                <th className="py-8 px-10">Identidade</th>
                                <th className="py-8 px-10">Classificação</th>
                                <th className="py-8 px-10">Ponto de Contato</th>
                                <th className="py-8 px-10 text-right">Comandos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-32 text-center">
                                        <Database className="mx-auto mb-6 text-white/5 w-16 h-16 animate-pulse" />
                                        <p className="text-white/10 font-black uppercase tracking-[0.5em] text-[10px]">Arquivos não localizados no setor.</p>
                                    </td>
                                </tr>
                            )}
                            {filteredLeads.map((l: any, i: number) => {
                                const inQueue = isInQueue(l.whatsapp);
                                return (
                                    <tr key={i} className="hover:bg-white/[0.01] transition-all group">
                                        <td className="py-8 px-10">
                                            <div className="font-black text-white text-lg group-hover:text-cyan-400 transition-colors uppercase tracking-tight italic">{l.name}</div>
                                            <div className="text-white/20 font-black text-[9px] flex items-center gap-2 mt-2.5 uppercase tracking-widest">
                                                <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center"><Clock size={10} /></div>
                                                Capturado em {new Date(l.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="py-8 px-10">
                                            <div className="flex flex-col gap-2">
                                                <span className="inline-flex px-3.5 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 font-black uppercase text-[9px] tracking-widest w-fit">{l.category || 'Geral'}</span>
                                                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest ml-1">{l.source?.split(' em ').pop() || 'Global'}</span>
                                            </div>
                                        </td>
                                        <td className="py-8 px-10">
                                            <div className="space-y-3">
                                                <div className="text-green-400 font-mono font-bold text-sm flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center"><MessageCircle size={14} /></div>
                                                    {l.whatsapp}
                                                </div>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <div className="text-pink-400 font-mono font-bold text-xs flex items-center gap-2.5 ml-0.5">
                                                        <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center"><Instagram size={14} /></div>
                                                        {l.instagram}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-8 px-10 text-right">
                                            <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => {
                                                        if (inQueue) {
                                                            onRemove(l.whatsapp);
                                                            toast("Removido da central de disparo.");
                                                        } else {
                                                            onQueue(l);
                                                            toast.success("Adicionado à fila tática!");
                                                        }
                                                    }}
                                                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${inQueue ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-cyan-500 hover:text-black hover:border-cyan-500'}`}
                                                    title={inQueue ? "Abortar Envio" : "Escalar para Lançador"}
                                                >
                                                    {inQueue ? <MinusCircle size={22} /> : <PlusCircle size={22} />}
                                                </button>
                                                <a
                                                    href={`https://wa.me/${l.whatsapp}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-lg"
                                                    title="WhatsApp Direct"
                                                >
                                                    <ExternalLink size={20} />
                                                </a>
                                                {l.instagram && l.instagram !== 'Não Listado' && (
                                                    <a
                                                        href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shadow-lg"
                                                        title="Instagram Direct"
                                                    >
                                                        <Instagram size={20} />
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
