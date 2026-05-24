import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Star } from 'lucide-react';

const ListingCard = ({ listing, idx }) => {
    const [currentImg, setCurrentImg] = useState(0);
    const images = listing.images && listing.images.length > 0 ? listing.images : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80'];
    
    useEffect(() => {
        if (images.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentImg(prev => (prev + 1) % images.length);
        }, 3000 + (idx * 200)); // Staggered start
        return () => clearInterval(interval);
    }, [images.length, idx]);

    const rooms = listing.rooms || [];
    const availableCount = rooms.filter(r => r.available !== false).length || 0;
    const gender = listing.gender_preference || listing.genderPreference || 'Any';
    const isCoed = gender === 'Any';
    const minPrice = rooms.length > 0 ? rooms[0].price : '—';
    const rating = listing.avg_rating || listing.avgRating || 0;
    const reviewCount = listing.review_count || listing.reviewCount || 0;
    
    return (
        <Link
            to={`/listing/${listing.id}`}
            className="group bg-white rounded-2xl overflow-hidden border border-gray-100/50 card-hover animate-fade-in"
            style={{ animationDelay: `${idx * 0.05}s` }}
        >
            <div className="relative h-48 sm:h-60 overflow-hidden">
                {images.map((img, i) => (
                    <img
                        key={i}
                        src={img}
                        alt={listing.name}
                        loading="lazy"
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === currentImg ? 'opacity-100' : 'opacity-0'}`}
                    />
                ))}
                
                {/* Image Overlay Gradients */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                {/* Carousel Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 right-0 left-0 flex justify-center gap-1.5 z-10">
                        {images.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImg ? 'bg-white w-3' : 'bg-white/40'}`} />
                        ))}
                    </div>
                )}
                
                {/* Availability badge */}
                <div className={`absolute top-4 right-4 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border border-white/20 text-white flex items-center gap-1.5 ${availableCount > 0 ? 'bg-emerald-500/70' : 'bg-gray-500/70'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${availableCount > 0 ? 'bg-emerald-300 animate-pulse' : 'bg-gray-300'}`} />
                    {availableCount > 0 ? `${availableCount} Rooms Left` : 'Full'}
                </div>

                {/* Gender badge */}
                <div className={`absolute top-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border border-white/20 ${isCoed ? 'bg-orange-50/80 text-orange-600' : (gender === 'Male' ? 'bg-blue-50/80 text-blue-600' : 'bg-rose-50/80 text-rose-600')}`}>
                    {gender === 'Any' ? 'Co-ed' : gender}
                </div>

                {/* Rating Badge */}
                {reviewCount > 0 && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-gray-900 shadow-xl border border-white">
                        <Star className="h-3 w-3 text-amber-500 fill-current" />
                        <span className="text-[11px] font-black leading-none">{rating}</span>
                        <span className="text-[10px] font-bold text-gray-400 leading-none">({reviewCount})</span>
                    </div>
                )}
            </div>
            
            <div className="p-5 sm:p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate group-hover:text-orange-600 transition-colors tracking-tight leading-tight">{listing.name}</h3>
                    <div className="flex items-center text-gray-400 text-xs font-medium">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-orange-500/70 flex-shrink-0" />
                        <span className="truncate">{listing.address?.area}, {listing.address?.city}</span>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-6 h-14 overflow-hidden content-start">
                    {(() => {
                        const allAmenities = (listing.amenities || []).reduce((acc, curr) => {
                            return acc.concat(curr.split(',').map(s => s.trim()).filter(Boolean));
                        }, []);
                        return (
                            <>
                                {allAmenities.slice(0, 4).map((amenity, i) => (
                                    <span key={i} className="bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight">
                                        {amenity}
                                    </span>
                                ))}
                                {allAmenities.length > 4 && (
                                    <span className="bg-orange-50 text-orange-500 px-2 py-1 rounded-lg text-[10px] font-bold">
                                        +{allAmenities.length - 4}
                                    </span>
                                )}
                            </>
                        );
                    })()}
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-50 pt-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Starting from</span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">₹{minPrice}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">/Mo</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-2xl font-black text-[11px] sm:text-xs transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-orange-100 hover:shadow-orange-200">
                        <span>VIEW PG</span>
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ListingCard;
