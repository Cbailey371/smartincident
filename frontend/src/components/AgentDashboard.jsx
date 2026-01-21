import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardCard from './DashboardCard';

const AgentDashboard = () => {
    const [stats, setStats] = useState({ open: 0, resolved: 0, avgResolutionTime: '0h' });
    const [assignedTickets, setAssignedTickets] = useState([]);
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
                    setAssignedTickets(data.recentIncidents);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="text-white p-8 animate-pulse">Cargando panel...</div>;

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
            <div className="flex justify-end items-center">
                <span className="text-sm text-text-muted">Bienvenido de nuevo</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Tickets Asignados" value={stats.open} icon={AlertCircle} color="bg-blue-500" delay={0} />
                <DashboardCard title="Resueltos (Total)" value={stats.resolved} icon={CheckCircle} color="bg-emerald-500" delay={0.1} />
                <DashboardCard title="Rendimiento" value="95%" icon={BarChart2} color="bg-purple-500" trend="+2%" delay={0.2} />
            </div>

            {/* Assigned Tickets List */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="bg-surface border border-border-color rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-border-color flex justify-between items-center bg-background/50">
                    <h2 className="text-lg font-bold text-text-main">Tickets Asignados Recientes</h2>
                    <Link to="/incidents" className="text-sm text-blue-400 hover:text-blue-300">Ver cola completa</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-muted">
                        <thead className="bg-background/50 uppercase text-xs tracking-wider text-text-muted">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Asunto</th>
                                <th className="px-6 py-4">Prioridad</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {assignedTickets.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center">No tienes tickets asignados recientemente.</td></tr>
                            ) : (
                                assignedTickets.map(ticket => (
                                    <motion.tr
                                        key={ticket.id}
                                        variants={itemVariants}
                                        className="hover:bg-background/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono">#{ticket.ticketCode || ticket.id}</td>
                                        <td className="px-6 py-4 font-medium text-text-main">{ticket.title}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold uppercase ${ticket.priority === 'high' ? 'text-orange-500' :
                                                ticket.priority === 'critical' ? 'text-red-500' : 'text-text-muted'
                                                }`}>
                                                {ticket.priority === 'low' ? 'BAJA' :
                                                    ticket.priority === 'medium' ? 'MEDIA' :
                                                        ticket.priority === 'high' ? 'ALTA' :
                                                            ticket.priority === 'critical' ? 'CRÍTICA' : ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{ticket.company?.name || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${ticket.status === 'open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-surface border-border-color text-text-muted'
                                                }`}>
                                                {ticket.status === 'open' ? 'Abierto' :
                                                    ticket.status === 'in_progress' ? 'En Progreso' :
                                                        ticket.status === 'resolved' ? 'Resuelto' :
                                                            ticket.status === 'closed' ? 'Cerrado' : ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link to={`/incidents/${ticket.id}`} className="text-primary hover:text-text-main transition-colors">Ver</Link>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default AgentDashboard;
