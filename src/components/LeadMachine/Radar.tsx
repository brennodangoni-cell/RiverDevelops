import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Phone, MapPin, Instagram, PlusCircle, ChevronDown, Check, Globe, Database, ShieldCheck, Zap } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const NICHES = [
    "Clínica de Estética", "Loja de Roupas", "Petshop", "Academia",
    "Barbearia", "Dentista", "Escritório de Advocacia", "Corretor de Imóveis",
    "Loja de Suplementos", "Concessionária de Carros", "Restaurante", "Pizzaria", "Ótica"
];

const STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' }, { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' }, { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

function CustomDropdown({ options, value, onChange, placeholder, isSearchable = false }: any) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = isSearchable
        ? options.filter((o: any) => typeof o === 'string' ? o.toLowerCase().includes(search.toLowerCase()) : o.name.toLowerCase().includes(search.toLowerCase()))
        : options;

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-black border border-white/10 hover:border-cyan-500/30 rounded-2xl h-[56px] px-5 text-white focus:outline-none focus:ring-2 ring-cyan-500/20 transition-all text-sm font-bold"
            >
                <span className="truncate">{typeof value === 'string' ? value : value?.name || placeholder}</span>
                <ChevronDown size={18} className={`text-white/20 transition-transform duration-300 ${open ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-[60] w-full mt-3 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl"
                    >
                        {isSearchable && (
                            <div className="p-3 border-b border-white/5 bg-white/5">
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-white/20"
                                    placeholder="Procurar..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                            {filteredOptions.length === 0 && <div className="p-4 text-center text-xs text-white/20 font-bold uppercase tracking-widest">Vazio</div>}
                            {filteredOptions.map((opt: any, i: number) => {
                                const isSelected = typeof opt === 'string' ? value === opt : value?.uf === opt.uf;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                                        className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isSelected ? 'bg-cyan-500 text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className="truncate">{typeof opt === 'string' ? opt : opt.name}</span>
                                        {isSelected && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Radar({ onQueue }: { onQueue: (l: any) => void, queueCount: number }) {
    const [niche, setNiche] = useState(NICHES[0]);
    const [stateObj, setStateObj] = useState(STATES.find(s => s.uf === 'SP'));
    const [cities, setCities] = useState<string[]>([]);
    const [city, setCity] = useState('');
    const [limit, setLimit] = useState<number | string>(20);

    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [loadingStage, setLoadingStage] = useState(0);

    const stages = [
        "Iniciando Motores...",
        "Acessando Grounding Hub...",
        "Escaneando Google Maps...",
        "Filtrando Dados Reais...",
        "Localizando Instagram...",
        "Validando WhatsApp...",
        "Finalizando Dossiê..."
    ];

    useEffect(() => {
        if (!stateObj) return;
        setCity('');
        axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateObj.uf}/municipios`)
            .then(res => setCities(res.data.map((c: any) => c.nome)))
            .catch(() => { });
    }, [stateObj]);

    useEffect(() => {
        let interval: any;
        if (loading) {
            interval = setInterval(() => {
                setLoadingStage(prev => (prev + 1) % stages.length);
            }, 2500);
        } else {
            setLoadingStage(0);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!city) { toast.error("Selecione a cidade!"); return; }

        const query = `${niche} em ${city} ${stateObj?.uf}`;
        setLoading(true);
        setLeads([]);

        try {
            const res = await axios.post('/api/scraper/maps', { query, limit });
            setLeads(res.data.leads || []);
            toast.success(`${res.data.leads?.length || 0} leads extraídos com sucesso!`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 relative">

            <div className="bg-[#0A0A0A] p-8 md:p-12 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <Search size={300} />
                </div>

                <div className="relative z-10 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <Zap size={14} /> Sistema de Grounding Ativo
                    </div>
                    <h3 className="text-3xl md:text-5xl font-black mb-3 tracking-tighter text-white uppercase italic">Radar de Captação</h3>
                    <p className="text-white/40 text-sm md:text-lg max-w-2xl font-medium leading-relaxed">Localize leads qualificados em tempo real usando a inteligência de busca River.</p>
                </div>

                <form onSubmit={handleSearch} className="relative z-20 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <div className="w-full">
                            <label className="block text-[10px] font-black mb-3 text-white/30 uppercase tracking-[0.2em]">Segmento Profissional</label>
                            <CustomDropdown options={NICHES} value={niche} onChange={setNiche} isSearchable />
                        </div>

                        <div className="w-full">
                            <label className="block text-[10px] font-black mb-3 text-white/30 uppercase tracking-[0.2em]">Unidade Federativa</label>
                            <CustomDropdown options={STATES} value={stateObj} onChange={setStateObj} isSearchable />
                        </div>

                        <div className="relative w-full">
                            <label className="block text-[10px] font-black mb-3 text-white/30 uppercase tracking-[0.2em]">Município Alvo</label>
                            {cities.length === 0 ? (
                                <div className="h-[56px] rounded-2xl bg-black border border-white/10 flex items-center px-6 animate-pulse shadow-inner"><span className="text-white/10 text-xs font-bold uppercase tracking-widest">IBGE SYNCING...</span></div>
                            ) : (
                                <CustomDropdown options={cities} value={city} onChange={setCity} placeholder="Selecionar..." isSearchable />
                            )}
                        </div>

                        <div className="w-full">
                            <label className="block text-[10px] font-black mb-3 text-white/30 uppercase tracking-[0.2em]">Volume de Leads</label>
                            <input
                                type="number"
                                value={limit}
                                min="1"
                                max="200"
                                onChange={e => setLimit(e.target.value === '' ? '' : Math.min(200, Math.max(1, Number(e.target.value))))}
                                className="w-full h-[56px] bg-black border border-white/10 hover:border-cyan-500/30 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 ring-cyan-500/20 transition-all text-center placeholder:text-white/20"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-10 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-[#111] border-2 border-black flex items-center justify-center text-[10px] font-bold text-white/20">...</div>)}
                            </div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Algoritmo de varredura pronto para ação</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !city}
                            className={`group relative h-[64px] min-w-[280px] rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 overflow-hidden shadow-2xl ${loading ? 'bg-white/5 text-white/40' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_10px_40px_rgba(6,182,212,0.3)]'}`}
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin w-5 h-5 text-cyan-400" /> {stages[loadingStage]}</>
                            ) : (
                                <><Search size={22} /> Iniciar Varredura</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                    >
                        <div className="bg-[#0A0A0A] border border-white/10 p-12 rounded-[40px] shadow-2xl flex flex-col items-center gap-8 max-w-md w-full text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin" />
                                <Globe size={48} className="text-cyan-400 animate-pulse" />
                            </div>
                            <div className="relative space-y-3">
                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">Searching Web</h4>
                                <div className="h-6 overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={loadingStage}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            className="text-cyan-400 text-xs font-black uppercase tracking-[0.3em]"
                                        >
                                            {stages[loadingStage]}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-4">Extraindo coordenadas de ${niche}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0A0A0A] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
                    >
                        <div className="px-8 py-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
                                    <Database size={28} />
                                </div>
                                <div>
                                    <h4 className="font-black text-2xl text-white uppercase italic tracking-tighter">Database Extraído</h4>
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-cyan-400" /> Sincronização: {leads.length} Leads Qualificados
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { leads.forEach(l => onQueue(l)); toast.success("Adicionados ao Lançador!"); }}
                                className="w-full md:w-auto px-8 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                            >
                                <PlusCircle size={18} className="text-cyan-400" /> Injetar Todos na Fila
                            </button>
                        </div>

                        <div className="divide-y divide-white/5">
                            {leads.map((lead, i) => (
                                <div key={i} className="p-6 md:p-8 hover:bg-white/[0.03] transition-all flex items-center justify-between gap-6 group">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h5 className="font-extrabold text-xl text-white tracking-tight group-hover:text-cyan-400 transition-colors">{lead.name}</h5>
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{niche}</span>
                                        </div>
                                        <div className="text-xs flex flex-wrap items-center gap-6 text-white/40">
                                            <span className="flex items-center gap-2 font-bold uppercase tracking-widest"><MapPin size={14} className="text-cyan-500" /> {city}</span>
                                            {lead.instagram && lead.instagram !== "Não Listado" && (
                                                <span className="text-pink-400/80 flex items-center gap-2 font-bold uppercase tracking-widest bg-pink-500/5 px-3 py-1 rounded-lg border border-pink-500/10">
                                                    <Instagram size={14} /> {lead.instagram}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 px-4">
                                        <div className="text-right hidden lg:block">
                                            <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">WhatsApp ID</div>
                                            <div className="flex items-center gap-2 text-green-400 font-mono font-black text-lg">
                                                <span>{lead.whatsapp}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { onQueue(lead); toast.success("Adicionado à Fila!"); }}
                                            className="w-14 h-14 rounded-2xl bg-black border border-white/10 group-hover:bg-cyan-500 group-hover:border-cyan-500 group-hover:text-black flex items-center justify-center transition-all shadow-xl"
                                        >
                                            <PlusCircle size={28} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
