import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardCard from './DashboardCard';

const ClientDashboard = () => {
    const [stats, setStats] = useState({ open: 0, resolved: 0 });
    const [recentTickets, setRecentTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const userInfo = localStorage.getItem('userInfo');
                const token = userInfo ? JSON.parse(userInfo).token : null;
                const res = await fetch('/api/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.metrics);
                    setRecentTickets(data.recentIncidents);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="text-white p-8 animate-pulse">Cargando...</div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-lg relative overflow-hidden"
            >
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Hola, ¿En qué podemos ayudarte hoy?</h1>
                    <p className="text-blue-100 mb-6 font-medium">Estamos aquí para resolver tus problemas técnicos.</p>
                    <Link
                        to="/incidents"
                        state={{ openCreateModal: true }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-black/20"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Incidente
                    </Link>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-12 mix-blend-overlay"></div>
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardCard title="Tickets Abiertos" value={stats.open} icon={Clock} color="bg-blue-500" delay={0.2} />
                <DashboardCard title="Tickets Resueltos" value={stats.resolved} icon={CheckCircle} color="bg-emerald-500" delay={0.3} />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="bg-surface border border-border-color rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-border-color bg-background/50">
                    <h2 className="text-lg font-bold text-text-main">Mis Tickets Recientes</h2>
                </div>
                <div className="divide-y divide-border-color">
                    {recentTickets.length === 0 ? (
                        <div className="p-8 text-center text-text-muted">No tienes tickets recientes.</div>
                    ) : (
                        recentTickets.map(ticket => (
                            <motion.div
                                key={ticket.id}
                                variants={itemVariants}
                                className="p-4 hover:bg-background/30 transition-colors flex items-center justify-between group"
                            >
                                <div>
                                    <Link to={`/incidents/${ticket.id}`} className="text-text-main font-medium hover:text-primary block mb-1">
                                        {ticket.title}
                                    </Link>
                                    <div className="flex gap-3 text-xs text-text-muted">
                                        <span className="font-mono">#{ticket.ticketCode || ticket.id}</span>
                                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${ticket.status === 'open' ? 'bg-primary/10 text-primary border-primary/20' :
                                    ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        'bg-surface border-border-color text-text-muted'
                                    }`}>
                                    {ticket.status === 'open' ? 'Abierto' :
                                        ticket.status === 'in_progress' ? 'En Progreso' :
                                            ticket.status === 'resolved' ? 'Resuelto' :
                                                ticket.status === 'closed' ? 'Cerrado' : ticket.status}
                                </span>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ClientDashboard;
