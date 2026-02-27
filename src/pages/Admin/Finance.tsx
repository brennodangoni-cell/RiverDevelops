import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownRight, Plus, LogOut, DollarSign, Filter, Trash2, Loader2, X, ChevronLeft, CalendarDays, Pencil } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Helper to format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper to format date nicely
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    let safeStr = dateStr;
    if (!safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
    if (!safeStr.endsWith('Z') && !safeStr.includes('+') && !safeStr.includes('-0')) safeStr += 'Z';
    const d = new Date(safeStr);
    d.setHours(d.getHours() - 3); // Adjust backwards by 3 hours
    return d.toLocaleDateString('pt-BR');
};

type Transaction = {
    id: number;
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
    date: string;
    created_by: number;
    created_by_username: string;
    client_name?: string;
    created_at: string;
};

type User = {
    id: number;
    username: string;
};

export default function Finance() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
    const navigate = useNavigate();

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<number | null>(null);
    const [newTx, setNewTx] = useState({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0], client_name: '' });

    // Auth Check
    const userStr = localStorage.getItem('rivertasks_user');
    const currentUser: User = userStr ? JSON.parse(userStr) : null;

    // Axios Authorization
    axios.interceptors.request.use(config => {
        const token = localStorage.getItem('rivertasks_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    const fetchData = async (silent = false) => {
        try {
            const txRes = await axios.get('/api/transactions');
            setTransactions(txRes.data);
        } catch (error) {
            if (!silent) toast.error('Erro ao buscar financeiro.');
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('rivertasks_token');
        localStorage.removeItem('rivertasks_user');
        navigate('/admin/login');
    };

    const handleCreateTx = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(String(newTx.amount).replace(',', '.'));
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Valor inválido!');
            return;
        }

        try {
            const payload = {
                type: newTx.type,
                amount: amountNum,
                description: newTx.description,
                date: newTx.date.includes('T') ? newTx.date : newTx.date + 'T12:00:00.000Z',
                client_name: newTx.type === 'IN' ? newTx.client_name : undefined
            };

            if (editingTxId) {
                await axios.put(`/api/transactions/${editingTxId}`, payload);
                toast.success('Lançamento atualizado!');
            } else {
                await axios.post('/api/transactions', payload);
                toast.success('Lançamento registrado!');
            }

            setIsModalOpen(false);
            setEditingTxId(null);
            setNewTx({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0], client_name: '' });
            fetchData();
        } catch (error) {
            toast.error(editingTxId ? 'Erro ao atualizar.' : 'Erro ao registrar.');
        }
    };

    const handleEditTx = (tx: Transaction) => {
        setEditingTxId(tx.id);
        const dateStr = tx.date.split('T')[0];
        setNewTx({
            type: tx.type,
            amount: String(tx.amount),
            description: tx.description,
            date: dateStr,
            client_name: tx.client_name || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Excluir este lançamento permanentemente?')) return;
        try {
            await axios.delete(`/api/transactions/${id}`);
            toast.success('Excluído');
            fetchData();
        } catch (error) {
            toast.error('Erro ao excluir.');
        }
    };

    // Derived States
    let filteredTxs = transactions;
    const now = new Date();

    if (filter === 'TODAY') {
        const todayStr = now.toISOString().split('T')[0];
        filteredTxs = transactions.filter(t => t.date.startsWith(todayStr));
    } else if (filter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filteredTxs = transactions.filter(t => new Date(t.date) >= weekAgo);
    } else if (filter === 'MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredTxs = transactions.filter(t => new Date(t.date) >= startOfMonth);
    } else if (filter === 'YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filteredTxs = transactions.filter(t => new Date(t.date) >= startOfYear);
    }

    const totalIn = filteredTxs.filter(t => t.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
    const totalOut = filteredTxs.filter(t => t.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIn - totalOut;

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 md:w-12 md:h-12 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative font-sans text-white bg-black">
            {/* Background identical to Dashboard */}
            <div className="fixed inset-0 pointer-events-none">
                <img src="/bgtasks.webp" alt="Background" className="w-full h-full object-cover opacity-70" />
            </div>
            <div className="fixed inset-0 bg-black/50 pointer-events-none" />

            {/* Premium Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 pt-4 md:pt-6 px-4 md:px-10 pointer-events-auto">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 md:py-2.5 px-4 rounded-[1.5rem] md:rounded-full shadow-2xl isolate">
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] md:rounded-full -z-10 overflow-hidden" />

                        <div className="flex items-center justify-between w-full md:w-auto">
                            <div className="flex items-center gap-4 group">
                                <Link to="/admin" className="relative shrink-0 hover:scale-105 transition-transform duration-300">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                        <ChevronLeft className="w-5 h-5 text-white/70" />
                                    </div>
                                </Link>
                                <div className="flex flex-col">
                                    <span className="text-lg font-display font-bold text-white tracking-widest uppercase mb-[-2px]">Caixa river</span>
                                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Painel Financeiro</span>
                                </div>
                            </div>

                            {/* Mobile CTA */}
                            <div className="flex items-center gap-3 md:hidden">
                                <button
                                    onClick={() => {
                                        setEditingTxId(null);
                                        setNewTx({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0], client_name: '' });
                                        setIsModalOpen(true);
                                    }}
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-all duration-300 relative group/btn shrink-0"
                                    title="Nova Movimentação"
                                >
                                    <Plus className="w-5 h-5 opacity-80 group-hover/btn:rotate-90 transition-transform duration-300" />
                                </button>
                                <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 hover:bg-red-500/20 hover:border-red-500 transition-all">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Center (Filters) */}
                        <div className="flex items-center justify-center w-fit max-w-full mx-auto overflow-x-auto custom-scrollbar md:absolute md:left-1/2 md:-translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 p-1 gap-1">
                            {['TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'].map((f) => {
                                const labels: any = { 'TODAY': 'Hoje', 'WEEK': '7 Dias', 'MONTH': 'Mês', 'YEAR': 'Ano', 'ALL': 'Tudo' };
                                const isActive = filter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all whitespace-nowrap ${isActive ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">{labels[f]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setEditingTxId(null);
                                    setNewTx({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0], client_name: '' });
                                    setIsModalOpen(true);
                                }}
                                className="bg-white/5 border border-white/20 text-white pl-4 pr-5 py-2.5 rounded-full font-medium text-xs hover:bg-white/10 hover:border-white/40 hover:text-cyan-50 transition-all duration-300 flex items-center gap-2 group/btn shrink-0"
                                title="Nova Movimentação"
                            >
                                <Plus className="w-4 h-4 opacity-70 group-hover/btn:rotate-90 transition-transform duration-300" />
                                <span>Nova Movimentação</span>
                            </button>

                            <img src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`} alt="User"
                                className="w-10 h-10 rounded-full border border-white/20 object-cover"
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Dashboard Content */}
            <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-10 pt-[160px] lg:pt-[180px] min-h-[100dvh] relative z-10 pb-12">

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Saldo Total */}
                    <div className="relative flex flex-col p-8 group isolate h-full">
                        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-2xl ring-1 ring-inset ring-emerald-500/30 rounded-[2rem] -z-20 pointer-events-none overflow-hidden" />
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full -z-10 group-hover:bg-emerald-400/30 transition-all duration-700 pointer-events-none translate-x-1/3 -translate-y-1/3" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20 ring-1 ring-emerald-500/40">
                                <DollarSign className="w-5 h-5 text-emerald-300" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-emerald-300">Saldo Atual</span>
                        </div>
                        <div className="mt-auto">
                            <span className={`text-4xl md:text-5xl font-display font-medium tracking-tight ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(balance)}
                            </span>
                        </div>
                    </div>

                    {/* Entradas */}
                    <div className="relative flex flex-col p-8 isolate group h-full">
                        <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-xl ring-1 ring-inset ring-cyan-500/30 rounded-[2rem] shadow-xl -z-20 pointer-events-none overflow-hidden" />
                        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full -z-10 group-hover:bg-cyan-400/30 transition-all duration-700 pointer-events-none translate-x-1/3 -translate-y-1/3" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-cyan-500/20 ring-1 ring-cyan-500/40">
                                <ArrowDownRight className="w-5 h-5 text-cyan-300" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-cyan-300">Entradas</span>
                        </div>
                        <div className="mt-auto">
                            <span className="text-3xl md:text-4xl font-display font-medium tracking-tight text-cyan-400">
                                {formatCurrency(totalIn)}
                            </span>
                        </div>
                    </div>

                    {/* Saídas */}
                    <div className="relative flex flex-col p-8 isolate group h-full">
                        <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-xl ring-1 ring-inset ring-rose-500/30 rounded-[2rem] shadow-xl -z-20 pointer-events-none overflow-hidden" />
                        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 blur-[80px] rounded-full -z-10 group-hover:bg-rose-400/30 transition-all duration-700 pointer-events-none translate-x-1/3 -translate-y-1/3" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/20 ring-1 ring-rose-500/40">
                                <ArrowUpRight className="w-5 h-5 text-rose-300" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-rose-300">Saídas</span>
                        </div>
                        <div className="mt-auto">
                            <span className="text-3xl md:text-4xl font-display font-medium tracking-tight text-rose-400">
                                {formatCurrency(totalOut)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Transitions List */}
                <div className="relative flex flex-col rounded-[2.5rem] p-4 sm:p-8 shadow-2xl isolate">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[50px] ring-1 ring-inset ring-white/10 rounded-[2.5rem] -z-10 overflow-hidden pointer-events-none" />

                    <div className="flex items-center gap-4 mb-8 pl-4">
                        <CalendarDays className="w-5 h-5 text-white/40" />
                        <h2 className="text-xl font-display font-medium text-white tracking-wide">Histórico de Transações</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                        {filteredTxs.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center opacity-60">
                                <Filter className="w-10 h-10 text-white/20 mb-4" />
                                <span className="text-sm tracking-widest uppercase font-bold text-white/40">Nenhum lançamento no período</span>
                            </div>
                        ) : (
                            filteredTxs.map(tx => (
                                <div key={tx.id} className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors ring-1 ring-white/5 rounded-[1.5rem] p-5 w-full group">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'IN' ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 ring-1 ring-rose-500/20 text-rose-400'}`}>
                                        {tx.type === 'IN' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            {tx.client_name && (
                                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shrink-0">
                                                    {tx.client_name}
                                                </span>
                                            )}
                                            <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide whitespace-pre-wrap leading-snug">{tx.description}</h3>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                                            <span>{formatDate(tx.date)}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                            <span>Por: {tx.created_by_username}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0 sm:ml-auto w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0">
                                        <span className={`text-xl font-display font-medium ${tx.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </span>

                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:-translate-x-2 sm:group-hover:translate-x-0 transition-all">
                                            <button
                                                onClick={() => handleEditTx(tx)}
                                                className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400/70 hover:text-cyan-400 hover:bg-cyan-500/20 transition-all"
                                                title="Editar Lançamento"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/20 transition-all"
                                                title="Excluir Lançamento"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Create Transation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-[#080808]/90 backdrop-blur-2xl ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition-all flex flex-col mx-auto my-auto font-sans overflow-hidden">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 z-20 text-white/30 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-3 rounded-full border border-transparent hover:border-white/10 shrink-0">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex-1 w-full p-[clamp(1.25rem,4vh,2.5rem)]">
                            <form onSubmit={handleCreateTx} className="flex flex-col gap-[clamp(0.75rem,2.5vh,1.5rem)] h-full">
                                <h2 className="text-[clamp(1.25rem,4vh,1.5rem)] font-display font-medium text-white tracking-wide shrink-0">
                                    {editingTxId ? 'Editar Lançamento' : 'Novo Lançamento'}
                                </h2>

                                {/* Type Toggle */}
                                <div className="flex bg-white/5 p-[clamp(0.125rem,0.5vh,0.25rem)] rounded-full ring-1 ring-white/10 shrink-0">
                                    <button type="button" onClick={() => setNewTx({ ...newTx, type: 'IN', client_name: '' })} className={`flex-1 py-[clamp(0.5rem,1.5vh,0.75rem)] rounded-full text-[clamp(10px,1.5vh,12px)] font-bold uppercase tracking-widest transition-all ${newTx.type === 'IN' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                        Entrada Caixa
                                    </button>
                                    <button type="button" onClick={() => setNewTx({ ...newTx, type: 'OUT', client_name: '' })} className={`flex-1 py-[clamp(0.5rem,1.5vh,0.75rem)] rounded-full text-[clamp(10px,1.5vh,12px)] font-bold uppercase tracking-widest transition-all ${newTx.type === 'OUT' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                        Saída
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1">Valor (R$)</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 font-display text-lg">R$</span>
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={newTx.amount}
                                            onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-14 pr-6 py-[clamp(0.75rem,2vh,1.25rem)] text-white font-display text-[clamp(1rem,2.5vh,1.125rem)] outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05] transition-all font-medium placeholder:text-white/20 focus:placeholder-transparent placeholder:font-light caret-cyan-400 hide-number-spin"
                                            style={{ WebkitTapHighlightColor: 'transparent' }}
                                            placeholder="0,00"
                                            required autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1 block">Data de Ocorrência</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                                            <CalendarDays className="w-5 h-5 text-white/40" />
                                        </div>
                                        <input
                                            type="date"
                                            value={newTx.date}
                                            onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] pl-6 pr-14 py-[clamp(0.75rem,2vh,1rem)] text-white text-[clamp(12px,1.5vh,14px)] outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05] transition-all hide-date-icon [color-scheme:dark] caret-cyan-400"
                                            style={{ WebkitTapHighlightColor: 'transparent' }}
                                            required
                                        />
                                    </div>
                                </div>

                                {newTx.type === 'IN' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1 block">Nome do Cliente (Opcional)</label>
                                        <input
                                            type="text"
                                            value={newTx.client_name}
                                            onChange={(e) => setNewTx({ ...newTx, client_name: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2vh,1rem)] text-white text-[clamp(12px,1.5vh,14px)] outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05] transition-all font-medium placeholder:text-white/20 focus:placeholder-transparent placeholder:font-light caret-cyan-400"
                                            style={{ WebkitTapHighlightColor: 'transparent' }}
                                            placeholder="Ex: Vitor, Lucas..."
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest ml-1 mb-1 block">Descrição Detalhada</label>
                                    <textarea
                                        value={newTx.description}
                                        onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2vh,1rem)] text-white text-[clamp(12px,1.5vh,14px)] outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05] transition-all font-light placeholder:text-white/20 focus:placeholder-transparent resize-none overflow-hidden caret-cyan-400 leading-relaxed block max-h-[120px] custom-scrollbar"
                                        style={{ WebkitTapHighlightColor: 'transparent', minHeight: '60px' }}
                                        placeholder={newTx.type === 'IN' ? 'Ex: Desenvolvimento do site X...' : 'Ex: Compra de equipamento Y, pago pelo Caixa...'}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={`w-full ${newTx.type === 'IN' ? 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:ring-emerald-500/50' : 'bg-rose-500/10 ring-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:ring-rose-500/50'} ring-1 ring-inset uppercase tracking-widest text-[clamp(10px,2vh,12px)] font-bold py-[clamp(0.8rem,2.5vh,1.25rem)] rounded-full transition-all group/submit mt-auto shrink-0`}
                                >
                                    {editingTxId ? 'Salvar Alterações' : 'Registrar Lançamento'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
