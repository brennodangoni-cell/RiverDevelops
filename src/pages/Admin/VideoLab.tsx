import { useState } from 'react';
import { Sparkles, Image as ImageIcon, Copy, Wand2, MonitorPlay, Camera, Palette, Zap, Check, Layout, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PRESETS = [
    {
        id: 'premium',
        name: 'Estilo Premium / Luxury',
        icon: <Palette className="w-4 h-4" />,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        scenes: [
            { title: 'Intro Impacto', prompt: 'Cinematic wide reveal of [PRODUCT] on a rotating glass pedestal, extreme luxury studio lighting, soft golden rim light, 8k, slow dolly zoom.' },
            { title: 'Macro Detalhe', prompt: 'Extreme macro close-up of [PRODUCT] textures and materials, soft focus background, elegant bokeh, high-speed camera. --motion 2' },
            { title: 'Lifestyle / Uso', prompt: 'Cinematic lifestyle shot of a hand interacting with [PRODUCT] in a high-end mansion setting, warm sunset light through windows.' },
            { title: 'Ação Dinâmica', prompt: 'Dynamic tracking shot of [PRODUCT] surrounded by silk fabric or gold particles flying in slow motion, extremely detailed.' },
            { title: 'Final / Logo', prompt: 'Stable centered shot of [PRODUCT], clean minimalist background, professional commercial lighting, fading to black.' }
        ]
    },
    {
        id: 'street',
        name: 'Estilo Urbano / Street',
        icon: <Camera className="w-4 h-4" />,
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        scenes: [
            { title: 'Intro Street', prompt: 'Low angle wide shot of [PRODUCT] on a rainy concrete street at night, neon reflections, cinematic teal and orange lighting.' },
            { title: 'Detalhe Rápido', prompt: 'Handheld style macro of [PRODUCT], gritty urban texture, lens flares from passing cars, high energy.' },
            { title: 'Ação Urbana', prompt: 'Person wearing [PRODUCT] walking fast through a hazy urban alley, cinematic motion blur, street lights flickering.' },
            { title: 'Take Criativo', prompt: 'Time-lapse of city lights reflecting on [PRODUCT] surface, fast camera movement, edgy aesthetic.' },
            { title: 'Final / Call', prompt: 'Close up of [PRODUCT] with a graffiti wall background, dramatic contrast, professional street photography style.' }
        ]
    }
];

const VO_SCRIPTS = [
    { id: 'sales', name: 'Venda Agressiva', template: 'Cansado do básico? Conheça o novo [PRODUCT]. Qualidade premium que você sente no primeiro toque. Clique agora e garanta o seu!' },
    { id: 'emotional', name: 'Estilo Storytelling', template: 'Cada detalhe do [PRODUCT] foi pensado para você. Mais que um produto, uma experiência. Sinta a diferença de um clássico moderno.' },
    { id: 'direct', name: 'Direto e Reto', template: 'O [PRODUCT] chegou. Design exclusivo, tecnologia de ponta e o melhor custo-benefício do mercado. Confira no link abaixo.' }
];

export default function VideoLab() {
    const [productDesc, setProductDesc] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [generatedStoryboard, setGeneratedStoryboard] = useState<any[]>([]);
    const [narration, setNarration] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();

    const generateStoryboard = () => {
        if (!productDesc) {
            toast.error('O que estamos vendendo?');
            return;
        }

        setIsGenerating(true);

        setTimeout(() => {
            const scenes = selectedPreset.scenes.map(s => ({
                ...s,
                prompt: s.prompt.replace('[PRODUCT]', productDesc)
            }));

            const vo = VO_SCRIPTS[Math.floor(Math.random() * VO_SCRIPTS.length)].template.replace('[PRODUCT]', productDesc);

            setGeneratedStoryboard(scenes);
            setNarration(vo);
            setIsGenerating(false);
            toast.success('Storyboard de Produção Criado!');
        }, 1200);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Prompt copiado!');
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto pt-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate('/admin')}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all mr-2"
                            >
                                <ChevronLeft className="w-5 h-5 text-white/50" />
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                <Sparkles className="w-5 h-5 text-cyan-400" />
                            </div>
                            <h1 className="text-3xl font-display font-medium tracking-tight">Laboratório de Produção</h1>
                        </div>
                        <p className="text-white/50 text-sm max-w-xl">
                            Transforme fotos simples em prompts de alta performance para a Sora 2 em segundos.
                            Gere variações técnicas para garantir o take perfeito.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Input Side */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-6 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> 1. O que vamos vender?
                            </h3>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Descrição do Produto (Ex: Tênis Branco com Detalhe Azul)</label>
                                <textarea
                                    value={productDesc}
                                    onChange={(e) => setProductDesc(e.target.value)}
                                    placeholder="Descreva o objeto da foto..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-all resize-none h-32"
                                />
                            </div>
                        </section>

                        <section className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-6 flex items-center gap-2">
                                <Wand2 className="w-4 h-4" /> 2. Escolha o Vibe
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedPreset(preset)}
                                        className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${selectedPreset.id === preset.id
                                            ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                                            : 'bg-white/5 border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors ${selectedPreset.id === preset.id ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/40 group-hover:text-white'
                                            }`}>
                                            {preset.icon}
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-tight ${selectedPreset.id === preset.id ? 'text-white' : 'text-white/40'}`}>
                                            {preset.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={generateStoryboard}
                                disabled={isGenerating}
                                className="w-full mt-8 bg-white text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            >
                                {isGenerating ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 fill-current" />
                                        <span>Criar Roteiro de Vídeo</span>
                                    </>
                                )}
                            </button>
                        </section>

                        {/* Narration Box */}
                        {narration && (
                            <section className="bg-cyan-500/10 border border-cyan-500/20 rounded-[2rem] p-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 shadow-[0_0_10px_cyan]" /> Sugestão de Narração (Off)
                                </h3>
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative group">
                                    <p className="text-sm italic text-white/80 leading-relaxed pr-8">
                                        "{narration}"
                                    </p>
                                    <button
                                        onClick={() => copyToClipboard(narration)}
                                        className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-[9px] mt-3 text-cyan-400/50 uppercase tracking-tighter">* Use o CapCut ou ElevenLabs para esta voz.</p>
                            </section>
                        )}
                    </div>

                    {/* Output Side */}
                    <div className="lg:col-span-7">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl min-h-[600px] flex flex-col relative overflow-hidden">
                            {/* Decorative Grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

                            <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-8 flex items-center gap-2 relative">
                                <MonitorPlay className="w-4 h-4" /> Storyboard: 40 Segundos de Alta Conversão
                            </h3>

                            {generatedStoryboard.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-10 text-center px-10 relative">
                                    <Layout className="w-24 h-24 mb-6 stroke-[1]" />
                                    <p className="text-xl font-display">A linha de montagem está desligada.</p>
                                    <p className="text-xs mt-2 uppercase tracking-[0.3em]">Configure à esquerda para produzir</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative">
                                    {generatedStoryboard.map((scene, idx) => (
                                        <div key={idx} className="group flex flex-col sm:flex-row gap-4 bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
                                            <div className="flex sm:flex-col items-center justify-between sm:justify-start gap-3 sm:w-20 shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold font-display text-white group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                                    0{idx + 1}
                                                </div>
                                                <div className="hidden sm:block h-full w-px bg-white/5 group-hover:bg-cyan-500/30 transition-all" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{scene.title}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(scene.prompt)}
                                                        className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full hover:bg-cyan-500 hover:text-black transition-all text-[9.5px] font-bold text-white/40"
                                                    >
                                                        <Copy className="w-3 h-3" /> COPIAR PROMPT
                                                    </button>
                                                </div>
                                                <p className="text-xs text-white/60 font-light leading-relaxed">
                                                    {scene.prompt}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="mt-10 p-6 bg-amber-400/5 border border-amber-400/20 rounded-[2rem]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Check className="w-4 h-4 text-amber-400" />
                                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-tighter">Fluxo de Escala River</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-white/80">1. Gere os 5 Takes</p>
                                                <p className="text-[9px] text-white/40">Use a mesma foto do cliente em todos na Sora 2.</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold text-white/80">2. Monte no CapCut</p>
                                                <p className="text-[9px] text-white/40">Importe os takes, remova audio da Sora e grave a narração sugerida.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
