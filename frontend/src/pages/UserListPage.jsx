import { useState, useEffect } from 'react';
import { Users, Plus, Search, MoreVertical, X, Save, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserListPage = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterRole, setFilterRole] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'client',
        companyId: ''
    });

    useEffect(() => {
        fetchUsers();
        if (user?.role === 'superadmin') {
            fetchCompanies();
        }
    }, [user]);

    // Handle Edit Mode Population
    useEffect(() => {
        if (editingUser) {
            setFormData({
                name: editingUser.name,
                email: editingUser.email,
                password: '',
                role: editingUser.role,
                companyId: editingUser.companyId || ''
            });
            setShowModal(true);
        }
    }, [editingUser]);

    const fetchUsers = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        // Frontend Validation
        if (formData.role === 'client' && !formData.companyId && user?.role === 'superadmin') {
            alert('Para Clientes, debes seleccionar una empresa.');
            return;
        }

        try {
            const url = editingUser
                ? `/api/users/${editingUser.id}`
                : '/api/users';

            const method = editingUser ? 'PUT' : 'POST';

            // Clean up empty password if editing
            const payload = {
                ...formData,
                companyId: formData.companyId ? parseInt(formData.companyId) : null
            };
            if (editingUser && !payload.password) delete payload.password;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                handleCloseModal();
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'client', companyId: '' });
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'all' ? true : u.role === filterRole;
        const matchesCompany = filterCompany === 'all' ? true : (u.companyId || u.company?.id) === parseInt(filterCompany);

        return matchesSearch && matchesRole && matchesCompany;
    });

    const clearFilters = () => {
        setSearchTerm('');
        setFilterRole('all');
        setFilterCompany('all');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-text-muted mt-1">Ver y gestionar usuarios del sistema</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
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
                            placeholder="Buscar usuarios..."
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
                    {(filterRole !== 'all' || filterCompany !== 'all' || searchTerm !== '') && (
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
                            <label className="text-xs font-medium text-text-muted">Rol</label>
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="all">Todos los roles</option>
                                <option value="superadmin">Super Admin</option>
                                <option value="agent">Agente</option>
                                <option value="client">Cliente</option>
                            </select>
                        </div>
                        {user?.role === 'superadmin' && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-text-muted">Empresa</label>
                                <select
                                    value={filterCompany}
                                    onChange={(e) => setFilterCompany(e.target.value)}
                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="all">Todas las empresas</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-background/50 text-xs uppercase text-text-muted font-medium">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">Cargando usuarios...</td></tr>
                            ) : filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-background/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                                                {u.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-text-main">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-background text-text-muted border border-border-color capitalize">
                                            {u.role === 'agent' ? 'Agente' :
                                                u.role === 'superadmin' ? 'Administrador' : 'Cliente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-text-muted">{u.company?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-2 hover:bg-background rounded-lg text-text-muted hover:text-text-main transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredUsers.length === 0 && (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">No se encontraron usuarios.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-border-color">
                            <h2 className="text-xl font-bold text-text-main">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-text-muted hover:text-text-main transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-muted">
                                    Contraseña {editingUser && '(Dejar en blanco para mantener)'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-muted">Rol</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="client">Cliente</option>
                                        <option value="agent">Agente Soporte</option>
                                        {user?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                                    </select>
                                </div>

                                {/* Company Selection: Only for Superadmin */}
                                {user?.role === 'superadmin' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text-muted">
                                            Empresa
                                            {formData.role === 'client' && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <select
                                            value={formData.companyId}
                                            onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                                        >
                                            <option value="">Ninguna / Global</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {formData.role === 'agent' && (
                                <p className="text-xs text-text-muted italic">
                                    * Los agentes creados sin empresa serán globales.
                                </p>
                            )}

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
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserListPage;
