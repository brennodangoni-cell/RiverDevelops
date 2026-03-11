import { useState, useEffect } from 'react';
2: import { Database, History as HistoryIcon, Clock, Filter, Phone, Instagram, Search } from 'lucide-react';
3: import axios from 'axios';
4:
5: export function History() {
    6: const [data, setData] = useState<any>({ searches: [], leads: [], sent: [] });
    7: const [loading, setLoading] = useState(true);
    8: const [filter, setFilter] = useState('');
    9: const [categoryFilter, setCategoryFilter] = useState('Todas');
    10:
    11: useEffect(() => {
        12: axios.get('/api/history')
        13:             .then(res => { setData(res.data); setLoading(false); })
        14:             .catch (err => { console.error(err); setLoading(false); });
    15:
}, []);
16:
17: if (loading) return <div className="text-white/40 animate-pulse text-center py-20 font-medium font-mono text-xs tracking-widest uppercase">Consultando Arquivos Centrais...</div>;
18:
19: const categories = ['Todas', ...Array.from(new Set(data.leads.map((l: any) => l.category || 'Geral')))] as string[];
20:
21: const filteredLeads = data.leads.filter((l: any) => {
    22: const matchesSearch = l.name.toLowerCase().includes(filter.toLowerCase()) || l.whatsapp.includes(filter);
    23: const matchesCategory = categoryFilter === 'Todas' || (l.category || 'Geral') === categoryFilter;
    24: return matchesSearch && matchesCategory;
    25:
});
26:
27: return (
    28: <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        29:             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            30:                 <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                31:                     <div>
                    32:                         <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Lead Bank</p>
                    33:                         <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.leads.length}</h2>
                    34:                     </div>
                35:                     <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/20"><Database size={28} /></div>
                36:                 </div>
            37:                 <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                38:                     <div>
                    39:                         <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Total Enviado</p>
                    40:                         <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.sent.length}</h2>
                    41:                     </div>
                42:                     <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 border border-green-500/20"><Phone size={28} /></div>
                43:                 </div>
            44:                 <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/10 flex items-center justify-between shadow-2xl">
                45:                     <div>
                    46:                         <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-2">Escaneamentos</p>
                    47:                         <h2 className="text-4xl font-extrabold tracking-tight text-white">{data.searches.length}</h2>
                    48:                     </div>
                49:                     <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20"><HistoryIcon size={28} /></div>
                50:                 </div>
            51:             </div>
        52:
        53:             <div className="bg-[#0A0A0A] rounded-3xl border border-white/10 overflow-hidden">
            54:                 <div className="p-6 md:p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                55:                     <h3 className="font-extrabold text-xl text-white uppercase tracking-tighter">Banco de Dados de Leads</h3>
                56:
                57:                     <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    58:                         <div className="relative">
                        59:                             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                        60:                             <input 
61:                                 type="text"
                        62:                                 placeholder="Filtrar por nome ou zap..."
                        63:                                 value={filter}
                        64:                                 onChange={e => setFilter(e.target.value)}
                        65:                                 className="bg-black border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 ring-cyan-500/50 w-full md:w-64"
66:                             />
                        67:                         </div>
                    68:                         <div className="relative">
                        69:                             <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                        70:                             <select 
71:                                 value={categoryFilter}
                        72:                                 onChange={e => setCategoryFilter(e.target.value)}
                        73:                                 className="bg-black border border-white/10 rounded-xl py-2.5 pl-11 pr-10 text-sm text-white focus:outline-none focus:ring-2 ring-cyan-500/50 appearance-none w-full md:w-48 cursor-pointer"
74:                             >
                        75:                                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        76:                             </select>
                    77:                         </div>
                78:                     </div>
            79:                 </div>
        80:
        81:                 <div className="overflow-x-auto">
            82:                     <table className="w-full text-left border-collapse">
                83:                         <thead className="bg-[#050505]">
                    84:                             <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
                        85:                                 <th className="py-5 px-8">Lead / Empresa</th>
                        86:                                 <th className="py-5 px-8">Categoria</th>
                        87:                                 <th className="py-5 px-8">Contato</th>
                        88:                                 <th className="py-5 px-8 text-right">Ação</th>
                        89:                             </tr>
                    90:                         </thead>
                91:                         <tbody className="divide-y divide-white/5">
                    92:                             {filteredLeads.length === 0 && (
                        93:                                 <tr><td colSpan={4} className="py-20 text-center text-white/20 font-medium">Nenhum lead encontrado com esses filtros.</td></tr>
94:                             )}
                    95:                             {filteredLeads.map((l: any, i: number) => (
                        96:                                 <tr key={i} className="hover:bg-white/5 transition-colors group">
                        97:                                     <td className="py-6 px-8">
                            98:                                         <div className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{l.name}</div>
                            99:                                         <div className="text-white/40 font-mono text-xs flex items-center gap-1.5 mt-1">
                                100:                                             <Clock size={12} /> Descoberto em {new Date(l.created_at).toLocaleDateString()}
                                101:                                         </div>
                            102:                                     </td>
                        103:                                     <td className="py-6 px-8 text-sm">
                            104:                                         <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 font-bold uppercase text-[10px] tracking-widest">{l.category || 'Geral'}</span>
                            105:                                     </td>
                        106:                                     <td className="py-6 px-8">
                            107:                                         <div className="flex flex-col gap-1">
                                108:                                             <div className="text-green-400 font-mono font-bold text-sm flex items-center gap-2">
                                    109:                                                 <Phone size={14} /> {l.whatsapp}
                                    110:                                             </div>
                                111:                                             {l.instagram && l.instagram !== 'Não Listado' && (
                                    112:                                                 <div className="text-pink-400 text-xs flex items-center gap-2 font-medium">
                                    113:                                                     <Instagram size={14} /> {l.instagram}
                                    114:                                                 </div>
115:                                             )}
                                116:                                         </div>
                            117:                                     </td>
                        118:                                     <td className="py-6 px-8 text-right">
                            119:                                         <div className="flex justify-end gap-2">
                                120:                                             <a 
121:                                                 href={`https://wa.me/${l.whatsapp}`}
                                122:                                                 target="_blank"
                                123:                                                 className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"
                                124:                                                 title="Abrir WhatsApp"
125:                                             >
                                126:                                                 <Phone size={18} />
                                127:                                             </a>
                            128:                                             {l.instagram && l.instagram !== 'Não Listado' && (
                                129:                                                 <a 
130:                                                     href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                            131:                                                     target="_blank"
                            132:                                                     className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all"
                            133:                                                     title="Ver Instagram"
134:                                                 >
                            135:                                                     <Instagram size={18} />
                            136:                                                 </a>
137:                                             )}
                        138:                                         </div>
                    139:                                     </td>
                140:                                 </tr>
141:                             ))}
            142:                         </tbody>
        143:                     </table>
144:                 </div >
    145:             </div >
        146:         </div >
            147:     );
148: }
