import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Image as ImageIcon, Copy, Wand2, MonitorPlay,
    Zap, Check, ChevronLeft, Loader2, Upload,
    X, SunMoon, User, RefreshCcw, ArrowRight,
    Smartphone, Monitor, Download, Film, LayoutGrid, Key,
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
    { id: 'Golden Hour', label: 'Golden Hour', desc: 'Luz suave e dourada do pôr do sol', icon: SunMoon },
    { id: 'Bright Daylight', label: 'Dia Ensolarado', desc: 'Luz forte e natural, sombras nítidas', icon: SunMoon },
    { id: 'Night/Neon', label: 'Noite / Neon', desc: 'Escuro com luzes artificiais vibrantes', icon: SunMoon },
    { id: 'Studio Lighting', label: 'Estúdio', desc: 'Luzes controladas, visual profissional', icon: SunMoon },
    { id: 'Overcast/Moody', label: 'Nublado', desc: 'Luz suave sem sombras, tom dramático', icon: SunMoon },
];

const styles = [
    { id: 'Cinematic', label: 'Cinemático', desc: 'Visual de filme, alta qualidade e profundidade' },
    { id: 'Raw Documentary', label: 'Doc Raw', desc: 'Câmera na mão, realista, sem filtros artificiais' },
    { id: 'Commercial', label: 'Comercial TV', desc: 'Cores vibrantes, foco absoluto no produto' },
    { id: 'Minimalist', label: 'Minimalista', desc: 'Cenário limpo, fundo neutro, sem distrações' },
    { id: 'Cyberpunk', label: 'Cyberpunk', desc: 'Futurista, luzes neon, tecnológico e noturno' },
    { id: 'Vintage 35mm', label: 'Vintage 35mm', desc: 'Estilo retrô, textura de filme antigo, nostálgico' },
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
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
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

    // Check if API Key is set on mount
    useEffect(() => {
        if (!apiKey) {
            setStep(0);
        }
    }, [apiKey]);

    const handleSaveKey = () => {
        if (!apiKey.trim()) {
            toast.error('Insira uma chave válida');
            return;
        }
        localStorage.setItem('gemini_api_key', apiKey);
        setStep(1);
        toast.success('Laboratório Desbloqueado!');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImages(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (images.length === 0) return;
        setIsAnalyzing(true);
        setProgress(10);
        setProgressText('Analisando imagens com IA...');
        try {
            const result = await analyzeProduct(images);
            setProgress(100);
            setAnalysis(result);
            setOptions(prev => ({ ...prev, environment: result.suggestedSceneriesLifestyle[0] || '' }));
            setTimeout(() => setStep(2), 500);
        } catch (error: any) {
            console.error(error);
            if (error.message === "GEMINI_API_KEY_MISSING") {
                setStep(0);
            } else {
                toast.error("Erro ao analisar produto. Verifique sua chave.");
            }
        } finally {
            setIsAnalyzing(false);
            setProgress(0);
        }
    };

    const handleGenerate = async () => {
        if (!analysis) return;
        setIsGenerating(true);
        setStep(3);
        setResults([]);
        setProgress(5);

        try {
            setProgressText('Criando prompts perfeitos para o Sora 2...');
            const prompts = await generatePrompts(analysis.description, options);
            setProgress(25);

            const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults([...newResults]);

            for (let i = 0; i < prompts.length; i++) {
                setProgressText(`Gerando mockup realista ${i + 1} de ${prompts.length}...`);
                const mockupUrl = await generateMockup(analysis.description, options, i);
                newResults[i].mockupUrl = mockupUrl;
                setResults([...newResults]);
                setProgress(25 + ((i + 1) / prompts.length) * 75);
            }

            setProgressText('Concluído!');
            setTimeout(() => {
                setProgressText('');
                setProgress(0);
            }, 2000);

            toast.success('Roteiro e Mockups gerados!');
        } catch (error: any) {
            console.error(error);
            toast.error("Erro na geração. Verifique os créditos.");
            setStep(2);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleContinueFlow = async () => {
        if (!analysis) return;
        setIsContinuing(true);
        setProgress(10);

        try {
            setProgressText('Criando continuação da cena...');
            const previousPrompts = results.map(r => r.prompt);
            const newPrompts = await generatePrompts(analysis.description, options, previousPrompts);
            setProgress(30);

            const startIndex = results.length;
            const newResults: Result[] = newPrompts.map(p => ({ prompt: p, mockupUrl: null }));
            setResults(prev => [...prev, ...newResults]);

            for (let i = 0; i < newPrompts.length; i++) {
                const globalIndex = startIndex + i;
                setProgressText(`Gerando mockup realista ${globalIndex + 1}...`);
                const mockupUrl = await generateMockup(analysis.description, options, globalIndex);

                setResults(prev => {
                    const updated = [...prev];
                    updated[globalIndex].mockupUrl = mockupUrl;
                    return updated;
                });
                setProgress(30 + ((i + 1) / newPrompts.length) * 70);
            }

            setProgressText('Continuação Concluída!');
            setTimeout(() => {
                setProgressText('');
                setProgress(0);
            }, 2000);

        } catch (error) {
            console.error(error);
            toast.error("Erro na continuação.");
        } finally {
            setIsContinuing(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Prompt copiado!');
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 font-light">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 text-white/50" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                <Sparkles className="w-5 h-5 text-cyan-400" />
                            </div>
                            <h1 className="text-2xl font-display font-medium tracking-tight">Vitta Video Lab</h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                        <span className={step >= 1 ? 'text-cyan-400' : 'text-zinc-600'}>1. Upload</span>
                        <ChevronRight className="w-4 h-4 text-zinc-800" />
                        <span className={step >= 2 ? 'text-cyan-400' : 'text-zinc-600'}>2. Configuração</span>
                        <ChevronRight className="w-4 h-4 text-zinc-800" />
                        <span className={step >= 3 ? 'text-cyan-400' : 'text-zinc-600'}>3. Storyboard</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setStep(0)}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                            title="Configurar Chave"
                        >
                            <Key className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">

                    {/* STEP 0: API KEY SETUP */}
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-md mx-auto py-20 text-center space-y-8"
                        >
                            <div className="w-20 h-20 rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,211,238,0.1)]">
                                <ShieldCheck className="w-10 h-10 text-cyan-400" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-display font-semibold">Desbloquear Laboratório</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Integramos o <b>Gemini 2.0 Flash</b> para análise visual de produtos e geração de roteiros. Insira sua chave do Google AI Studio.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Cole sua API Key aqui..."
                                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm focus:outline-none focus:border-cyan-500 transition-all focus:ring-1 focus:ring-cyan-500/50"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveKey}
                                    className="w-full bg-cyan-500 text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)]"
                                >
                                    AUTORIZAR ACESSO
                                </button>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors uppercase font-bold tracking-widest pt-2"
                                >
                                    Obter Chave Grátis no Google AI Studio
                                </a>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-4xl mx-auto space-y-12"
                        >
                            <div className="text-center space-y-4">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500">Inteligência Maestro</span>
                                <h2 className="text-5xl font-display font-semibold tracking-tight">Prepare sua Lente</h2>
                                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Nossa IA analisará a forma, textura e cor do seu produto para criar cenários hiper-realistas para o <b>Sora 2</b>.</p>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative"
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative border-2 border-dashed border-white/5 hover:border-cyan-500/50 bg-zinc-950 rounded-[3rem] p-20 text-center cursor-pointer transition-all flex flex-col items-center">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                    />
                                    <div className="w-24 h-24 rounded-3xl bg-white/5 group-hover:bg-cyan-500/10 flex items-center justify-center mb-8 border border-white/10 group-hover:border-cyan-500/30 transition-all">
                                        <Upload className="w-10 h-10 text-white/20 group-hover:text-cyan-400" />
                                    </div>
                                    <p className="text-2xl font-medium text-white mb-2">Importar Referências</p>
                                    <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Arraste fotos do seu produto aqui (PNG, JPG)</p>
                                </div>
                            </div>

                            {images.length > 0 && (
                                <div className="space-y-10">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        <AnimatePresence>
                                            {images.map((img, idx) => (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    key={idx}
                                                    className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/10 shadow-2xl"
                                                >
                                                    <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                        className="absolute top-4 right-4 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all hover:bg-red-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex justify-center">
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing}
                                            className="group relative px-12 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-cyan-400 transition-all disabled:opacity-50"
                                        >
                                            {isAnalyzing ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" /> Escaneando...</>
                                            ) : (
                                                <><Wand2 className="w-5 h-5" /> Ativar IA Maestro</>
                                            )}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: OPTIONS */}
                    {step === 2 && analysis && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-10"
                        >
                            <div className="lg:col-span-4 space-y-10">
                                {/* Vision Results Card */}
                                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Zap className="w-20 h-20 text-cyan-400" />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Produto Identificado</span>
                                        <h3 className="text-3xl font-display font-semibold text-white leading-tight">{analysis.productType}</h3>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-3 relative">
                                        <p className="text-xs text-zinc-400 uppercase font-black tracking-widest">DNA Visual</p>
                                        <p className="text-sm text-zinc-200 leading-relaxed italic">"{analysis.description.substring(0, 150)}..."</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Aspect Ratio */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <LayoutGrid className="w-3.5 h-3.5" /> Formato de Entrega
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setOptions({ ...options, aspectRatio: '16:9' })}
                                                className={`py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-tighter ${options.aspectRatio === '16:9' ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                                            >
                                                <Monitor className="w-4 h-4" /> Horizontal (16:9)
                                            </button>
                                            <button
                                                onClick={() => setOptions({ ...options, aspectRatio: '9:16' })}
                                                className={`py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-tighter ${options.aspectRatio === '9:16' ? 'bg-cyan-500 border-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                                            >
                                                <Smartphone className="w-4 h-4" /> Vertical (9:16)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mode Selector */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Video className="w-3.5 h-3.5" /> Direção de Arte
                                        </label>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis?.suggestedSceneriesProductOnly[0] || '' })}
                                                className={`p-6 text-left rounded-3xl border transition-all flex flex-col gap-2 ${options.mode === 'product_only' ? 'bg-cyan-500/10 border-cyan-500 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}`}
                                            >
                                                <span className={`text-sm font-black uppercase tracking-widest ${options.mode === 'product_only' ? 'text-cyan-400' : 'text-zinc-500'}`}>Apenas Produto</span>
                                                <span className="text-xs text-zinc-400 leading-relaxed font-light">Foco total nas texturas e design. Ideal para estúdio e 3D.</span>
                                            </button>
                                            <button
                                                onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis?.suggestedSceneriesLifestyle[0] || '' })}
                                                className={`p-6 text-left rounded-3xl border transition-all flex flex-col gap-2 ${options.mode === 'lifestyle' ? 'bg-cyan-500/10 border-cyan-500 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'}`}
                                            >
                                                <span className={`text-sm font-black uppercase tracking-widest ${options.mode === 'lifestyle' ? 'text-cyan-400' : 'text-zinc-500'}`}>Lifestyle (Com Modelo)</span>
                                                <span className="text-xs text-zinc-400 leading-relaxed font-light">Produto em contexto de uso real com atores cinematográficos.</span>
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {options.mode === 'lifestyle' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-8 overflow-hidden pt-4 border-t border-white/5"
                                            >
                                                {/* Model Casting Details */}
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Casting: Gênero</label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {genders.map(g => (
                                                                <button
                                                                    key={g.id}
                                                                    onClick={() => setOptions({ ...options, gender: g.id })}
                                                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${options.gender === g.id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-zinc-600'}`}
                                                                >
                                                                    <g.icon className="w-4 h-4" />
                                                                    <span className="text-[9px] font-bold uppercase">{g.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tom de Pele</label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {skinTones.map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => setOptions({ ...options, skinTone: s.id })}
                                                                    className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 ${options.skinTone === s.id ? 'border-cyan-500 bg-cyan-500/5' : 'border-transparent'}`}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full border border-white/10" style={{ background: s.color }} />
                                                                    <span className="text-[9px] font-bold uppercase text-zinc-500">{s.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tom de Cabelo</label>
                                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                                            {hairColors.map(h => (
                                                                <button
                                                                    key={h.id}
                                                                    onClick={() => setOptions({ ...options, hairColor: h.id })}
                                                                    className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 ${options.hairColor === h.id ? 'border-cyan-500 bg-cyan-500/5' : 'border-transparent'}`}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full border border-white/10" style={{ background: h.color }} />
                                                                    <span className="text-[9px] font-bold uppercase text-zinc-500">{h.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="lg:col-span-8 space-y-10">
                                <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl backdrop-blur-3xl">

                                    {/* Step Heading */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-display font-medium flex items-center gap-3">
                                                <ImageIcon className="w-6 h-6 text-cyan-500" /> Curadoria de Cenários
                                            </h2>
                                            <p className="text-sm text-zinc-500">Selecione uma das sugestões da IA ou personalize o ambiente.</p>
                                        </div>
                                    </div>

                                    {/* Scenery Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((scenery, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setOptions({ ...options, environment: scenery })}
                                                className={`p-8 rounded-3xl border text-left transition-all relative group overflow-hidden ${options.environment === scenery
                                                        ? 'bg-cyan-500/10 border-cyan-500 shadow-xl'
                                                        : 'bg-black/60 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4 h-full relative z-10">
                                                    <div className={`mt-1 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${options.environment === scenery ? 'border-cyan-500' : 'border-zinc-700'}`}>
                                                        {options.environment === scenery && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                                                    </div>
                                                    <span className={`text-sm leading-relaxed ${options.environment === scenery ? 'text-white font-medium' : 'text-zinc-500'}`}>{scenery}</span>
                                                </div>
                                                <div className={`absolute bottom-0 left-0 h-1 bg-cyan-500 transition-all duration-500 ${options.environment === scenery ? 'w-full' : 'w-0'}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                <SunMoon className="w-3.5 h-3.5" /> Iluminação & Atmosphere
                                            </label>
                                            <select
                                                value={options.timeOfDay}
                                                onChange={(e) => setOptions({ ...options, timeOfDay: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-cyan-500"
                                            >
                                                {lightings.map(l => <option key={l.id} value={l.id}>{l.label} - {l.desc}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                <Film className="w-3.5 h-3.5" /> Estilo de Lente
                                            </label>
                                            <select
                                                value={options.style}
                                                onChange={(e) => setOptions({ ...options, style: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-cyan-500"
                                            >
                                                {styles.map(s => <option key={s.id} value={s.id}>{s.label} - {s.desc}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Brainstorming Adicional (Opcional)</label>
                                        <textarea
                                            value={options.supportingDescription}
                                            onChange={(e) => setOptions({ ...options, supportingDescription: e.target.value })}
                                            placeholder="Ex: Adicionar gotas de água na superfície, flocos de neve caindo, fundo mais desfocado..."
                                            className="w-full bg-black/60 border border-white/10 rounded-3xl px-8 py-6 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500 transition-all min-h-[140px] resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        className="w-full group bg-white text-black font-black uppercase tracking-[0.2em] py-6 rounded-[2rem] hover:bg-cyan-400 transition-all flex items-center justify-center gap-4 text-sm shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_50px_rgba(34,211,238,0.2)]"
                                    >
                                        CONFIGURAR PRODUÇÃO <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <h2 className="text-3xl font-display font-semibold">Produção Concluída</h2>
                                    </div>
                                    <p className="text-zinc-500 text-sm">Pronto para a Sora 2. Copie os prompts e use as artes como referência de estilo.</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setStep(1);
                                            setImages([]);
                                            setAnalysis(null);
                                        }}
                                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                                    >
                                        <RefreshCcw className="w-4 h-4" /> Reset Lab
                                    </button>
                                </div>
                            </div>

                            {(isGenerating || isContinuing) && (
                                <div className="bg-zinc-900/50 border border-cyan-500/20 rounded-3xl p-10 flex flex-col gap-6 backdrop-blur-sm animate-pulse">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                                            <span className="text-cyan-400 font-bold uppercase tracking-widest text-sm">{progressText}</span>
                                        </div>
                                        <span className="text-zinc-600 font-mono text-xl">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-cyan-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-12">
                                {results.map((result, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.15 }}
                                        key={idx}
                                        className="group relative"
                                    >
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-[3rem] blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                        <div className="relative bg-zinc-950 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl">
                                            {/* Mockup Display */}
                                            <div className="lg:w-1/2 aspect-square bg-black relative flex items-center justify-center overflow-hidden border-b lg:border-r border-white/5 group/img">
                                                {result.mockupUrl ? (
                                                    <>
                                                        <img src={result.mockupUrl} alt={`Mockup ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                                                        <div className="absolute bottom-8 left-8">
                                                            <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40 mb-2 block">Reference Collage</span>
                                                            <h4 className="text-xl font-display font-medium">Concept Visual 0{idx + 1}</h4>
                                                        </div>
                                                        <div className="absolute top-8 right-8 flex gap-3 translate-y-2 opacity-0 group-hover/img:translate-y-0 group-hover/img:opacity-100 transition-all duration-500">
                                                            <a
                                                                href={result.mockupUrl}
                                                                download={`mockup-${idx + 1}.png`}
                                                                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-cyan-400 transition-all shadow-xl"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </a>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-4 text-zinc-700">
                                                        <div className="w-12 h-12 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center animate-spin">
                                                            <Sparkles className="w-5 h-5" />
                                                        </div>
                                                        <span className="text-[10px] uppercase font-black tracking-widest">Orchestrating Visuals...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Prompt Content */}
                                            <div className="lg:flex-1 p-12 flex flex-col justify-between space-y-10">
                                                <div className="space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{sequenceTitles[idx] || `Variação 0${idx + 1}`}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(result.prompt)}
                                                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group/copy"
                                                        >
                                                            <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>

                                                    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 relative">
                                                        <p className="text-lg text-zinc-100 leading-relaxed font-light tracking-wide">
                                                            {result.prompt}
                                                        </p>
                                                        <div className="mt-6 flex items-center gap-4 opacity-30">
                                                            <div className="h-[1px] flex-1 bg-white/10" />
                                                            <MonitorPlay className="w-4 h-4" />
                                                            <div className="h-[1px] flex-1 bg-white/10" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <Film className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Sora 2 Optimization</p>
                                                        <p className="text-xs text-zinc-400">Cinematography: {options.style} / Lighting: {options.timeOfDay}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {!isGenerating && !isContinuing && results.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="pt-12 border-t border-white/5 flex flex-col items-center gap-6"
                                >
                                    <p className="text-xs uppercase font-black tracking-[0.4em] text-zinc-700">Precisa de mais tempo de vídeo?</p>
                                    <button
                                        onClick={handleContinueFlow}
                                        className="group relative px-10 py-5 rounded-[2rem] bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-widest text-xs flex items-center gap-4 hover:border-cyan-500/50 transition-all shadow-2xl"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                            <Video className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        Continuar Produção (+3 Cenas)
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* Background Decor */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>
        </div>
    );
}
