import { LayoutDashboard, Ticket, Settings, Building2, Users, LogOut, History, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();

    const allNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['superadmin', 'agent', 'client'] },
        { icon: Building2, label: 'Empresas', path: '/companies', roles: ['superadmin'] },
        { icon: Users, label: 'Usuarios', path: '/users', roles: ['superadmin'] },
        { icon: Ticket, label: 'Incidentes', path: '/incidents', roles: ['superadmin', 'agent', 'client'] },
        { icon: History, label: 'Historial', path: '/history', roles: ['superadmin', 'agent', 'client'] },
        { icon: Settings, label: 'Configuración', path: '/settings', roles: ['superadmin'] },
    ];

    const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

    return (
        <div className={`fixed inset-y-0 left-0 z-[70] w-64 bg-surface border-r border-border-color flex flex-col p-4 text-text-muted transition-transform duration-300 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between lg:justify-center gap-3 px-4 py-6 mb-4">
                <img src="/logo.png" alt="SMARTINCIDENT" className="h-16 lg:h-44 object-contain" />
                <button onClick={onClose} className="lg:hidden p-2 text-text-muted hover:text-text-main">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                : 'hover:bg-background/50 hover:text-text-main'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                        <span className="font-medium text-sm lg:text-base">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto px-4 py-4 border-t border-border-color">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-background border border-border-color flex items-center justify-center text-xs lg:text-sm font-bold text-text-muted">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col max-w-[100px] lg:max-w-none">
                            <span className="text-xs lg:text-sm font-semibold text-text-main truncate">{user?.name || 'Usuario'}</span>
                            <span className="text-[10px] lg:text-xs text-text-muted capitalize">
                                {user?.role === 'agent' ? 'Agente' :
                                    user?.role === 'superadmin' ? 'Administrador' : 'Cliente'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-text-muted"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
