import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Clock, Tag, User, Save, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const IncidentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [incident, setIncident] = useState(null);
    const [comments, setComments] = useState([]);
    const [users, setUsers] = useState([]); // For assignment
    // const [ticketTypes, setTicketTypes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    // Image Preview State
    const [previewImage, setPreviewImage] = useState(null);

    // Close Ticket State
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeComment, setCloseComment] = useState('');

    useEffect(() => {
        fetchIncident();
        fetchComments();
        if (['superadmin', 'company_admin', 'agent'].includes(user?.role)) {
            fetchUsers();
        }
    }, [id, user]);

    const fetchIncident = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch(`http://localhost:3000/api/incidents/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setIncident(data);
            setEditData({
                status: data.status,
                priority: data.priority,
                assignee_id: data.assignee_id || ''
            });
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch(`http://localhost:3000/api/incidents/${id}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setComments(data);
        } catch (error) {
            console.error("Error loading comments", error);
        }
    };

    const fetchUsers = async () => {
        // Fetch users to populate assignee dropdown. 
        // For simplicity reusing user list endpoint, ideally should filter for potential assignees (Agents/Admins)
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            // Filter only agents or admins for assignment if needed, or allow all.
            // Let's allow agents and admins.
            const assignables = data.filter(u => ['agent', 'superadmin', 'company_admin'].includes(u.role));
            setUsers(assignables);
        } catch (error) {
            console.error(error);
        }
    };

    const [selectedFile, setSelectedFile] = useState(null);

    const handlePostComment = async () => {
        if (!commentText.trim() && !selectedFile) return;

        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            const formData = new FormData();
            formData.append('content', commentText);
            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            const res = await fetch(`http://localhost:3000/api/incidents/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                setCommentText('');
                setSelectedFile(null);
                fetchComments();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCloseTicket = async () => {
        if (!closeComment.trim()) return;

        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            // 1. Post Closing Comment
            await fetch(`http://localhost:3000/api/incidents/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: `[CIERRE] ${closeComment}` })
            });

            // 2. Update Status to Closed
            const res = await fetch(`http://localhost:3000/api/incidents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'closed' })
            });

            if (res.ok) {
                setShowCloseModal(false);
                setCloseComment('');
                fetchIncident();
                fetchComments();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateIncident = async () => {
        try {
            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;
            const res = await fetch(`http://localhost:3000/api/incidents/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editData)
            });

            if (res.ok) {
                setIsEditing(false);
                fetchIncident(); // Refresh
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="text-text-main p-8 animate-pulse">Cargando detalles...</div>;
    if (!incident) return <div className="text-red-500 p-8">Incidente no encontrado</div>;

    const canManage = ['superadmin', 'company_admin', 'agent'].includes(user?.role);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/incidents')}
                className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la lista</span>
            </button>

            {/* Header */}
            <div className="bg-surface border border-border-color p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-text-muted text-sm">{incident.ticket_code || `#${incident.id}`}</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${incident.status === 'open' ? 'bg-primary/10 text-primary border-primary/20' :
                                incident.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-background text-text-muted border-border-color'
                                }`}>
                                {incident.status}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-text-main mb-2">{incident.title}</h1>
                    </div>

                    {canManage && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
                        >
                            Gestionar Ticket
                        </button>
                    )}

                    {isEditing && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-text-muted hover:text-text-main"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateIncident}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
                            </button>
                        </div>
                    )}

                    {/* Close Ticket Button (Visible to everyone involved if open) */}
                    {!isEditing && incident.status !== 'closed' && incident.status !== 'resolved' && (
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-600 border border-red-600/20 rounded-lg font-medium transition-colors"
                        >
                            Cerrar Ticket
                        </button>
                    )}
                </div>

                <p className="text-text-muted mb-6 whitespace-pre-wrap">{incident.description}</p>

                {/* Attachments Section */}
                {incident.Attachments && incident.Attachments.length > 0 && (
                    <div className="mb-6 p-4 bg-background/30 rounded-xl border border-border-color/50">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Paperclip className="w-3 h-3" /> Archivos Adjuntos
                        </h3>
                        <div className="flex flex-wrap gap-4">
                            {incident.Attachments.filter(att => !att.comment_id).map(att => {
                                const isImage = att.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                return (
                                    <div key={att.id} className="group relative">
                                        {/* Debug Log */ console.log('Attachment Path:', att.file_path)}
                                        {isImage ? (
                                            <div
                                                onClick={() => setPreviewImage(`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`)}
                                                className="cursor-pointer transition-transform hover:scale-105"
                                            >
                                                <img
                                                    src={`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`}
                                                    alt={att.original_name}
                                                    className="w-24 h-24 object-cover rounded-lg border border-border-color shadow-sm group-hover:shadow-md"
                                                />
                                            </div>
                                        ) : (
                                            <a
                                                href={`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`}

                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block transition-transform hover:scale-105"
                                            >
                                                <div className="w-24 h-24 flex flex-col items-center justify-center bg-background border border-border-color rounded-lg group-hover:bg-primary/5 transition-colors">
                                                    <Paperclip className="w-6 h-6 text-text-muted group-hover:text-primary mb-1" />
                                                    <span className="text-[10px] text-text-muted px-2 text-center truncate w-full">
                                                        {att.original_name}
                                                    </span>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Info Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm p-4 bg-background/50 rounded-xl border border-border-color">
                    <div className="flex flex-col gap-1">
                        <span className="text-text-muted flex items-center gap-2">
                            <User className="w-4 h-4" /> Reportado por
                        </span>
                        <span className="text-text-main font-medium">{incident.reporter?.name || 'Unknown'}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-text-muted flex items-center gap-2">
                            <User className="w-4 h-4" /> Asignado a
                        </span>
                        {isEditing ? (
                            <select
                                value={editData.assignee_id}
                                onChange={e => setEditData({ ...editData, assignee_id: e.target.value })}
                                className="bg-background border border-border-color rounded px-2 py-1 text-text-main focus:outline-none"
                            >
                                <option value="">Sin Asignar</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-text-main font-medium">{incident.assignee?.name || 'Unassigned'}</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-text-muted flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Prioridad
                        </span>
                        {isEditing ? (
                            <select
                                value={editData.priority}
                                onChange={e => setEditData({ ...editData, priority: e.target.value })}
                                className="bg-background border border-border-color rounded px-2 py-1 text-text-main focus:outline-none"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        ) : (
                            <span className={`font-bold uppercase ${incident.priority === 'high' ? 'text-orange-500' :
                                incident.priority === 'critical' ? 'text-red-500' : 'text-text-muted'
                                }`}>{incident.priority}</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-text-muted flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Estado
                        </span>
                        {isEditing ? (
                            <select
                                value={editData.status}
                                onChange={e => setEditData({ ...editData, status: e.target.value })}
                                className="bg-background border border-border-color rounded px-2 py-1 text-text-main focus:outline-none"
                            >
                                <option value="open">Abierto</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="resolved">Resuelto</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        ) : (
                            <span className="text-text-main font-medium capitalize">{incident.status.replace('_', ' ')}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    <div className="bg-surface border border-border-color rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border-color bg-background/50">
                            <h3 className="font-bold text-text-main">Actividad y Comentarios</h3>
                        </div>

                        <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                            {comments.length === 0 && (
                                <p className="text-center text-text-muted py-8">No hay comentarios aún.</p>
                            )}
                            {Array.isArray(comments) && comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 ${comment.author?.role === 'client' ? 'bg-blue-600' : 'bg-purple-600'
                                        }`}>
                                        {comment.author?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-text-main text-sm">{comment.author?.name}</span>
                                            <span className="text-xs text-text-muted capitalize px-2 py-0.5 bg-background rounded border border-border-color">{comment.author?.role}</span>
                                            <span className="text-xs text-text-muted ml-auto">
                                                {new Date(comment.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-text-main text-sm bg-background/50 p-3 rounded-lg rounded-tl-none border border-border-color">
                                            {comment.content}
                                            {comment.attachments && comment.attachments.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {comment.attachments.map(att => {
                                                        const isImage = att.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                        return (
                                                            <div key={att.id}>
                                                                {isImage ? (
                                                                    <div
                                                                        onClick={() => setPreviewImage(`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`)}
                                                                        className="cursor-pointer group"
                                                                    >
                                                                        <img
                                                                            src={`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`}
                                                                            alt={att.original_name}
                                                                            className="w-full h-24 object-cover rounded-lg border border-border-color group-hover:opacity-90 transition-opacity"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <a
                                                                        href={`http://localhost:3000/${att.file_path.replace(/\\/g, '/')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-xs p-2 bg-background/50 rounded border border-border-color/50"
                                                                    >
                                                                        <Paperclip className="w-3 h-3" />
                                                                        <span className="truncate">{att.original_name || 'Adjunto'}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-border-color bg-background/30">
                            {selectedFile && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-background rounded-lg text-xs text-text-muted w-fit border border-border-color">
                                    <Paperclip className="w-3 h-3" />
                                    <span>{selectedFile.name}</span>
                                    <button onClick={() => setSelectedFile(null)} className="hover:text-text-main">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                    placeholder="Escribe un comentario..."
                                    className="flex-1 bg-background border border-border-color rounded-lg px-4 py-2 text-text-main focus:ring-2 focus:ring-primary focus:outline-none placeholder-text-muted/70"
                                />
                                <input
                                    type="file"
                                    id="comment-file"
                                    className="hidden"
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                />
                                <button
                                    onClick={() => document.getElementById('comment-file').click()}
                                    className={`p-2 rounded-lg transition-colors ${selectedFile ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text-main hover:bg-background'}`}
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handlePostComment}
                                    disabled={!commentText.trim() && !selectedFile}
                                    className="p-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Close Ticket Modal */}

            {/* Close Ticket Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-text-main mb-4">Cerrar Ticket</h3>
                        <p className="text-text-muted mb-4 text-sm">
                            Por favor, indica el motivo del cierre o un comentario final. Este comentario es obligatorio.
                        </p>
                        <textarea
                            value={closeComment}
                            onChange={(e) => setCloseComment(e.target.value)}
                            className="w-full bg-background border border-border-color rounded-lg p-3 text-text-main focus:ring-2 focus:ring-primary focus:outline-none mb-6 min-h-[100px]"
                            placeholder="Escribe tu comentario aquí..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="px-4 py-2 text-text-muted hover:text-text-main"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCloseTicket}
                                disabled={!closeComment.trim()}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                            >
                                Cerrar Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute -top-10 right-0 text-white hover:text-gray-300"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()} // Prevent close on image click
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default IncidentDetailPage;
