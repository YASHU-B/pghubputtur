import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { ExternalLink, Navigation } from 'lucide-react';

// Fix for default marker icon in Leaflet + Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapView = ({ listings, center = [12.9716, 77.5946], height = '600px', zoom = 12, onMarkerClick, onMapClick }) => {
    // Filter out listings without coordinates
    const mapListings = listings.filter(l => l.coordinates?.lat && l.coordinates?.lng);

    // Map Events Component
    const MapEvents = () => {
        useMapEvents({
            click: (e) => {
                if (onMapClick) onMapClick(e.latlng);
            }
        });
        return null;
    };

    // Correct way to change view in React Leaflet
    function Recenter({ coords }) {
        const map = useMap();
        useEffect(() => {
            if (coords) map.setView(coords, zoom);
        }, [coords, map]);
        return null;
    }

    const mapCenter = mapListings.length > 0 ? [mapListings[0].coordinates.lat, mapListings[0].coordinates.lng] : center;

    return (
        <div className="w-full rounded-xl overflow-hidden shadow-inner border border-gray-100 animate-fade-in relative z-0" style={{ height }}>
            <MapContainer 
                center={mapCenter} 
                zoom={zoom} 
                scrollWheelZoom={true} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Recenter coords={mapCenter} />
                <MapEvents />
                {mapListings.map((listing) => (
                    <Marker 
                        key={listing.id} 
                        position={[listing.coordinates.lat, listing.coordinates.lng]}
                        eventHandlers={{
                            click: () => onMarkerClick && onMarkerClick(listing)
                        }}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1 min-w-[180px]">
                                <img 
                                    src={listing.images?.[0] || 'https://via.placeholder.com/150'} 
                                    className="w-full h-24 object-cover rounded-lg mb-2" 
                                    alt={listing.name} 
                                />
                                <p className="font-bold text-gray-800 text-sm mb-1 truncate">{listing.name}</p>
                                <p className="text-xs text-orange-600 font-bold mb-3 flex justify-between items-center">
                                    <span>₹{listing.rooms?.[0]?.price || '—'}/mo</span>
                                    <span className="text-[10px] text-gray-400 font-normal">{listing.address?.area}</span>
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Link 
                                        to={`/listing/${listing.id}`} 
                                        className="text-center bg-orange-600 text-white py-2 rounded-lg text-[10px] font-bold"
                                    >
                                        Details
                                    </Link>
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${listing.coordinates.lat},${listing.coordinates.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-center bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                                    >
                                        <Navigation className="h-2.5 w-2.5" /> Maps
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
