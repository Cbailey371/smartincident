import { useEffect, useState } from 'react';
import { Filter, Search, Eye, ChevronDown, ChevronUp, RefreshCw, Calendar, User, Building, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HistoryPage = () => {
    const { user } = useAuth();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');

    // Data for Dropdowns
    const [usersList, setUsersList] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);

    useEffect(() => {
        // Fetch specific data for filters based on roles
        if (['superadmin', 'company_admin', 'agent'].includes(user?.role)) {
            fetchUsers();
        }
        if (['superadmin', 'company_admin'].includes(user?.role)) {
            fetchCompanies();
        }
    }, [user]);

    // Fetch Incidents whenever filters change (Server-side filtering)
    useEffect(() => {
        fetchHistory();
    }, [filterPriority, filterAssignee, filterCompany]);
    // Note: startDate, endDate, searchTerm might need debounce or specific "Apply" button to avoid too many requests, 
    // or just fetch on effect for now if traffic is low.

    // For search and dates, let's filter client side for now OR implement robust debounce. 
    // Given the previous pattern, let's keep hybrid: Fetch Closed/Resolved from Server, Filter specific fields client side 
    // OR ideally move all to server. The Plan said "Implement server-side filtering", so let's try to use it.

    const fetchUsers = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsersList(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
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
            setCompaniesList(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            // Build Query Params
            const params = new URLSearchParams();
            params.append('status', 'closed,resolved'); // FORCE Closed/Resolved

            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterAssignee !== 'all') params.append('assignee_id', filterAssignee);
            if (filterCompany !== 'all') params.append('company_id', filterCompany);
            if (searchTerm) params.append('ticket_code', searchTerm); // Assuming simple search by code/title? Backend implemented ticket_code like

            const res = await fetch(`/api/incidents?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setIncidents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering for Search (Title) and Dates if backend doesn't support them fully yet
    // Backend `ticket_code` filter was added, but Title search might be needed. 
    // Also Date Range was NOT added to backend yet.
    // So we will filter `incidents` (which are already closed/resolved) by Date and Title here.
    const filteredIncidents = incidents.filter(incident => {
        const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            incident.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase());

        // Date Logic
        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && new Date(incident.createdAt) >= new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && new Date(incident.createdAt) <= end;
        }

        return matchesSearch && matchesDate;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setFilterPriority('all');
        setFilterAssignee('all');
        setFilterCompany('all');
        fetchHistory(); // Reset fetch
    };

    // Handle Search Submit/Enter
    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            fetchHistory(); // If we want to use server side search
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                        placeholder="Buscar por código o título..."
                        className="pl-10 pr-4 py-2 bg-background border border-border-color rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80 placeholder-text-muted/70"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors ${showFilters
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface border-border-color text-text-muted hover:text-text-main hover:bg-background'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filtros Globales</span>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={fetchHistory}
                        className="p-2 bg-surface hover:bg-background border border-border-color rounded-xl text-text-muted hover:text-text-main transition-colors"
                        title="Actualizar Lista"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-surface border border-border-color rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Desde
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Hasta
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                        {/* Status is FIXED to Closed/Resolved, so no filter needed here unless we want to distinguish between them */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                <Filter className="w-3 h-3" /> Prioridad
                            </label>
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="all">Todas</option>
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>

                        {(user?.role === 'superadmin' || user?.role === 'company_admin' || user?.role === 'agent') && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                    <User className="w-3 h-3" /> Asignado Originalmente
                                </label>
                                <select
                                    value={filterAssignee}
                                    onChange={(e) => setFilterAssignee(e.target.value)}
                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">Todos</option>
                                    {Array.isArray(usersList) && usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(user?.role === 'superadmin') && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                    <Building className="w-3 h-3" /> Empresa
                                </label>
                                <select
                                    value={filterCompany}
                                    onChange={(e) => setFilterCompany(e.target.value)}
                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">Todas</option>
                                    {Array.isArray(companiesList) && companiesList.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Limpiar Filtros
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-surface border border-border-color rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-muted">
                        <thead className="bg-background/50 uppercase text-xs tracking-wider text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Código</th>
                                <th className="px-6 py-4 font-semibold">Asunto</th>
                                <th className="px-6 py-4 font-semibold">Estado Final</th>
                                <th className="px-6 py-4 font-semibold">Prioridad</th>
                                <th className="px-6 py-4 font-semibold">Agente</th>
                                <th className="px-6 py-4 font-semibold">Empresa</th>
                                <th className="px-6 py-4 font-semibold">Cerrado</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center animate-pulse">Cargando historial...</td></tr>
                            ) : filteredIncidents.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center text-text-muted/50">No hay tickets en el historial con estos filtros.</td></tr>
                            ) : (
                                filteredIncidents.map((incident) => (
                                    <tr key={incident.id} className="hover:bg-background/50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-xs">{incident.ticketCode || `#${incident.id}`}</td>
                                        <td className="px-6 py-4">
                                            <Link to={`/incidents/${incident.id}`} className="font-medium text-text-main hover:text-primary transition-colors block truncate w-64">
                                                {incident.title}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                }`}>
                                                {incident.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${incident.priority === 'high' ? 'text-orange-500' :
                                                incident.priority === 'critical' ? 'text-red-500' :
                                                    'text-text-muted'
                                                }`}>
                                                {incident.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-background border border-border-color flex items-center justify-center text-xs text-text-muted">
                                                    {incident.assignee?.name?.charAt(0) || '?'}
                                                </div>
                                                <span className="truncate max-w-[100px]">{incident.assignee?.name || 'Sin asignar'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted">
                                            {incident.company?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-xs">
                                            {incident.updatedAt ? new Date(incident.updatedAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/incidents/${incident.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-background border border-border-color hover:border-primary/50 hover:text-primary rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Eye className="w-3 h-3" /> Ver Detalles
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryPage;
