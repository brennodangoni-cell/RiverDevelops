import { useState } from 'react';
import { Target, FileText, ArrowLeft, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Radar } from '../../components/LeadMachine/Radar';
import { History } from '../../components/LeadMachine/History';
import { Dispatcher } from '../../components/LeadMachine/Dispatcher';

export default function LeadMachine() {
    const [activeTab, setActiveTab] = useState('radar');

    const [queue, setQueue] = useState<any[]>([]);

    const tabs = [
        { id: 'radar', label: 'Buscar Leads', icon: Target },
        { id: 'history', label: 'Banco de Leads', icon: FileText },
        { id: 'dispatcher', label: 'Disparador', icon: Share2 },
    ];

    const addToQueue = (lead: any) => {
        setQueue(prev => {
            if (prev.find(l => l.whatsapp === lead.whatsapp)) return prev;
            return [...prev, lead];
        });
        toast.success(`${lead.name} adicionado à fila`);
    };

    const removeFromQueue = (whatsapp: string) => {
        setQueue(prev => prev.filter(l => l.whatsapp !== whatsapp));
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] text-white font-sans selection:bg-cyan-500/30">

            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 pt-4 md:pt-6 px-4 md:px-10">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex items-center justify-between py-2.5 px-4 rounded-full">
                        <div className="absolute inset-0 bg-[#141414] border border-white/5 rounded-full -z-10" />

                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="flex items-center gap-3 group">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-all" />
                                    <img src="/logo.webp" alt="River" className="relative h-10 w-10 object-contain rounded-full group-hover:scale-105 transition-transform" />
                                </div>
                                <span className="text-lg font-bold text-white tracking-widest hidden sm:block uppercase">RIVER LEADS</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`h-10 rounded-full flex items-center justify-center px-4 gap-2 shrink-0 transition-all text-[10px] sm:text-xs font-bold tracking-widest uppercase ${activeTab === tab.id ? 'bg-cyan-500 text-black' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}

                            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />

                            <Link
                                to="/admin"
                                className="h-10 rounded-full bg-white/5 border border-white/10 text-white/50 flex items-center justify-center px-4 hover:bg-white/10 hover:text-white transition-all shrink-0 gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="font-bold text-[10px] tracking-widest uppercase hidden sm:inline">Voltar</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Conteúdo */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-10 pt-[100px] lg:pt-[110px] pb-20">
                {activeTab === 'radar' && <Radar onAddToQueue={addToQueue} />}
                {activeTab === 'history' && <History onAddToQueue={addToQueue} />}
                {activeTab === 'dispatcher' && <Dispatcher queue={queue} onRemove={removeFromQueue} />}
            </div>
        </div>
    );
}
