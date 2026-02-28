import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Copy, Wand2,
    Check, ChevronLeft, Loader2, Upload,
    X, User, ArrowRight,
    Download,
    ShieldCheck, ChevronRight, Video, DollarSign, LogOut
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { analyzeProduct, generatePrompts, generateMockup, ProductAnalysis } from '../../services/ai';

type Mode = 'product_only' | 'lifestyle';
type AspectRatio = '16:9' | '9:16';

interface Options {
    mode: Mode;
    gender: string;
    skinTone: string;
    hairColor: string;
    timeOfDay: string;
    environment: string;
    style: string;
    aspectRatio: AspectRatio;
    supportingDescription: string;
}

interface Result {
    prompt: string;
    mockupUrl: string | null;
}

const genders = [
    { id: 'Female', label: 'Feminino', icon: User },
    { id: 'Male', label: 'Masculino', icon: User },
    { id: 'Androgynous', label: 'Andrógino', icon: User },
    { id: 'Any', label: 'Qualquer', icon: User },
];

const skinTones = [
    { id: 'Light', label: 'Clara', color: '#fcdcb4' },
    { id: 'Medium', label: 'Média', color: '#d09668' },
    { id: 'Dark', label: 'Escura', color: '#6b4124' },
    { id: 'Any', label: 'Qualquer', color: 'linear-gradient(45deg, #fcdcb4, #6b4124)' },
];

const hairColors = [
    { id: 'Blonde', label: 'Loiro', color: '#e8c92a' },
    { id: 'Brunette', label: 'Castanho', color: '#4a2f1d' },
    { id: 'Black', label: 'Preto', color: '#111111' },
    { id: 'Red', label: 'Ruivo', color: '#8c2211' },
    { id: 'Silver', label: 'Grisalho', color: '#c0c0c0' },
    { id: 'Any', label: 'Qualquer', color: 'linear-gradient(45deg, #e8c92a, #111111)' },
];

const lightings = [
    { id: 'Golden Hour', label: 'Golden Hour', desc: 'Luz suave e dourada do pôr do sol' },
    { id: 'Bright Daylight', label: 'Dia Ensolarado', desc: 'Luz forte e natural' },
    { id: 'Night/Neon', label: 'Noite / Neon', desc: 'Vibrante e escuro' },
    { id: 'Studio Lighting', label: 'Estúdio', desc: 'Visual técnico e controlado' },
    { id: 'Overcast/Moody', label: 'Nublado', desc: 'Tom dramático e frio' },
];

const styles = [
    { id: 'Cinematic', label: 'Cinemático', desc: 'Visual de filme, alta qualidade' },
    { id: 'Raw Documentary', label: 'Doc Raw', desc: 'Realista, sem filtros' },
    { id: 'Commercial', label: 'Comercial TV', desc: 'Foco absoluto no brilho' },
    { id: 'Minimalist', label: 'Minimalista', desc: 'Fundo neutro e limpo' },
    { id: 'Cyberpunk', label: 'Cyberpunk', desc: 'Futurista e tecnológico' },
    { id: 'Vintage 35mm', label: 'Vintage 35mm', desc: 'Textura de filme antigo' },
];

const sequenceTitles = [
    "Cena 1: Estabelecimento (Introdução)",
    "Cena 2: Ação e Uso (Desenvolvimento)",
    "Cena 3: Detalhes e Textura (Clímax)",
    "Cena 4: Ângulo Alternativo (Reação)",
    "Cena 5: B-Roll Dinâmico (Transição)",
    "Cena 6: Encerramento (Call to Action)",
    "Cena 7: Extensão Extra",
    "Cena 8: Extensão Extra",
    "Cena 9: Extensão Extra"
];

