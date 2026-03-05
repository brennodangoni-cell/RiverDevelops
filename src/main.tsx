import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import AdminLayout from './pages/Admin/AdminLayout.tsx'
import Login from './pages/Admin/Login.tsx'
import Dashboard from './pages/Admin/Dashboard.tsx'
import Finance from './pages/Admin/Finance.tsx'
import VideoLab from './pages/Admin/VideoLab.tsx'
import AdminClients from './pages/Admin/Clients.tsx'
import ClientLogin from './pages/Client/Login.tsx'
import ClientDashboard from './pages/Client/Dashboard.tsx'
import './index.css'
import axios from 'axios'

// Set globally the API base URL (Vercel Env or Localhost)
// @ts-ignore
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://riverdevelops.onrender.com';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />
    },
    {
        path: '/admin',
        element: <AdminLayout />,
        children: [
            { path: 'login', element: <Login /> },
            { path: 'financeiro', element: <Finance /> },
            { path: 'laboratorio', element: <VideoLab /> },
            { path: 'clientes', element: <AdminClients /> },
            { path: '', element: <Dashboard /> }
        ]
    },
    {
        path: '/cliente/login',
        element: <ClientLogin />
    },
    {
        path: '/cliente',
        element: <ClientDashboard />
    }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Toaster position="top-right" toastOptions={{ style: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <RouterProvider router={router} />
    </React.StrictMode>,
)
