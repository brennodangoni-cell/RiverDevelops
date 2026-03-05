import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Check, Clock, LogOut, Trash2, Loader2, X, CircleDashed, CheckCircle2, Edit2, DollarSign, Sparkles, Users } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Helper to check if task was updated before today
const isOlderThanToday = (dateStr?: string) => {
    if (!dateStr) return false;
    let safeStr = dateStr;
    // Fix DB UTC issues
    if (!safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
    if (!safeStr.endsWith('Z') && !safeStr.includes('+') && !safeStr.includes('-0')) safeStr += 'Z';
    const d = new Date(safeStr);
    d.setHours(d.getHours() - 3); // Adjust backwards by 3 hours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
};

// Helper to format date nicely
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    let safeStr = dateStr;
    // Fix DB UTC issues
    if (!safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
    if (!safeStr.endsWith('Z') && !safeStr.includes('+') && !safeStr.includes('-0')) safeStr += 'Z';
    const d = new Date(safeStr);
    d.setHours(d.getHours() - 3); // Adjust backwards by 3 hours

    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

type Task = {
    id: number;
    title: string;
    description: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    assigned_to: number;
    assigned_to_username: string;
    created_by: number;
    created_by_username: string;
    created_at: string;
    updated_at?: string;
};

type User = {
    id: number;
    username: string;
};

type Demand = {
    id: number;
    client_name: string;
    total_videos: number;
    duration_seconds: string | null;
    has_material: number; // sqlite gets 0 or 1
    material_link: string | null;
    description: string | null;
    assigned_videos: number;
    status: 'pending' | 'partial' | 'completed';
    created_by: number;
    created_by_username: string;
    created_at: string;
};

export default function Dashboard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [demands, setDemands] = useState<Demand[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tasks' | 'demands'>('tasks');
    const navigate = useNavigate();

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

    // Edit states
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskData, setEditingTaskData] = useState({ title: '', description: '' });

    const [newTask, setNewTask] = useState({ title: '', description: '', urgency: 'MEDIUM', status: 'TODO', assigned_to: '' });

    const [newDemand, setNewDemand] = useState({ client_name: '', total_videos: '', duration_seconds: '', has_material: false, material_link: '', description: '' });
    const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);

    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
    const [allocateData, setAllocateData] = useState({ demand_id: 0, assigned_to: '', videos_count: '', urgency: 'MEDIUM', notes: '' });

    const currentUser = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');

    // User Switcher State
    const [viewingUserId, setViewingUserId] = useState<number>(() => {
        const user = JSON.parse(localStorage.getItem('rivertasks_user') || '{}');
        return user.id || 0;
    });

    // Setup axios interceptor
    axios.interceptors.request.use(config => {
        const token = localStorage.getItem('rivertasks_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    const fetchData = async (silent = false) => {
        try {
            const [tasksRes, usersRes, txRes, demandsRes] = await Promise.all([
                axios.get('/api/tasks'),
                axios.get('/api/users'),
                axios.get('/api/transactions'),
                axios.get('/api/demands')
            ]);
            setTasks(tasksRes.data);
            setUsers(usersRes.data);
            setTransactions(txRes.data);
            setDemands(demandsRes.data);
        } catch (error) {
            if (!silent) toast.error('Erro ao buscar dados.');
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

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/tasks', { ...newTask, assigned_to: Number(newTask.assigned_to) || currentUser.id });
            toast.success('Tarefa criada!');
            setIsModalOpen(false);
            setNewTask({ title: '', description: '', urgency: 'MEDIUM', status: 'TODO', assigned_to: '' });
            fetchData();
        } catch (error) {
            toast.error('Erro ao criar tarefa.');
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await axios.put(`/api/tasks/${id}`, { status });
            fetchData();
        } catch (error) {
            toast.error('Erro ao atualizar tarefa.');
        }
    };

    const handleCreateDemand = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/demands', {
                ...newDemand,
                total_videos: Number(newDemand.total_videos) || 0,
                duration_seconds: newDemand.duration_seconds
            });
            toast.success('Demanda criada!');
            setIsDemandModalOpen(false);
            setNewDemand({ client_name: '', total_videos: '', duration_seconds: '', has_material: false, material_link: '', description: '' });
            fetchData();
        } catch (error) {
            toast.error('Erro ao criar demanda.');
        }
    };

    const handleDeleteDemand = async (id: number) => {
        if (!confirm('Excluir esta demanda?')) return;
        try {
            await axios.delete(`/api/demands/${id}`);
            toast.success('Demanda excluída.');
            fetchData();
        } catch (error) {
            toast.error('Erro ao excluir demanda.');
        }
    };

    const handleAllocateDemand = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`/api/demands/${allocateData.demand_id}/allocate`, {
                ...allocateData,
                assigned_to: Number(allocateData.assigned_to) || currentUser.id
            });
            toast.success('Tarefa gerada a partir da demanda!');
            setIsAllocateModalOpen(false);
            setAllocateData({ demand_id: 0, assigned_to: '', videos_count: '', urgency: 'MEDIUM', notes: '' });
            fetchData();
        } catch (error) {
            toast.error('Erro ao alocar demanda.');
        }
    };

    const handleDelete = async () => {
        if (!taskToDelete) return;
        try {
            await axios.delete(`/api/tasks/${taskToDelete}`);
            toast.success('Tarefa excluída');
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
            fetchData();
        } catch (error) {
            toast.error('Erro ao excluir tarefa.');
        }
    };

    const handleUpdateText = async (id: number) => {
        try {
            await axios.put(`/api/tasks/${id}`, { title: editingTaskData.title, description: editingTaskData.description });
            toast.success('Tarefa atualizada!');
            setEditingTaskId(null);
            fetchData();
        } catch (error) {
            toast.error('Erro ao atualizar tarefa.');
        }
    };

    const getUrgencyIndicator = (urgency: string) => {
        switch (urgency) {
            case 'HIGH': return <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /><span className="text-[10px] text-red-500 font-bold uppercase tracking-widest leading-none">Urgente</span></div>;
            case 'MEDIUM': return <div className="bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-none">Média</span></div>;
            default: return <div className="bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none">Baixa</span></div>;
        }
    };

    const sections = [
        { title: 'Por Fazer', status: 'TODO', icon: CircleDashed, color: 'text-white/60', bg: 'bg-white/5' },
        { title: 'Em Andamento', status: 'IN_PROGRESS', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        { title: 'Concluído', status: 'DONE', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
    ];

    // Derived balance
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, curr) => acc + curr.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIn - totalOut;
    const formattedBalance = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;
    }

    return (
        <div className="min-h-screen relative font-sans text-white bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] overflow-x-hidden selection:bg-cyan-500/30">

            {/* Premium Header - Exactly Like Main Site */}
            <nav className="fixed top-0 left-0 right-0 z-50 pt-4 md:pt-6 px-4 md:px-10 pointer-events-auto">
                <div className="max-w-[1500px] mx-auto">
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 md:py-2.5 px-4 rounded-[1.5rem] md:rounded-full isolate">
                        {/* Solid Background Layer */}
                        <div className="absolute inset-0 bg-[#141414] border border-white/5 rounded-[1.5rem] md:rounded-full -z-10 overflow-hidden" />

                        {/* Top Row on Mobile / Left Section on Desktop */}
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <div className="flex items-center gap-4 group">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100  " />
                                    <img
                                        src="/logo.webp"
                                        alt="River Logo"
                                        className="relative h-10 w-10 object-contain rounded-full group-hover:scale-105  "
                                    />
                                </div>
                                <span className="text-lg font-display font-bold text-white tracking-widest hidden sm:block group-hover:text-cyan-100   uppercase pb-0.5">RIVER TASKS</span>
                            </div>

                            {/* Mobile CTA + User Area (Hidden on Desktop) */}
                            <div className="flex items-center gap-3 md:hidden">
                                <Link
                                    to="/admin/financeiro"
                                    className="h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center px-4 hover:bg-emerald-500/20 hover:border-emerald-500   shrink-0 gap-2"
                                    title="Caixa da Empresa"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-bold text-xs tracking-wider">{formattedBalance}</span>
                                </Link>
                                <Link
                                    to="/admin/laboratorio"
                                    className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500   shrink-0"
                                    title="Laboratório IA"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </Link>
                                <Link
                                    to="/admin/clientes"
                                    className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500   shrink-0"
                                    title="Gestão de Clientes"
                                >
                                    <Users className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500   shrink-0"
                                    title="Histórico de Tarefas"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/20 text-white flex items-center justify-center hover:bg-white/10   relative group/btn shrink-0"
                                    title="Nova Tarefa"
                                >
                                    <Plus className="w-5 h-5 opacity-80 group-hover/btn:rotate-90  " />
                                </button>

                                <div className="h-6 w-px bg-white/10 mx-1" />

                                <img
                                    src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                                    alt={currentUser.username}
                                    className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                                />
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500   shrink-0"
                                    title="Sair"
                                >
                                    <LogOut className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>

                        {/* Center (User Selection Switcher) */}
                        <div className="flex items-center justify-center w-fit max-w-full mx-auto overflow-x-auto custom-scrollbar md:absolute md:left-1/2 md:-translate-x-1/2 bg-black/40 rounded-full border border-white/5 p-1 gap-1">
                            {[...users].sort((a, b) => {
                                if (a.id === currentUser.id) return -1;
                                if (b.id === currentUser.id) return 1;
                                return 0;
                            }).map(u => {
                                const isCurrentUser = u.id === currentUser.id;
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => setViewingUserId(u.id)}
                                        className={`px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase   shrink-0 ${viewingUserId === u.id ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white/70 border border-transparent'}`}
                                    >
                                        {isCurrentUser ? 'VOCÊ' : u.username.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Desktop CTA + User Area (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center gap-4 shrink-0">
                            <Link
                                to="/admin/financeiro"
                                className="h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center px-4 hover:bg-emerald-500/20 hover:border-emerald-500   shrink-0 gap-2"
                                title="Caixa da Empresa"
                            >
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold text-xs tracking-wider">{formattedBalance}</span>
                            </Link>
                            <Link
                                to="/admin/laboratorio"
                                className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500   shrink-0"
                                title="Laboratório IA"
                            >
                                <Sparkles className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/admin/clientes"
                                className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500   shrink-0"
                                title="Gestão de Clientes"
                            >
                                <Users className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500   shrink-0"
                                title="Histórico de Tarefas"
                            >
                                <Clock className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-white/5 border border-white/20 text-white pl-4 pr-5 py-2.5 rounded-full font-medium text-xs hover:bg-white/10 hover:border-white/40 hover:text-cyan-50   flex items-center gap-2 group/btn shrink-0"
                                title="Nova Tarefa"
                            >
                                <Plus className="w-4 h-4 opacity-70 group-hover/btn:rotate-90  " />
                                <span>Nova Tarefa</span>
                            </button>

                            <div className="h-6 w-px bg-white/10 mx-1" />

                            <div className="flex items-center gap-3 shrink-0">
                                <img
                                    src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`}
                                    alt={currentUser.username}
                                    className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                                />
                                <button
                                    onClick={handleLogout}
                                    className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500   group shrink-0"
                                    title="Finalizar Sessão"
                                >
                                    <LogOut className="w-4 h-4 ml-0.5 opacity-80 group-hover:opacity-100" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Top Toggle Demands vs Tasks */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pt-[120px] lg:pt-[130px] relative z-20 flex justify-center mb-10 lg:mb-12">
                <div className="bg-[#141414] rounded-full border border-white/5 p-1 flex items-center gap-1">
                    <button onClick={() => setActiveTab('tasks')} className={`px-5 py-2 sm:px-8 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase   ${activeTab === 'tasks' ? 'bg-cyan-500 text-black' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                        Tarefas Ativas
                    </button>
                    <button onClick={() => setActiveTab('demands')} className={`px-5 py-2 sm:px-8 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase   ${activeTab === 'demands' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                        Mural de Demandas
                    </button>
                </div>
            </div>

            {activeTab === 'tasks' ? (
                /* Sleek Kanban Board */
                <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 min-h-[50dvh] relative z-10 flex flex-wrap justify-center lg:justify-start gap-8 pb-12">
                    {sections.map(section => (
                        <div key={section.status} className="w-full sm:w-auto md:min-w-[340px] md:max-w-lg flex-1 flex flex-col relative shrink-0">
                            {/* Floating Pill Header */}
                            <div className="flex items-center justify-between mb-6 rounded-full py-4 px-6 shrink-0 relative isolate">
                                <div className="absolute inset-0 bg-white/5 ring-1 ring-inset ring-white/10 rounded-full -z-10 overflow-hidden" />
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${section.bg} ring-1 ring-white/10`}>
                                        <section.icon className={`w-5 h-5 ${section.color}`} />
                                    </div>
                                    <h2 className="text-lg lg:text-xl font-display font-medium text-white tracking-wide">{section.title}</h2>
                                </div>
                                <span className="text-xs font-sans font-bold text-white/50 bg-white/5 px-4 py-1.5 rounded-full ring-1 ring-white/10">
                                    {tasks.filter(t => t.status === section.status && t.assigned_to === viewingUserId && !(t.status === 'DONE' && isOlderThanToday(t.updated_at || t.created_at))).length}
                                </span>
                            </div>

                            {/* Task List */}
                            <div className="flex flex-col pb-8 space-y-4">
                                {tasks.filter(t => t.status === section.status && t.assigned_to === viewingUserId && !(t.status === 'DONE' && isOlderThanToday(t.updated_at || t.created_at))).map(task => (
                                    <div key={task.id} className="group relative flex flex-col rounded-[2rem] p-6   cursor-default isolate">
                                        <div className="absolute inset-0 bg-white/5 ring-1 ring-inset ring-white/10 group-hover:bg-white/10 group-hover:ring-white/20 rounded-[2rem]   -z-10 overflow-hidden pointer-events-none" />

                                        {/* Action Buttons (Floating pill inside card - restricted to assignee) */}
                                        {task.assigned_to === currentUser.id && (
                                            <div className="absolute top-5 right-5 z-10 opacity-0 group-hover:opacity-100  translate-y-2 group-hover:translate-y-0 flex gap-1 bg-black/80 rounded-full border border-white/10 p-1.5">
                                                {task.status !== 'TODO' && (
                                                    <button onClick={() => handleUpdateStatus(task.id, 'TODO')} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full " title="Mover para Por Fazer"><CircleDashed className="w-4 h-4" /></button>
                                                )}
                                                {task.status !== 'IN_PROGRESS' && (
                                                    <button onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className="p-2 text-white/40 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-full " title="Mover para Andamento"><Clock className="w-4 h-4" /></button>
                                                )}
                                                {task.status !== 'DONE' && (
                                                    <button onClick={() => handleUpdateStatus(task.id, 'DONE')} className="p-2 text-white/40 hover:text-green-400 hover:bg-green-400/10 rounded-full " title="Mover para Concluído"><Check className="w-4 h-4" /></button>
                                                )}
                                                {task.status !== 'DONE' && (
                                                    <button onClick={() => {
                                                        setEditingTaskId(task.id);
                                                        setEditingTaskData({ title: task.title, description: task.description || '' });
                                                    }} className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 rounded-full " title="Editar Tarefa">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <div className="w-px h-6 bg-white/10 mx-0.5 my-auto" />
                                                <button onClick={() => { setTaskToDelete(task.id); setIsDeleteModalOpen(true); }} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full " title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        )}

                                        <>
                                            <h3 className="text-base font-medium leading-relaxed text-white tracking-wide mb-3 pr-24">{task.title}</h3>
                                            {task.description && (
                                                <p className="text-sm text-white/50 line-clamp-3 leading-relaxed mb-6 font-light">{task.description}</p>
                                            )}
                                        </>

                                        <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Atribuída por:</span>
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={task.created_by_username === currentUser.username ? `/${currentUser.username?.toLowerCase() || 'default'}.webp` : `/${task.created_by_username?.toLowerCase()}.webp`}
                                                        alt={task.created_by_username}
                                                        className="w-7 h-7 rounded-full object-cover border border-white/10"
                                                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.created_by_username}&background=111&color=fff`; }}
                                                    />
                                                    <span className="text-xs tracking-wide text-white/80 font-medium">
                                                        {task.created_by_username === currentUser.username ? 'VOCÊ' : task.created_by_username?.split(' ')[0]}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end justify-center h-full pt-4">
                                                {getUrgencyIndicator(task.urgency)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tasks.filter(t => t.status === section.status && t.assigned_to === viewingUserId && !(t.status === 'DONE' && isOlderThanToday(t.updated_at || t.created_at))).length === 0 && (
                                    <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-[2rem] py-14 flex flex-col items-center justify-center text-center opacity-70">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${section.bg} ring-1 ring-white/5`}>
                                            <section.icon className={`w-4 h-4 ${section.color}`} />
                                        </div>
                                        <span className="text-xs text-white/50 font-display font-medium tracking-widest uppercase">Pilha Vazia</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </main>
            ) : (
                <main className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 min-h-[50dvh] relative z-10 pb-12 w-full flex flex-col items-center">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white/5 border border-white/10 rounded-[2rem] sm:rounded-full py-6 sm:py-4 px-6 sm:px-8 shrink-0 w-full max-w-7xl">
                        <div>
                            <h1 className="text-xl font-display font-medium text-white tracking-widest uppercase">Demandas em Aberto</h1>
                            <p className="text-xs text-white/40 tracking-wider">Gerencie a fila de projetos pendentes de clientes.</p>
                        </div>
                        <button onClick={() => setIsDemandModalOpen(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/30 text-emerald-400 font-bold tracking-widest uppercase text-[10px] px-6 py-3 rounded-full flex items-center gap-2 ">
                            <Plus className="w-4 h-4" /> Nova Demanda
                        </button>
                    </div>

                    {demands.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] w-full max-w-7xl py-24 flex flex-col items-center justify-center text-center relative">
                            <span className="text-sm text-white/40 tracking-widest uppercase">Nenhuma demanda cadastrada</span>
                        </div>
                    ) : (
                        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
                            {demands.map(demand => (
                                <div key={demand.id} className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-6 flex flex-col relative group  hover:border-white/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-white tracking-wider truncate uppercase">{demand.client_name}</h3>
                                        <button onClick={() => handleDeleteDemand(demand.id)} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/20  shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
                                            <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Restam</span>
                                            <span className="text-xl font-display font-bold text-cyan-400">{demand.total_videos - demand.assigned_videos} <span className="text-[10px] text-white/30 font-medium">/ {demand.total_videos} vlog</span></span>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
                                            <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Formatos</span>
                                            <span className="text-[11px] font-display font-medium text-emerald-400 break-words line-clamp-2">{demand.duration_seconds || '--'}</span>
                                        </div>
                                    </div>
                                    {demand.description && <p className="text-xs text-white/50 mb-4 line-clamp-3 leading-relaxed">{demand.description}</p>}
                                    {demand.has_material === 1 && demand.material_link && (
                                        <a href={demand.material_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 underline tracking-wider mb-4 block truncate">Link de Referência / Material</a>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${demand.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : demand.status === 'partial' ? 'bg-amber-400/10 text-amber-500 border border-amber-400/20' : 'bg-white/5 text-white/50 border border-white/10'}`}>
                                            {demand.status === 'completed' ? 'Concluída' : demand.status === 'partial' ? 'Em Progresso' : 'Pendente'}
                                        </span>

                                        {demand.status !== 'completed' && (
                                            <button onClick={() => { setAllocateData({ ...allocateData, demand_id: demand.id, videos_count: String(demand.total_videos - demand.assigned_videos) }); setIsAllocateModalOpen(true); }} className="text-[10px] font-bold uppercase tracking-widest text-black bg-cyan-400 hover:bg-cyan-300 px-5 py-2.5 rounded-full  hover:scale-105">
                                                Pegar Demanda
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            )}

            {/* Create Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg transform  flex flex-col mx-auto my-auto ring-1 ring-white/5 font-sans overflow-hidden">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 z-20 text-white/30 hover:text-white  bg-white/5 hover:bg-white/10 p-3 rounded-full border border-transparent hover:border-white/10">
                            <X className="w-5 h-5" />
                        </button>

                        <form onSubmit={handleCreateTask} className="p-[clamp(1.5rem,4vh,2.5rem)] flex-1 relative z-10 w-full flex flex-col items-center gap-[clamp(1rem,4vh,1.75rem)]">

                            <div className="w-full text-center flex flex-col gap-[clamp(0.25rem,1vh,0.5rem)] shrink-0">
                                <h2 className="text-[clamp(1.25rem,4vh,1.5rem)] leading-none font-display font-medium text-white tracking-wide">Planejar Ação</h2>
                                <p className="text-[10px] sm:text-xs text-white/40 lowercase font-light tracking-wide">defina o próximo passo de forma objetiva</p>
                            </div>

                            <div className="w-full flex flex-col gap-[clamp(0.75rem,2vh,1rem)] shrink-0">
                                <input required type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-base outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05]  font-medium placeholder:text-white/20 focus:placeholder-transparent placeholder:font-light caret-cyan-400"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                    placeholder="Qual a missão?" autoFocus />

                                <textarea rows={1} value={newTask.description} onChange={e => {
                                    setNewTask({ ...newTask, description: e.target.value });
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-sm outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05]  font-light placeholder:text-white/20 focus:placeholder-transparent resize-none overflow-hidden caret-cyan-400 leading-relaxed block max-h-[120px] custom-scrollbar"
                                    style={{ WebkitTapHighlightColor: 'transparent', minHeight: '52px' }}
                                    placeholder="Mais detalhes (Opcional)" />
                            </div>

                            <div className="w-full flex flex-col items-center gap-3">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Prioridade</span>
                                <div className="flex gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-[2rem]">
                                    {[
                                        { value: 'LOW', label: 'Baixa', baseClass: 'text-emerald-500/40 hover:text-emerald-500/80 hover:bg-white/5', active: 'bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/30' },
                                        { value: 'MEDIUM', label: 'Média', baseClass: 'text-amber-500/40 hover:text-amber-500/80 hover:bg-white/5', active: 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/30' },
                                        { value: 'HIGH', label: 'Urgente', baseClass: 'text-red-500/40 hover:text-red-500/80 hover:bg-white/5', active: 'bg-red-400/10 text-red-400 ring-1 ring-red-400/30' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setNewTask({ ...newTask, urgency: opt.value })}
                                            className={`px-6 py-2.5 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-widest   ${newTask.urgency === opt.value ? opt.active : opt.baseClass}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full flex flex-col items-center gap-4 shrink-0">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Atribuir Para</span>
                                <div className="flex flex-wrap gap-4 justify-center w-full pb-[clamp(0.2rem,1vh,0.5rem)]">
                                    <div
                                        onClick={() => setNewTask({ ...newTask, assigned_to: '' })}
                                        className="flex flex-col items-center gap-2 cursor-pointer group"
                                    >
                                        <div className={`w-[clamp(2.5rem,6.5vh,3.5rem)] h-[clamp(2.5rem,6.5vh,3.5rem)] rounded-full overflow-hidden flex items-center justify-center   ${!newTask.assigned_to ? 'ring-2 ring-cyan-400 ring-offset-4 ring-offset-[#080808] grayscale-0 opacity-100 scale-110' : 'ring-1 ring-white/10 grayscale opacity-40 group-hover:opacity-80 group-hover:grayscale-[20%] group-hover:scale-110'}`}>
                                            <img src={`/${currentUser.username?.toLowerCase() || 'default'}.webp`} alt="Eu" className="w-full h-full object-cover object-center" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }} />
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest   ${!newTask.assigned_to ? 'text-cyan-400 scale-110 translate-y-1' : 'text-white/40 group-hover:text-white/70 group-hover:translate-y-0.5 group-hover:scale-110'}`}>Você</span>
                                    </div>

                                    {users.filter(u => u.id !== currentUser.id).map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => setNewTask({ ...newTask, assigned_to: u.id.toString() })}
                                            className="flex flex-col items-center gap-2 cursor-pointer group"
                                        >
                                            <div className={`w-[clamp(2.5rem,6.5vh,3.5rem)] h-[clamp(2.5rem,6.5vh,3.5rem)] rounded-full overflow-hidden flex items-center justify-center   ${newTask.assigned_to === u.id.toString() ? 'ring-2 ring-cyan-400 ring-offset-4 ring-offset-[#080808] grayscale-0 opacity-100 scale-110' : 'ring-1 ring-white/10 grayscale opacity-40 group-hover:opacity-80 group-hover:grayscale-[20%] group-hover:scale-110'}`}>
                                                <img src={`/${u.username.toLowerCase()}.webp`} alt={u.username} className="w-full h-full object-cover object-center" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${u.username}&background=111&color=fff`; }} />
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest   ${newTask.assigned_to === u.id.toString() ? 'text-cyan-400 scale-110 translate-y-1' : 'text-white/40 group-hover:text-white/70 group-hover:translate-y-0.5 group-hover:scale-110'}`}>{u.username.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full pt-[clamp(0.2rem,1vh,1rem)] shrink-0">
                                <button type="submit" className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vh,0.75rem)] py-[clamp(1rem,2.8vh,1.25rem)] rounded-[2rem]   flex items-center justify-center gap-3 group/submit">
                                    Adicionar Missão
                                    <Plus className="w-4 h-4 group-hover/submit:scale-125 " />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Task Modal */}
            {editingTaskId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setEditingTaskId(null)} />

                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg transform  flex flex-col mx-auto my-auto ring-1 ring-white/5 font-sans overflow-hidden">
                        <button type="button" onClick={() => setEditingTaskId(null)} className="absolute top-5 right-5 z-20 text-white/30 hover:text-white  bg-white/5 hover:bg-white/10 p-3 rounded-full border border-transparent hover:border-white/10">
                            <X className="w-5 h-5" />
                        </button>

                        <form onSubmit={(e) => { e.preventDefault(); handleUpdateText(editingTaskId); }} className="p-[clamp(1.5rem,4vh,2.5rem)] flex-1 relative z-10 w-full flex flex-col items-center gap-[clamp(1rem,4vh,1.75rem)]">

                            <div className="w-full text-center flex flex-col gap-[clamp(0.25rem,1vh,0.5rem)] shrink-0">
                                <h2 className="text-[clamp(1.25rem,4vh,1.5rem)] leading-none font-display font-medium text-white tracking-wide">Editar Missão</h2>
                                <p className="text-[10px] sm:text-xs text-white/40 lowercase font-light tracking-wide">ajuste os detalhes da operação</p>
                            </div>

                            <div className="w-full flex flex-col gap-[clamp(0.75rem,2vh,1rem)] shrink-0">
                                <input required type="text" value={editingTaskData.title} onChange={e => setEditingTaskData({ ...editingTaskData, title: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-base outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05]  font-medium placeholder:text-white/20 focus:placeholder-transparent placeholder:font-light caret-cyan-400"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                    placeholder="Qual a missão?" autoFocus />

                                <textarea rows={1} value={editingTaskData.description} onChange={e => {
                                    setEditingTaskData({ ...editingTaskData, description: e.target.value });
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-6 py-[clamp(0.75rem,2.5vh,1rem)] text-white text-center text-sm outline-none focus:outline-none focus:ring-0 focus:border-cyan-400/50 focus:bg-white/[0.05]  font-light placeholder:text-white/20 focus:placeholder-transparent resize-none overflow-hidden caret-cyan-400 leading-relaxed block max-h-[120px] custom-scrollbar"
                                    style={{ WebkitTapHighlightColor: 'transparent', minHeight: '52px' }}
                                    placeholder="Mais detalhes (Opcional)" />
                            </div>

                            <div className="w-full pt-[clamp(0.2rem,1vh,1rem)] shrink-0">
                                <button type="submit" className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vh,0.75rem)] py-[clamp(1rem,2.8vh,1.25rem)] rounded-[2rem]   flex items-center justify-center gap-3 group/submit">
                                    Salvar Alterações
                                    <Check className="w-4 h-4 group-hover/submit:scale-125 " />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setIsHistoryModalOpen(false)} />

                    <div className="relative bg-[#060606]/40 ring-1 ring-inset ring-white/10 rounded-[2.5rem] w-full max-w-2xl transform  flex flex-col mx-auto my-auto h-[80vh] overflow-hidden">
                        <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="absolute top-6 right-6 z-10 text-white/40 hover:text-white  bg-white/5 hover:bg-white/10 p-2.5 rounded-full border border-transparent hover:border-white/10">
                            <X className="w-4 h-4" />
                        </button>

                        <div className="p-8 sm:p-10 flex flex-col h-full relative z-0">
                            <h2 className="text-xl sm:text-2xl font-display font-medium text-white tracking-wide mb-8 text-center sm:text-left">Histórico de Tarefas</h2>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                {tasks.filter(t => t.status === 'DONE').length === 0 ? (
                                    <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-[2rem] py-14 flex flex-col items-center justify-center text-center opacity-70">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-white/5 ring-1 ring-white/10`}>
                                            <Clock className={`w-5 h-5 text-white/40`} />
                                        </div>
                                        <span className="text-xs text-white/50 font-display font-medium tracking-widest uppercase">Nenhum histórico passado</span>
                                    </div>
                                ) : (
                                    tasks.filter(t => t.status === 'DONE')
                                        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                                        .map(task => (
                                            <div key={task.id} className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-[1.5rem] p-5 w-full">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h3 className="text-sm font-semibold text-white tracking-wide truncate mb-1">{task.title}</h3>
                                                    <div className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
                                                        Concluído em: {formatDate(task.updated_at || task.created_at)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Executor</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-white/80">{task.assigned_to_username.split(' ')[0]}</span>
                                                            <img
                                                                src={`/${task.assigned_to_username?.toLowerCase() || 'default'}.webp`}
                                                                alt={task.assigned_to_username}
                                                                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                                                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.assigned_to_username}&background=0D8ABC&color=fff`; }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => { setTaskToDelete(task.id); setIsDeleteModalOpen(true); }}
                                                        className="ml-2 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/20 "
                                                        title="Excluir Definitivamente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="relative bg-[#060606]/40 ring-1 ring-inset ring-white/10 rounded-[2.5rem] w-full max-w-sm transform  flex flex-col mx-auto my-auto overflow-hidden">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/20">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-xl font-display font-medium text-white tracking-wide mb-2">Excluir Tarefa</h2>
                            <p className="text-sm text-white/50 mb-8 leading-relaxed">
                                Tem certeza que deseja excluir esta tarefa permanentemente? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 "
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 "
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Demand Modal */}
            {isDemandModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setIsDemandModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg transform  flex flex-col ring-1 ring-white/5 p-8 sm:p-10">
                        <button type="button" onClick={() => setIsDemandModalOpen(false)} className="absolute top-6 right-6 z-20 text-white/30 hover:text-white  bg-white/5 hover:bg-white/10 p-2.5 rounded-full">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-full text-center mb-8">
                            <h2 className="text-xl sm:text-2xl font-display font-medium text-white tracking-wide uppercase">Nova Demanda</h2>
                            <p className="text-xs text-white/40 tracking-wider">Adicione o projeto do cliente no mural.</p>
                        </div>

                        <form onSubmit={handleCreateDemand} className="flex flex-col gap-4">
                            <input required type="text" value={newDemand.client_name} onChange={e => setNewDemand({ ...newDemand, client_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-400/50  font-light" placeholder="Nome do Cliente" />

                            <div className="flex flex-col sm:flex-row gap-4">
                                <input required type="number" min="1" value={newDemand.total_videos} onChange={e => setNewDemand({ ...newDemand, total_videos: e.target.value })} className="w-full sm:w-1/3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-400/50  font-bold placeholder:font-light hide-number-spin" placeholder="Total de Vídeos" />
                                <input required type="text" value={newDemand.duration_seconds} onChange={e => setNewDemand({ ...newDemand, duration_seconds: e.target.value })} className="w-full sm:w-2/3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-400/50  font-light" placeholder="Ex: 5 de 30s, 2 de 60s" />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer mt-2 mb-1 px-2">
                                <div className={`w-5 h-5 rounded flex items-center justify-center  border ${newDemand.has_material ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-white/20'}`}>
                                    {newDemand.has_material && <Check className="w-3.5 h-3.5 text-black" />}
                                </div>
                                <span className="text-xs font-bold text-white/70 tracking-widest uppercase">Possui material de apoio?</span>
                                <input type="checkbox" checked={newDemand.has_material} onChange={e => setNewDemand({ ...newDemand, has_material: e.target.checked })} className="hidden" />
                            </label>

                            {newDemand.has_material && (
                                <input required type="url" value={newDemand.material_link} onChange={e => setNewDemand({ ...newDemand, material_link: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-400/50  font-light" placeholder="Link do Google Drive / Dropbox" />
                            )}

                            <textarea rows={2} value={newDemand.description} onChange={e => setNewDemand({ ...newDemand, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-emerald-400/50  font-light resize-none mt-2" placeholder="Instruções ou Descrição Extra" />

                            <button type="submit" className="w-full mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-4 rounded-full  flex justify-center items-center">
                                Registrar Demanda
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Allocate Demand Modal */}
            {isAllocateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[8px] backdrop-blur-sm " onClick={() => setIsAllocateModalOpen(false)} />
                    <div className="relative bg-[#080808]/90 ring-1 ring-inset ring-white/10 rounded-[3rem] w-full max-w-lg transform  flex flex-col ring-1 ring-white/5 p-8 sm:p-10">
                        <button type="button" onClick={() => setIsAllocateModalOpen(false)} className="absolute top-6 right-6 z-20 text-white/30 hover:text-white  bg-white/5 hover:bg-white/10 p-2.5 rounded-full">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-full text-center mb-8">
                            <h2 className="text-xl sm:text-2xl font-display font-medium text-white tracking-wide uppercase">Pegar Parte</h2>
                            <p className="text-xs text-white/40 tracking-wider">Designe uma parte da demanda como tarefa.</p>
                        </div>

                        <form onSubmit={handleAllocateDemand} className="flex flex-col gap-4">
                            <div className="flex gap-4 w-full">
                                <div className="flex-1 dropdown-container relative bg-white/5 border border-white/10 rounded-2xl px-5 py-1 flex items-center cursor-pointer hover:bg-white/10 hover:border-cyan-400/50 ">
                                    <select required value={allocateData.assigned_to} onChange={e => setAllocateData({ ...allocateData, assigned_to: e.target.value })} className="w-full bg-transparent text-white outline-none cursor-pointer appearance-none text-center font-bold tracking-widest text-sm uppercase">
                                        <option value="" disabled className="text-black bg-white">Membro (Equipe)</option>
                                        <option value={currentUser.id} className="text-black bg-white">VOCÊ</option>
                                        {users.filter(u => u.id !== currentUser.id).map(user => (
                                            <option key={user.id} value={user.id} className="text-black bg-white">{user.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <input required type="number" min="1" max={allocateData.videos_count} value={allocateData.videos_count} onChange={e => setAllocateData({ ...allocateData, videos_count: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-center text-sm outline-none focus:border-cyan-400/50  font-bold placeholder:text-white/20" placeholder="Qtd. Vds" />
                                </div>
                            </div>

                            <div className="flex bg-white/5 rounded-full overflow-hidden p-1 border border-white/10 w-full mt-2">
                                <button type="button" onClick={() => setAllocateData({ ...allocateData, urgency: 'LOW' })} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-widest rounded-full  ${allocateData.urgency === 'LOW' ? 'bg-emerald-400 text-black' : 'text-emerald-400 hover:bg-white/10'}`}>Baixa Urgência</button>
                                <button type="button" onClick={() => setAllocateData({ ...allocateData, urgency: 'MEDIUM' })} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-widest rounded-full  ${allocateData.urgency === 'MEDIUM' ? 'bg-yellow-400 text-black' : 'text-yellow-400 hover:bg-white/10'}`}>Normal</button>
                                <button type="button" onClick={() => setAllocateData({ ...allocateData, urgency: 'HIGH' })} className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-widest rounded-full  ${allocateData.urgency === 'HIGH' ? 'bg-red-500 text-black' : 'text-red-500 hover:bg-white/10'}`}>Urgente</button>
                            </div>

                            <textarea rows={2} value={allocateData.notes} onChange={e => setAllocateData({ ...allocateData, notes: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-cyan-400/50  font-light resize-none mt-2" placeholder="Notas/Anotações Rápidas (Opcional)" />

                            <button type="submit" className="w-full mt-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-xs py-4 rounded-full  flex justify-center items-center">
                                Confirmar e Criar Tarefa
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
