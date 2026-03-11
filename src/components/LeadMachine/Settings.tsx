import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, CloudLightning } from 'lucide-react';
import toast from 'react-hot-toast';

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
        toast.success("Configuração salva!");
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl pb-20">
            <div className="bg-[#0A0A0A] p-8 md:p-10 rounded-3xl border border-white/10 flex flex-col items-start shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                        <CloudLightning size={28} />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-2xl tracking-tight text-white">Configurações do Motor</h3>
                        <p className="text-white/40 text-sm mt-1 font-medium">Otimize a extração de dados.</p>
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col relative overflow-hidden group text-white/60">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl group-hover:w-2 transition-all"></div>
                        <h4 className="font-bold text-base text-white tracking-wide uppercase mb-2 ml-4">Google Places API (Opcional)</h4>
                        <p className="text-sm leading-relaxed ml-4 font-medium">
                            O rastreio padrão utiliza automação de navegador (Puppeteer). Para extrações massivas sem risco de bloqueio, você pode utilizar sua própria chave do Google Places API.
                        </p>
                    </div>

                    <div className="w-full pt-4">
                        <label className="block text-xs uppercase tracking-widest font-extrabold mb-3 text-white/40">Chave Google Places</label>
                        <div className="flex flex-col md:flex-row gap-4 w-full h-auto">
                            <div className="relative flex-1 h-14">
                                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                                <input
                                    type="password"
                                    placeholder="AIza..."
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    className="w-full h-full bg-[#111] border border-white/10 rounded-xl pl-14 pr-5 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono tracking-wider transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                className="h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-8 rounded-xl transition-all flex items-center justify-center gap-3 shrink-0"
                            >
                                {saved ? <><CheckCircle2 size={20} className="animate-bounce" /> Salvo!</> : "Salvar Configurações"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
