import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Instagram, PlusCircle, MinusCircle, ChevronDown, Check, Globe, Database, Zap, Sparkles, ExternalLink } from 'lucide-react';

const WhatsAppIcon = ({ size = 18, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.3 8.38 8.38 0 0 1 3.8.9l5.7-1.1-1.1 5.7Z" />
        <path d="M11 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
    </svg>
);
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const NICHES = [
    'Academias', 'Restaurantes', 'Clínicas de Estética', 'Pet Shops',
    'Imobiliárias', 'Auto Escolas', 'Escritórios de Advocacia', 'Contabilidades',
    'Salões de Beleza', 'Oficinas Mecânicas', 'Lojas de Roupas', 'Dentistas'
];

const STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' }, { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

function Select({ label, value, options, onChange, icon: Icon }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1" ref={ref}>
            <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 ml-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#050505] border border-white/10 rounded-2xl px-5 py-4 text-left flex items-center justify-between group hover:border-cyan-500/50 transition-all font-sans"
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} className="text-white/20 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-sm font-bold text-white/90 truncate">
                        {typeof value === 'string' ? value || 'Selecionar...' : value?.name || value?.uf || 'Selecionar...'}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-white/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-xl"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-3 space-y-1">
                            {options.map((opt: any) => {
                                const optVal = typeof opt === 'string' ? opt : opt.uf || opt.name;
                                const currentVal = typeof value === 'string' ? value : value?.uf || value?.name;
                                const isSelected = optVal === currentVal;
                                return (
                                    <button
                                        key={optVal}
                                        type="button"
                                        onClick={() => { onChange(opt); setIsOpen(false); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-bold transition-all ${isSelected ? 'bg-cyan-500 text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
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

export function Radar({ onQueue, queue, onRemove }: { onQueue: (l: any) => void, queue: any[], onRemove: (num: string) => void }) {
    const [niche, setNiche] = useState(NICHES[0]);
    const [stateObj, setStateObj] = useState(STATES.find(s => s.uf === 'SP'));
    const [cities, setCities] = useState<string[]>([]);
    const [city, setCity] = useState('');
    const [limit, setLimit] = useState<number | string>(20);

    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [loadingStage, setLoadingStage] = useState(0);

    const stages = [
        "Sincronizando com Satélites...",
        "Acessando Grounding AI Protocol...",
        "Escaneando Digital Footprint...",
        "Extraindo Metadados de Contato...",
        "Validando Canais de WhatsApp...",
        "Mapeando Perfis Instagram...",
        "Finalizando Dossiê Estratégico..."
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
            }, 3000);
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

            if (res.data.success && res.data.leads?.length > 0) {
                setLeads(res.data.leads);
                toast.success(`${res.data.leads.length} leads extraídos com sucesso!`);
            } else {
                toast.error("Busca concluída, mas 0 resultados retornaram.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Tempo limite excedido ou erro na conexão.");
        } finally {
            setLoading(false);
        }
    };

    const isInQueue = (num: string) => queue.some(q => q.whatsapp === num);

    return (
        <div className="space-y-10 font-sans">
            {/* Form Glass Card */}
            <div className="bg-[#050505] rounded-[3rem] border border-white/10 p-10 md:p-14 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                    <Globe size={240} className="text-cyan-500 rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-12">
                        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-[2rem] flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                            <Zap size={32} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Deep Radar 2.0</h3>
                            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em] mt-2 ml-1">Grounding AI Protocol Activated</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <Select label="Nicho / Atividade" value={niche} options={NICHES} onChange={setNiche} icon={Database} />
                            <Select label="Estado" value={stateObj} options={STATES} onChange={setStateObj} icon={MapPin} />
                            <Select label="Cidade Próxima" value={city} options={cities} onChange={setCity} icon={Globe} />
                            <div className="relative">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-2 ml-1">Volume de Busca</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-5 flex items-center text-white/20 group-hover:text-cyan-400 transition-colors">
                                        <Zap size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        value={limit}
                                        onChange={e => setLimit(e.target.value)}
                                        className="w-full bg-[#050505] border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-white focus:outline-none focus:ring-2 ring-cyan-500/30 transition-all hover:border-white/20 hide-number-spin text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] text-base py-7 rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(6,182,212,0.2)] flex items-center justify-center gap-4 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                            {loading ? 'EXECUTANDO VARREDURA PROFUNDA...' : 'INICIAR RASTREAMENTO TÁTICO'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Leads Grid */}
            <AnimatePresence>
                {leads.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {leads.map((l, i) => {
                            const inQueue = isInQueue(l.whatsapp);
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-[#050505] rounded-[2.5rem] border border-white/10 p-8 hover:border-cyan-500/40 transition-all group relative overflow-hidden shadow-2xl"
                                >
                                    <div className="absolute top-0 right-0 px-5 py-2.5 bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        Grounding Info
                                    </div>

                                    <h4 className="font-black text-white text-xl mb-8 truncate pr-12 uppercase tracking-tight italic">{l.name}</h4>

                                    <div className="space-y-4 mb-10">
                                        <div className="flex items-center justify-between group/row">
                                            <div className="flex items-center gap-3 text-white/30 text-[10px] font-black uppercase tracking-widest">
                                                <WhatsAppIcon size={16} className="text-green-500" /> WhatsApp
                                            </div>
                                            <a
                                                href={`https://wa.me/${l.whatsapp}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-green-400 flex items-center gap-2 hover:text-green-300 font-bold uppercase tracking-widest"
                                            >
                                                {l.phone} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                        <div className="flex items-center justify-between group/row">
                                            <div className="flex items-center gap-3 text-white/30 text-[10px] font-black uppercase tracking-widest">
                                                <Instagram size={16} className="text-pink-500" /> Instagram
                                            </div>
                                            {l.instagram && l.instagram !== 'Não Listado' ? (
                                                <a
                                                    href={`https://instagram.com/${l.instagram.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[11px] text-pink-400 flex items-center gap-2 hover:text-pink-300 font-bold uppercase tracking-widest"
                                                >
                                                    {l.instagram} <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-white/10 uppercase tracking-widest font-black italic">Privado</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (inQueue) {
                                                onRemove(l.whatsapp);
                                                toast("Removido da fila.");
                                            } else {
                                                onQueue(l);
                                                toast.success("Adicionado ao Lançador!");
                                            }
                                        }}
                                        className={`w-full flex items-center justify-center gap-3 py-4.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${inQueue ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white/[0.03] border-white/10 text-white/30 hover:bg-cyan-500 hover:text-black hover:border-cyan-500'}`}
                                    >
                                        {inQueue ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                                        {inQueue ? 'Tirar do Lançador' : 'Enviar p/ Lançador'}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-6 text-center"
                    >
                        <div className="max-w-md w-full">
                            <div className="relative mb-14 flex justify-center scale-125 lg:scale-150">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                    className="w-48 h-48 rounded-full border-[1.5px] border-cyan-500/10 flex items-center justify-center relative"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
                                    <div className="w-40 h-40 rounded-full border-[1px] border-cyan-500/5 flex items-center justify-center" />
                                </motion.div>

                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <Sparkles className="text-cyan-400 w-8 h-8 mb-3 animate-pulse opacity-40" />
                                    <img src="/logo.webp" alt="River Logo" className="w-16 h-16 rounded-full border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-3" />
                                    <div className="text-white font-black text-2xl tracking-[0.1em] uppercase italic leading-none">River</div>
                                    <div className="text-[7px] text-cyan-400 font-black tracking-[0.5em] uppercase mt-1.5 opacity-60">Sales Engine AI</div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="text-white font-black text-2xl lg:text-3xl uppercase tracking-tighter h-12 overflow-hidden italic">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={loadingStage}
                                            initial={{ y: 40, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -40, opacity: 0 }}
                                        >
                                            {stages[loadingStage]}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 p-[2px]">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] rounded-full"
                                        animate={{ width: `${((loadingStage + 1) / stages.length) * 100}%` }}
                                        transition={{ duration: 1, ease: "circOut" }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.4em] text-white/10">
                                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500/40 animate-pulse" /> Sincronismo Global</span>
                                    <span>v4.0 Alpha</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
