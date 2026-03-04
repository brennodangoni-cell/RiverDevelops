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
        <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-4 text-white font-sans relative overflow-hidden select-none">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#020202] to-[#020202] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none opacity-50 mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none opacity-50 mix-blend-screen" />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Back Button */}
            <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-zinc-500 hover:text-white transition-all bg-white/[0.02] border border-white/5 p-4 rounded-full hover:bg-white/[0.05] hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] z-20 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] group backdrop-blur-md">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Início</span>
            </button>

            {/* Login Card */}
            <div className="w-full max-w-sm relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Logo Area */}
                <div className="mb-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-[1px] shadow-2xl mb-8 relative group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-3xl group-hover:bg-cyan-400/30 transition-colors duration-500" />
                        <div className="w-full h-full bg-black/50 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/5 relative z-10">
                            <img src="/logo.webp" alt="River" className="w-12 h-12 object-contain" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-widen mb-3">
                        Portal <span className="font-semibold text-white">River</span>
                    </h1>
                    <p className="text-[11px] text-zinc-500 tracking-[0.3em] font-medium uppercase">
                        Acesso Restrito
                    </p>
                </div>

                {/* Form Container */}
                <form onSubmit={handleLogin} className="w-full bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col gap-5 relative overflow-hidden">
                    {/* Inner highlight */}
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-cyan-400 transition-colors duration-300">
                            <User className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-cyan-500/50 focus:bg-white/[0.03] transition-all font-light placeholder:text-zinc-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            placeholder="Usuário"
                            autoComplete="off"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-cyan-400 transition-colors duration-300">
                            <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-cyan-500/50 focus:bg-white/[0.03] transition-all font-light placeholder:text-zinc-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            placeholder="Senha"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-white text-black font-semibold tracking-[0.15em] uppercase text-xs py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] relative overflow-hidden group"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        ) : (
                            <>
                                <span className="relative z-10">Acessar</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-purple-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300 mix-blend-overlay" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-12 flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-default">
                    <img src="/logo.webp" alt="River" className="w-3 h-3 grayscale" />
                    <span className="text-[9px] text-white tracking-[0.3em] font-light uppercase">
                        2026 River Studio
                    </span>
                </div>
            </div>
        </div>
    );
}
