import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Activity, Users, Building, AlertTriangle, ShieldCheck, Timer, OctagonAlert, PlusCircle, Layers, Calendar, Filter, RefreshCw, ClipboardList, Hourglass, Inbox, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardCard from './DashboardCard';
import { Link } from 'react-router-dom';

const SuperadminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);

    // Filters State - Default to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [companyId, setCompanyId] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchDashboard();
        fetchCompanies();
    }, [startDate, endDate, companyId]);

    const fetchDashboard = async () => {
        setLoading(true);
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const query = new URLSearchParams({
                startDate,
                endDate,
                ...(companyId && { companyId })
            }).toString();

            const res = await fetch(`/api/dashboard?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const jsonData = await res.json();
            setData(jsonData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setCompanies(data);
        } catch (error) {
            console.error(error);
        }
    };

    const resetFilters = () => {
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        setCompanyId('');
    };

    if (loading) return <div className="text-text-muted p-8 animate-pulse text-center">Cargando métricas globales...</div>;
    if (!data || data.error) return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Error cargando datos</h2>
            <p className="opacity-80">{data?.error || 'No se pudo conectar con el servidor'}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">Reintentar</button>
        </div>
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border-color text-text-muted hover:text-text-main'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                    {(startDate !== firstDayOfMonth.toISOString().split('T')[0] || endDate !== today.toISOString().split('T')[0] || companyId !== '') && (
                        <button onClick={resetFilters} className="text-xs text-blue-500 hover:underline flex items-center gap-1 cursor-pointer">
                            <RefreshCw className="w-3 h-3" /> Reiniciar
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <Link to="/companies" className="px-4 py-2 bg-surface hover:bg-background border border-border-color text-text-main rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Empresas
                    </Link>
                    <Link to="/users" className="px-4 py-2 bg-surface hover:bg-background border border-border-color text-text-main rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Usuarios
                    </Link>
                </div>
            </div>

            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-surface border border-border-color rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                            <Building className="w-3 h-3" /> Empresa
                        </label>
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main"
                        >
                            <option value="">Todas las empresas</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </motion.div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <DashboardCard
                    title="Incidentes Activos"
                    subtitle="Carga operativa actual"
                    value={data?.metrics?.active || 0}
                    icon={ClipboardList}
                    color="bg-blue-500"
                    delay={0}
                />
                <DashboardCard
                    title="Críticos (P1)"
                    subtitle="Riesgo inmediato"
                    value={data?.metrics?.critical || 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    delay={0.1}
                />
                <DashboardCard
                    title="SLA Cumplimiento"
                    subtitle="Salud contractual"
                    value={data?.metrics?.slaCompliance || '100%'}
                    icon={Timer}
                    color="bg-emerald-500"
                    delay={0.2}
                />
                <DashboardCard
                    title="MTTR Promedio"
                    subtitle="Eficiencia"
                    value={data?.metrics?.mttr || '0h 0m'}
                    icon={Hourglass}
                    color="bg-orange-500"
                    delay={0.3}
                />
                <DashboardCard
                    title="Incidentes Vencidos"
                    subtitle="Riesgo legal/comercial"
                    value={data?.metrics?.overdue || 0}
                    icon={OctagonAlert}
                    color="bg-purple-500"
                    delay={0.4}
                />
                <DashboardCard
                    title="Nuevos Hoy"
                    subtitle="Presión diaria"
                    value={data?.metrics?.newToday || 0}
                    icon={Inbox}
                    color="bg-primary"
                    delay={0.5}
                />
                <DashboardCard
                    title="Backlog Total"
                    subtitle="Deuda operativa"
                    value={data?.metrics?.backlog || 0}
                    icon={Layers}
                    color="bg-slate-500"
                    delay={0.6}
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="bg-surface border border-border-color rounded-2xl overflow-hidden shadow-lg"
            >
                <div className="p-6 border-b border-border-color flex justify-between items-center bg-background/50">
                    <h2 className="text-lg font-bold text-text-main">Actividad Reciente</h2>
                    <Link to="/incidents" className="text-sm text-primary hover:text-primary/80 font-medium">Ver todo los incidentes</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-muted">
                        <thead className="bg-background/50 uppercase text-xs tracking-wider text-text-muted">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {(!data || data.recentIncidents.length === 0) ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center">No hay actividad en este periodo</td></tr>
                            ) : data.recentIncidents.map((incident) => (
                                <motion.tr
                                    key={incident.id}
                                    variants={itemVariants}
                                    className="hover:bg-background/30 transition-colors"
                                >
                                    <td className="px-6 py-4 font-mono">#{incident.ticket_code || incident.id}</td>
                                    <td className="px-6 py-4 font-medium text-text-main">{incident.title}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${incident.status === 'open' ? 'bg-primary/10 text-primary border-primary/20' :
                                            incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-surface border-border-color text-text-muted'
                                            }`}>
                                            {incident.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{incident.company?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{new Date(incident.createdAt).toLocaleDateString()}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default SuperadminDashboard;