export default function VideoLab() {
    const [step, setStep] = useState<0 | 1 | 2 | 3>(1);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || 'AIzaSyCzD70dKzYba-TYUlX3V1CRUy6zasGHCCc');
    const [images, setImages] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [options, setOptions] = useState<Options>({
        mode: 'lifestyle',
        gender: 'Female',
        skinTone: 'Medium',
        hairColor: 'Brunette',
        timeOfDay: 'Golden Hour',
        environment: '',
        style: 'Cinematic',
        aspectRatio: '16:9',
        supportingDescription: ''
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [balanceVal, setBalanceVal] = useState('R$ 0,00');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    // Fetch finance balance for the header
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const token = localStorage.getItem('rivertasks_token');
                if (!token) return;
                const txRes = await axios.get('/api/transactions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const txs = txRes.data || [];
                const totalIn = txs.filter((t: any) => t.type === 'IN').reduce((acc: number, curr: any) => acc + curr.amount, 0);
                const totalOut = txs.filter((t: any) => t.type === 'OUT').reduce((acc: number, curr: any) => acc + curr.amount, 0);
                const bal = totalIn - totalOut;
                setBalanceVal(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal));
            } catch (error) {
                console.warn('Finance balance fetch failed');
            }
        };
        fetchBalance();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('rivertasks_token');
        localStorage.removeItem('rivertasks_user');
        navigate('/admin/login');
    };

    const handleSaveKey = () => {
        if (!apiKey.trim()) {
            toast.error('Chave inválida');
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey);
        setStep(1);
        toast.success('Lab Sora Desbloqueado!');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) setImages(prev => [...prev, event.target!.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const handleAnalyze = async () => {
        if (images.length === 0) return;
        setIsAnalyzing(true);
        setProgress(15);
        setProgressText('O Maestro Alpha está escaneando a identidade visual...');
        try {
            const result = await analyzeProduct(images);
            setAnalysis(result);
            setOptions(prev => ({ ...prev, environment: result.suggestedSceneriesLifestyle[0] || '' }));
            setProgress(100);
            setTimeout(() => setStep(2), 600);
        } catch (error: any) {
            console.error("Analysis Error:", error);
            const msg = error.message === "GEMINI_API_KEY_MISSING" ? "Chave API ausente." : "Erro na análise. Verifique sua chave e conexão.";
            toast.error(msg);
        } finally {
            setIsAnalyzing(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleGenerate = async () => {
        if (!analysis) return;
        setIsGenerating(true);
        setStep(3);
        setResults([]);
        setProgress(5);
        try {
            setProgressText('Esculpindo prompts cinematográficos...');
            const prompts = await generatePrompts(analysis.description, options);
            setProgress(20);
            const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults([...newResults]);
            for (let i = 0; i < prompts.length; i++) {
                setProgressText(`Renderizando mockup ${i + 1} com Nano Banana 2...`);
                const mockupUrl = await generateMockup(analysis.description, options, i);
                newResults[i].mockupUrl = mockupUrl;
                setResults([...newResults]);
                setProgress(20 + ((i + 1) / prompts.length) * 80);
            }
            setProgressText('Direção de Arte completa!');
        } catch (error) {
            toast.error("Rede instável ou créditos insuficientes.");
            setStep(2);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setProgress(0), 2000);
        }
    };

    const handleContinueFlow = async () => {
        if (!analysis) return;
        setIsContinuing(true);
        setProgress(10);
        try {
            setProgressText('Expandindo o storytelling visual...');
            const newPrompts = await generatePrompts(analysis.description, options, results.map(r => r.prompt));
            setProgress(30);
            const startIndex = results.length;
            const newResults: Result[] = newPrompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);
            for (let i = 0; i < newPrompts.length; i++) {
                const globalIndex = startIndex + i;
                setProgressText(`Processando cena extra ${globalIndex + 1}...`);
                const mockupUrl = await generateMockup(analysis.description, options, globalIndex);
                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex].mockupUrl = mockupUrl;
                    return updated;
                });
                setProgress(30 + ((i + 1) / newPrompts.length) * 70);
            }
        } catch (error) {
            toast.error("Erro na expansão.");
        } finally {
            setIsContinuing(false);
            setTimeout(() => setProgress(0), 2000);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Prompt pronto para o Sora 2!');
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
            <div
                className="fixed inset-0 pointer-events-none opacity-40 mix-blend-screen"
                style={{ backgroundImage: 'url(/bgtasks.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }}
            />

            {/* Premium Header - Replicated from Dashboard for Consistency */}
            <header className="fixed top-0 left-0 right-0 z-50 pt-4 md:pt-6 px-4 md:px-10">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex items-center justify-between py-2.5 px-4 rounded-full shadow-2xl isolate">
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full -z-10" />

                        <div className="flex items-center gap-6">
                            <Link to="/admin" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                                <ChevronLeft className="w-5 h-5 text-white/50" />
                            </Link>
                            <div className="flex items-center gap-4 group">
                                <Link to="/admin" className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <Sparkles className="w-5 h-5 text-cyan-400" />
                                </Link>
                                <div className="flex flex-col">
                                    <h1 className="text-base font-display font-bold tracking-widest text-white uppercase leading-none">River Sora Lab</h1>
                                    <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Direção de Arte AI</span>
                                </div>
                            </div>
                        </div>

                        {/* Breadcrumbs for flow - Desktop */}
                        <div className="hidden lg:flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.3em]">
                            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1 h-1 rounded-full ${step >= 1 ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-white/10'}`} /> Importar
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1 h-1 rounded-full ${step >= 2 ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-white/10'}`} /> Produzir
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1 h-1 rounded-full ${step >= 3 ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-white/10'}`} /> Entrega
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link
                                to="/admin/financeiro"
                                className="hidden md:flex h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 items-center justify-center px-4 hover:bg-emerald-500/20 transition-all duration-300 gap-2"
                            >
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold text-xs tracking-wider">{balanceVal}</span>
                            </Link>

                            <div className="flex items-center gap-3">
                                <img
                                    src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                                    alt={currentUser.username}
                                    className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg shrink-0"
                                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                                />
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all duration-300"
                                >
                                    <LogOut className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-[160px] pb-32 relative z-10 flex flex-col min-h-screen">
                <AnimatePresence mode="wait">
                    {/* API CONFIG OPTIONAL */}
                    {step === 0 && (
                        <motion.div key="st0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto py-10 flex flex-col items-center gap-8 text-center mt-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-cyan-400" /></div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-display font-medium">Gateway de IA</h2>
                                <p className="text-white/30 text-[10px] uppercase tracking-widest">Ajuste sua chave v3.1 Flash.</p>
                            </div>
                            <div className="w-full space-y-4">
                                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs focus:outline-none focus:border-cyan-500 transition-all" />
                                <button onClick={handleSaveKey} className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-2xl text-[10px] hover:bg-cyan-400 transition-all">Autorizar</button>
                                <button onClick={() => setStep(1)} className="text-[9px] text-white/20 hover:text-white uppercase tracking-widest font-black">Pular Setup</button>
                            </div>
                        </motion.div>
                    )}

                    {/* UPLOAD PHASE */}
                    {step === 1 && (
                        <motion.div key="st1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto flex flex-col items-center gap-16 text-center">
                            <div className="space-y-6">
                                <span className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">Maestro AI Alpha 2026</span>
                                <h2 className="text-5xl md:text-6xl font-display font-medium tracking-tighter leading-tight uppercase">Direção de Arte<br /><span className="text-white/40">Sora Ready.</span></h2>
                                <p className="text-white/30 text-base max-w-xl font-light italic leading-relaxed">"O laboratório ideal para transformar fotos em cinematografia hiper-realista automática."</p>
                            </div>

                            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-2xl relative group">
                                <div className="absolute -inset-1 bg-cyan-500/20 rounded-[2.5rem] opacity-0 blur-xl group-hover:opacity-100 transition-all duration-700" />
                                <div className="relative bg-[#060606]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-20 md:p-24 flex flex-col items-center gap-6 cursor-pointer transition-all hover:bg-white/[0.04]">
                                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:text-cyan-400 transition-all"><Upload className="w-6 h-6" /></div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-display font-medium uppercase tracking-widest text-white/80">Importar DNA Visual</h3>
                                        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">Fotos do Produto em Alta</p>
                                    </div>
                                </div>
                            </div>

                            {images.length > 0 && (
                                <div className="w-full space-y-10">
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative w-24 aspect-square rounded-2xl overflow-hidden border border-white/10 group/item">
                                                <img src={img} className="h-full w-full object-cover" alt="prev" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white scale-0 group-hover/item:scale-100 transition-transform"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleAnalyze} disabled={isAnalyzing} className="px-12 py-5 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 hover:bg-cyan-400 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                                        {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Escaneando...</> : <><Wand2 className="w-4 h-4" /> Iniciar Análise Visual</>}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* CONFIG PHASE */}
                    {step === 2 && analysis && (
                        <motion.div key="st2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                            {/* Card 1: Product Context (River Tasks Style) */}
                            <div className="lg:col-span-4 space-y-8">
                                <div className="relative rounded-[2rem] p-8 md:p-10 isolate h-fit sticky top-[140px]">
                                    <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] -z-10" />

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 opacity-60">Contexto Identificado</span>
                                            <h3 className="text-3xl font-display font-medium uppercase tracking-tighter leading-none">{analysis.productType}</h3>
                                        </div>

                                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                                            <p className="text-[11px] text-white/40 leading-relaxed italic font-light">"{analysis.description.length > 200 ? analysis.description.substring(0, 200) + '...' : analysis.description}"</p>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Modo de Direção</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis.suggestedSceneriesProductOnly[0] })} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${options.mode === 'product_only' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-white/20'}`}>Estúdio</button>
                                                <button onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis.suggestedSceneriesLifestyle[0] })} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${options.mode === 'lifestyle' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-white/20'}`}>Realista</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Environment Curation (Clean Tiles) */}
                            <div className="lg:col-span-8 space-y-8">
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-display font-medium uppercase tracking-tight">Curadoria de Ambiente</h3>
                                        <div className="h-px flex-1 bg-white/5 mx-6 hidden md:block" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setOptions({ ...options, environment: s })}
                                                className={`group relative p-6 rounded-[1.5rem] border text-left transition-all duration-500 ${options.environment === s ? 'bg-white/5 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'bg-[#080808]/40 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className={`absolute top-4 right-4 w-4 h-4 rounded-full border border-white/10 flex items-center justify-center transition-all ${options.environment === s ? 'bg-cyan-500 border-cyan-400' : 'bg-transparent'}`}>
                                                    {options.environment === s && <Check className="w-2.5 h-2.5 text-black" />}
                                                </div>
                                                <p className={`text-[11px] leading-relaxed transition-colors ${options.environment === s ? 'text-white' : 'text-white/30 group-hover:text-white/60'}`}>{s}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Luz & Atmosfera</label>
                                            <div className="relative">
                                                <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-[#080808]/60 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/5 transition-all">
                                                    {lightings.map(l => <option key={l.id} value={l.id} className="bg-neutral-900">{l.label}</option>)}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronRight className="w-4 h-4 rotate-90" /></div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Direção de Estética</label>
                                            <div className="relative">
                                                <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-[#080808]/60 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:border-cyan-500/50 focus:bg-white/5 transition-all">
                                                    {styles.map(st => <option key={st.id} value={st.id} className="bg-neutral-900">{st.label}</option>)}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><ChevronRight className="w-4 h-4 rotate-90" /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {options.mode === 'lifestyle' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Casting Gênero</label>
                                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                                    {genders.slice(0, 3).map(g => (
                                                        <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-tight transition-all ${options.gender === g.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/20 hover:text-white/40'}`}>{g.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4 text-center">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Pele</label>
                                                <div className="flex gap-2 justify-center py-1">
                                                    {skinTones.map(sk => <button key={sk.id} onClick={() => setOptions({ ...options, skinTone: sk.id })} className={`w-6 h-6 rounded-full border-2 transition-transform ${options.skinTone === sk.id ? 'border-cyan-500 scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ background: sk.color }} />)}
                                                </div>
                                            </div>
                                            <div className="space-y-4 text-center">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Cabelo</label>
                                                <div className="flex gap-2 justify-center py-1">
                                                    {hairColors.map(h => <button key={h.id} onClick={() => setOptions({ ...options, hairColor: h.id })} className={`w-6 h-6 rounded-full border-2 transition-transform ${options.hairColor === h.id ? 'border-cyan-500 scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ background: h.color }} />)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-4 pt-4">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Direção Personalizada</label>
                                        <textarea value={options.supportingDescription} onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })} placeholder="Ex: Câmera lenta dramática, gotas d'água, atmosfera urbana..." className="w-full bg-[#080808]/60 border border-white/10 rounded-[1.5rem] p-6 text-xs font-light text-white/80 focus:border-cyan-500/50 focus:bg-white/5 transition-all min-h-[120px] resize-none leading-relaxed" />
                                    </div>

                                    <button onClick={handleGenerate} className="w-full group mt-6 relative rounded-3xl p-px bg-gradient-to-r from-cyan-500/50 to-indigo-500/50 hover:from-cyan-400 hover:to-indigo-400 transition-all duration-700 shadow-2xl overflow-hidden">
                                        <div className="relative bg-black transition-colors group-hover:bg-transparent py-8 flex items-center justify-center gap-6 rounded-[calc(1.5rem-1px)]">
                                            <span className="text-xl font-display font-medium uppercase tracking-[0.4em] text-white">Lançar Produção</span>
                                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowRight className="w-5 h-5" /></div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* DELIVERY PHASE */}
                    {step === 3 && (
                        <motion.div key="st3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto space-y-16">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/5">
                                <div className="space-y-2 text-center md:text-left">
                                    <div className="flex items-center gap-4 justify-center md:justify-start">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30"><Check className="w-5 h-5 text-emerald-400" /></div>
                                        <h2 className="text-4xl font-display font-medium tracking-tight uppercase">Produção Finalizada</h2>
                                    </div>
                                    <p className="text-white/30 text-base font-light italic">"O Maestro Alpha 2026 entregou sua visão cinematográfica."</p>
                                </div>
                                <button onClick={() => { setStep(1); setImages([]); setResults([]); }} className="px-10 py-4 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">Novo Ciclo</button>
                            </div>

                            {/* Processing Progress */}
                            {(isGenerating || isContinuing) && (
                                <div className="relative bg-[#080808]/40 border border-white/10 rounded-[2.5rem] p-10 flex flex-col gap-8 shadow-2xl isolate">
                                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /></div>
                                            <div className="flex flex-col">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{progressText}</h4>
                                                <span className="text-[9px] text-white/20 uppercase tracking-widest mt-0.5">Sincronizando com Sora Hub</span>
                                            </div>
                                        </div>
                                        <div className="text-4xl font-display font-bold text-white/30">{Math.round(progress)}%</div>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div className="h-full bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                                    </div>
                                </div>
                            )}

                            {/* Result Cards - Clean Storyboard Items */}
                            <div className="grid grid-cols-1 gap-12">
                                {results.map((res, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="group relative rounded-[2.5rem] bg-[#060606]/40 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col lg:flex-row shadow-2xl hover:border-white/20 transition-all duration-700"
                                    >
                                        <div className="lg:w-[45%] aspect-square bg-black relative overflow-hidden">
                                            {res.mockupUrl ? (
                                                <>
                                                    <img src={res.mockupUrl} className="h-full w-full object-cover transition-all duration-[8s] group-hover:scale-110" alt="mockup" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                                    <div className="absolute bottom-8 left-8">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-1 block">Reference Shot Alpha</span>
                                                        <h3 className="text-2xl font-display font-medium uppercase tracking-widest">Cena 0{i + 1}</h3>
                                                    </div>
                                                    <a href={res.mockupUrl} download={`river-sora-0${i + 1}.png`} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95"><Download className="w-5 h-5" /></a>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/10 bg-[#080808] uppercase font-black text-[9px] tracking-widest">
                                                    <Loader2 className="w-6 h-6 animate-spin text-white/10" />
                                                    <span>Renderizando Visual...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-10 md:p-14 flex flex-col justify-between gap-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 border-l border-cyan-500 pl-4">{sequenceTitles[i] || `Sequência de Arte 0${i + 1}`}</span>
                                                    <button onClick={() => copyToClipboard(res.prompt)} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"><Copy className="w-3.5 h-3.5" /> Copiar Prompt</button>
                                                </div>
                                                <p className="text-xl md:text-2xl font-light leading-relaxed italic text-white/70">"{res.prompt}"</p>
                                            </div>
                                            <div className="flex items-center gap-6 pt-6 border-t border-white/5 opacity-30 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400">
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5">Ratio: {options.aspectRatio}</div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5">Style: {options.style}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-10 flex flex-col items-center gap-6">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Expandir Narrativa de Produto?</p>
                                    <button onClick={handleContinueFlow} className="group relative px-12 py-6 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 hover:bg-cyan-500 hover:text-black transition-all shadow-2xl overflow-hidden active:scale-95">
                                        <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                                        <Video className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                        Gerar Mais 3 Cenas (+10 Segundos)
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Subtle Lab Aesthetic Finish */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] animate-scan" />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
                .animate-scan { animation: scan 12s linear infinite; }
            `}} />
        </div>
    );
}
