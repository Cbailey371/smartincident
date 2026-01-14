import { useEffect, useState } from 'react';
import { Filter, Plus, Search, MoreVertical, X, Save, AlertCircle, Upload, ChevronDown, ChevronUp, RefreshCw, Calendar, User, Building, Trash2 } from 'lucide-react';
import Combobox from '../components/Combobox';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IncidentListPage = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');

    // Data for Dropdowns
    const [usersList, setUsersList] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);

    // Create Modal State
    const [showModal, setShowModal] = useState(false);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        type_id: '',
        company_id: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchIncidents();
        fetchTicketTypes();
        if (['superadmin', 'company_admin', 'agent'].includes(user?.role)) {
            fetchUsers();
        }
        if (['superadmin', 'company_admin'].includes(user?.role)) {
            fetchCompanies();
        }

        // Open Modal if coming from Dashboard shortcut
        if (location.state?.openCreateModal) {
            setShowModal(true);
        }
    }, [user, location.state]);

    const fetchUsers = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsersList(data);
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
            setCompaniesList(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchIncidents = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/incidents?status=open,in_progress,resolved', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setIncidents(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const fetchTicketTypes = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/ticket-types', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTicketTypes(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('priority', formData.priority);
        data.append('type_id', formData.type_id);
        if (formData.company_id) {
            data.append('company_id', formData.company_id);
        }
        if (selectedFile) {
            data.append('image', selectedFile);
        }

        try {
            const res = await fetch('/api/incidents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({ title: '', description: '', priority: 'medium', type_id: '', company_id: '' });
                setSelectedFile(null);
                fetchIncidents();
            } else {
                alert('Error creando incidente');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({ title: '', description: '', priority: 'medium', type_id: '', company_id: '' });
        setSelectedFile(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este incidente? Esta acción no se puede deshacer.')) return;

        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch(`/api/incidents/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchIncidents();
            } else {
                const data = await res.json();
                alert(data.error || 'Error eliminando incidente');
            }
        } catch (error) {
            console.error(error);
            alert('Error al conectar con el servidor');
        }
    };

    const filteredIncidents = incidents.filter(incident => {
        const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            incident.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' ? true : incident.status === filterStatus;
        const matchesPriority = filterPriority === 'all' ? true : incident.priority === filterPriority;

        // Handle IDs being numbers or objects
        const assigneeId = incident.assignee_id || incident.assignee?.id;
        const matchesAssignee = filterAssignee === 'all' ? true : assigneeId === parseInt(filterAssignee);

        const companyId = incident.company_id || incident.company?.id;
        const matchesCompany = filterCompany === 'all' ? true : companyId === parseInt(filterCompany);

        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && new Date(incident.createdAt) >= new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && new Date(incident.createdAt) <= end;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesCompany && matchesDate;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setFilterStatus('all');
        setFilterPriority('all');
        setFilterAssignee('all');
        setFilterCompany('all');
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar incidentes..."
                        className="pl-10 pr-4 py-2 bg-background border border-border-color rounded-xl text-text-main focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64 placeholder-text-muted/70"
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
                        <span>Filtros</span>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Incidente</span>
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-surface border border-border-color rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in duration-200 shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Estado
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="open">Abierto</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="resolved">Resuelto</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Prioridad
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
                                    <User className="w-3 h-3" /> Asignado a
                                </label>
                                <select
                                    value={filterAssignee}
                                    onChange={(e) => setFilterAssignee(e.target.value)}
                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                >
                                    <option value="all">Todos</option>
                                    {usersList.map(u => (
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
                                    {companiesList.map(c => (
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
            <div className="bg-surface border border-border-color rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-text-muted">
                        <thead className="bg-background/50 uppercase text-xs tracking-wider text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Código</th>
                                <th className="px-6 py-4 font-semibold">Asunto</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                                <th className="px-6 py-4 font-semibold">Prioridad</th>
                                <th className="px-6 py-4 font-semibold">Asignado a</th>
                                <th className="px-6 py-4 font-semibold">Empresa</th>
                                <th className="px-6 py-4 font-semibold">Actualizado</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {loading ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center">Cargando...</td></tr>
                            ) : filteredIncidents.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center">No se encontraron incidentes</td></tr>
                            ) : (
                                filteredIncidents.map((incident) => (
                                    <tr key={incident.id} className="hover:bg-background/50 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-text-muted">{incident.ticket_code || `#${incident.id}`}</td>
                                        <td className="px-6 py-4">
                                            <Link to={`/incidents/${incident.id}`} className="font-medium text-text-main hover:text-blue-500 transition-colors block truncate w-64">
                                                {incident.title}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${incident.status === 'open' ? 'bg-primary/10 text-primary border-primary/20' :
                                                incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-background text-text-muted border-border-color'
                                                }`}>
                                                {incident.status}
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
                                        <td className="px-6 py-4 text-text-muted">
                                            {new Date(incident.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/incidents/${incident.id}`} className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text-main transition-colors inline-block">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Link>
                                                {user?.role === 'superadmin' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDelete(incident.id);
                                                        }}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors"
                                                        title="Eliminar Incidente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-border-color">
                            <h2 className="text-xl font-bold text-text-main">Nuevo Incidente</h2>
                            <button onClick={handleCloseModal} className="text-text-muted hover:text-text-main transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Asunto</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                    placeholder="Breve descripción del problema"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Descripción Detallada</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                                    placeholder="Explica qué sucedió..."
                                />
                            </div>

                            {(user?.role === 'superadmin' || user?.role === 'agent') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Empresa (Opcional - Si se deja vacío será Global/Personal)</label>
                                    <select
                                        value={formData.company_id}
                                        onChange={e => setFormData({ ...formData, company_id: e.target.value })}
                                        className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="">Seleccionar Empresa...</option>
                                        {companiesList.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Prioridad</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-primary focus:outline-none"
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Combobox
                                        label="Tipo de Incidente"
                                        placeholder="Buscar Tipo..."
                                        options={ticketTypes.map(t => ({ value: t.id, label: t.name }))}
                                        value={formData.type_id ? parseInt(formData.type_id) : ''}
                                        onChange={(val) => setFormData({ ...formData, type_id: val })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-text-muted">Upload Screenshot</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files?.[0]) {
                                            setSelectedFile(e.dataTransfer.files[0]);
                                        }
                                    }}
                                    onClick={() => document.getElementById('file-upload').click()}
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border-color hover:border-text-muted bg-background/50'
                                        }`}
                                >
                                    <div className="w-12 h-12 bg-background rounded-full border border-border-color flex items-center justify-center mb-3">
                                        <Upload className="w-6 h-6 text-text-muted" />
                                    </div>
                                    <p className="text-text-main font-medium mb-1">
                                        {selectedFile ? selectedFile.name : 'Upload a File'}
                                    </p>
                                    <p className="text-sm text-text-muted">
                                        {selectedFile ? 'Click or drag to change' : 'Drag and drop files here'}
                                    </p>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => setSelectedFile(e.target.files[0])}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-text-muted hover:text-text-main transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Save className="w-4 h-4" />
                                    {isSubmitting ? 'Creando...' : 'Nuevo Incidente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentListPage;
