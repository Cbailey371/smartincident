import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await login(email, password);
        if (!res.success) {
            setError(res.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative transition-colors duration-200">
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 p-2 rounded-full bg-surface border border-border-color text-text-main hover:bg-background/80 transition-colors"
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-full max-w-md bg-surface border border-border-color rounded-2xl p-8 shadow-2xl transition-colors duration-200">
                <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center mb-6">
                        <img src="/logo.png" alt="SMARTINCIDENT Logo" className="h-44 object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-main mb-2">SMARTINCIDENT</h1>
                    <p className="text-text-muted text-sm">Ingresa tus credenciales para continuar</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-muted">Email Corporativo</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-5 h-5 text-text-muted" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg pl-10 pr-4 py-2.5 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder-text-muted/50"
                                placeholder="usuario@empresa.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-muted">Contraseña</label>
                            <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 animate-pulse">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 w-5 h-5 text-text-muted" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background border border-border-color rounded-lg pl-10 pr-4 py-2.5 text-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder-text-muted/50"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[10px] text-text-muted font-medium tracking-widest uppercase">
                    v1.0.0 (Build 2026.01.14) - © 2026 CBTECH Consulting Solutions Systems. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
