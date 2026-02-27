import { Outlet, Navigate, useLocation } from 'react-router-dom';

export default function AdminLayout() {
    const token = localStorage.getItem('rivertasks_token');
    const location = useLocation();

    if (!token && location.pathname !== '/admin/login') {
        return <Navigate to="/admin/login" replace />;
    }

    if (token && location.pathname === '/admin/login') {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-cyan-500/30">
            <Outlet />
        </div>
    );
}
