import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import { ShieldCheck, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Leaflet marker icon configuration fix for React compatibility
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom hook component to capture map click coordinates
const MapClickHandler = ({ setPosition }: { setPosition: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

// Haversine distance formula
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

const PostItemPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<LocationState>({ province: '', district: '', city: '' });
  const [externalLocation, setExternalLocation] = useState<LocationState | null>(null);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Police Station Recommendation State
  const [nearestPolice, setNearestPolice] = useState<{name: string, lat: number, lon: number, distance: number} | null>(null);
  const [isSearchingPolice, setIsSearchingPolice] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'LOST',
    category: 'Electronics',
    date: '',
    contactNumber: '',
    securityQuestion: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  React.useEffect(() => {
    if (mapPosition) {
      const fetchLocation = async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${mapPosition[0]}&lon=${mapPosition[1]}`, {
            headers: {
              'User-Agent': 'LostAndFoundApp/1.0'
            }
          });
          const data = await response.json();
          if (data && data.address) {
            let province = data.address.state || '';
            let district = data.address.state_district || data.address.county || '';
            let city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';

            // Clean up mapping strings to match locations.ts format
            province = province.replace(' Province', '').trim();
            district = district.replace(' District', '').trim();
            
            setExternalLocation({ province, district, city });
          }
        } catch (error) {
          console.error("Reverse geocoding failed", error);
        }
      };
      
      const fetchPolice = async () => {
        if (formData.type !== 'FOUND') return;
        setIsSearchingPolice(true);
        setNearestPolice(null);
        try {
          const query = `
            [out:json];
            node["amenity"="police"](around:10000,${mapPosition[0]},${mapPosition[1]});
            out 5;
          `;
          const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.elements && data.elements.length > 0) {
            let closest = null;
            let minDistance = Infinity;

            data.elements.forEach((el: any) => {
              const dist = getDistanceFromLatLonInKm(mapPosition[0], mapPosition[1], el.lat, el.lon);
              if (dist < minDistance) {
                minDistance = dist;
                closest = {
                  name: el.tags.name || 'Local Police Station',
                  lat: el.lat,
                  lon: el.lon,
                  distance: dist
                };
              }
            });

            if (closest) {
              setNearestPolice(closest);
            }
          }
        } catch (error) {
          console.error("Failed to find police station", error);
        } finally {
          setIsSearchingPolice(false);
        }
      };

      // 500ms debounce
      const timeout = setTimeout(() => {
        fetchLocation();
        fetchPolice();
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setNearestPolice(null);
    }
  }, [mapPosition, formData.type]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.province || !location.district || !location.city) {
      Swal.fire({ icon: 'error', title: 'Location Required', text: 'Please complete the geographic registration.', confirmButtonColor: '#800000' });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      data.append('province', location.province);
      data.append('district', location.district);
      data.append('city', location.city);
      
      if (mapPosition) {
        data.append('latitude', mapPosition[0].toString());
        data.append('longitude', mapPosition[1].toString());
      }
      
      if (imageFile) data.append('image', imageFile);

      await api.post('/items', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire({
        title: 'Successfully Posted!',
        text: 'Your item report has been published to the national network.',
        icon: 'success',
        confirmButtonColor: '#800000'
      });
      navigate('/');
    } catch (error: any) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to post item',
        icon: 'error',
        confirmButtonColor: '#800000'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
    >
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Report an Item</h2>
        <p className="text-gray-500 mt-2">Help reunite lost assets with their rightful owners across Sri Lanka.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">Core Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Report Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none">
                <option value="LOST">I Lost Something</option>
                <option value="FOUND">I Found Something</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none">
                <option value="Electronics">Electronics (Phones, Laptops)</option>
                <option value="Documents">Official Documents (NIC, Passport)</option>
                <option value="Keys">Keys</option>
                <option value="Bags">Bags & Luggage</option>
                <option value="Wallets">Wallets & Purses</option>
                <option value="Pets">Pets</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
            <input required type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., iPhone 13 Pro Max - Black" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea required rows={4} name="description" value={formData.description} onChange={handleInputChange} placeholder="Provide details like colors, specific marks, or brands..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
              <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Image Upload</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#800000]/10 file:text-[#800000] hover:file:bg-[#800000]/20 transition-colors" />
            </div>
          </div>
        </div>

        {/* Location & Interactive Map */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">Geographic Registration</h3>
          <LocationSelector onLocationChange={setLocation} externalLocation={externalLocation} />
          
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pinpoint Exact Location (Optional)</label>
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-gray-200 z-0 relative shadow-inner mb-2">
              <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapClickHandler setPosition={setMapPosition} />
                {mapPosition && <Marker position={mapPosition} />}
              </MapContainer>
            </div>
            
            {/* Police Station Suggestion Widget */}
            {formData.type === 'FOUND' && isSearchingPolice && (
              <div className="flex items-center text-sm text-gray-500 animate-pulse bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                <div className="w-4 h-4 border-2 border-[#800000] border-t-transparent rounded-full animate-spin mr-3"></div>
                Scanning for nearest police stations...
              </div>
            )}

            {formData.type === 'FOUND' && nearestPolice && !isSearchingPolice && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 overflow-hidden"
              >
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <ShieldCheck className="w-6 h-6 text-blue-700" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-blue-900">Recommended Action: Surrender to Police</h4>
                    <p className="text-sm text-blue-800 mt-1 mb-3">
                      We detected <strong>{nearestPolice.name}</strong> just {nearestPolice.distance.toFixed(1)} km away from this location. We recommend surrendering high-value items here to ensure maximum safety and legal compliance.
                    </p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${nearestPolice.lat},${nearestPolice.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions to Station
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Security / Blind Claim */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">Verification & Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
              <input required type="text" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="07XXXXXXXX" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Security Question (Blind Claim Protocol)</label>
              <input type="text" name="securityQuestion" value={formData.securityQuestion} onChange={handleInputChange} placeholder="e.g., What is the lock screen wallpaper?" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
              <p className="text-xs text-gray-500 mt-1.5">If posted as FOUND, claimants must answer this to verify ownership.</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-[#800000] text-white font-bold py-4 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-[0.99] disabled:opacity-70 mt-8 text-lg">
          {isSubmitting ? 'Publishing Report...' : 'Publish Item Record'}
        </button>
      </form>
    </motion.div>
  );
};

export default PostItemPage;
