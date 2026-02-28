import { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Copy, Wand2, MonitorPlay, Camera, Palette, Zap, Check, Layout, ChevronLeft, Loader2, Upload, Trash2, Mic2 } from 'lucide-react';
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
            { title: 'Intro Impacto', prompt: 'Cinematic wide reveal of [PRODUCT] on a rotating glass pedestal, [LIGHTING], [COLORS] accents highlighted, 8k, slow dolly zoom.' },
            { title: 'Macro Detalhe', prompt: 'Extreme macro close-up of [PRODUCT] textures and materials, [COLORS] details, soft focus background, elegant bokeh, high-speed camera. --motion 2' },
            { title: 'Lifestyle / Uso', prompt: 'Cinematic lifestyle shot of [PRODUCT] in a high-end mansion setting, [LIGHTING], warm sunset light through windows.' },
            { title: 'Ação Dinâmica', prompt: 'Dynamic tracking shot of [PRODUCT] surrounded by silk fabric or gold particles flying in slow motion, [COLORS] reflections, extremely detailed.' },
            { title: 'Final / Logo', prompt: 'Stable centered shot of [PRODUCT], clean [COLOR_SCHEME] background, professional commercial lighting, fading to black.' }
        ]
    },
    {
        id: 'street',
        name: 'Estilo Urbano / Street',
        icon: <Camera className="w-4 h-4" />,
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        scenes: [
            { title: 'Intro Street', prompt: 'Low angle wide shot of [PRODUCT] on a rainy concrete street at night, [COLORS] neon reflections, cinematic teal and orange lighting.' },
            { title: 'Detalhe Rápido', prompt: 'Handheld style macro of [PRODUCT], gritty urban texture, lens flares from passing cars, [COLORS] highlights, high energy.' },
            { title: 'Ação Urbana', prompt: 'Person wearing [PRODUCT] walking fast through a hazy urban alley, cinematic motion blur, [LIGHTING], street lights flickering.' },
            { title: 'Take Criativo', prompt: 'Time-lapse of city lights reflecting on [PRODUCT] surface, [COLORS] transitions, fast camera movement, edgy aesthetic.' },
            { title: 'Final / Call', prompt: 'Close up of [PRODUCT] with a graffiti wall background, [COLORS] contrast, dramatic [LIGHTING], professional street photography style.' }
        ]
    }
];

const VO_SCRIPTS: Record<string, any[]> = {
    'sales': [
        { id: 'v1', name: 'Impacto', template: 'Cansado do básico? Conheça o novo [PRODUCT]. Qualidade premium que você sente no primeiro toque. Clique agora e garanta o seu!' },
        { id: 'v2', name: 'Oportunidade', template: 'Design exclusivo, tecnologia de ponta e o estilo que você merece - o [PRODUCT] chegou para mudar tudo. Garanta o seu hoje.' }
    ],
    'emotional': [
        { id: 'v1', name: 'Elegância', template: 'Cada detalhe do [PRODUCT] foi pensado para você. Mais que um produto, uma experiência. Sinta a diferença de um clássico moderno.' },
        { id: 'v2', name: 'Sonho', template: 'Imagine ter o [PRODUCT] em suas mãos. Feito para quem não abre mão da excelência em cada segundo.' }
    ]
};

