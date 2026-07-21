import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Shield, Check, X, Loader, Users, Home, Crown, MapPin, Trash2, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');

    const fetchAll = async () => {
        setLoading(true);
        try {
            try {
                const { data: listingsData } = await supabase.from('listings').select('*').order('created_at', { ascending: false });
                if (listingsData) {
                    setListings(listingsData.map(d => ({
                        ...d,
                        ownerId: d.owner_id,
                        ownerName: d.owner_name,
                        ownerEmail: d.owner_email,
                        isVerified: d.is_verified
                    })));
                }
            } catch (err) {
                console.error("Listings fetch failed:", err);
            }

            try {
                const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
                if (usersData) {
                    setUsers(usersData.map(d => {
                        // Calculate subscription/trial status
                        let isSubscribed = d.subscription_status === 'active';
                        if (isSubscribed && d.subscription_expires_at) {
                            const expiresAt = new Date(d.subscription_expires_at);
                            if (expiresAt < new Date()) {
                                isSubscribed = false;
                            }
                        }

                        const createdAt = new Date(d.created_at);
                        const now = new Date();
                        const diffTime = now - createdAt;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        const trialDaysLeft = Math.max(0, 180 - diffDays);
                        const isTrial = !isSubscribed && trialDaysLeft > 0;

                        return {
                            ...d,
                            isSubscribed,
                            isTrial,
                            trialDaysLeft,
                            statusLabel: isSubscribed ? 'Pro Member' : isTrial ? 'Free Trial' : 'Expired'
                        };
                    }));
                }
            } catch (err) {
                console.error("Users fetch failed:", err);
                // If users fetch fails (e.g. permission), don't break the listings view
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'admin') navigate('/');
            else fetchAll();
        }
    }, [user, authLoading, navigate]);

    if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader className="animate-spin text-orange-600 h-8 w-8" /></div>;
    if (!user || user.role !== 'admin') return null;

    const verify = async (id, val) => {
        await supabase.from('listings').update({ is_verified: val }).eq('id', id);
        fetchAll();
    };
    const deleteListing = async (id) => {
        if (!window.confirm('Delete this listing?')) return;
        await supabase.from('listings').delete().eq('id', id);
        fetchAll();
    };
    const deleteUser = async (uid) => {
        if (uid === user.id) { alert('Cannot delete yourself!'); return; }
        if (!window.confirm('Delete this user?')) return;
        await supabase.from('users').delete().eq('id', uid);
        fetchAll();
    };
    const toggleSubscription = async (uid, current) => {
        const nextStatus = current ? 'trial' : 'active';
        const expiresAt = nextStatus === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
        
        await supabase.from('users').update({ 
            subscription_status: nextStatus,
            subscription_expires_at: expiresAt
        }).eq('id', uid);
        fetchAll();
    };

    const pending = listings.filter(l => !l.isVerified);
    const verified = listings.filter(l => l.isVerified);
    const owners = users.filter(u => u.role === 'owner');
    const subscribedOwners = owners.filter(o => o.isSubscribed);

    const tabs = [
        { key: 'pending', label: `Pending (${pending.length})` },
        { key: 'verified', label: `Live PGs (${verified.length})` },
        { key: 'owners', label: `Owners (${owners.length})` },
        { key: 'users', label: `All Users (${users.length})` },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-10 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
                <div className="p-2.5 bg-orange-600 rounded-xl shadow-lg shadow-orange-200">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Admin Console</h1>
                    <p className="text-xs text-gray-400">Manage listings, owners, and subscriptions</p>
                </div>
                <button 
                  onClick={fetchAll} 
                  className="ml-auto p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-gray-500" 
                  title="Refresh"
                >
                    <Loader className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="stat-card-indigo p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total PGs</p>
                    <p className="text-2xl font-black text-gray-900">{listings.length}</p>
                </div>
                <div className="stat-card-amber p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-black text-amber-600">{pending.length}</p>
                </div>
                <div className="stat-card-emerald p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Subscribed</p>
                    <p className="text-2xl font-black text-emerald-600">{subscribedOwners.length}</p>
                </div>
                <div className="stat-card-rose p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Revenue</p>
                    <p className="text-2xl font-black text-rose-600">₹{subscribedOwners.length * 99}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[auto] ${activeTab === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
            ) : (
                <>
                    {/* Pending Listings */}
                    {activeTab === 'pending' && (
                        <div className="space-y-3">
                            {pending.length === 0 && (
                                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                                    <Check className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">All caught up! No pending listings.</p>
                                </div>
                            )}
                            {pending.map(l => (
                                <div key={l.id} className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
                                    <div className="flex flex-col sm:flex-row">
                                        <div className="w-full sm:w-32 h-28 flex-shrink-0">
                                            <img src={l.images?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&w=400'} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col sm:flex-row justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{l.name}</h3>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{l.address?.area}, {l.address?.city}</p>
                                                {l.phone && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{l.phone}</p>}
                                                <p className="text-xs text-gray-400 mt-0.5">By: {l.ownerName || l.ownerEmail}</p>
                                            </div>
                                            <div className="flex gap-2 items-start">
                                                <button onClick={() => verify(l.id, true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all min-h-[auto]">
                                                    <Check className="h-4 w-4" /> Verify
                                                </button>
                                                <button onClick={() => deleteListing(l.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all min-h-[auto]">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Verified Listings */}
                    {activeTab === 'verified' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {verified.map(l => (
                                <div key={l.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover group">
                                    <div className="h-36 overflow-hidden relative">
                                        <img src={l.images?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&w=400'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">✓ Verified</div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{l.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{l.address?.city}</p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => verify(l.id, false)} className="flex-1 py-2 text-xs font-bold bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all min-h-[auto]">
                                                Revoke
                                            </button>
                                            <button onClick={() => deleteListing(l.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all min-h-[auto]">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Owners */}
                    {activeTab === 'owners' && (
                        <div className="space-y-3">
                            {owners.map(o => (
                                <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                            {o.name?.charAt(0).toUpperCase() || 'O'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-800 text-sm">{o.name || 'Owner'}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${o.isSubscribed ? 'bg-orange-100 text-orange-700' : o.isTrial ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {o.statusLabel}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">{o.email}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            {o.isSubscribed ? (
                                                <div className="text-right mr-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Expires</p>
                                                    <p className="text-xs font-bold text-gray-700">{o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString() : '—'}</p>
                                                </div>
                                            ) : o.isTrial ? (
                                                <div className="text-right mr-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Trial Ends</p>
                                                    <p className="text-xs font-bold text-emerald-600">{o.trialDaysLeft} days left</p>
                                                </div>
                                            ) : (
                                                <div className="text-right mr-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</p>
                                                    <p className="text-xs font-bold text-red-500">Subscription Required</p>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => toggleSubscription(o.id, o.isSubscribed)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[auto] ${o.isSubscribed ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white'}`}>
                                                    {o.isSubscribed ? 'Revoke Pro' : 'Manual Grant'}
                                                </button>
                                                <button onClick={() => deleteUser(o.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all min-h-[auto]">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-300">Joined: {new Date(o.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {owners.length === 0 && <p className="text-center py-12 text-gray-400">No owners registered yet.</p>}
                        </div>
                    )}

                    {/* All Users */}
                    {activeTab === 'users' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {['Name', 'Email', 'Role', 'Sub', ''].map(h => (
                                                <th key={h} className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3.5 font-bold text-gray-800 text-sm">{u.name || '—'}</td>
                                                <td className="px-5 py-3.5 text-gray-500 text-sm">{u.email}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : u.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {u.isSubscribed ? <span className="text-emerald-600 text-xs font-bold">● Pro</span> : <span className="text-gray-400 text-xs">—</span>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button onClick={() => deleteUser(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all min-h-[auto]">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
