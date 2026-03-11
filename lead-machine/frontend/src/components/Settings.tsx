import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, CloudLightning } from 'lucide-react';

export function Settings() {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const key = localStorage.getItem('google_places_api_key');
        if (key) setApiKey(key);
    }, []);

    const handleSave = () => {
        localStorage.setItem('google_places_api_key', apiKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl pb-20">
            <div className="glass-panel p-8 md:p-10 rounded-3xl border border-[#27272A] flex flex-col items-start shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                        <CloudLightning size={28} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-2xl tracking-tight text-[#FAFAFA]">Chave da Máquina (API V1)</h3>
                        <p className="text-[#A1A1AA] text-sm mt-1 font-medium">Motor de hiper-rastreio oficial pela Google Cloud.</p>
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <div className="p-6 rounded-2xl bg-[#18181B] border border-[#27272A] flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl group-hover:w-2 transition-all"></div>
                        <h4 className="font-bold text-base text-[#FAFAFA] tracking-wide uppercase mb-2 ml-4">Por que utilizar a Chave Oficial?</h4>
                        <p className="text-[#A1A1AA] text-sm leading-relaxed ml-4 font-medium">
                            O rastreio padrão utiliza um navegador fantasma na nuvem. Ele é bloqueável, demorado (arrasta a tela do painel do maps 5 em 5) e tem gargalos de RAM. Ao adicionar a sua chave particular aqui, <b>o algoritmo corta o navegador</b> e extrai cargas pesadas instantaneamente da torre original da Google.
                        </p>
                    </div>

                    <div className="w-full pt-4">
                        <label className="block text-xs uppercase tracking-widest font-extrabold mb-3 text-[#71717A]">Chave Exclusiva Google Places</label>
                        <div className="flex flex-col md:flex-row gap-4 w-full h-auto md:h-14">
                            <div className="relative flex-1 h-14">
                                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-[#52525B]" size={20} />
                                <input
                                    type="password"
                                    placeholder="AIzaSyA..."
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    className="w-full h-full bg-[#121214] border border-[#27272A] rounded-xl pl-14 pr-5 text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-primary/50 shadow-inner font-mono tracking-wider transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                className="h-14 bg-primary hover:bg-primary/90 text-white font-extrabold px-8 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] flex items-center justify-center gap-3 shrink-0"
                            >
                                {saved ? <><CheckCircle2 size={20} className="animate-bounce" /> Motor Injetado!</> : "Salvar Configuração"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
