import { useState } from 'react';
import { Target, MessageSquare, FileText, Activity, Home, Zap, Command, Menu, X, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar } from '../../components/LeadMachine/Radar';
import { Dispatcher } from '../../components/LeadMachine/Dispatcher';
import { History as LMHistory } from '../../components/LeadMachine/History';

export default function LeadMachine() {
    const [activeTab, setActiveTab] = useState('radar');
    const [queue, setQueue] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const addToQueue = (lead: any) => {
        if (!queue.some(l => l.whatsapp === lead.whatsapp)) {
            setQueue(prev => [...prev, lead]);
        }
    };

    const removeQueue = (whatsapp: string) => {
        setQueue(prev => prev.filter(l => l.whatsapp !== whatsapp));
    }

    const menuItems = [
        { id: 'radar', label: 'Radar', icon: Target, desc: 'Buscar Leads' },
        { id: 'dispatcher', label: 'Disparador', icon: MessageSquare, desc: 'Envio em Massa', badge: queue.length },
        { id: 'history', label: 'Banco de Leads', icon: FileText, desc: 'Histórico Completo' },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden font-jakarta selection:bg-cyan-500/30">
            {/* Liquid Background Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/[0.03] blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/[0.03] blur-[150px] rounded-full" />
            </div>

            {/* Precision Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full md:w-[320px] shrink-0 border-r border-white/5 bg-[#050505] flex flex-col py-10 z-40 relative backdrop-blur-3xl overflow-y-auto custom-scrollbar shadow-2xl"
                    >
                        <div className="px-10 mb-16 flex items-center justify-between">
                            <div className="flex items-center gap-4 group">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                                    <img
                                        src="/logo.webp"
                                        alt="River Logo"
                                        className="relative w-12 h-12 object-contain rounded-xl border border-white/10 p-1 bg-black"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="font-black text-xl leading-none tracking-tighter uppercase italic">River</h1>
                                    <span className="text-[8px] uppercase tracking-[0.5em] text-cyan-400 font-bold mt-1">Sistema de Leads</span>
                                </div>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/20 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="w-full px-6 space-y-2 flex-grow">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${activeTab === item.id ? 'bg-white/[0.03] border border-white/10 ring-1 ring-white/5' : 'hover:bg-white/[0.01]'}`}
                                >
                                    {activeTab === item.id && (
                                        <motion.div layoutId="navActive" className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent z-0" />
                                    )}
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`p-2.5 rounded-xl border transition-all duration-500 ${activeTab === item.id ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 text-white/20 border-white/5 group-hover:text-white'}`}>
                                            <item.icon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-[11px] font-black uppercase tracking-widest leading-none ${activeTab === item.id ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>{item.label}</p>
                                            <p className="text-[8px] text-white/10 uppercase tracking-[0.2em] mt-1.5 font-bold group-hover:text-white/20 transition-colors">{item.desc}</p>
                                        </div>
                                    </div>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <div className="relative z-10 h-5 px-1.5 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-cyan-400">
                                            {item.badge}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </nav>

                        <div className="px-6 mt-10">
                            <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-cyan-400 animate-pulse" />
                                        <span className="text-[9px] uppercase tracking-widest font-black text-white/30">Status do Sistema</span>
                                    </div>
                                    <span className="text-[9px] font-black text-green-500">ATIVO</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5 }} className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto px-6 pt-10">
                            <Link
                                to="/admin"
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <Home size={18} className="text-white/20 group-hover:text-white transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-colors">Voltar ao Painel</span>
                                </div>
                                <ArrowUpRight size={14} className="text-white/10 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                            </Link>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Surface */}
            <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar bg-black">
                {/* Minimalist Top Nav */}
                <header className="h-[80px] border-b border-white/5 flex items-center justify-between px-8 lg:px-12 bg-black/60 backdrop-blur-3xl sticky top-0 z-50">
                    <div className="flex items-center gap-6">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-white/40 hover:text-white transition-all">
                                <Menu size={20} />
                            </button>
                        )}
                        <div className="flex items-center gap-4">
                            <Command size={16} className="text-cyan-500" />
                            <h2 className="text-lg font-black text-white tracking-widest uppercase italic leading-none">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={activeTab}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                    >
                                        {activeTab === 'radar' && 'Buscar Leads'}
                                        {activeTab === 'dispatcher' && 'Disparador'}
                                        {activeTab === 'history' && 'Banco de Leads'}
                                    </motion.span>
                                </AnimatePresence>
                            </h2>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                        <Zap size={14} className="text-cyan-400" />
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">River v5.0</span>
                    </div>
                </header>

                <div className="p-8 lg:p-14 max-w-[1600px] mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
