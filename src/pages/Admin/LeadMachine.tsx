import { useState } from 'react';
import { Target, MessageSquare, FileText, Activity, Home, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="min-h-screen bg-black text-white flex overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Sidebar */}
            <aside className="w-[300px] shrink-0 border-r border-white/5 bg-[#050505] flex flex-col py-12 z-30 relative backdrop-blur-3xl">
                <div className="px-10 mb-16 group">
                    <div className="flex items-center gap-5 relative">
                        <div className="relative">
                            <div className="absolute -inset-3 bg-cyan-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                            <img
                                src="/logo.webp"
                                alt="River Logo"
                                className="relative w-16 h-16 object-contain rounded-[1.5rem] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 bg-black border border-white/10"
                            />
                        </div>
                        <div>
                            <h1 className="font-black text-3xl leading-none tracking-tighter text-white uppercase italic">River</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-black">Lead Machine</p>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="w-full px-6 space-y-4 flex-grow flex flex-col">
                    {[
                        { id: 'radar', label: 'Radar Tático', icon: Target },
                        { id: 'dispatcher', label: 'Lançador', icon: MessageSquare, badge: queue.length },
                        { id: 'history', label: 'Lead Bank', icon: FileText },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveTab(btn.id)}
                            className={`w-full flex items-center justify-between px-6 py-5 rounded-[1.5rem] transition-all duration-300 relative group ${activeTab === btn.id ? 'bg-white/[0.03] text-cyan-400 border border-white/10 shadow-2xl' : 'text-white/20 hover:text-white hover:bg-white/[0.01]'}`}
                        >
                            {activeTab === btn.id && (
                                <motion.div layoutId="activeNav" className="absolute inset-0 bg-cyan-500/5 rounded-[1.5rem] z-0" />
                            )}
                            <div className="flex items-center gap-4 relative z-10">
                                <btn.icon size={20} className={`transition-colors duration-300 ${activeTab === btn.id ? 'text-cyan-400' : 'group-hover:text-white'}`} strokeWidth={activeTab === btn.id ? 2.5 : 2} />
                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${activeTab === btn.id ? 'text-white' : ''}`}>{btn.label}</span>
                            </div>
                            {btn.badge !== undefined && btn.badge > 0 && (
                                <div className="relative z-10 flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-cyan-500 px-1.5 text-[9px] font-black text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                    {btn.badge}
                                </div>
                            )}
                        </button>
                    ))}

                    <div className="flex-grow" />

                    <div className="pt-8 border-t border-white/5 space-y-8">
                        <div className="px-6 py-8 rounded-3xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><Zap size={16} /></div>
                                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40">Sessão Ativa</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div animate={{ width: '100%' }} transition={{ duration: 2 }} className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                            </div>
                            <p className="text-[8px] text-white/10 mt-3 uppercase tracking-widest font-bold">Latency: 24ms • v4.0.2</p>
                        </div>

                        <Link
                            to="/admin"
                            className="w-full flex items-center gap-4 px-6 py-6 rounded-[1.5rem] transition-all duration-300 font-black text-white/20 hover:text-white hover:bg-white/[0.02] group"
                        >
                            <Home size={20} className="group-hover:translate-x-[-2px] transition-transform" />
                            <span className="text-[10px] uppercase tracking-[0.3em]">Hub Central</span>
                        </Link>
                    </div>
                </nav>
            </aside>

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#020202] relative custom-scrollbar z-10">
                {/* Floating Glass Header */}
                <header className="h-[100px] border-b border-white/5 flex items-center justify-between px-12 lg:px-20 bg-[#050505]/60 backdrop-blur-3xl sticky top-0 z-40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                        <div className="w-2 h-10 bg-cyan-500/20 rounded-full" />
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {activeTab === 'radar' && 'Deep Radar Matrix'}
                                        {activeTab === 'dispatcher' && 'Tactical Dispatcher'}
                                        {activeTab === 'history' && 'Neural Lead Bank'}
                                    </motion.span>
                                </AnimatePresence>
                            </h2>
                            <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black mt-2">River Operational System</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] font-black px-6 py-3.5 rounded-2xl bg-white/[0.03] text-cyan-400 border border-white/5 shadow-xl">
                            <Activity size={14} className="animate-pulse" /> AI Grounding Status: Locked
                        </div>
                    </div>
                </header>

                <div className="p-12 lg:p-20 max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            {activeTab === 'radar' && <Radar onQueue={addToQueue} queue={queue} onRemove={removeQueue} />}
                            {activeTab === 'dispatcher' && <Dispatcher queue={queue} onRemove={removeQueue} />}
                            {activeTab === 'history' && <LMHistory onQueue={addToQueue} queue={queue} onRemove={removeQueue} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
