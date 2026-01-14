import { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, CheckCheck, Info, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Header = ({ title }) => {
    const { theme, toggleTheme } = useTheme();
    const [showNotifications, setShowNotifications] = useState(false);
    const popoverRef = useRef(null);

    // Mock Notifications - Replace with real data later
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Bienvenido', message: 'Sistema de soporte activo.', type: 'info', time: 'Ahora', unread: true },
        { id: 2, title: 'Configuración', message: 'SMTP validado correctamente.', type: 'success', time: '1h', unread: true },
    ]);

    const unreadCount = notifications.filter(n => n.unread).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, unread: false })));
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-20 border-b border-border-color bg-surface/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50 transition-colors duration-200">
            <h1 className="text-2xl font-bold text-text-main">{title}</h1>

            <div className="flex items-center gap-6">
                <button
                    onClick={toggleTheme}
                    className="p-2 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-background cursor-pointer"
                >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="relative" ref={popoverRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-text-muted hover:text-text-main transition-colors rounded-lg hover:bg-background cursor-pointer"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface animate-pulse"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-3 w-80 bg-surface border border-border-color rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-border-color flex justify-between items-center bg-background/50">
                                <h3 className="font-bold text-text-main text-sm">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                                    >
                                        <CheckCheck className="w-3 h-3" /> Leer todo
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-text-muted text-sm">
                                        No hay notificaciones
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className={`p-4 border-b border-border-color last:border-0 hover:bg-background/40 transition-colors flex gap-3 ${n.unread ? 'bg-primary/5' : ''}`}>
                                            <div className={`mt-1 p-1.5 rounded-full h-fit ${n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {n.type === 'success' ? <Info className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-text-main">{n.title}</p>
                                                    <span className="text-[10px] text-text-muted">{n.time}</span>
                                                </div>
                                                <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">{n.message}</p>
                                            </div>
                                            {n.unread && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-3 bg-background/50 text-center border-t border-border-color">
                                <button className="text-[10px] text-text-muted hover:text-text-main font-medium">Ver historial de actividad</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
