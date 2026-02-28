import { useState } from 'react';
import { Sparkles, Image as ImageIcon, Copy, Wand2, MonitorPlay, Camera, Palette, Zap, Check, Layout, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PRESETS = [
    {
        id: 'apple',
        name: 'Estilo Apple (Clean)',
        icon: <Zap className="w-4 h-4" />,
        promptBase: 'Cinematic slow-motion close-up of [PRODUCT], pristine white studio background, soft professional lighting, sharp focus, 8k resolution, Minimalist aesthetic, Apple-style product photography.',
        camera: 'Slow macro pan across the textures'
    },
    {
        id: 'urban',
        name: 'Urbano / Street',
        icon: <Camera className="w-4 h-4" />,
        promptBase: 'Dramatic low-angle shot of [PRODUCT] on a busy wet city street at night, neon reflections, cinematic teal and orange lighting, rain droplets, hyper-realistic, bokeh background.',
        camera: 'Fast tracking shot at ground level'
    },
    {
        id: 'luxury',
        name: 'Luxo / Ouro',
        icon: <Palette className="w-4 h-4" />,
        promptBase: 'Elegant cinematic shot of [PRODUCT] surrounded by floating gold dust and silk fabric, warm golden hour lighting, luxury atmosphere, high-end commercial style, smooth transitions.',
        camera: 'Breathtaking 360-degree orbit'
    },
    {
        id: 'nature',
        name: 'Natureza / Outdoor',
        icon: <Layout className="w-4 h-4" />,
        promptBase: 'Action shot of [PRODUCT] in a lush tropical forest, sunlight filtering through leaves (Ray Tracing), morning mist, vibrant colors, epic commercial cinematography.',
        camera: 'Drone-style overhead reveal'
    }
];

export default function VideoLab() {
    const [productDesc, setProductDesc] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();

    const generatePrompts = () => {
        if (!productDesc) {
            toast.error('Descreva o produto primeiro!');
            return;
        }

        setIsGenerating(true);

        // Simulating an AI generation logic of technical variations
        setTimeout(() => {
            const variations = [
                selectedPreset.promptBase.replace('[PRODUCT]', productDesc),
                `${selectedPreset.promptBase.replace('[PRODUCT]', productDesc)} with extreme close-up on details, macro lens.`,
                `${selectedPreset.promptBase.replace('[PRODUCT]', productDesc)} featuring a dramatic lens flare and high contrast.`,
                `A professional product reveal of ${productDesc}, ${selectedPreset.camera}, studio lighting, masterwork.`,
                `High-speed phantom camera footage of ${productDesc} in a liquid splash environment, hyper-detailed.`
            ];
            setGeneratedPrompts(variations);
            setIsGenerating(false);
            toast.success('Lote de Prompts Gerado!');
        }, 800);
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
                                onClick={generatePrompts}
                                disabled={isGenerating}
                                className="w-full mt-8 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                            >
                                {isGenerating ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 fill-current" />
                                        <span>Gerar Lote de Produção</span>
                                    </>
                                )}
                            </button>
                        </section>
                    </div>

                    {/* Output Side */}
                    <div className="lg:col-span-7">
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl min-h-[600px] flex flex-col">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-8 flex items-center gap-2">
                                <MonitorPlay className="w-4 h-4" /> 3. Prompts para Sora 2
                            </h3>

                            {generatedPrompts.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center px-10">
                                    <Sparkles className="w-16 h-16 mb-6" />
                                    <p className="text-lg font-medium">Os prompts mágicos aparecerão aqui.</p>
                                    <p className="text-xs mt-2 uppercase tracking-widest">Insira os dados à esquerda para começar</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {generatedPrompts.map((prompt, idx) => (
                                        <div key={idx} className="group relative bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-tighter">Take 0{idx + 1}</span>
                                                <button
                                                    onClick={() => copyToClipboard(prompt)}
                                                    className="p-2 bg-white/5 rounded-lg hover:bg-cyan-500 hover:text-black transition-all text-white/40"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-white/80 font-light leading-relaxed italic">
                                                "{prompt}"
                                            </p>
                                        </div>
                                    ))}

                                    <div className="mt-8 p-6 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Check className="w-4 h-4 text-cyan-400" />
                                            <span className="text-xs font-bold uppercase text-cyan-400">Dica de Especialista</span>
                                        </div>
                                        <p className="text-xs text-cyan-100/60 leading-relaxed">
                                            Para melhores resultados na Sora 2, use a imagem original do cliente como **"Image Reference"** e cole o Take 01 acima.
                                            Se o movimento de câmera for muito rápido, adicione "--motion 3" no final do prompt.
                                        </p>
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