export default function VideoLab() {
    const [productDesc, setProductDesc] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [selectedVoStyle, setSelectedVoStyle] = useState('sales');
    const [generatedStoryboard, setGeneratedStoryboard] = useState<any[]>([]);
    const [narration, setNarration] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Image Intelligence states
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [visualData, setVisualData] = useState({ colors: '', lighting: '', scheme: 'minimalist' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const navigate = useNavigate();

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setImagePreview(result);
            analyzeImage(result);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = (dataUrl: string) => {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Resize canvas to a small thumbnail for faster analysis
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

            let r = 0, g = 0, b = 0, brightness = 0;
            const data = ctx.getImageData(0, 0, 50, 50).data;

            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                brightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            }

            const count = data.length / 4;
            const avgR = Math.round(r / count);
            const avgG = Math.round(g / count);
            const avgB = Math.round(b / count);
            const avgBrightness = brightness / count;

            // Simple intelligence: detect lighting and colors
            let lighting = 'extreme luxury studio lighting';
            if (avgBrightness > 180) lighting = 'bright daylight, high-key lighting';
            else if (avgBrightness < 80) lighting = 'dramatic low-key lighting, heavy shadows';

            const colorNames = [];
            if (avgR > 150 && avgG < 100 && avgB < 100) colorNames.push('deep red');
            if (avgG > 150 && avgR < 100 && avgB < 100) colorNames.push('vibrant green');
            if (avgB > 150 && avgR < 100 && avgG < 100) colorNames.push('electric blue');
            if (avgR > 200 && avgG > 200 && avgB < 100) colorNames.push('golden yellow');
            if (avgR > 200 && avgG > 200 && avgB > 200) colorNames.push('clean white');
            if (avgR < 50 && avgG < 50 && avgB < 50) colorNames.push('matte black');

            setVisualData({
                colors: colorNames.length > 0 ? colorNames.join(' and ') : 'vibrant',
                lighting: lighting,
                scheme: avgBrightness > 128 ? 'bright white' : 'dark atmospheric'
            });

            toast.success('IA: Referência visual analisada!');
        };
        img.src = dataUrl;
    };

    const generateStoryboard = () => {
        if (!productDesc) {
            toast.error('O que estamos vendendo?');
            return;
        }

        setIsGenerating(true);

        setTimeout(() => {
            const scenes = selectedPreset.scenes.map(s => ({
                ...s,
                prompt: s.prompt
                    .replace(/\[PRODUCT\]/g, productDesc)
                    .replace(/\[COLORS\]/g, visualData.colors || 'product specific')
                    .replace(/\[LIGHTING\]/g, visualData.lighting || 'cinematic lighting')
                    .replace(/\[COLOR_SCHEME\]/g, visualData.scheme)
            }));

            const styles = VO_SCRIPTS[selectedVoStyle];
            const vo = styles[Math.floor(Math.random() * styles.length)].template.replace(/\[PRODUCT\]/g, productDesc);

            setGeneratedStoryboard(scenes);
            setNarration(vo);
            setIsGenerating(false);
            toast.success('Roteiro Maestro Gerado!');
        }, 1500);
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
                    <div className="lg:col-span-5 space-y-8 h-fit lg:sticky lg:top-[120px]">
                        {/* 1. Referência Visual (Vision AI) */}
                        <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl group hover:border-cyan-500/30 transition-all">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> 1. Referência Visual (IA Vision)
                            </h3>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${imagePreview ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs font-bold uppercase tracking-widest text-white">Trocar Foto</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setImagePreview(null); setVisualData({ colors: '', lighting: '', scheme: 'minimalist' }); }}
                                            className="absolute top-4 right-4 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-all text-white shadow-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                                            <Upload className="w-6 h-6 text-white/30" />
                                        </div>
                                        <p className="text-sm font-medium text-white/60">Arraste a foto do produto</p>
                                        <p className="text-[10px] uppercase text-white/20 mt-1 tracking-widest font-bold">A inteligência lerá as cores</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                            <canvas ref={canvasRef} className="hidden" />

                            {visualData.colors && (
                                <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]" />
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">IA detectou: <span className="text-white">{visualData.colors}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]" />
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Iluminação: <span className="text-white">{visualData.lighting}</span></span>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 2. Detalhes Studio */}
                        <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-6 flex items-center gap-2">
                                <Wand2 className="w-4 h-4" /> 2. Maestro Engine
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Produto / O que é?</label>
                                    <input
                                        type="text"
                                        value={productDesc}
                                        onChange={(e) => setProductDesc(e.target.value)}
                                        placeholder="Ex: Tênis Nike Air Jordan Azul..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Preset de Estúdio</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {PRESETS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setSelectedPreset(preset)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${selectedPreset.id === preset.id
                                                    ? 'bg-white/10 border-white/40 text-white shadow-xl'
                                                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${selectedPreset.id === preset.id ? preset.bg : 'bg-white/5'}`}>
                                                    {preset.icon}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Tom da Narração</label>
                                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => setSelectedVoStyle('sales')}
                                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${selectedVoStyle === 'sales' ? 'bg-cyan-500 text-black font-bold shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Zap className="w-3 h-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Excited / Sales</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedVoStyle('emotional')}
                                            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${selectedVoStyle === 'emotional' ? 'bg-cyan-500 text-black font-bold shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Mic2 className="w-3 h-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Calm / Store</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={generateStoryboard}
                                disabled={isGenerating}
                                className="w-full mt-10 bg-white text-black font-bold py-[1.25rem] rounded-[1.5rem] hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] relative overflow-hidden group/btn"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                {isGenerating ? (
                                    <Loader2 className="animate-spin w-5 h-5 text-black" />
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 fill-black" />
                                        <span className="uppercase tracking-[0.1em]">Configurar Produção</span>
                                    </>
                                )}
                            </button>
                        </section>

                        {/* Narration Box */}
                        {narration && (
                            <section className="bg-cyan-500/10 border border-cyan-500/20 rounded-[2.5rem] p-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
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
