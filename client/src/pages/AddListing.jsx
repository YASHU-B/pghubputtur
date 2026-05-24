import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Upload, X, Loader, Phone, BedDouble, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import MapView from '../components/MapView';

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm font-medium';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5';
const sectionCls = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4';

const AddListing = () => {
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(isEditMode);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        phone: '',
        whatsapp: '',
        address: { street: '', area: '', city: '', state: '', pincode: '' },
        amenities: [],
        rules: '',
        genderPreference: 'Any',
        rooms: [{ sharingType: 'Single', price: '', capacity: 1, available: true }],
        images: [],
        landmarks: [],
        coordinates: null
    });
    const [amenityInput, setAmenityInput] = useState('');
    const [landmarkInput, setLandmarkInput] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Guard: must be subscribed owner and limited to 1 PG
    useEffect(() => {
        if (!user) return;
        if (user.role === 'owner' && !user.isSubscribed) {
            navigate('/owner');
            return;
        }

        if (!isEditMode && user.role === 'owner') {
            const checkLimit = async () => {
                const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
                if (count >= 1) {
                    alert('You have already reached the limit of 1 PG listing.');
                    navigate('/owner');
                }
            };
            checkLimit();
        }
    }, [user, navigate, isEditMode]);

    // Load existing listing in edit mode
    useEffect(() => {
        if (!isEditMode) return;
        (async () => {
            try {
                const { data, error } = await supabase.from('listings').select('*').eq('id', id).single();
                if (data) {
                    setFormData(prev => ({ 
                        ...prev, 
                        ...data,
                        ownerId: data.owner_id,
                        genderPreference: data.gender_preference,
                        isVerified: data.is_verified
                    }));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isEditMode]);

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const setAddr = (field, value) => setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));

    // Amenities
    const addAmenity = (e) => {
        if (e.key === 'Enter' && amenityInput.trim()) {
            e.preventDefault();
            if (!formData.amenities.includes(amenityInput.trim())) {
                set('amenities', [...formData.amenities, amenityInput.trim()]);
            }
            setAmenityInput('');
        }
    };
    // Landmarks
    const addLandmark = (e) => {
        if (e.key === 'Enter' && landmarkInput.trim()) {
            e.preventDefault();
            const val = landmarkInput.trim();
            if (!formData.landmarks?.includes(val)) {
                set('landmarks', [...(formData.landmarks || []), val]);
            }
            setLandmarkInput('');
        }
    };
    const removeLandmark = (i) => set('landmarks', formData.landmarks.filter((_, idx) => idx !== i));
    const removeAmenity = (i) => set('amenities', formData.amenities.filter((_, idx) => idx !== i));

    // Rooms
    const updateRoom = (i, field, value) => {
        const rooms = [...formData.rooms];
        rooms[i] = { ...rooms[i], [field]: value };
        set('rooms', rooms);
    };
    const addRoom = () => set('rooms', [...formData.rooms, { sharingType: 'Double', price: '', capacity: 2, available: true }]);
    const removeRoom = (i) => set('rooms', formData.rooms.filter((_, idx) => idx !== i));

    // Auto-geocoding helper
    const handleGeocode = async () => {
        if (!formData.address.area && !formData.address.city) return;
        try {
            const query = `${formData.address.area || ''}, ${formData.address.city || ''}, ${formData.address.state || 'India'}`;
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            if (res.data && res.data[0]) {
                const newCoords = {
                    lat: parseFloat(res.data[0].lat),
                    lng: parseFloat(res.data[0].lon)
                };
                set('coordinates', newCoords);
            }
        } catch (err) {
            console.error('Auto-geocoding failed:', err);
        }
    };

    // Image upload
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        if (!user) {
            alert('Please log in again. Your session might have expired.');
            return;
        }

        setUploading(true);
        console.log('Starting upload for', files.length, 'files...');
        
        try {
            const uploadedUrls = [];
            for (const file of files) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Max limit is 5MB.`);
                    continue;
                }

                console.log('Uploading:', file.name);
                const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const filePath = `${user.id}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file);
                
                if (uploadError) {
                    console.error('Upload error details:', uploadError);
                    alert(`Could not upload ${file.name}: ${uploadError.message}`);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(filePath);
                uploadedUrls.push(publicUrl);
            }
            
            if (uploadedUrls.length > 0) {
                set('images', [...formData.images, ...uploadedUrls]);
            }
        } catch (err) {
            console.error('Global upload error:', err);
            alert(`Something went wrong: ${err.message}`);
        } finally {
            setUploading(false);
            // Clear input so same file can be selected again
            e.target.value = '';
        }
    };

    const removeImage = (index) => {
        set('images', formData.images.filter((_, i) => i !== index));
    };

    const moveImage = (index, direction) => {
        const newImages = [...formData.images];
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < newImages.length) {
            [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
            set('images', newImages);
        }
    };

    const handleReplaceImage = async (e, index) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Image is too large. Max limit is 5MB.');
            return;
        }

        setUploading(true);
        try {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = `${user.id}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(filePath);
            
            const newImages = [...formData.images];
            newImages[index] = publicUrl;
            set('images', newImages);
        } catch (err) {
            console.error('Replace failed:', err);
            alert('Failed to replace image: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Save
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.phone.trim()) { alert('Phone number is required!'); return; }
        setSaving(true);
        try {
            // Final safety check for 1-listing limit
            if (!isEditMode && user.role === 'owner') {
                const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
                if (count >= 1) {
                    alert('Limit reached! You can only have one PG listing.');
                    navigate('/owner');
                    return;
                }
            }

            // Simple Geocoding via Nominatim (only if not manually picked)
            let coordinates = formData.coordinates;
            if (!coordinates) {
                try {
                    const query = `${formData.address.area}, ${formData.address.city}, ${formData.address.state || 'India'}`;
                    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                    if (res.data && res.data[0]) {
                        coordinates = {
                            lat: parseFloat(res.data[0].lat),
                            lng: parseFloat(res.data[0].lon)
                        };
                    }
                } catch (err) {
                    console.error('Geocoding failed:', err);
                    // Non-blocking
                }
            }

            // Parse rules from textarea (newline-separated) into an array
            const rulesArray = typeof formData.rules === 'string'
                ? formData.rules.split('\n').map(r => r.trim()).filter(Boolean)
                : (formData.rules || []);

            // Flush any typed inputs not yet added by pressing 'Enter'
            let finalLandmarks = formData.landmarks || [];
            if (landmarkInput.trim() && !finalLandmarks.includes(landmarkInput.trim())) {
                finalLandmarks = [...finalLandmarks, landmarkInput.trim()];
            }
            let finalAmenities = formData.amenities || [];
            if (amenityInput.trim() && !finalAmenities.includes(amenityInput.trim())) {
                finalAmenities = [...finalAmenities, amenityInput.trim()];
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                phone: formData.phone,
                whatsapp: formData.whatsapp,
                address: formData.address,
                amenities: finalAmenities,
                gender_preference: formData.genderPreference,
                rooms: formData.rooms,
                images: formData.images,
                landmarks: finalLandmarks,
                coordinates,
                rules: rulesArray,
                owner_id: user.id,
                owner_name: user.name || user.email?.split('@')[0] || '',
                is_verified: isEditMode ? (formData.isVerified || false) : false
            };

            if (isEditMode) {
                const { error: updateError } = await supabase.from('listings').update(payload).eq('id', id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('listings').insert([payload]);
                if (insertError) throw insertError;
            }
            navigate('/owner');
        } catch (err) {
            alert('Error saving listing: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Loader className="animate-spin text-orange-600 h-8 w-8" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{isEditMode ? 'Edit' : 'Add New'} <span className="gradient-text">PG Listing</span></h1>
                    <p className="text-gray-400 text-sm mt-1">Fill in the details — students will see this info directly.</p>
                </div>
                <button type="button" onClick={() => navigate('/owner')} className="text-sm font-bold text-gray-400 hover:text-orange-600 transition-all flex items-center gap-1 min-h-[auto]">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>
            </div>

            {/* Quick Actions Bar (Sticky) */}
            <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border border-orange-100 rounded-xl p-3 mb-6 shadow-lg shadow-orange-100/50 flex flex-wrap items-center gap-2 animate-slide-up">
                <button type="button" onClick={() => { addRoom(); setTimeout(() => document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} 
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-orange-100 transition-all min-h-[auto]">
                    <Plus className="h-4 w-4" /> ADD ROOM
                </button>
                <button type="button" onClick={() => document.getElementById('photos-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-orange-100 transition-all min-h-[auto]">
                    <Upload className="h-4 w-4" /> ADD PHOTOS
                </button>
                <button type="button" onClick={() => navigate('/owner')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-500 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-gray-100 transition-all min-h-[auto] sm:hidden">
                    DASHBOARD
                </button>
                <button type="submit" form="listing-form" disabled={saving || uploading}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 btn-glow min-h-[auto]">
                    {saving ? <Loader className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saving ? 'SAVING...' : 'SAVE ALL'}
                </button>
            </div>

            <form id="listing-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
                <div className={sectionCls}>
                    <h2 className="font-bold text-gray-800">Basic Information</h2>
                    <div>
                        <label className={labelCls}>PG Name *</label>
                        <input type="text" required placeholder="e.g. Sunshine PG for Girls" className={inputCls}
                            value={formData.name} onChange={e => set('name', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea rows={3} placeholder="Describe your PG — facilities, locality, nearby colleges..." className={inputCls}
                            value={formData.description} onChange={e => set('description', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Gender Preference</label>
                        <select className={inputCls} value={formData.genderPreference} onChange={e => set('genderPreference', e.target.value)}>
                            <option value="Any">Any (Co-ed)</option>
                            <option value="Male">Male Only</option>
                            <option value="Female">Female Only</option>
                        </select>
                    </div>
                </div>

                {/* Contact */}
                <div className={sectionCls}>
                    <h2 className="font-bold text-gray-800 flex items-center gap-2"><Phone className="h-5 w-5 text-orange-500" /> Contact Details</h2>
                    <p className="text-xs text-gray-400">Students will use this to call or WhatsApp you directly from the listing page.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Phone Number *</label>
                            <input type="tel" required placeholder="9876543210" className={inputCls}
                                value={formData.phone} onChange={e => set('phone', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>WhatsApp Number</label>
                            <input type="tel" placeholder="Same as phone or different" className={inputCls}
                                value={formData.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className={sectionCls}>
                    <h2 className="font-bold text-gray-800">Address</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Street / Landmark</label>
                            <input type="text" placeholder="House no, street name" className={inputCls}
                                value={formData.address.street} onChange={e => setAddr('street', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Area / Locality *</label>
                            <input type="text" required placeholder="e.g. Koramangala" className={inputCls}
                                value={formData.address.area} 
                                onChange={e => setAddr('area', e.target.value)}
                                onBlur={handleGeocode}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>City *</label>
                            <input type="text" required placeholder="e.g. Bangalore" className={inputCls}
                                value={formData.address.city} 
                                onChange={e => setAddr('city', e.target.value)}
                                onBlur={handleGeocode}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>State</label>
                            <input type="text" placeholder="e.g. Karnataka" className={inputCls}
                                value={formData.address.state} onChange={e => setAddr('state', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Pincode</label>
                            <input type="text" placeholder="560001" className={inputCls}
                                value={formData.address.pincode} onChange={e => setAddr('pincode', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Exact Location (Click Map to Apply)</label>
                            <div className="h-[250px] rounded-xl overflow-hidden border border-gray-200 mt-1 relative group">
                                <MapView 
                                    listings={formData.coordinates ? [{ ...formData, id: 'preview' }] : []}
                                    height="250px"
                                    zoom={14}
                                    onMapClick={(latlng) => set('coordinates', { lat: latlng.lat, lng: latlng.lng })}
                                />
                                {!formData.coordinates && (
                                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-orange-500" />
                                            <p className="text-xs font-bold text-gray-600">Click to pin location</p>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 bg-orange-600 text-white px-2 py-1 rounded text-[10px] font-bold z-[1000]">
                                    {formData.coordinates ? '✓ Location Set' : 'Map Picker'}
                                </div>
                            </div>
                            <p className="mt-2 text-[10px] text-gray-400 italic">* If you don't pick a location, we'll try to find it automatically from your address.</p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Nearby Landmarks (Colleges, Parks, Hubs)</label>
                            <input type="text" placeholder="Type a landmark and press Enter (e.g. Sony World Signal)" className={inputCls}
                                value={landmarkInput} onChange={e => setLandmarkInput(e.target.value)} onKeyDown={addLandmark} />
                            {formData.landmarks?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.landmarks.map((l, i) => (
                                        <span key={i} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100">
                                            {l}
                                            <button type="button" onClick={() => removeLandmark(i)} className="hover:text-red-500 min-h-[auto]">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rooms */}
                <div id="rooms-section" className={sectionCls}>
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2"><BedDouble className="h-5 w-5 text-orange-500" /> Rooms & Pricing</h2>
                        <button type="button" onClick={addRoom} className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all min-h-[auto]">
                            <Plus className="h-3.5 w-3.5" /> Add Room
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.rooms.map((room, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                        <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none"
                                            value={room.sharingType} onChange={e => updateRoom(i, 'sharingType', e.target.value)}>
                                            <option value="Single">Single</option>
                                            <option value="Double">Double</option>
                                            <option value="Triple">Triple</option>
                                            <option value="Dormitory">Dormitory</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rent/mo (₹)</label>
                                        <input type="number" placeholder="5000" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none"
                                            value={room.price} onChange={e => updateRoom(i, 'price', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Capacity</label>
                                        <input type="number" min="1" max="20" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none"
                                            value={room.capacity} onChange={e => updateRoom(i, 'capacity', parseInt(e.target.value))} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                                            <button type="button"
                                                onClick={() => updateRoom(i, 'available', !room.available)}
                                                className={`px-3 py-2.5 rounded-lg text-xs font-bold min-h-[auto] transition-all ${room.available !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {room.available !== false ? '✓ Available' : '✗ Full'}
                                            </button>
                                        </div>
                                        {formData.rooms.length > 1 && (
                                            <button type="button" onClick={() => removeRoom(i)} className="p-2.5 mt-5 text-red-400 hover:bg-red-50 rounded-lg transition-all min-h-[auto]">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Amenities */}
                <div className={sectionCls}>
                    <h2 className="font-bold text-gray-800">Amenities</h2>
                    <div>
                        <input type="text" placeholder="Type an amenity and press Enter (e.g. WiFi, AC, Gym)" className={inputCls}
                            value={amenityInput} onChange={e => setAmenityInput(e.target.value)} onKeyDown={addAmenity} />
                    </div>
                    {formData.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.amenities.map((a, i) => (
                                <span key={i} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                                    {a}
                                    <button type="button" onClick={() => removeAmenity(i)} className="hover:text-red-500 min-h-[auto]">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rules */}
                <div className={sectionCls}>
                    <h2 className="font-bold text-gray-800">House Rules</h2>
                    <textarea rows={3} placeholder="Enter rules one per line (e.g. No smoking, No guests after 10pm)"
                        className={inputCls}
                        value={Array.isArray(formData.rules) ? formData.rules.join('\n') : formData.rules}
                        onChange={e => set('rules', e.target.value)} />
                </div>

                {/* Images */}
                <div id="photos-section" className={sectionCls}>
                    <h2 className="font-bold text-gray-800">Photos</h2>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
                        {uploading ? (
                            <Loader className="animate-spin h-7 w-7 text-orange-600 mb-2" />
                        ) : (
                            <Upload className="h-7 w-7 text-gray-400 mb-2" />
                        )}
                        <span className="text-sm text-gray-500 font-medium">{uploading ? 'Uploading...' : 'Click to upload photos'}</span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB each</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    {formData.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                            {formData.images.map((url, i) => (
                                <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                    <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                                    
                                    {/* Action Overlays */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0}
                                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm disabled:opacity-30 transition-all min-h-[auto]">
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                        <label className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm cursor-pointer transition-all">
                                            <Upload className="h-4 w-4" />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReplaceImage(e, i)} />
                                        </label>
                                        <button type="button" onClick={() => removeImage(i)}
                                            className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-all min-h-[auto]">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === formData.images.length - 1}
                                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm disabled:opacity-30 transition-all min-h-[auto]">
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Slot Label */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-white">
                                        {i === 0 ? 'COVER PHOTO' : `Photo ${i + 1}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={saving || uploading}
                    className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold text-base hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 btn-glow disabled:opacity-50 flex items-center justify-center gap-3 min-h-[auto]">
                    {saving ? <Loader className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {saving ? 'Saving...' : (isEditMode ? 'Update Listing' : 'Publish Listing')}
                </button>
            </form>
        </div>
    );
};

export default AddListing;
