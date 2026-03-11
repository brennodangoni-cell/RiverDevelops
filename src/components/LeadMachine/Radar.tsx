import { useState } from 'react';
import { Search, Loader2, MapPin, Instagram, PlusCircle, MinusCircle, Check, Globe, Database, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { WhatsAppIcon } from './WhatsAppIcon';

interface Lead {
    name: string;
    whatsapp: string;
    address: string;
    website?: string;
    instagram?: string;
    category?: string;
    city?: string;
    state?: string;
    rating?: number;
    user_ratings_total?: number;
}

export function Radar({ onQueue, queue, onRemove }: { onQueue: (l: any) => void; queue: any[]; onRemove: (num: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchState, setSearchState] = useState({
        keyword: '',
        location: '',
        limit: 20
    });

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchState.keyword) return toast.error("Defina o nicho para busca");

        setLoading(true);
        try {
            const res = await axios.post('/api/scraper/maps', searchState);
            setLeads(res.data.leads || []);
            toast.success(`${res.data.leads?.length || 0} leads encontrados!`);
        } catch (err) {
            toast.error("Erro na extração de leads");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 pb-32">
            {/* Search Zenith */}
            <section className="relative px-4">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] uppercase tracking-[0.3em] font-black mx-auto">
                            <Sparkles size={14} /> Matrix Search Engine
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.9]">
                            Onde a Prospecção <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Torna-se Arte.</span>
                        </h1>
                    </motion.div>

                    <form onSubmit={handleSearch} className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                        <div className="relative flex flex-col md:flex-row gap-2 bg-[#0A0A0A] p-3 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-xl">
                            <div className="flex-1 flex items-center px-6 gap-4">
                                <Search className="text-white/20" size={24} />
                                <input
                                    type="text"
                                    placeholder="Nicho (ex: Clínicas de Estética, Lojas de Luxo...)"
                                    className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl font-bold text-white placeholder:text-white/10 py-4"
                                    value={searchState.keyword}
                                    onChange={e => setSearchState({ ...searchState, keyword: e.target.value })}
                                />
                            </div>
                            <div className="w-px h-10 bg-white/5 self-center hidden md:block" />
                            <div className="flex items-center px-6 gap-4 min-w-[240px]">
                                <MapPin className="text-white/20" size={24} />
                                <input
                                    type="text"
                                    placeholder="Cidade, Estado"
                                    className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl font-bold text-white placeholder:text-white/10 py-4"
                                    value={searchState.location}
                                    onChange={e => setSearchState({ ...searchState, location: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-white text-black h-[64px] px-10 rounded-[1.8rem] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-xl"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Extrair Leads'}
                            </button>
                        </div>
                    </form>

                    <div className="flex flex-wrap justify-center gap-6 mt-8">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                            <Database size={16} className="text-cyan-400" />
                            <span className="text-[10px] uppercase tracking-[0.1em] font-black text-white/40">Volume:</span>
                            <input
                                type="number"
                                className="bg-transparent border-none w-12 p-0 text-sm font-black text-white focus:ring-0 text-center hide-number-spin"
                                value={searchState.limit}
                                onChange={e => setSearchState({ ...searchState, limit: parseInt(e.target.value) || 20 })}
                            />
                        </div>
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
                            <Check size={16} className="text-green-500" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">Verified Numbers Only</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Matrix Result Grid */}
            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4"
                    >
                        <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8 max-w-7xl mx-auto">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-8 bg-cyan-500 rounded-full" />
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Resultados da Matriz</h3>
                                    <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black mt-1">Sincronização com Google Maps: Ativa</p>
                                </div>
                            </div>
                            <span className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-black text-white/40 uppercase tracking-[0.1em]">
                                {leads.length} Entidades Capturadas
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {leads.map((lead, idx) => {
                                const inQueue = queue.some(l => l.whatsapp === lead.whatsapp);
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="group bg-[#0A0A0A] border border-white/5 hover:border-cyan-500/30 rounded-[2rem] p-7 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col h-full overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-500">
                                            <Database size={60} className="text-cyan-500" />
                                        </div>

                                        <div className="mb-6 relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20">
                                                    {lead.category || 'Lead'}
                                                </span>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <div key={star} className={`w-1 h-3 rounded-full ${star <= (lead.rating || 0) ? 'bg-cyan-500' : 'bg-white/10'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-black text-white uppercase italic leading-tight group-hover:text-cyan-400 transition-colors">{lead.name}</h4>
                                            <p className="text-white/20 text-xs mt-3 flex items-start gap-2 leading-relaxed">
                                                <MapPin size={14} className="shrink-0 mt-0.5" />
                                                {lead.address}
                                            </p>
                                        </div>

                                        <div className="mt-auto space-y-4 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center gap-3 hover:bg-[#25D366]/10 hover:border-[#25D366]/20 transition-all group/wa"
                                                >
                                                    <WhatsAppIcon size={16} className="text-white/20 group-hover/wa:text-[#25D366] transition-colors" />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover/wa:text-[#25D366]">WhatsApp</span>
                                                </a>
                                                {lead.instagram && (
                                                    <a
                                                        href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-pink-500/10 hover:border-pink-500/20 transition-all text-white/20 hover:text-pink-500"
                                                    >
                                                        <Instagram size={18} />
                                                    </a>
                                                )}
                                                {lead.website && (
                                                    <a
                                                        href={lead.website}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all text-white/20 hover:text-cyan-400"
                                                    >
                                                        <Globe size={18} />
                                                    </a>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => inQueue ? onRemove(lead.whatsapp) : onQueue(lead)}
                                                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.1em] transition-all ${inQueue ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white text-black hover:bg-cyan-400 shadow-xl'}`}
                                            >
                                                {inQueue ? (
                                                    <><MinusCircle size={18} /> Remover da Fila</>
                                                ) : (
                                                    <><PlusCircle size={18} /> Adicionar à Fila</>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Cinematic Loading Overlay */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10"
                    >
                        <div className="relative w-80 h-80 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-[3px] border-dashed border-cyan-500/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-10 border-[2px] border-white/10 rounded-full"
                            />
                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-20 h-20 bg-cyan-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5)]"
                                >
                                    <Database size={32} className="text-black" />
                                </motion.div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Neural Extraction</h3>
                                    <div className="flex items-center gap-3 justify-center">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [4, 16, 4] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-1 bg-cyan-500 rounded-full"
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-400">Capturando Dados...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 max-w-md w-full">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">
                                <span>Scanning Maps API</span>
                                <span>Core Ready</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    animate={{ x: [-300, 300] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="h-full w-40 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
