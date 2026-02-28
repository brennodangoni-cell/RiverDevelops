import React, { useState, useRef } from 'react';
import {
    Sparkles, Copy, Wand2,
    Check, ChevronLeft, Loader2, Upload,
    X, User, ArrowRight,
    Download, Film, LayoutGrid, Key,
    ShieldCheck, ChevronRight, Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

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
        } catch (error) {
            toast.error("Erro na análise. Verifique sua chave.");
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
            <header className="fixed top-0 left-0 right-0 z-50 pt-6 px-10">
                <div className="max-w-[1500px] mx-auto">
                    <div className="flex items-center justify-between py-3 px-6 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative group">
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                                <ChevronLeft className="w-5 h-5 text-white/50" />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <Sparkles className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h1 className="text-xl font-display font-bold tracking-widest text-white uppercase pt-1">River Sora Lab</h1>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.3em]">
                            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${step >= 1 ? 'bg-cyan-400' : 'bg-white/10'}`} /> Importar
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${step >= 2 ? 'bg-cyan-400' : 'bg-white/10'}`} /> Produzir
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-white' : 'text-white/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${step >= 3 ? 'bg-cyan-400' : 'bg-white/10'}`} /> Entrega
                            </div>
                        </div>
                        <button onClick={() => setStep(0)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:text-cyan-400 transition-all">
                            <Key className="w-4 h-4 text-white/20" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-[160px] relative z-10 flex flex-col min-h-screen">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div key="st0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto py-10 flex flex-col items-center gap-8 text-center">
                            <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center"><ShieldCheck className="w-10 h-10 text-cyan-400/50" /></div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-display font-medium">Gateway de IA</h2>
                                <p className="text-white/30 text-xs">Ajuste sua chave de alta performance v3.1 Flash.</p>
                            </div>
                            <div className="w-full space-y-4">
                                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key..." className="w-full bg-[#080808] border border-white/5 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />
                                <button onClick={handleSaveKey} className="w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl">Autorizar</button>
                                <button onClick={() => setStep(1)} className="text-[10px] text-white/20 hover:text-white uppercase tracking-widest">Pular Setup</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div key="st1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto flex flex-col items-center gap-16 text-center">
                            <div className="space-y-6">
                                <span className="inline-block px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest">Maestro AI Alpha 2026</span>
                                <h2 className="text-6xl md:text-7xl font-display font-medium tracking-tighter leading-tight">Direção de Arte<br />Sora Ready.</h2>
                                <p className="text-white/30 text-lg max-w-2xl font-light italic">"O laboratório ideal para transformar fotos em cinematografia hiper-realista."</p>
                            </div>
                            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-3xl relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-[3rem] opacity-20 blur-md group-hover:opacity-60 transition-all duration-700" />
                                <div className="relative bg-black border border-white/5 rounded-[3rem] p-24 md:p-32 flex flex-col items-center gap-8 cursor-pointer transition-all hover:bg-white/[0.02]">
                                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/40"><Upload className="w-8 h-8" /></div>
                                    <div className="space-y-1 text-center">
                                        <h3 className="text-xl font-display font-semibold uppercase tracking-widest">Upload de Referências</h3>
                                        <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">DNA visual do produto</p>
                                    </div>
                                </div>
                            </div>
                            {images.length > 0 && (
                                <div className="w-full space-y-12">
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative w-28 md:w-32 aspect-square rounded-2xl overflow-hidden border border-white/10 glass">
                                                <img src={img} className="h-full w-full object-cover" alt="prev" />
                                                <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleAnalyze} disabled={isAnalyzing} className="px-16 py-6 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 hover:bg-cyan-400 disabled:opacity-50">
                                        {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Escaneando...</> : <><Wand2 className="w-4 h-4" /> Iniciar AI Lab 3.1 Pro</>}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 2 && analysis && (
                        <motion.div key="st2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pb-24">
                            <div className="lg:col-span-4 space-y-8">
                                <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl p-10 space-y-8 sticky top-[160px]">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Identificação Maestro</span>
                                        <h3 className="text-3xl font-display font-bold uppercase tracking-tighter">{analysis.productType}</h3>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-black/40 border border-white/5"><p className="text-xs text-white/40 leading-relaxed italic">"{analysis.description.substring(0, 150)}..."</p></div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Modo de Produção</label>
                                            <div className="space-y-2">
                                                <button onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis.suggestedSceneriesProductOnly[0] })} className={`w-full p-4 text-left rounded-2xl border text-xs font-bold transition-all ${options.mode === 'product_only' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent opacity-30'}`}>Apenas Produto</button>
                                                <button onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis.suggestedSceneriesLifestyle[0] })} className={`w-full p-4 text-left rounded-2xl border text-xs font-bold transition-all ${options.mode === 'lifestyle' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent opacity-30'}`}>Lifestyle / Humano</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8 space-y-12">
                                <div className="space-y-8">
                                    <h3 className="text-3xl font-display font-medium">Curadoria de Ambiente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                            <button key={idx} onClick={() => setOptions({ ...options, environment: s })} className={`p-6 rounded-3xl border text-left text-xs leading-relaxed transition-all ${options.environment === s ? 'bg-white/5 border-cyan-500 text-white' : 'bg-black/40 border-white/5 text-white/30 hover:border-white/20'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Luz Solar / Artificial</label>
                                            <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer">
                                                {lightings.map(l => <option key={l.id} value={l.id} className="bg-black text-white">{l.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Estética de Imagem</label>
                                            <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer">
                                                {styles.map(st => <option key={st.id} value={st.id} className="bg-black text-white">{st.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {options.mode === 'lifestyle' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Casting Gênero</label>
                                                <div className="flex gap-1">
                                                    {genders.map(g => (
                                                        <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase border transition-all ${options.gender === g.id ? 'bg-white text-black' : 'bg-white/5 text-white/20 border-white/5'}`}>{g.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Casting Pele</label>
                                                <div className="flex gap-2">
                                                    {skinTones.map(sk => <button key={sk.id} onClick={() => setOptions({ ...options, skinTone: sk.id })} className={`w-6 h-6 rounded-full border-2 ${options.skinTone === sk.id ? 'border-cyan-500 scale-110' : 'border-transparent opacity-50'}`} style={{ background: sk.color }} />)}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Cabelo</label>
                                                <div className="flex gap-2">
                                                    {hairColors.map(h => <button key={h.id} onClick={() => setOptions({ ...options, hairColor: h.id })} className={`w-6 h-6 rounded-full border-2 ${options.hairColor === h.id ? 'border-cyan-500 scale-110' : 'border-transparent opacity-50'}`} style={{ background: h.color }} />)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Instruções de Direção do Cliente</label>
                                        <textarea value={options.supportingDescription} onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })} placeholder="Ex: Adicionar gotas d'água, atmosfera de mistério, câmera lenta..." className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-light text-white/80 focus:border-cyan-500 min-h-[140px] resize-none" />
                                    </div>

                                    <button onClick={handleGenerate} className="w-full group overflow-hidden rounded-full p-[2px] bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] shadow-2xl mt-8">
                                        <div className="relative bg-[#030303] rounded-full py-8 flex items-center justify-center gap-6 transition-all group-hover:bg-transparent">
                                            <span className="text-xl font-display font-bold uppercase tracking-[0.4em] text-white">Lançar Produção</span>
                                            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-all"><ArrowRight className="w-5 h-5" /></div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="st3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
                            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30"><Check className="w-4 h-4 text-emerald-400" /></div><h2 className="text-4xl font-display font-medium tracking-tight">Câmera, Ação!</h2></div>
                                    <p className="text-white/30 text-lg font-light italic">Seu storyboard Alpha 2026 está pronto.</p>
                                </div>
                                <button onClick={() => { setStep(1); setImages([]); setResults([]); }} className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Novo Lab</button>
                            </div>

                            {(isGenerating || isContinuing) && (
                                <div className="relative bg-[#080808] border border-cyan-500/10 rounded-[3rem] p-10 flex flex-col gap-8 shadow-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /></div>
                                            <h4 className="text-sm font-black uppercase tracking-widest text-cyan-400">{progressText}</h4>
                                        </div>
                                        <div className="text-2xl font-display font-bold text-white/40">{Math.round(progress)}%</div>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><motion.div className="h-full bg-cyan-500" animate={{ width: `${progress}%` }} /></div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-16">
                                {results.map((res, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="group relative rounded-[3.5rem] bg-[#060606] border border-white/5 overflow-hidden flex flex-col lg:flex-row shadow-2xl">
                                        <div className="lg:w-[45%] aspect-square bg-black relative overflow-hidden group/img">
                                            {res.mockupUrl ? (
                                                <>
                                                    <img src={res.mockupUrl} className="h-full w-full object-cover transition-all duration-[4s] group-hover/img:scale-125" alt="res" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                                    <div className="absolute bottom-8 left-8"><span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-1 block">Ref Scene 0{i + 1}</span><h3 className="text-2xl font-display font-bold uppercase tracking-widest text-white">Cap. Alpha</h3></div>
                                                    <a href={res.mockupUrl} download={`river-sora-lab-${i + 1}.png`} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all shadow-xl"><Download className="w-5 h-5" /></a>
                                                </>
                                            ) : <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#080808] text-white/5 uppercase font-black text-[9px] tracking-widest"><Loader2 className="w-6 h-6 animate-spin" /> Orbitando...</div>}
                                        </div>
                                        <div className="lg:flex-1 p-12 md:p-16 flex flex-col justify-between gap-10">
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{sequenceTitles[i] || `Sequência Alpha`}</span>
                                                    <button onClick={() => copyToClipboard(res.prompt)} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"><Copy className="w-3.5 h-3.5" /> Copiar Prompt</button>
                                                </div>
                                                <p className="text-xl md:text-2xl font-light leading-relaxed italic text-white/80">"{res.prompt}"</p>
                                            </div>
                                            <div className="flex items-center gap-6 pt-6 border-t border-white/5 opacity-20 text-[8px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Ratio: {options.aspectRatio}</div>
                                                <div className="flex items-center gap-2"><Film className="w-4 h-4" /> Style: {options.style}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-16 border-t border-white/5 flex flex-col items-center gap-6">
                                    <p className="text-[9px] uppercase font-black tracking-widest text-white/20">Storyboard finalizado? Que tal expandir?</p>
                                    <button onClick={handleContinueFlow} className="px-12 py-6 rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:bg-cyan-500 hover:text-black shadow-2xl transition-all">
                                        <Video className="w-5 h-5" /> Gerar Sequência Alpha (+3 Cenas)
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] animate-scan" />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
                .animate-scan { animation: scan 10s linear infinite; }
            `}} />
        </div>
    );
}
