import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search as SearchIcon, MapPin, Filter, Users, Building2, Map, LayoutGrid } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import MapView from '../components/MapView';

const SkeletonCard = () => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
    <div className="h-56 shimmer-loading"></div>
    <div className="p-5 space-y-3">
      <div className="h-5 w-3/4 shimmer-loading rounded-lg"></div>
      <div className="h-4 w-1/2 shimmer-loading rounded-lg"></div>
      <div className="flex gap-2">
        <div className="h-6 w-16 shimmer-loading rounded-full"></div>
        <div className="h-6 w-16 shimmer-loading rounded-full"></div>
      </div>
      <div className="h-10 w-full shimmer-loading rounded-xl mt-4"></div>
    </div>
  </div>
);

const Search = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const cityParam = searchParams.get('city') || '';

    const [listings, setListings] = useState(() => {
        const cached = localStorage.getItem('search_listings');
        return cached ? JSON.parse(cached) : [];
    });
    const [loading, setLoading] = useState(!listings.length);
    const [isMapView, setIsMapView] = useState(false);
    const [filters, setFilters] = useState({
        city: cityParam,
        gender: '',
        maxPrice: ''
    });

    // Sync URL param with internal filter state
    useEffect(() => {
        setFilters(prev => ({ ...prev, city: cityParam }));
    }, [cityParam]);

    useEffect(() => {
        document.title = filters.city ? `PGs in ${filters.city} | pghub` : 'Search PGs | pghub';
        return () => { document.title = 'pghub | Zero Commission PGs'; };
    }, [filters.city]);

    useEffect(() => {
        setLoading(true);
        const fetchListings = async () => {
            const { data, error } = await supabase
                .from('listings')
                .select('*');

            if (error) {
                console.error('Error fetching listings:', error);
                setLoading(false);
                return;
            }

            const filtered = (data || []).filter(item => {
                if (!item) return false;
                
                const cityTarget = item.address?.city || '';
                const matchCity = filters.city ? (
                    cityTarget.toLowerCase().includes(filters.city.toLowerCase()) ||
                    (item.landmarks && item.landmarks.some(l => l.toLowerCase().includes(filters.city.toLowerCase())))
                ) : true;
                
                const matchGender = filters.gender ? item.gender_preference === filters.gender || item.genderPreference === filters.gender : true;
                
                const rooms = item.rooms || [];
                const matchPrice = filters.maxPrice ? rooms.some(r => r && r.price <= parseInt(filters.maxPrice)) : true;
                
                return matchCity && matchGender && matchPrice;
            });

            setListings(filtered);
            localStorage.setItem('search_listings', JSON.stringify(filtered));
            setLoading(false);
        };

        fetchListings();

        const subscription = supabase
            .channel('public:listings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, fetchListings)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [filters.city, filters.gender, filters.maxPrice]);

    const handleSearch = (e) => {
        e.preventDefault();
        // Sync the city filter into the URL so it's shareable; useEffect watches filters & re-fetches
        if (filters.city) {
            setSearchParams({ city: filters.city });
        } else {
            setSearchParams({});
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-40 md:pb-10">
            {/* Header / Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Explore <span className="gradient-text">PGs & Hostels</span></h1>
                    <p className="text-gray-500">Find your perfect stay from our verified listings. Contact owners directly.</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200 self-end sm:self-auto">
                    <button 
                        onClick={() => setIsMapView(false)} 
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${!isMapView ? 'bg-white text-orange-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid className="h-4 w-4" /> LIST
                    </button>
                    <button 
                        onClick={() => setIsMapView(true)} 
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${isMapView ? 'bg-white text-orange-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Map className="h-4 w-4" /> MAP
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 md:mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <MapPin className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="City or Landmark (e.g. Koramangala)"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        />
                    </div>
                    <div className="relative">
                        <Users className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                        <select
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-medium text-sm"
                            value={filters.gender}
                            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                        >
                            <option value="">Any Gender</option>
                            <option value="Male">Male Only</option>
                            <option value="Female">Female Only</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                            type="number"
                            placeholder="Max Budget"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200 btn-glow min-h-[auto] text-sm">
                        <SearchIcon className="h-5 w-5" /> Search
                    </button>
                </form>
            </div>

            {/* Results */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : isMapView ? (
                <MapView 
                    listings={listings} 
                    onMarkerClick={(l) => navigate(`/listing/${l.id}`)}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                    {listings.map((listing, idx) => (
                        <ListingCard key={listing.id} listing={listing} idx={idx} />
                    ))}
                </div>
            )}
            {!loading && listings.length === 0 && (
                <div className="text-center py-24 animate-fade-in bg-white rounded-xl border-2 border-dashed border-gray-100">
                    <Building2 className="h-16 w-16 text-orange-50 mx-auto mb-4" />
                    <p className="text-gray-400 text-xl font-bold uppercase tracking-tight">No match found</p>
                    <p className="text-gray-300 text-sm mt-1">Adjust filters or search a different city.</p>
                </div>
            )}
        </div>
    );
};

export default Search;
