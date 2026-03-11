import { useState } from 'react';
import { Target, MessageSquare, Sparkles, Settings as SettingsIcon, FileText, Activity, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Radar } from '../../components/LeadMachine/Radar';
import { Dispatcher } from '../../components/LeadMachine/Dispatcher';
import { History as LMHistory } from '../../components/LeadMachine/History';
import { Settings as LMSettings } from '../../components/LeadMachine/Settings';

export default function LeadMachine() {
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
        <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans">

            {/* Sidebar */}
            <aside className="w-[280px] shrink-0 border-r border-white/10 bg-[#050505] flex flex-col items-center py-8 z-20">
                <div className="flex items-center gap-4 mb-14 px-8 w-full">
                    <div className="w-12 h-12 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center text-cyan-400">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-xl leading-tight tracking-tight text-white">Sales Engine</h1>
                        <p className="text-[11px] uppercase tracking-widest text-white/40 font-bold mt-1">Lead Machine 2.0</p>
                    </div>
                </div>

                <nav className="w-full px-5 space-y-3 flex-grow flex flex-col">
                    <button
                        onClick={() => setActiveTab('radar')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'radar' ? 'bg-white/5 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><Target size={20} className={activeTab === 'radar' ? "text-cyan-400" : ""} /> <span className="text-sm">Radar Tático</span></div>
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatcher')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'dispatcher' ? 'bg-white/5 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><MessageSquare size={20} className={activeTab === 'dispatcher' ? "text-cyan-400" : ""} /> <span className="text-sm">Lançador</span></div>
                        {queue.length > 0 && <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-500 text-black px-2 py-0.5 rounded-full">{queue.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'history' ? 'bg-white/5 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><FileText size={20} className={activeTab === 'history' ? "text-cyan-400" : ""} /> <span className="text-sm">Histórico</span></div>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all font-semibold ${activeTab === 'settings' ? 'bg-white/5 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <SettingsIcon size={20} className={activeTab === 'settings' ? "text-cyan-400" : ""} />
                        <span className="text-sm">Configuração</span>
                    </button>

                    <div className="flex-grow" />
                    <div className="h-px bg-white/5 my-4" />

                    <Link
                        to="/admin"
                        className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all font-bold text-cyan-400/60 hover:text-cyan-400 hover:bg-white/5 mt-auto"
                    >
                        <Home size={20} />
                        <span className="text-sm uppercase tracking-widest text-[10px]">Dashboard</span>
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black relative">

                <header className="h-[90px] border-b border-white/10 flex items-center justify-between px-10 bg-[#050505] sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
                            {activeTab === 'radar' && 'Radar de Captação'}
                            {activeTab === 'dispatcher' && 'Disparador Humanizado'}
                            {activeTab === 'history' && 'Histórico de Operações'}
                            {activeTab === 'settings' && 'Módulo de API'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-extrabold px-4 py-2 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                            <Activity size={14} /> Sistema Online
                        </div>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto">
                    {activeTab === 'radar' && <Radar onQueue={addToQueue} queueCount={queue.length} />}
                    {activeTab === 'dispatcher' && <Dispatcher queue={queue} onRemove={removeQueue} />}
                    {activeTab === 'history' && <LMHistory />}
                    {activeTab === 'settings' && <LMSettings />}
                </div>
            </main>
        </div>
    );
}
