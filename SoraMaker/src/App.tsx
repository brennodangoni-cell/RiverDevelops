import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Settings2, Sparkles, Video, User, SunMoon, Palette, Loader2, CheckCircle2, ChevronRight, Download, Copy, Camera, Film, LayoutGrid, ArrowRight, Wand2, RefreshCcw, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeProduct, generatePrompts, generateMockup, ProductAnalysis } from './services/ai';

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

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const [spent, setSpent] = useState(() => parseFloat(localStorage.getItem('sora_spent') || '0'));
  const [results, setResults] = useState<Result[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Add cost for analysis
      setSpent(prev => {
        const newVal = prev + 0.005;
        localStorage.setItem('sora_spent', newVal.toString());
        return newVal;
      });
      
      setTimeout(() => setStep(2), 500);
    } catch (error) {
      console.error(error);
      alert("Erro ao analisar produto.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysis) return;
    setIsGenerating(true);
    setStep(3);
    setResults([]);
    setProgress(10);
    
    try {
      setProgressText('Criando prompts perfeitos para o Sora 2...');
      const prompts = await generatePrompts(analysis.description, options);
      setProgress(30);
      
      const newResults: Result[] = prompts.map(p => ({ prompt: p, mockupUrl: null }));
      setResults([...newResults]);

      for (let i = 0; i < prompts.length; i++) {
        setProgressText(`Gerando mockup realista ${i + 1} de ${prompts.length}...`);
        const mockupUrl = await generateMockup(analysis.description, options, i);
        newResults[i].mockupUrl = mockupUrl;
        setResults([...newResults]);
        setProgress(30 + ((i + 1) / prompts.length) * 70);
      }
      
      // Add cost
      setSpent(prev => {
        const newVal = prev + 0.01 + (prompts.length * 0.06);
        localStorage.setItem('sora_spent', newVal.toString());
        return newVal;
      });
      
      setProgressText('Concluído!');
      setTimeout(() => {
        setProgressText('');
        setProgress(0);
      }, 2000);
      
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro durante a geração.");
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
      
      // Add cost
      setSpent(prev => {
        const newVal = prev + 0.01 + (newPrompts.length * 0.06);
        localStorage.setItem('sora_spent', newVal.toString());
        return newVal;
      });
      
      setProgressText('Continuação Concluída!');
      setTimeout(() => {
        setProgressText('');
        setProgress(0);
      }, 2000);
      
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro durante a continuação.");
    } finally {
      setIsContinuing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">SoraPrompt Pro</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className={step >= 1 ? 'text-indigo-400' : 'text-zinc-600'}>1. Upload</span>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span className={step >= 2 ? 'text-indigo-400' : 'text-zinc-600'}>2. Opções</span>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span className={step >= 3 ? 'text-indigo-400' : 'text-zinc-600'}>3. Resultados</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight">Comece com o seu Produto</h2>
                <p className="text-zinc-400">Faça upload de fotos do produto. Nossa IA vai analisar os detalhes e sugerir os melhores cenários para o seu vídeo.</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/50 rounded-3xl p-12 text-center cursor-pointer transition-colors group"
              >
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <div className="w-16 h-16 rounded-full bg-zinc-800 group-hover:bg-indigo-500/20 flex items-center justify-center mx-auto mb-6 transition-colors">
                  <Upload className="w-8 h-8 text-zinc-400 group-hover:text-indigo-400" />
                </div>
                <p className="text-lg font-medium text-zinc-200">Clique ou arraste as fotos aqui</p>
                <p className="text-sm text-zinc-500 mt-2">Recomendamos 2-4 fotos de ângulos diferentes</p>
              </div>

              {images.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    <AnimatePresence>
                      {images.map((img, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          key={idx} 
                          className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10"
                        >
                          <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none text-lg"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Analisando Produto...</>
                    ) : (
                      <><Wand2 className="w-5 h-5" /> Analisar Produto & Sugerir Cenários</>
                    )}
                  </button>
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
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-5 space-y-8">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-indigo-300">Produto Identificado</h3>
                      <p className="text-lg font-semibold text-white">{analysis.productType}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" /> Formato (Aspect Ratio)
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-white/5">
                      <button
                        onClick={() => setOptions({ ...options, aspectRatio: '16:9' })}
                        className={`py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${options.aspectRatio === '16:9' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        <Monitor className="w-4 h-4" /> 16:9 (Horizontal)
                      </button>
                      <button
                        onClick={() => setOptions({ ...options, aspectRatio: '9:16' })}
                        className={`py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${options.aspectRatio === '9:16' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        <Smartphone className="w-4 h-4" /> 9:16 (Vertical)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Estilo do Vídeo
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setOptions({ ...options, mode: 'product_only', environment: analysis?.suggestedSceneriesProductOnly[0] || '' })}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1 ${options.mode === 'product_only' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'}`}
                      >
                        <span className="text-sm font-medium text-zinc-200">Apenas Produto</span>
                        <span className="text-[10px] text-zinc-500 leading-tight">Foco total no produto, sem modelos humanos. Ideal para 3D ou estúdio.</span>
                      </button>
                      <button
                        onClick={() => setOptions({ ...options, mode: 'lifestyle', environment: analysis?.suggestedSceneriesLifestyle[0] || '' })}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1 ${options.mode === 'lifestyle' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'}`}
                      >
                        <span className="text-sm font-medium text-zinc-200">Lifestyle (Com Modelo)</span>
                        <span className="text-[10px] text-zinc-500 leading-tight">Produto sendo usado por uma pessoa em um contexto de vida real.</span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {options.mode === 'lifestyle' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6 overflow-hidden"
                      >
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Gênero do Modelo
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {genders.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setOptions({...options, gender: opt.id})}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                                  options.gender === opt.id 
                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                                    : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                                }`}
                              >
                                <opt.icon className="w-5 h-5" />
                                <span className="text-xs font-medium">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5" /> Tom de Pele
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {skinTones.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setOptions({...options, skinTone: opt.id})}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                  options.skinTone === opt.id 
                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                                    : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full shadow-inner border border-white/10" style={{ background: opt.color }} />
                                <span className="text-[10px] font-medium">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Cor do Cabelo
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {hairColors.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setOptions({...options, hairColor: opt.id})}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                  options.hairColor === opt.id 
                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                                    : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full shadow-inner border border-white/10" style={{ background: opt.color }} />
                                <span className="text-[10px] font-medium">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SunMoon className="w-3.5 h-3.5" /> Iluminação / Clima
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {lightings.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setOptions({...options, timeOfDay: opt.id})}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                            options.timeOfDay === opt.id 
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                          }`}
                        >
                          <span className="text-xs font-medium text-zinc-200">{opt.label}</span>
                          <span className="text-[10px] text-zinc-500 leading-tight">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" /> Estilo Cinematográfico
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {styles.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setOptions({...options, style: opt.id})}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                            options.style === opt.id 
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                          }`}
                        >
                          <span className="text-xs font-medium text-zinc-200">{opt.label}</span>
                          <span className="text-[10px] text-zinc-500 leading-tight">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <LayoutGrid className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-medium">Cenários Sugeridos pela IA</h2>
                  </div>
                  <p className="text-sm text-zinc-400">Com base na análise do seu produto, geramos estes cenários perfeitos. Selecione um ou digite o seu próprio.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(options.mode === 'product_only' ? analysis.suggestedSceneriesProductOnly : analysis.suggestedSceneriesLifestyle).map((scenery, idx) => (
                      <button
                        key={idx}
                        onClick={() => setOptions({...options, environment: scenery})}
                        className={`p-5 rounded-2xl border text-left transition-all group ${
                          options.environment === scenery 
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10' 
                            : 'bg-zinc-900/80 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${options.environment === scenery ? 'border-indigo-500' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                            {options.environment === scenery && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                          </div>
                          <span className="text-sm leading-relaxed">{scenery}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Ou digite um cenário personalizado</label>
                    <input 
                      type="text"
                      value={options.environment}
                      onChange={(e) => setOptions({...options, environment: e.target.value})}
                      placeholder="Ex: Fundo branco infinito, Rua de Nova York, Praia..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Descrição de Apoio (Opcional)</label>
                    <textarea 
                      value={options.supportingDescription}
                      onChange={(e) => setOptions({...options, supportingDescription: e.target.value})}
                      placeholder="Adicione detalhes extras para a IA. Ex: 'O produto está flutuando na água', 'O modelo está sorrindo e segurando o produto com as duas mãos'..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 min-h-[100px] resize-y"
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="w-full py-4 mt-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 text-lg"
                  >
                    Gerar Prompts e Mockups <ArrowRight className="w-5 h-5" />
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
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    Resultados Gerados
                  </h2>
                  <p className="text-zinc-400 mt-1">Aqui estão seus prompts otimizados para o Sora 2 e mockups de referência.</p>
                </div>
                <button 
                  onClick={() => {
                    setStep(1);
                    setImages([]);
                    setAnalysis(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <RefreshCcw className="w-4 h-4" /> Novo Produto
                </button>
              </div>

              {(isGenerating || isContinuing) && (
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-indigo-400 font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progressText}
                    </span>
                    <span className="text-zinc-400 font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                {results.map((result, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col lg:flex-row"
                  >
                    {/* Mockup Image */}
                    <div className="lg:w-1/2 aspect-square bg-black relative flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5">
                      {result.mockupUrl ? (
                        <img src={result.mockupUrl} alt={`Mockup ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                          <span className="text-sm">Gerando collage de referência...</span>
                        </div>
                      )}
                      
                      {result.mockupUrl && (
                        <div className="absolute top-4 right-4 flex gap-2">
                           <a 
                            href={result.mockupUrl} 
                            download={`mockup-${idx+1}.png`}
                            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-indigo-500 transition-colors border border-white/10 text-white"
                            title="Baixar Imagem"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Prompt Text */}
                    <div className="lg:flex-1 p-6 lg:p-8 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-medium text-indigo-400 flex items-center gap-2">
                          <Sparkles className="w-5 h-5" /> {sequenceTitles[idx] || `Prompt Sora 2 - Variação ${idx + 1}`}
                        </h3>
                        <button 
                          onClick={() => copyToClipboard(result.prompt)}
                          className="text-sm font-medium flex items-center gap-2 text-zinc-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/5"
                        >
                          <Copy className="w-4 h-4" /> Copiar
                        </button>
                      </div>
                      <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-white/5 relative group">
                        <p className="text-sm text-zinc-300 leading-relaxed font-mono">
                          {result.prompt}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {!isGenerating && !isContinuing && results.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-8 border-t border-white/10 flex justify-center"
                >
                  <button
                    onClick={handleContinueFlow}
                    className="px-8 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium flex items-center justify-center gap-3 transition-all shadow-lg border border-white/5"
                  >
                    <Video className="w-5 h-5 text-indigo-400" />
                    Continuar Fluxo (Gerar +3 Cenas)
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
