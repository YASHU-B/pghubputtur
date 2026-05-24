import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Building2 } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, loginWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/admin');
            else navigate('/owner');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await register({ ...formData, role: 'owner' });
            navigate('/owner');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle('owner');
            // Supabase OAuth redirects the browser to Google.
            // After sign-in, user is redirected back and onAuthStateChange fires automatically.
        } catch (err) {
            setError(err.message || 'Google sign-in failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden pb-20 md:pb-4">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-orange-400/10 to-orange-400/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-pink-400/10 to-orange-400/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="max-w-md w-full relative z-10 animate-fade-in">
                <div className="bg-white/85 backdrop-blur-xl rounded-xl shadow-2xl p-7 sm:p-9 border border-white/50">
                    {/* Header */}
                    <div className="text-center mb-7">
                        <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">List Your PG on pghub</h2>
                        <p className="text-gray-400 text-sm mt-1.5">Create an owner account to manage your listings</p>
                    </div>

                    {/* Subscription info */}
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                        <p className="text-sm font-bold text-orange-800 mb-1">pghub Pro — ₹299/month</p>
                        <ul className="text-xs text-orange-600 space-y-0.5">
                            <li>✓ Unlimited PG listings</li>
                            <li>✓ Direct student inquiries via phone & WhatsApp</li>
                            <li>✓ Admin-verified badge for trust</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-5 font-medium text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="text" required placeholder="John Doe" value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="email" required placeholder="you@example.com" value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="password" required placeholder="Min. 6 characters" value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-sm" />
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 btn-glow disabled:opacity-50 flex items-center justify-center gap-2 mt-2 min-h-[auto]">
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : 'Create Owner Account'}
                        </button>
                    </form>

                    <div className="my-5 relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                        <div className="relative flex justify-center"><span className="px-3 bg-white/85 text-gray-400 font-medium text-sm">or</span></div>
                    </div>

                    <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm min-h-[auto]">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5" alt="Google" />
                        Continue with Google
                    </button>

                    <p className="mt-6 text-center text-gray-500 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-orange-600 font-bold hover:underline">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
