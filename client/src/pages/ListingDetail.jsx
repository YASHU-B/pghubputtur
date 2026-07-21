import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Check, ArrowLeft, Phone, MessageCircle, Home, BedDouble, Map, Star, User, Send, Shield, Navigation, Trash2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import AdSlot from '../components/AdSlot';

const ListingDetail = () => {
    const { id } = useParams();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [reviewerName, setReviewerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const { user } = useAuth();
    const navigate = useNavigate();

    const isOwner = user && listing && user.id === listing.owner_id;

    useEffect(() => {
        if (listing?.name) {
            document.title = `${listing.name} | pghub`;
        } else {
            document.title = 'Listing Details | pghub';
        }
        return () => { document.title = 'pghub | Zero Commission PGs'; };
    }, [listing?.name]);

    useEffect(() => {
        setLoading(true);
        // Real-time listing data
        const fetchListing = async () => {
            const { data, error } = await supabase
                .from('listings')
                .select('*, owner:users(subscription_status, subscription_expires_at, created_at)')
                .eq('id', id)
                .single();
                
            if (data) {
                const viewerIsOwner = user && user.id === data.owner_id;
                const viewerIsAdmin = user && user.role === 'admin';
                
                // Determine if owner's subscription is active
                let hasActiveSubscription = true;
                if (data.owner) {
                    const isSubscribed = data.owner.subscription_status === 'active';
                    let isValidSub = isSubscribed;
                    if (isSubscribed && data.owner.subscription_expires_at) {
                        const expiresAt = new Date(data.owner.subscription_expires_at);
                        if (expiresAt < new Date()) {
                            isValidSub = false;
                        }
                    }

                    let trialDaysLeft = 0;
                    if (data.owner.created_at) {
                        const createdAt = new Date(data.owner.created_at);
                        const now = new Date();
                        const diffTime = now - createdAt;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        trialDaysLeft = Math.max(0, 180 - diffDays);
                    }

                    const isTrial = !isValidSub && trialDaysLeft > 0;
                    hasActiveSubscription = isValidSub || isTrial;
                }

                if ((!data.is_verified || !hasActiveSubscription) && !viewerIsOwner && !viewerIsAdmin) {
                    setListing(null);
                } else {
                    setListing({
                        ...data,
                        ownerId: data.owner_id,
                        ownerName: data.owner_name || 'PG Owner',
                        avgRating: data.avg_rating,
                        reviewCount: data.review_count,
                        foodAvailable: data.food_available,
                        genderPreference: data.gender_preference,
                        isVerified: data.is_verified,
                    });
                }
            }
            setLoading(false);
        };
        fetchListing();

        const listingSub = supabase.channel('public:listings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `id=eq.${id}` }, fetchListing)
            .subscribe();

        // Public approved reviews
        const fetchApprovedReviews = async () => {
            const { data } = await supabase.from('reviews')
                .select('*')
                .eq('listing_id', id)
                .eq('status', 'approved')
                .order('created_at', { ascending: false });
            if (data) {
                setReviews(data.map(d => ({
                    ...d,
                    listingId: d.listing_id,
                    userId: d.user_id,
                    userName: d.user_name,
                    createdAt: new Date(d.created_at)
                })));
            }
        };
        fetchApprovedReviews();

        const reviewsSub = supabase.channel('public:reviews:approved')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `listing_id=eq.${id}` }, fetchApprovedReviews)
            .subscribe();

        return () => {
            supabase.removeChannel(listingSub);
            supabase.removeChannel(reviewsSub);
        };
    }, [id, user]);

    // Fetch pending reviews only for owner
    useEffect(() => {
        if (!isOwner) return;
        
        const fetchPendingReviews = async () => {
            const { data } = await supabase.from('reviews')
                .select('*')
                .eq('listing_id', id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (data) {
                setPendingReviews(data.map(d => ({
                    ...d,
                    listingId: d.listing_id,
                    userId: d.user_id,
                    userName: d.user_name,
                    createdAt: new Date(d.created_at)
                })));
            }
        };
        fetchPendingReviews();

        const pendingSub = supabase.channel('public:reviews:pending')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `listing_id=eq.${id}` }, fetchPendingReviews)
            .subscribe();

        return () => {
            supabase.removeChannel(pendingSub);
        };
    }, [id, isOwner]);

    const handleReview = async (e) => {
        e.preventDefault();
        const finalName = user ? (user.name || user.email?.split('@')[0]) : reviewerName;
        if (!finalName?.trim()) { alert('Please provide your name'); return; }
        if (!comment.trim()) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from('reviews').insert({
                listing_id: id,
                user_id: user?.id || null, // null for guest
                user_name: finalName,
                rating,
                comment,
                status: 'pending'
            });

            if (error) throw error;

            setComment('');
            setReviewerName('');
            setRating(5);
            alert('Review submitted! It will appear once the owner accepts it.');
        } catch (err) {
            console.error(err);
            alert('Failed to post review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveReview = async (review) => {
        try {
            const { error } = await supabase.from('reviews').update({ status: 'approved' }).eq('id', review.id);
            if (error) throw error;
            
            // Recalculate average rating
            const approvedReviews = [...reviews, review];
            const newCount = approvedReviews.length;
            const newSum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
            const newAvg = newSum / newCount;

            const { error: listErr } = await supabase.from('listings').update({
                avg_rating: Number(newAvg.toFixed(1)),
                review_count: newCount
            }).eq('id', id);

            if (listErr) throw listErr;
            
            alert('Review approved successfully!');
        } catch (err) {
            console.error('Approve error:', err);
            alert('Failed to approve review: ' + (err.message || 'Permissions error'));
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await supabase.from('reviews').delete().eq('id', reviewId);
        } catch (err) { console.error(err); }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
        </div>
    );
    if (!listing) return (
        <div className="text-center py-24">
            <Home className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Listing not found</p>
        </div>
    );

    const fallbackImg = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80';
    const images = listing.images?.length ? listing.images : [fallbackImg];
    const phone = listing.phone || listing.ownerPhone || '';
    const whatsapp = listing.whatsapp || phone;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-60 md:pb-10 animate-fade-in">
            {/* Back */}
            <div className="flex justify-between items-center mb-5">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-medium transition-colors text-sm min-h-[auto]">
                    <ArrowLeft className="h-4 w-4" /> Back to listings
                </button>
                <button 
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: `${listing.name} | pghub`,
                                text: `Check out this PG on pghub: ${listing.name}`,
                                url: window.location.href,
                            }).catch(console.error);
                        } else {
                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this PG on pghub: ${listing.name}\n${window.location.href}`)}`;
                            window.open(whatsappUrl, '_blank');
                        }
                    }}
                    className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-medium transition-colors text-sm min-h-[auto]"
                >
                    <Share2 className="h-4 w-4" /> Share Listing
                </button>
            </div>

            {/* Images */}
            <div className="mb-8">
                <div className="rounded-2xl overflow-hidden aspect-video sm:aspect-[21/9] lg:aspect-[3/1] relative group bg-gray-100 shadow-xl border border-gray-100">
                    <img
                        src={images[selectedImage]}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={listing.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => (prev - 1 + images.length) % images.length); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-10 min-h-[auto]"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(prev => (prev + 1) % images.length); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-10 min-h-[auto]"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </>
                    )}
                    
                    {/* Floating Controls Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <span className="bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg">
                                    {(listing.gender_preference || listing.genderPreference) === 'Any' ? 'Co-ed' : `${listing.gender_preference || listing.genderPreference} Only`}
                                </span>
                                {listing.isVerified && (
                                    <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                        <Check className="h-3 w-3" /> Verified
                                    </span>
                                )}
                            </div>
                        </div>
                        {images.length > 1 && (
                            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-white border border-white/10">
                                {selectedImage + 1} / {images.length}
                            </div>
                        )}
                    </div>
                </div>
                
                {images.length > 1 && (
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide px-1">
                        {images.map((img, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setSelectedImage(idx)} 
                                className={`flex-shrink-0 w-20 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden border-2 transition-all transform hover:scale-105 active:scale-95 shadow-sm min-h-[auto] ${selectedImage === idx ? 'border-orange-500 ring-2 ring-orange-500/20 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Details */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">{listing.name}</h1>
                        <div className="flex items-center text-gray-500 text-sm mb-4">
                            <MapPin className="h-4 w-4 mr-1 text-orange-400 flex-shrink-0" />
                            {listing.address?.street && `${listing.address.street}, `}
                            {listing.address?.area && `${listing.address.area}, `}
                            {listing.address?.city}
                        </div>
                        <p className="text-gray-600 leading-relaxed text-sm">{listing.description}</p>
                    </div>

                    {/* Rooms & Availability */}
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BedDouble className="h-5 w-5 text-orange-500" /> Rooms & Pricing
                        </h2>
                        <div className="space-y-3">
                            {listing.rooms?.map((room, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${room.available !== false ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{room.sharingType} Sharing</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-orange-600">₹{room.price}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${room.available !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {room.available !== false ? '● Available' : '● Full'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sponsored Ad Slot */}
                    <AdSlot slot="1849204859" />

                    {/* Amenities */}
                    {listing.amenities?.length > 0 && (
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="font-bold text-gray-800 mb-4">Amenities</h2>
                            <div className="flex flex-wrap gap-2">
                                {(listing.amenities || []).reduce((acc, curr) => {
                                    return acc.concat(curr.split(',').map(s => s.trim()).filter(Boolean));
                                }, []).map((a, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-700 border border-gray-100">
                                        <Check className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" /> {a}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rules */}
                    {listing.rules?.length > 0 && (
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="font-bold text-gray-800 mb-3">House Rules</h2>
                            <ul className="space-y-2">
                                {listing.rules.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" /> {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Landmarks */}
                    {listing.landmarks?.length > 0 && (
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-orange-500" /> Nearby Landmarks
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {listing.landmarks.map((l, i) => (
                                    <div key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 uppercase tracking-tight">
                                        <Check className="h-3 w-3" /> {l}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Map Location */}
                    {listing.coordinates && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Map className="h-5 w-5 text-orange-500" /> Location Map
                                </h2>
                                <a 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${listing.coordinates.lat},${listing.coordinates.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all min-h-[auto]"
                                >
                                    <Navigation className="h-4 w-4" /> GET DIRECTIONS
                                </a>
                            </div>
                            <MapView listings={[listing]} height="300px" zoom={15} />
                            <p className="mt-3 text-[10px] text-gray-400 font-medium italic">* Marker shows the approximate locality based on the address provided.</p>
                        </div>
                    )}

                    {/* ── MOBILE CONTACT CARD (above reviews, hidden on desktop) ─────── */}
                    <div className="lg:hidden relative overflow-hidden rounded-xl shadow-xl border border-orange-100">
                        {/* Gradient background */}
                        <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-orange-700 p-4 pb-5">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                {/* Owner row */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0 border border-white/30">
                                        {listing.ownerName?.charAt(0).toUpperCase() || 'P'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-orange-200 text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-1">Contact Owner</p>
                                        <p className="text-white font-black text-lg leading-tight truncate">{listing.ownerName || 'PG Owner'}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                            </span>
                                            <span className="text-emerald-300 text-[11px] font-bold">Available Now</span>
                                        </div>
                                    </div>
                                    {phone && (
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-orange-200 text-[10px] font-medium leading-none mb-1">Phone</p>
                                            <p className="text-white font-black text-sm tracking-wide">{phone}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                {phone ? (
                                    <div className="flex gap-2.5">
                                        <a
                                            href={`tel:${phone}`}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white text-orange-700 py-3.5 rounded-xl font-black text-sm shadow-xl hover:bg-orange-50 transition-all active:scale-95"
                                        >
                                            <Phone className="h-4 w-4" /> Call Now
                                        </a>
                                        {whatsapp && (
                                            <a
                                                href={`https://wa.me/91${whatsapp.toString().replace(/\D/g, '')}?text=Hi, I found your PG "${listing.name}" on pghub and I'm interested.`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-400 text-white py-3.5 rounded-xl font-black text-sm shadow-xl hover:bg-emerald-300 transition-all active:scale-95"
                                            >
                                                <MessageCircle className="h-4 w-4" /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-orange-300 text-sm text-center font-medium">Contact info not available</p>
                                )}
                            </div>
                        </div>
                        {/* Bottom strip */}
                        <div className="bg-white px-5 py-3 flex items-center justify-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-orange-400" />
                            <p className="text-xs text-gray-500 font-semibold">Mention <span className="text-orange-600 font-bold">pghub</span> when you call for a warm welcome!</p>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mt-4 sm:mt-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 leading-tight">Student <span className="gradient-text">Reviews</span></h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex text-amber-400">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={`h-3.5 w-3.5 ${s <= (listing.avgRating || 0) ? 'fill-current' : ''}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{listing.avgRating || '0.0'}</span>
                                    <span className="text-xs text-gray-400 font-medium">({reviews.length} reviews)</span>
                                </div>
                            </div>
                        </div>

                        {/* Owner Moderation Console */}
                        {isOwner && pendingReviews.length > 0 && (
                            <div className="mb-10 p-6 bg-amber-50 rounded-xl border border-amber-100 shadow-sm animate-pulse-subtle">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="h-5 w-5 text-amber-600" />
                                    <h3 className="font-black text-amber-900 text-sm uppercase tracking-wider">Review Moderation Console</h3>
                                    <span className="bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black">{pendingReviews.length} PENDING</span>
                                </div>
                                <div className="space-y-4">
                                    {pendingReviews.map((r) => (
                                        <div key={r.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-inner">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{r.userName} <span className="text-[10px] text-gray-400 font-normal">({!r.userId ? 'Guest' : 'Verified User'})</span></p>
                                                    <div className="flex text-amber-400">
                                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? 'fill-current' : 'opacity-20'}`} />)}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleApproveReview(r)}
                                                        className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors"
                                                    >
                                                        APPROVE
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteReview(r.id)}
                                                        className="bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-100 transition-colors"
                                                    >
                                                        DELETE
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-xs italic">"{r.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Leave a Review */}
                        <form onSubmit={handleReview} className="mb-8 p-5 bg-gray-50/50 rounded-xl border border-gray-100 shadow-inner">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Share your experience</p>
                            {!user && (
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Your Name</label>
                                    <input 
                                        type="text"
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                                        placeholder="e.g. Rahul Sharma"
                                        value={reviewerName}
                                        onChange={e => setReviewerName(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button 
                                        key={s} 
                                        type="button" 
                                        onClick={() => setRating(s)}
                                        className="min-h-[auto] p-1 transition-transform hover:scale-110"
                                    >
                                        <Star className={`h-6 w-6 ${s <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                                    </button>
                                ))}
                            </div>
                            <textarea 
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm mb-4 resize-none"
                                placeholder="Tell others about the food, safety, and hygiene..."
                                rows="3"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                required
                            />
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-100"
                            >
                                {submitting ? 'Posting...' : <><Send className="h-4 w-4" /> Post Review</>}
                            </button>
                            {!user && (
                                <p className="mt-3 text-[10px] text-gray-400 font-medium italic">* Your review will be visible once the owner approves it.</p>
                            )}
                        </form>

                        {/* Pending Reviews (Owner only) */}
                        {isOwner && pendingReviews.length > 0 && (
                            <div className="mb-10 p-5 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200 animate-fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="h-5 w-5 text-orange-600" />
                                    <h3 className="font-black text-orange-900 text-sm uppercase tracking-wider">Pending Approval ({pendingReviews.length})</h3>
                                </div>
                                <div className="space-y-4">
                                    {pendingReviews.map((r, i) => (
                                        <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900 text-sm">{r.userName}</span>
                                                        <span className="flex text-amber-400">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? 'fill-current' : 'opacity-20'}`} />
                                                            ))}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm italic">"{r.comment}"</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleApproveReview(r)}
                                                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-100"
                                                        title="Approve Review"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteReview(r.id)}
                                                        className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                        title="Delete Review"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-[10px] text-orange-400 font-bold uppercase tracking-tight text-center italic">Only you can see these reviews until they are approved</p>
                            </div>
                        )}

                        {/* Reviews List */}
                        <div className="space-y-6">
                            {reviews.length > 0 ? reviews.map((r, i) => (
                                <div key={i} className="animate-fade-in group">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-black text-xs uppercase shadow-inner group-hover:bg-orange-50 group-hover:text-orange-400 transition-colors">
                                            {r.userName?.charAt(0) || <User className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-gray-900 text-sm">{r.userName}</h4>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {r.createdAt instanceof Date && !isNaN(r.createdAt) ? r.createdAt.toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                            <div className="flex text-amber-400 mb-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`h-2.5 w-2.5 ${s <= r.rating ? 'fill-current' : 'opacity-20 text-gray-300'}`} />
                                                ))}
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 grayscale opacity-40">
                                    <Star className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-xs font-medium text-gray-400">No reviews yet. Be the first to rate!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Contact Card (sticky on desktop, hidden on mobile) */}
                <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-orange-600 p-5 text-white">
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-200 mb-1">Contact Owner</p>
                            <p className="font-black text-xl">{listing.ownerName || 'PG Owner'}</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {phone ? (
                                <>
                                    <a href={`tel:${phone}`} className="flex items-center justify-center gap-3 w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-base hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 btn-glow">
                                        <Phone className="h-5 w-5" /> Call Now
                                    </a>
                                    {whatsapp && (
                                        <a
                                            href={`https://wa.me/91${whatsapp.toString().replace(/\D/g, '')}?text=Hi, I found your PG "${listing.name}" on pghub and I'm interested.`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-3 w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-600 transition-all"
                                        >
                                            <MessageCircle className="h-5 w-5" /> WhatsApp
                                        </a>
                                    )}
                                    <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl text-center">
                                        <p className="text-xs text-gray-400 mb-0.5 font-medium">Phone number</p>
                                        <p className="text-lg font-black text-gray-800 tracking-wider">{phone}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <Phone className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Contact info not available</p>
                                </div>
                            )}
                            <p className="text-center text-[11px] text-gray-400 pt-1">Mention pghub when you call!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListingDetail;
