import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    const location = useLocation();

    const getTitle = () => {
        switch (location.pathname) {
            case '/': return 'Panel de Control';
            case '/companies': return 'Gestión de Empresas';
            case '/users': return 'Gestión de Usuarios';
            case '/incidents': return 'Lista de Incidentes';
            case '/settings': return 'Configuración';
            default: return 'Tickes SaaS';
        }
    };

    return (
        <div className="flex bg-background h-screen font-sans overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header title={getTitle()} />
                <main className="flex-1 overflow-auto p-8 bg-black/20">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
