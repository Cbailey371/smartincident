import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Mail, Tag, Plus, Trash2, Check, X, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('notifications');
    const [loading, setLoading] = useState(false);

    // Ticket Types State
    const [ticketTypes, setTicketTypes] = useState([]);
    const [companies, setCompanies] = useState([]); // For assignment
    const [showTypeForm, setShowTypeForm] = useState(false);
    const [editingType, setEditingType] = useState(null); // Track editing item
    const [newType, setNewType] = useState({ name: '', slaResponse: 60, slaResolution: 24, isGlobal: false, companies: [] });

    useEffect(() => {
        if (activeTab === 'catalog' && (user?.role === 'superadmin' || user?.role === 'company_admin')) {
            fetchTicketTypes();
            if (user?.role === 'superadmin') fetchCompanies();
        }
        if (activeTab === 'email' && user?.role === 'superadmin') {
            fetchEmailConfig();
        }
        if (activeTab === 'notifications') {
            fetchEmailConfig();
        }
    }, [activeTab]);

    // Security State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', name: '', newPassword: '', confirmPassword: '' });

    // Email Config State (camelCase to match backend)
    const [emailConfig, setEmailConfig] = useState({
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        senderEmail: '',
        isActive: false
    });

    const fetchEmailConfig = async () => {
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;
        try {
            const res = await fetch('/api/settings/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Handle both snake_case (old) and camelCase (new) for robustness
                setEmailConfig({
                    smtpHost: data.smtpHost ?? data.smtp_host ?? '',
                    smtpPort: data.smtpPort ?? data.smtp_port ?? 587,
                    smtpUser: data.smtpUser ?? data.smtp_user ?? '',
                    smtpPass: data.smtpPass ?? data.smtp_pass ?? '',
                    senderEmail: data.senderEmail ?? data.sender_email ?? '',
                    isActive: data.isActive ?? data.is_active ?? false
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return alert('Las contraseñas no coinciden');
        }

        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Contraseña actualizada');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateEmailConfig = async (e) => {
        if (e) e.preventDefault();
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(emailConfig)
            });

            if (res.ok) {
                if (e) alert('Configuración SMTP guardada');
                fetchEmailConfig();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchTicketTypes = async () => {
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;
        try {
            const res = await fetch('/api/ticket-types', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                const normalizedData = data.map(t => ({
                    ...t,
                    slaResponse: t.slaResponse ?? t.sla_response ?? 0,
                    slaResolution: t.slaResolution ?? t.sla_resolution ?? 0,
                    isGlobal: t.isGlobal ?? t.is_global ?? false
                }));
                setTicketTypes(normalizedData);
            } else {
                setTicketTypes([]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCompanies = async () => {
        setCompanies([
            { id: 1, name: 'TechSolutions Inc.' },
            { id: 2, name: 'Global Logistics' },
        ]);
    };

    const handleCreateOrUpdateType = async (e) => {
        e.preventDefault();
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        const url = editingType ? `/api/ticket-types/${editingType.id}` : '/api/ticket-types';
        const method = editingType ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newType.name,
                    description: '',
                    slaResponse: parseInt(newType.slaResponse) || 0,
                    slaResolution: parseInt(newType.slaResolution) || 0,
                    isGlobal: !!newType.isGlobal,
                    companies: []
                })
            });

            if (res.ok) {
                setShowTypeForm(false);
                setEditingType(null);
                setNewType({ name: '', slaResponse: 60, slaResolution: 24, isGlobal: false, companies: [] });
                fetchTicketTypes();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al guardar tipo');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditClick = (type) => {
        setEditingType(type);
        setNewType({
            name: type.name || '',
            slaResponse: type.slaResponse !== undefined ? type.slaResponse : (type.sla_response || 0),
            slaResolution: type.slaResolution !== undefined ? type.slaResolution : (type.sla_resolution || 0),
            isGlobal: type.isGlobal !== undefined ? type.isGlobal : !!type.is_global,
            companies: []
        });
        setShowTypeForm(true);
    };

    const handleCancelEdit = () => {
        setShowTypeForm(false);
        setEditingType(null);
        setNewType({ name: '', slaResponse: 60, slaResolution: 24, isGlobal: false, companies: [] });
    };

    const handleDeleteType = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este tipo?')) return;
        const userInfo = localStorage.getItem('userInfo');
        const token = userInfo ? JSON.parse(userInfo).token : null;

        try {
            const res = await fetch(`/api/ticket-types/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTicketTypes();
            else alert('No autorizado para eliminar este tipo');
        } catch (error) {
            console.error(error);
        }
    };

    const tabs = [
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'security', label: 'Seguridad', icon: Shield },
        { id: 'email', label: 'Servidor de Correo', icon: Mail },
        { id: 'catalog', label: 'Catálogo de Incidentes', icon: Tag },
    ];

    return (
        <div className="space-y-6">
            <div>
                <p className="text-text-muted mt-1">Gestiona las preferencias de la aplicación</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === tab.id
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-text-muted hover:bg-background/50 hover:text-text-main'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-1">
                    <div className="bg-surface border border-border-color rounded-2xl p-6 min-h-[400px]">

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-text-main">Preferencias de Notificación</h3>
                                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border-color">
                                    <div>
                                        <p className="text-text-main font-medium">Alertas por Email</p>
                                        <p className="text-sm text-text-muted">Recibir correos cuando se asigna un ticket</p>
                                    </div>
                                    <div
                                        onClick={async () => {
                                            const updated = { ...emailConfig, isActive: !emailConfig.isActive };
                                            setEmailConfig(updated);
                                            const userInfo = localStorage.getItem('userInfo');
                                            const token = userInfo ? JSON.parse(userInfo).token : null;
                                            try {
                                                await fetch('/api/settings/notifications', {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify(updated)
                                                });
                                            } catch (e) {
                                                console.error(e);
                                                setEmailConfig(emailConfig); // Rollback on error
                                            }
                                        }}
                                        className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors ${emailConfig.isActive ? 'bg-blue-600' : 'bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${emailConfig.isActive ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="max-w-md space-y-6">
                                <h3 className="text-lg font-medium text-text-main">Seguridad de la Cuenta</h3>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <label className="text-sm text-text-muted block mb-1">Contraseña Actual</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.currentPassword}
                                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-text-muted block mb-1">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-text-muted block mb-1">Confirmar Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                                        Actualizar Contraseña
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'email' && (
                            <div className="max-w-2xl space-y-6">
                                <h3 className="text-lg font-medium text-text-main">Configuración SMTP</h3>
                                <form onSubmit={handleUpdateEmailConfig} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Servidor SMTP</label>
                                            <input
                                                type="text"
                                                required
                                                value={emailConfig.smtpHost}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                                                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Puerto</label>
                                            <input
                                                type="number"
                                                required
                                                value={emailConfig.smtpPort}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value) })}
                                                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Usuario SMTP</label>
                                            <input
                                                type="text"
                                                required
                                                value={emailConfig.smtpUser}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                                                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Contraseña SMTP</label>
                                            <input
                                                type="password"
                                                value={emailConfig.smtpPass}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                                                className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main"
                                                placeholder="******"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-text-muted block mb-1">Email de Remitente</label>
                                        <input
                                            type="email"
                                            required
                                            value={emailConfig.senderEmail}
                                            onChange={e => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                                            className="w-full bg-background border border-border-color rounded-lg px-4 py-2 text-text-main"
                                        />
                                    </div>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                                        Guardar Configuración
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'catalog' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-text-main">Tipos de Incidentes y SLAs</h3>
                                    <button
                                        onClick={() => showTypeForm ? handleCancelEdit() : setShowTypeForm(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                                    >
                                        {showTypeForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {showTypeForm ? 'Cancelar' : 'Nuevo Tipo'}
                                    </button>
                                </div>

                                {showTypeForm && (
                                    <form onSubmit={handleCreateOrUpdateType} className="bg-background/50 p-4 rounded-xl border border-border-color space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-text-muted block mb-1">Nombre del Incidente</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newType.name}
                                                    onChange={e => setNewType({ ...newType, name: e.target.value })}
                                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-2 text-text-main text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 pt-6">
                                                <input
                                                    type="checkbox"
                                                    id="isGlobal"
                                                    checked={newType.isGlobal}
                                                    onChange={e => setNewType({ ...newType, isGlobal: e.target.checked })}
                                                    className="w-4 h-4 rounded bg-background border-border-color"
                                                />
                                                <label htmlFor="isGlobal" className="text-sm text-text-muted">Disponible para todos (Global)</label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-text-muted block mb-1">SLA 1ra Respuesta (horas)</label>
                                                <input
                                                    type="number"
                                                    value={newType.slaResponse}
                                                    onChange={e => setNewType({ ...newType, slaResponse: parseInt(e.target.value) })}
                                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-2 text-text-main text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-text-muted block mb-1">SLA Resolución (horas)</label>
                                                <input
                                                    type="number"
                                                    value={newType.slaResolution}
                                                    onChange={e => setNewType({ ...newType, slaResolution: parseInt(e.target.value) })}
                                                    className="w-full bg-background border border-border-color rounded-lg px-3 py-2 text-text-main text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">
                                                {editingType ? 'Actualizar Tipo' : 'Guardar Tipo'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-3">
                                    {ticketTypes.map(type => (
                                        <div key={type.id} className="flex items-center justify-between p-4 bg-background/30 rounded-xl border border-border-color">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-text-main font-medium">{type.name}</span>
                                                    {type.isGlobal && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">Global</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-text-muted mt-1 flex gap-4">
                                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> Resp: {type.slaResponse}h</span>
                                                    <span className="flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Res: {type.slaResolution}h</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditClick(type)} className="p-2 hover:bg-background text-text-muted rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteType(type.id)} className="p-2 hover:bg-red-500/10 text-text-muted rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

const ClockIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const CheckIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default SettingsPage;
