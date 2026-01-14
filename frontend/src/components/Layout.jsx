import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const location = useLocation();

    const getTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/companies': return 'Gestión de Empresas';
            case '/users': return 'Gestión de Usuarios';
            case '/incidents': return 'Lista de Incidentes';
            case '/history': return 'Historial de Tickets';
            case '/settings': return 'Configuración';
            default: return 'Tickes SaaS'; // Fallback title
        }
    };

    return (
        <div className="flex bg-background h-screen font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header title={getTitle()} />
                <main className="flex-1 overflow-auto p-8 bg-black/20 flex flex-col">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <footer className="mt-8 pt-6 border-t border-border-color/50 text-center">
                        <p className="text-[10px] text-text-muted font-medium tracking-wider uppercase">
                            v1.0.0 (Build 2026.01.14) - © 2026 CBTECH Consulting Solutions Systems. Todos los derechos reservados.
                        </p>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default Layout;
