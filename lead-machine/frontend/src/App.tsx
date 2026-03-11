import { useState } from 'react';
import { Target, MessageSquareCode, Activity, Sparkles, Settings as SettingsIcon, FileText } from 'lucide-react';
import { Radar } from './components/Radar';
import { Dispatcher } from './components/Dispatcher';
import { History } from './components/History';
import { Settings } from './components/Settings';

export default function App() {
    const [activeTab, setActiveTab] = useState('radar');
    const [queue, setQueue] = useState<any[]>([]);

    const addToQueue = (lead: any) => {
        if (!queue.some(l => l.whatsapp === lead.whatsapp)) {
            setQueue(prev => [...prev, lead]);
        }
    };

    const removeQueue = (whatsapp: string) => {
        setQueue(prev => prev.filter(l => l.whatsapp !== whatsapp));
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">

            {/* Sidebar - Solid Dark Theme */}
            <aside className="w-[280px] shrink-0 border-r border-[#27272A] bg-[#09090B] flex flex-col items-center py-8 z-20 shadow-2xl">
                <div className="flex items-center gap-4 mb-14 px-8 w-full">
                    <div className="w-12 h-12 bg-[#121214] border border-[#27272A] rounded-2xl flex items-center justify-center text-primary shadow-[0_4px_10px_-2px_rgba(0,0,0,0.5)]">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-xl leading-tight tracking-tight text-[#FAFAFA]">Sales Engine</h1>
                        <p className="text-[11px] uppercase tracking-widest text-[#71717A] font-bold mt-1">Lead Machine 2.0</p>
                    </div>
                </div>

                <nav className="w-full px-5 space-y-3 flex-grow">
                    <button
                        onClick={() => setActiveTab('radar')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'radar' ? 'bg-[#18181B] text-[#FAFAFA] border border-[#27272A] shadow-lg shadow-black/20' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#121214]'}`}
                    >
                        <div className="flex items-center gap-3.5"><Target size={20} className={activeTab === 'radar' ? "text-primary" : ""} /> <span className="text-sm">Radar Tático</span></div>
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatcher')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'dispatcher' ? 'bg-[#18181B] text-[#FAFAFA] border border-[#27272A] shadow-lg shadow-black/20' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#121214]'}`}
                    >
                        <div className="flex items-center gap-3.5"><MessageSquareCode size={20} className={activeTab === 'dispatcher' ? "text-primary" : ""} /> <span className="text-sm">Lançador</span></div>
                        {queue.length > 0 && <span className="text-[10px] uppercase font-bold tracking-wider bg-primary text-white px-2 py-0.5 rounded-full">{queue.length} Na Fila</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'history' ? 'bg-[#18181B] text-[#FAFAFA] border border-[#27272A] shadow-lg shadow-black/20' : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#121214]'}`}
                    >
                        <div className="flex items-center gap-3.5"><FileText size={20} className={activeTab === 'history' ? "text-primary" : ""} /> <span className="text-sm">Dossiê</span></div>
                    </button>
                </nav>

                <div className="w-full px-5 mt-auto border-t border-[#27272A] pt-6">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'settings' ? 'bg-[#18181B] text-[#FAFAFA] border border-[#27272A] shadow-lg shadow-black/20' : 'text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#121214]'}`}
                    >
                        <SettingsIcon size={20} className={activeTab === 'settings' ? "text-primary" : ""} />
                        <span className="text-sm">Configuração</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background relative selection:bg-primary/30">

                <header className="h-[90px] border-b border-[#27272A] flex items-center justify-between px-10 bg-[#09090B] relative z-10 sticky top-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-[#FAFAFA] tracking-tight">
                            {activeTab === 'radar' && 'Módulo de Captação e Inteligência de Leads'}
                            {activeTab === 'dispatcher' && 'Supervisão do Disparador Humanizado'}
                            {activeTab === 'history' && 'Históricos, Bancos e Backups'}
                            {activeTab === 'settings' && 'Módulo Oficial de API (Google Cloud)'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-extrabold px-4 py-2 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]">
                            <Activity size={14} /> Link Ativo
                        </div>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto relative z-10">
                    {activeTab === 'radar' && <Radar onQueue={addToQueue} queueCount={queue.length} />}
                    {activeTab === 'dispatcher' && <Dispatcher queue={queue} onRemove={removeQueue} />}
                    {activeTab === 'history' && <History />}
                    {activeTab === 'settings' && <Settings />}
                </div>
            </main>
        </div>
    );
}
