import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, X, Loader2, Save, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CompanyListPage = () => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactEmail: '',
        status: 'active'
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (editingCompany) {
            setFormData({
                name: editingCompany.name,
                address: editingCompany.address || '',
                contactEmail: editingCompany.contactEmail || '',
                status: editingCompany.status
            });
            setShowModal(true);
        }
    }, [editingCompany]);

    const fetchCompanies = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/companies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setCompanies(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching companies", error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const url = editingCompany
                ? `/api/companies/${editingCompany.id}`
                : '/api/companies';

            const method = editingCompany ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                setEditingCompany(null);
                setFormData({ name: '', address: '', contactEmail: '', status: 'active' });
                fetchCompanies();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta empresa?')) return;
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            await fetch(`/api/companies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchCompanies();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (company) => {
        setEditingCompany(company);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCompany(null);
        setFormData({ name: '', address: '', contactEmail: '', status: 'active' });
    };

    const toggleStatus = async (company) => {
        const newStatus = company.status === 'active' ? 'inactive' : 'active';
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch(`/api/companies/${company.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: company.name,
                    address: company.address,
                    contactEmail: company.contactEmail,
                    status: newStatus
                })
            });

            if (res.ok) {
                fetchCompanies();
            }
        } catch (error) {
            console.error("Error toggling status", error);
        }
    };

    const filteredCompanies = companies.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ? true : c.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted mt-1">Administra los clientes y sus configuraciones</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Empresa
                </button>
            </div>

            <div className="bg-surface border border-border-color rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border-color flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar empresas..."
                            className="w-full bg-background border border-border-color rounded-lg pl-9 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-text-muted/70"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${showFilters
                            ? 'bg-blue-600/10 border-blue-600 text-blue-600'
                            : 'bg-surface border-border-color text-text-muted hover:text-text-main hover:bg-background'
                            }`}
                    >
                        Filtrar
                    </button>
                    {(filterStatus !== 'all' || searchTerm !== '') && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className="p-4 border-b border-border-color bg-background/30 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-text-muted">Estado</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-background/50 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Usuarios</th>
                                <th className="px-6 py-4">Tickets</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">Cargando empresas...</td></tr>
                            ) : filteredCompanies.map((company) => (
                                <tr key={company.id} className="hover:bg-background/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-text-muted border border-border-color">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-text-main">{company.name}</div>
                                                <div className="text-xs text-text-muted">{company.contactEmail || 'Sin email'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(company)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all hover:brightness-110 active:scale-95 ${company.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
                                                }`}
                                            title={company.status === 'active' ? "Desactivar Empresa" : "Activar Empresa"}
                                        >
                                            <span className={`w-2 h-2 rounded-full mr-2 ${company.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                                            {company.status === 'active' ? 'Activa' : 'Inactiva'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">{company.usersCount}</td>
                                    <td className="px-6 py-4 text-text-muted">{company.ticketsCount}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(company)}
                                                className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text-main transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(company.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredCompanies.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">No se encontraron empresas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación/Edición */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-border-color">
                            <h2 className="text-xl font-bold text-text-main max-w-[80%] truncate">
                                {editingCompany ? `Editar ${editingCompany.name}` : 'Nueva Empresa'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-text-muted hover:text-text-main transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Nombre de la Empresa</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Ej. TechSolutions Inc."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Email de Contacto</label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="contacto@empresa.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Dirección</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Calle Principal 123, Ciudad"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Estado</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
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
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyListPage;
