import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Copy, Check, ChevronLeft, Loader2, Upload,
    X, ArrowRight, Download, Video, DollarSign, LogOut,
    Smartphone, Monitor, Camera, Palette,
    Layers, Wand2, PlayCircle, Settings2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { analyzeProduct, generatePrompts, generateMockup, ProductAnalysis } from '../../services/ai';

interface Result {
    prompt: string;
    mockupUrl: string | null;
}

const genders = [
    { id: 'Female', label: 'Feminino' },
    { id: 'Male', label: 'Masculino' },
    { id: 'Androgynous', label: 'Andrógino' },
    { id: 'Any', label: 'Qualquer' },
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
    "Cena 1: Estabelecimento",
    "Cena 2: Ação e Uso",
    "Cena 3: Detalhes e Textura",
    "Cena 4: Ângulo Alternativo",
    "Cena 5: B-Roll Dinâmico",
    "Cena 6: Encerramento",
    "Cena 7: Extensão Extra",
    "Cena 8: Extensão Extra",
    "Cena 9: Extensão Extra"
];

export default function VideoLab() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [images, setImages] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
    const [options, setOptions] = useState({
        mode: 'product_only',
        environment: '',
        style: 'Cinematic',
        timeOfDay: 'Golden Hour',
        aspectRatio: '16:9',
        gender: 'Female',
        skinTone: 'Light',
        hairColor: 'Blonde',
        supportingDescription: '',
        script: '',
        includeText: false,
        includeVoice: false,
        language: 'Português'
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

    // Sync API Key from localStorage for persistence if needed by ai.ts
    useEffect(() => {
        const localApiKey = localStorage.getItem('gemini_api_key');
        if (!localApiKey) {
            const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
            if (envKey) localStorage.setItem('gemini_api_key', envKey);
        }
    }, []);

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
        setProgressText('Analisando DNA Visual do Produto...');
        try {
            const result = await analyzeProduct(images);
            setAnalysis(result);
            setOptions(prev => ({ ...prev, environment: result.suggestedSceneriesLifestyle[0] || '' }));
            setProgress(100);
            setTimeout(() => setStep(2), 500);
        } catch (error: any) {
            console.error("ANALYSIS_ERROR_LOG:", error);
            toast.error(`Erro na análise visual. Tente novamente.`);
            setStep(1);
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
            setProgressText('Engenharia de Prompts (Sora 2 Master Skeleton)...');
            const prompts = await generatePrompts(analysis.description, options);
            setProgress(20);
            const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults([...newResults]);
            for (let i = 0; i < prompts.length; i++) {
                setProgressText(`Renderizando Mockup ${i + 1} (1K RAW)...`);
                const mockupUrl = await generateMockup(analysis.description, options, i);
                newResults[i].mockupUrl = mockupUrl;
                setResults([...newResults]);
                setProgress(20 + ((i + 1) / prompts.length) * 80);
            }
        } catch (e: any) {
            console.error("FULL_API_ERROR_OBJECT:", e);
            toast.error("Erro na geração da sequência.");
            setStep(2);
        } finally {
            setIsGenerating(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleContinueFlow = async () => {
        if (!analysis) return;
        setIsContinuing(true);
        setProgress(10);
        try {
            setProgressText('Expandindo Sequência Narrativa...');
            const previousPrompts = results.map(r => r.prompt);
            const newPrompts = await generatePrompts(
                analysis.description,
                options,
                previousPrompts
            );
            setProgress(30);
            const startIndex = results.length;
            const newResults: Result[] = newPrompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);
            for (let i = 0; i < newPrompts.length; i++) {
                const globalIndex = startIndex + i;
                setProgressText(`Renderizando Mockup Extra ${i + 1}...`);
                const mockupUrl = await generateMockup(analysis.description, options, globalIndex);
                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex].mockupUrl = mockupUrl;
                    return updated;
                });
                setProgress(30 + ((i + 1) / newPrompts.length) * 70);
            }
        } catch (error) {
            toast.error("Erro na expansão da sequência.");
        } finally {
            setIsContinuing(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const handleRegenerateTake = async (index: number) => {
        if (!analysis) return;
        toast.promise(
            (async () => {
                const newOptions = { ...options, supportingDescription: `Regenerate scene ${index + 1} with a new perspective.` };
                const newPrompts = await generatePrompts(
                    analysis.description,
                    newOptions,
                    results.slice(0, index).map(r => r.prompt)
                );
                const newPrompt = newPrompts[0];
                const mockupUrl = await generateMockup(analysis.description, newOptions, index);
                setResults(prev => {
                    const updated = [...prev];
                    updated[index] = { prompt: newPrompt, mockupUrl };
                    return updated;
                });
            })(),
            {
                loading: 'Regenerando take com nova perspectiva...',
                success: 'Take atualizado com sucesso!',
                error: 'Erro ao regenerar take.',
            }
        );
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Prompt copiado para a área de transferência!');
    };

    return (
        <div className="min-h-screen bg-[#030303] text-zinc-300 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(8,145,178,0.08)_0%,_transparent_70%)] blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.05)_0%,_transparent_70%)] blur-[100px]" />
            </div>

            {/* Glassmorphic Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.3)]">
                            <PlayCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight text-white">River Sora Lab</h1>
                            <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-[0.2em]">Production Engine <span className="text-cyan-500">v10.1</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-full">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-zinc-300">{balanceVal}</span>
                    </div>
                    <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                        <img
                            src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                            className="w-8 h-8 rounded-full border border-white/10 object-cover"
                            alt="User"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=111&color=fff`; }}
                        />
                        <button onClick={handleLogout} className="p-2 hover:bg-red-500/10 rounded-full text-zinc-500 hover:text-red-400 transition-all">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 pt-28 pb-20 relative z-10">
                {/* Minimalist Steps Indicator */}
                <div className="mb-12 flex items-center justify-center max-w-md mx-auto">
                    {[
                        { s: 1, label: 'Import', icon: Upload },
                        { s: 2, label: 'Configure', icon: Settings2 },
                        { s: 3, label: 'Generate', icon: Wand2 }
                    ].map((stepObj, idx) => (
                        <React.Fragment key={stepObj.s}>
                            <div className={`flex flex-col items-center gap-2 ${step >= stepObj.s ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${step === stepObj.s ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(8,145,178,0.4)] scale-110' : step > stepObj.s ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-500'}`}>
                                    <stepObj.icon className="w-4 h-4" />
                                </div>
                                <span className="text-[9px] font-semibold uppercase tracking-[0.15em]">{stepObj.label}</span>
                            </div>
                            {idx < 2 && (
                                <div className={`flex-1 h-px mx-4 transition-all duration-500 ${step > stepObj.s ? 'bg-cyan-500/50' : 'bg-white/5'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1: IMPORT */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center">
                            <div className="w-full max-w-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-12 text-center shadow-2xl">
                                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group cursor-pointer flex flex-col items-center gap-6 py-20 border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] rounded-2xl transition-all duration-500"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-500 shadow-inner">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-medium text-white tracking-tight">Upload Product Assets</h3>
                                        <p className="text-sm text-zinc-500 font-light">Drag and drop or click to browse. Minimum 1 photo required.</p>
                                    </div>
                                </div>

                                {images.length > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 pt-8 border-t border-white/5 w-full">
                                        <div className="flex justify-center gap-2 w-full mb-8">
                                            {images.map((img, idx) => (
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    key={idx}
                                                    className="relative flex-1 max-w-[6rem] aspect-square rounded-xl overflow-hidden border border-white/10 group shadow-lg"
                                                >
                                                    <img src={img} className="w-full h-full object-cover" alt="Uploaded" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                                                        <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors">
                                                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing}
                                            className="w-full py-5 bg-white hover:bg-zinc-200 disabled:bg-white/5 disabled:text-zinc-500 text-black font-bold uppercase tracking-[0.2em] text-xs rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3"
                                        >
                                            {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Extracting Visual DNA...</> : <>Analyze Product <ArrowRight className="w-4 h-4" /></>}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: CONFIGURATION */}
                    {step === 2 && analysis && (
                        <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Summary & Mode */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-8 space-y-6 shadow-2xl">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-semibold text-cyan-500 uppercase tracking-[0.2em]">Identified Subject</label>
                                        <p className="text-xl font-medium text-white tracking-tight">{analysis.productType}</p>
                                    </div>
                                    <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                                        <p className="text-xs text-zinc-400 leading-relaxed font-light italic">"{analysis.description.substring(0, 180)}..."</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Sequence Mode</label>
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis.suggestedSceneriesProductOnly[0] })} className={`py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 ${options.mode === 'product_only' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(8,145,178,0.15)]' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>Studio</button>
                                                <button onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis.suggestedSceneriesLifestyle[0] })} className={`py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 ${options.mode === 'lifestyle' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(8,145,178,0.15)]' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>Lifestyle</button>
                                            </div>
                                            <button onClick={() => setOptions({ ...options, mode: 'script' })} className={`w-full py-4 text-[10px] font-semibold uppercase tracking-[0.1em] rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${options.mode === 'script' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                <Layers className="w-3.5 h-3.5" /> Manual Script
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Detailed Configuration */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-8 shadow-2xl">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Settings2 className="w-5 h-5 text-zinc-400" />
                                        <h3 className="text-sm font-medium tracking-tight text-white">
                                            {options.mode === 'script' ? 'Script Detailing' : 'Environment & Aesthetics'}
                                        </h3>
                                    </div>

                                    {options.mode === 'script' ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={options.script}
                                                onChange={(e) => setOptions({ ...options, script: e.target.value })}
                                                placeholder="Paste your full script here. The AI Director will break it down into 3 distinct Sora 2 prompts..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-zinc-300 outline-none focus:border-purple-500/50 min-h-[300px] font-mono leading-relaxed transition-colors"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setOptions({ ...options, environment: s })}
                                                    className={`p-5 rounded-2xl border text-left transition-all duration-300 ${options.environment === s ? 'bg-cyan-500/5 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(8,145,178,0.1)]' : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:border-white/10 hover:bg-white/[0.04]'}`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${options.environment === s ? 'bg-cyan-500 border-cyan-400' : 'border-zinc-600'}`}>
                                                            {options.environment === s && <Check className="w-2.5 h-2.5 text-black" />}
                                                        </div>
                                                        <span className="text-xs leading-relaxed font-light">{s}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-10 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Lighting Physics</label>
                                            <select value={options.timeOfDay} onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-colors">
                                                {lightings.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Visual Realism Level</label>
                                            <select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-colors">
                                                {styles.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Lifestyle Personalization */}
                                    {options.mode === 'lifestyle' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-10 pt-10 border-t border-white/5 space-y-6">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Subject Architecture (Human)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Gender</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {genders.map(g => (
                                                            <button key={g.id} onClick={() => setOptions({ ...options, gender: g.id })} className={`py-2 px-4 rounded-full border text-[10px] font-medium transition-all ${options.gender === g.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                                {g.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Skin Tone</span>
                                                    <div className="flex gap-3">
                                                        {skinTones.map(s => (
                                                            <button key={s.id} onClick={() => setOptions({ ...options, skinTone: s.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.skinTone === s.id ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: s.color }} title={s.label} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <span className="text-[10px] text-zinc-400">Hair Color</span>
                                                    <div className="flex flex-wrap gap-3">
                                                        {hairColors.map(h => (
                                                            <button key={h.id} onClick={() => setOptions({ ...options, hairColor: h.id })} className={`w-8 h-8 rounded-full border-2 transition-all ${options.hairColor === h.id ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: h.color }} title={h.label} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-10 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Aspect Ratio</label>
                                            <div className="flex gap-3">
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '16:9' })} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-xl border transition-all duration-300 ${options.aspectRatio === '16:9' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                    <Monitor className="w-5 h-5" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider">16:9 Full</span>
                                                </button>
                                                <button onClick={() => setOptions({ ...options, aspectRatio: '9:16' })} className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-xl border transition-all duration-300 ${options.aspectRatio === '9:16' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:bg-white/5'}`}>
                                                    <Smartphone className="w-5 h-5" />
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider">9:16 Mobile</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Additional Directives</label>
                                            <textarea value={options.supportingDescription} onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })} placeholder="e.g., Slow motion, anamorphic lens flare..." className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 h-[88px] resize-none transition-colors" />
                                        </div>
                                    </div>

                                    <div className="mt-12">
                                        <button onClick={handleGenerate} className="w-full bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-[0.2em] text-xs py-5 rounded-full transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                            Generate Master Sequence <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-medium tracking-tight text-white">Production Results</h2>
                                    <p className="text-sm text-zinc-500 font-light mt-1">Sora 2 Deterministic Blueprints & 1K Mockups</p>
                                </div>
                                <button onClick={() => { setStep(1); setImages([]); setResults([]); }} className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 hover:text-white px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all">New Project</button>
                            </div>

                            {/* Progress Indicator */}
                            {(isGenerating || isContinuing) && (
                                <div className="bg-white/[0.02] border border-cyan-500/20 backdrop-blur-xl rounded-3xl p-8 mb-10 shadow-[0_0_30px_rgba(8,145,178,0.05)]">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                                            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400">{progressText}</span>
                                        </div>
                                        <span className="text-2xl font-light text-white">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
                                    </div>
                                </div>
                            )}

                            {/* Storyboard List */}
                            <div className="grid grid-cols-1 gap-8">
                                {results.map((res, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl">
                                        {/* Image Section */}
                                        <div className="w-full lg:w-[480px] aspect-square lg:aspect-auto bg-black/50 border-b lg:border-r lg:border-b-0 border-white/5 relative group">
                                            {res.mockupUrl ? (
                                                <>
                                                    <img src={res.mockupUrl} className="w-full h-full object-cover" alt="Result" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <a href={res.mockupUrl} download className="absolute top-6 right-6 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-cyan-500 hover:scale-110 shadow-xl border border-white/20">
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                    <div className="absolute bottom-6 left-6 flex gap-2">
                                                        <span className="bg-black/60 backdrop-blur-md text-[9px] font-semibold text-cyan-400 px-3 py-1.5 rounded-full border border-cyan-500/30 uppercase tracking-wider">AI Master Take</span>
                                                        <span className="bg-black/60 backdrop-blur-md text-[9px] font-semibold text-zinc-300 px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-wider">1K RAW</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-5 text-zinc-600 p-12 text-center">
                                                    {isGenerating || isContinuing ? (
                                                        <>
                                                            <Loader2 className="w-8 h-8 animate-spin text-cyan-500/50" />
                                                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Rendering Frame...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="w-10 h-10 text-zinc-700" />
                                                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Render Failed.<br />Try regenerating.</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Prompt Section */}
                                        <div className="flex-1 p-8 lg:p-10 flex flex-col">
                                            <div className="mb-6 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(8,145,178,0.8)]" />
                                                    <span className="text-xs font-semibold text-white uppercase tracking-[0.15em]">{sequenceTitles[i] || `Sequence ${i + 1}`}</span>
                                                </div>
                                                <button onClick={() => copyToClipboard(res.prompt)} className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all">
                                                    <Copy className="w-3.5 h-3.5" /> Copy Blueprint
                                                </button>
                                            </div>

                                            <div className="flex-1">
                                                <div className="p-6 bg-black/40 border border-white/5 rounded-2xl max-h-[360px] overflow-y-auto custom-scrollbar">
                                                    <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                                                        {res.prompt || "Generating deterministic skeleton..."}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-6">
                                                <div className="flex gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{options.aspectRatio}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Palette className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{options.style}</span>
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <button
                                                        onClick={() => handleRegenerateTake(i)}
                                                        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-5 py-2.5 rounded-full transition-all"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" /> Regenerate Take
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <div className="pt-12 flex flex-col items-center">
                                    <button onClick={handleContinueFlow} className="group bg-white/[0.03] border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-zinc-300 hover:text-cyan-400 px-10 py-5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 shadow-lg">
                                        <Video className="w-4 h-4" /> Expand Narrative (+3 Scenes)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Custom Scrollbar Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}} />
            </main>
        </div>
    );
}
