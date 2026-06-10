import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Home, Plus, Edit, Trash2, MapPin, Eye, BedDouble, Phone, Crown, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const OwnerDashboard = () => {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        // Check for trial expiration email trigger
        const checkTrialEmail = async () => {
            const hasSent = localStorage.getItem(`trial_email_sent_${user.id}`);
            if (!user.isSubscribed && user.trialDaysLeft <= 0 && !hasSent) {
                try {
                    await fetch('/api/sendTrialExpiredEmail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ownerEmail: user.email,
                            ownerName: user.name || 'Owner',
                            daysLeft: user.trialDaysLeft
                        })
                    });
                    localStorage.setItem(`trial_email_sent_${user.id}`, 'true');
                } catch (err) {
                    console.error('Failed to send trial email:', err);
                }
            }
        };
        checkTrialEmail();

        const fetchListings = async () => {
            try {
                const { data, error } = await supabase.from('listings').select('*').eq('owner_id', user.id);
                if (error) throw error;
                if (data) {
                    setListings(data.map(d => ({
                        ...d,
                        ownerId: d.owner_id,
                        isVerified: d.is_verified
                    })));
                }
            } catch (err) {
                console.error("fetchListings error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchListings();

        const channel = supabase.channel('public:listings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `owner_id=eq.${user.id}` }, fetchListings)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    const deleteListing = async (id) => {
        if (!window.confirm('Delete this listing?')) return;
        try {
            await supabase.from('listings').delete().eq('id', id);
        } catch (error) {
            console.error(error);
            alert('Error deleting listing.');
        }
    };

    const toggleAvailability = async (listingId, roomIdx, current) => {
        const listing = listings.find(l => l.id === listingId);
        if (!listing || !listing.rooms) return;

        // 1. Optimistic Update (Immediate UI response)
        const updatedRooms = listing.rooms.map((r, i) =>
            i === roomIdx ? { ...r, available: !current } : r
        );
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, rooms: updatedRooms } : l));

        // 2. Database Sync
        try {
            const { error } = await supabase.from('listings').update({ rooms: updatedRooms }).eq('id', listingId);
            if (error) throw error;
        } catch (err) { 
            console.error(err);
            alert('Failed to update availability. Please check your connection.');
            // Revert on error
            setListings(prev => prev.map(l => l.id === listingId ? { ...l, rooms: listing.rooms } : l));
        }
    };

    const toggleAllRooms = async (listingId, makeAvailable) => {
        const listing = listings.find(l => l.id === listingId);
        if (!listing || !listing.rooms) return;

        // 1. Optimistic Update
        const updatedRooms = listing.rooms.map(r => ({ ...r, available: makeAvailable }));
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, rooms: updatedRooms } : l));

        // 2. Database Sync
        try {
            const { error } = await supabase.from('listings').update({ rooms: updatedRooms }).eq('id', listingId);
            if (error) throw error;
        } catch (err) { 
            console.error(err);
            alert('Failed to update rooms. Reverting changes.');
            setListings(prev => prev.map(l => l.id === listingId ? { ...l, rooms: listing.rooms } : l));
        }
    };

    const handleSubscribe = async () => {
        setIsSaving(true);
        try {
            // 1. Create order
            const res = await fetch('/api/create-order', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    amount: 29900, // ₹299 in paise
                    userId: user.uid || user.id
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'API Route Not Found or Server Error' }));
                throw new Error(errorData.message || `Server Error (${res.status})`);
            }

            const order = await res.json();
            
            if (!order || !order.id) {
                const errorMsg = order.message || order.error || "Unknown Error";
                throw new Error(`Order Creation Failed: ${errorMsg}`);
            }

            // 2. Initialize Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "pghubputtur",
                image: "/logo.png",
                description: "Pro Activation (1 Month)",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        
                        const verifyRes = await fetch('/api/verify-payment', {
                            method: "POST",
                            headers: { 
                                "Content-Type": "application/json",
                                "Authorization": session ? `Bearer ${session.access_token}` : ""
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                userId: user.uid || user.id
                            })
                        });

                        if (!verifyRes.ok) {
                            const errorText = await verifyRes.text();
                            let errorMessage = 'Verification Failed';
                            try {
                                const errorData = JSON.parse(errorText);
                                errorMessage = errorData.message || errorMessage;
                            } catch (e) {
                                errorMessage = errorText || errorMessage;
                            }
                            throw new Error(errorMessage);
                        }

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            alert("Success! Your subscription is now active.");
                            window.location.reload();
                        } else {
                            alert("Payment verification failed: " + (verifyData.message || "Unknown error"));
                        }
                    } catch (e) {
                        alert("Error verifying payment: " + e.message);
                    } finally {
                        setIsSaving(false);
                    }
                },
                prefill: {
                    name: user.name || "PG Owner",
                    email: user.email,
                },
                theme: { color: "#ea580c" },
                modal: {
                    ondismiss: function() {
                        setIsSaving(false);
                    }
                }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                alert("Payment Failed: " + response.error.description);
                setIsSaving(false);
            });
            rzp.open();
        } catch (err) {
            console.error(err);
            alert('Failed to start checkout: ' + err.message);
            setIsSaving(false);
        }
    };

    const totalRooms = listings.reduce((a, l) => a + (l.rooms?.length || 0), 0);
    const availableRooms = listings.reduce((a, l) => a + (l.rooms?.filter(r => r.available !== false).length || 0), 0);
    const verifiedCount = listings.filter(l => l.isVerified).length;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-7">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Owner <span className="gradient-text">Dashboard</span></h1>
                    <p className="text-gray-400 text-sm mt-0.5">Welcome back, {user?.name || 'Owner'}!</p>
                </div>
                {user?.isSubscribed ? (
                    listings.length >= 1 ? (
                        <span className="flex items-center gap-2 bg-gray-100 text-gray-400 px-5 py-3 rounded-xl font-bold text-sm cursor-not-allowed border border-gray-200" title="Limit reached: Max 1 PG listing per owner">
                            <Plus className="h-4 w-4" /> Limit Reached
                        </span>
                    ) : (
                        <Link to="/owner/add-listing" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 btn-glow text-sm min-h-[auto]">
                            <Plus className="h-4 w-4" /> Add New PG
                        </Link>
                    )
                ) : (
                    <span className="flex items-center gap-2 bg-gray-100 text-gray-400 px-5 py-3 rounded-xl font-bold text-sm cursor-not-allowed" title="Subscribe to add listings">
                        <Plus className="h-4 w-4" /> Add New PG
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                <div className="stat-card-indigo p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Listings</p>
                    <p className="text-2xl font-black text-gray-900">{listings.length}</p>
                </div>
                <div className="stat-card-emerald p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Verified</p>
                    <p className="text-2xl font-black text-emerald-600">{verifiedCount}</p>
                </div>
                <div className="stat-card-amber p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Rooms</p>
                    <p className="text-2xl font-black text-amber-600">{totalRooms}</p>
                </div>
                <div className="stat-card-rose p-4 rounded-xl">
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Available</p>
                    <p className="text-2xl font-black text-rose-600">{availableRooms}</p>
                </div>
            </div>

            {/* Subscription / Trial Gate */}
            {user?.isSubscribed && !user?.isTrial ? (
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-5 mb-7 text-white relative overflow-hidden shadow-lg shadow-orange-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Crown className="h-6 w-6 text-yellow-300" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-lg">Pro Subscription Active</p>
                                    <span className="bg-white/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Pro Member</span>
                                </div>
                                <p className="text-orange-50 text-sm font-medium">Thank you for your support! Your account has full access to all features.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-wider">Valid Until</p>
                            <p className="font-bold text-sm">{user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString() : 'Next Month'}</p>
                        </div>
                    </div>
                </div>
            ) : user?.isTrial ? (
                <div className="bg-emerald-600 rounded-xl p-5 mb-7 text-white relative overflow-hidden shadow-lg shadow-emerald-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Crown className="h-6 w-6 text-yellow-300" />
                            </div>
                            <div>
                                <p className="font-black text-lg">30-Day Free Trial Active</p>
                                <p className="text-emerald-50 text-sm font-medium">{user.trialDaysLeft} days left in your free trial. Enjoy all Pro features!</p>
                            </div>
                        </div>
                        <button onClick={handleSubscribe} disabled={isSaving} className="bg-white text-emerald-700 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-all text-xs shadow-md">
                            Upgrade Early — ₹299/mo
                        </button>
                    </div>
                </div>
            ) : !user?.isSubscribed && (
                <div className="bg-orange-600 rounded-xl p-6 mb-7 text-white relative overflow-hidden shadow-lg shadow-orange-100">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Crown className="h-5 w-5 text-yellow-300" />
                                <p className="font-black text-lg">Trial Expired</p>
                            </div>
                            <p className="text-orange-100 text-sm">Your 30-day free trial has ended. Subscribe for ₹299/month to keep your listings active.</p>
                        </div>
                        <button onClick={handleSubscribe} disabled={isSaving} className="flex-shrink-0 bg-white text-orange-600 px-6 py-3 rounded-xl font-black hover:bg-orange-50 transition-all shadow-xl min-h-[auto] text-sm">
                            {isSaving ? 'Activating...' : 'Activate Pro — ₹299/mo'}
                        </button>
                    </div>
                </div>
            )}

            {/* Refund & Cancellation Policy Notice */}
            {!user?.isSubscribed && (
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 mb-7 text-xs text-gray-500 flex flex-col gap-1 shadow-sm">
                    <p className="font-bold text-gray-700">Cancellation & Refund Policy</p>
                    <p className="leading-relaxed">
                        Once paid, the Pro activation subscription fee of ₹299 is **strictly non-refundable**. 
                        Cancellation requests will ensure that no future payments are charged, but no refunds will be issued for the current active period.
                    </p>
                </div>
            )}

            {/* Listings */}
            <div className="mb-7">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Your PG Listings</h2>
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <Home className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium text-sm">No listings yet</p>
                        {user?.isSubscribed
                            ? <Link to="/owner/add-listing" className="text-orange-600 font-bold hover:underline text-sm mt-1 inline-block">Add your first PG →</Link>
                            : <p className="text-gray-300 text-xs mt-1">Subscribe to start listing</p>
                        }
                    </div>
                ) : (
                    <div className="space-y-4">
                        {listings.map(l => (
                            <div key={l.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Image */}
                                    <div className="w-full sm:w-40 h-36 sm:h-auto flex-shrink-0 relative">
                                        <img
                                            src={l.images?.[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80'}
                                            className="w-full h-full object-cover"
                                            alt={l.name}
                                        />
                                        <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-xl text-[11px] font-bold ${l.isVerified ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            {l.isVerified ? '✓ Verified' : '⏳ Pending'}
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 p-4">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{l.name}</h3>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {l.address?.area}, {l.address?.city}
                                                </p>
                                                {l.phone && (
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Phone className="h-3 w-3" /> {l.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1.5 flex-shrink-0">
                                                <Link to={`/listing/${l.id}`} className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-all min-h-[auto]" title="Preview">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link to={`/owner/edit-listing/${l.id}`} className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all min-h-[auto]">
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => deleteListing(l.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all min-h-[auto]">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* ── Master availability toggle ── */}
                                        {(() => {
                                            const allAvailable = l.rooms?.every(r => r.available !== false);
                                            const allFull = l.rooms?.every(r => r.available === false);
                                            return (
                                                <div className={`mt-3 flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                                    allAvailable
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : allFull
                                                        ? 'bg-red-50 border-red-200'
                                                        : 'bg-amber-50 border-amber-200'
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        {allAvailable ? (
                                                            <ToggleRight className="h-6 w-6 text-emerald-500" />
                                                        ) : (
                                                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                                                        )}
                                                        <div>
                                                            <p className={`text-xs font-black uppercase tracking-wider ${
                                                                allAvailable ? 'text-emerald-700' : allFull ? 'text-red-600' : 'text-amber-700'
                                                            }`}>
                                                                {allAvailable ? '● Fully Available' : allFull ? '● Fully Booked' : '◐ Partially Available'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                                {l.rooms?.filter(r => r.available !== false).length}/{l.rooms?.length} rooms open
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => toggleAllRooms(l.id, true)}
                                                            disabled={allAvailable}
                                                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[11px] font-black hover:bg-emerald-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[auto]"
                                                        >
                                                            All Open
                                                        </button>
                                                        <button
                                                            onClick={() => toggleAllRooms(l.id, false)}
                                                            disabled={allFull}
                                                            className="px-3 py-1.5 bg-red-400 text-white rounded-xl text-[11px] font-black hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed min-h-[auto]"
                                                        >
                                                            All Full
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* ── Per-room toggle switches ── */}
                                        <div className="flex flex-wrap gap-2 mt-2.5">
                                            {l.rooms?.map((room, idx) => {
                                                const isAvailable = room.available !== false;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => toggleAvailability(l.id, idx, isAvailable)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all min-h-[auto] ${
                                                            isAvailable
                                                                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <BedDouble className={`h-3 w-3 flex-shrink-0 ${isAvailable ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                        <span className={`text-[11px] font-bold ${isAvailable ? 'text-emerald-800' : 'text-gray-500'}`}>
                                                            {room.sharingType} · ₹{room.price}
                                                        </span>
                                                        {/* Toggle pill */}
                                                        <div className={`relative w-8 h-4 rounded-full transition-all flex-shrink-0 ${
                                                            isAvailable ? 'bg-emerald-500' : 'bg-gray-300'
                                                        }`}>
                                                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                                                isAvailable ? 'left-[18px]' : 'left-0.5'
                                                            }`} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-gray-300 mt-1">Tap any room to toggle · Use buttons above for all rooms</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Subscription Status Card */}
            {user?.isSubscribed && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-xl">
                                <Crown className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-sm">pghub Pro — Active</p>
                                <p className="text-xs text-gray-400">₹299/month · All features unlocked</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold min-h-[auto]">
                            <Check className="h-3.5 w-3.5" /> Active
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
