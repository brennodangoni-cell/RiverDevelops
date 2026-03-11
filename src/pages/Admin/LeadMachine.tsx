import { useState } from 'react';
import { Target, MessageSquare, FileText, Activity, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Radar } from '../../components/LeadMachine/Radar';
import { Dispatcher } from '../../components/LeadMachine/Dispatcher';
import { History as LMHistory } from '../../components/LeadMachine/History';

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
                <div className="flex items-center gap-4 mb-14 px-8 w-full group">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        <img
                            src="/logo.webp"
                            alt="River Logo"
                            className="relative w-14 h-14 object-contain rounded-2xl group-hover:scale-105 transition-transform"
                        />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl leading-tight tracking-tighter text-white uppercase italic">River</h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-400 font-black mt-0.5">Sales Engine</p>
                    </div>
                </div>

                <nav className="w-full px-5 space-y-3 flex-grow flex flex-col">
                    <button
                        onClick={() => setActiveTab('radar')}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold uppercase tracking-widest text-[10px] ${activeTab === 'radar' ? 'bg-white/5 text-cyan-400 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><Target size={18} className={activeTab === 'radar' ? "text-cyan-400" : ""} /> Radar Tático</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatcher')}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold uppercase tracking-widest text-[10px] ${activeTab === 'dispatcher' ? 'bg-white/5 text-cyan-400 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><MessageSquare size={18} className={activeTab === 'dispatcher' ? "text-cyan-400" : ""} /> Lançador</div>
                        {queue.length > 0 && <span className="text-[9px] font-black bg-cyan-500 text-black px-2 py-0.5 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)]">{queue.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold uppercase tracking-widest text-[10px] ${activeTab === 'history' ? 'bg-white/5 text-cyan-400 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3.5"><FileText size={18} className={activeTab === 'history' ? "text-cyan-400" : ""} /> Lead Bank</div>
                    </button>

                    <div className="flex-grow" />
                    <div className="h-px bg-white/5 my-4" />

                    <Link
                        to="/admin"
                        className="w-full flex items-center gap-3.5 px-5 py-5 rounded-2xl transition-all font-black text-white/20 hover:text-cyan-400 hover:bg-white/5 mt-auto border border-transparent hover:border-white/5"
                    >
                        <Home size={18} />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Voltar ao Hub</span>
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-black relative custom-scrollbar">

                <header className="h-[90px] border-b border-white/10 flex items-center justify-between px-10 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">
                            {activeTab === 'radar' && 'Deep Radar'}
                            {activeTab === 'dispatcher' && 'Disparo Humanizado'}
                            {activeTab === 'history' && 'Database Central'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black px-5 py-2.5 rounded-2xl bg-cyan-500/5 text-cyan-400 border border-cyan-500/10">
                            <Activity size={12} className="animate-pulse" /> Core Status: Optimal
                        </div>
                    </div>
                </header>

                <div className="p-10 max-w-7xl mx-auto">
                    {activeTab === 'radar' && <Radar onQueue={addToQueue} queue={queue} onRemove={removeQueue} />}
                    {activeTab === 'dispatcher' && <Dispatcher queue={queue} onRemove={removeQueue} />}
                    {activeTab === 'history' && <LMHistory onQueue={addToQueue} queue={queue} onRemove={removeQueue} />}
                </div>
            </main>
        </div>
    );
}
