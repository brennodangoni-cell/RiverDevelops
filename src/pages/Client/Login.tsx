import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, KeyRound, Loader2, User } from 'lucide-react';

export default function ClientLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post('/api/clients/login', { username, password });
            if (res.data.token) {
                localStorage.setItem('rivertasks_client_token', res.data.token);
                localStorage.setItem('rivertasks_client_user', JSON.stringify(res.data.client));
                navigate('/cliente');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Acesso negado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-4 text-white font-sans relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-black to-cyan-500/10 pointer-events-none" />
            <div className="absolute top-1/4 -left-64 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />

            <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors bg-white/5 p-3 rounded-full hover:bg-white/10 z-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Voltar ao Início</span>
            </button>

            <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-2xl border border-white/10 p-10 sm:p-12 rounded-[3.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    <img src="/logo.webp" alt="River" className="w-10 h-10 object-contain rounded-full" />
                </div>

                <div className="text-center mb-10 w-full">
                    <h1 className="text-2xl font-display font-medium text-white tracking-widest uppercase mb-2">Área do Cliente</h1>
                    <p className="text-xs text-white/40 tracking-wider font-light">Acesse seu conteúdo exclusivo.</p>
                </div>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-cyan-400 transition-colors">
                            <User className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20"
                            placeholder="Seu Usuário"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-cyan-400 transition-colors">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-cyan-400/50 focus:bg-white/10 transition-all font-medium placeholder:text-white/20"
                            placeholder="Sua Senha"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold tracking-widest uppercase text-xs py-4 rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar na Plataforma'}
                    </button>
                </form>

                <p className="mt-12 text-[10px] text-white/20 tracking-widest uppercase">
                    &copy; 2026 River. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
