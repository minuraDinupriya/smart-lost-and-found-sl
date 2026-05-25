import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapClickHandler = ({ setPosition }: { setPosition: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const EditItemPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [location, setLocation] = useState<LocationState>({ province: '', district: '', city: '' });
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [externalLocation, setExternalLocation] = useState<LocationState | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'LOST',
    category: 'Electronics',
    date: '',
    contactNumber: '',
    securityQuestion: ''
  });

  // Fetch the item data on load
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${itemId}`);
        const data = res.data;
        
        // Format the date for the HTML date input (YYYY-MM-DD)
        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        
        setFormData({
          title: data.title,
          description: data.description,
          type: data.type,
          category: data.category,
          date: formattedDate,
          contactNumber: data.contactNumber,
          securityQuestion: data.securityQuestion || ''
        });
        
        setLocation({
          province: data.province,
          district: data.district,
          city: data.city
        });
        
        if (data.latitude && data.longitude) {
          setMapPosition([parseFloat(data.latitude), parseFloat(data.longitude)]);
        }
        
        if (data.imageUrl) {
          setExistingImageUrl(data.imageUrl);
        }
        
        setIsLoading(false);
      } catch (error) {
        Swal.fire('Error', 'Failed to fetch item details.', 'error');
        navigate('/');
      }
    };
    
    if (itemId) fetchItem();
  }, [itemId, navigate]);

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
      // 500ms debounce to prevent spamming the Nominatim API while clicking rapidly
      const timeout = setTimeout(fetchLocation, 500);
      return () => clearTimeout(timeout);
    }
  }, [mapPosition]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      setExistingImageUrl(null); // Clear the preview of the old image
    }
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

      await api.put(`/items/${itemId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire({
        title: 'Successfully Updated!',
        text: 'Your item report has been modified.',
        icon: 'success',
        confirmButtonColor: '#800000'
      });
      navigate('/');
    } catch (error: any) {
      Swal.fire({
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to update item',
        icon: 'error',
        confirmButtonColor: '#800000'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-20 text-gray-500 font-medium text-lg">Loading item details...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8"
    >
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Edit Your Report</h2>
        <p className="text-gray-500 mt-2">Update the details of your lost or found item.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
            <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea required rows={4} name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
              <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Image Upload (Leave empty to keep current)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#800000]/10 file:text-[#800000] hover:file:bg-[#800000]/20 transition-colors" />
              {existingImageUrl && (
                <div className="mt-2 text-sm text-gray-500 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Current image attached
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">Geographic Registration</h3>
          {location && (
            <LocationSelector onLocationChange={setLocation} initialLocation={location} externalLocation={externalLocation} />
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pinpoint Exact Location (Optional)</label>
            <div className="h-72 w-full rounded-2xl overflow-hidden border border-gray-200 z-0 relative shadow-inner">
              <MapContainer center={mapPosition || [7.8731, 80.7718]} zoom={mapPosition ? 13 : 7} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapClickHandler setPosition={setMapPosition} />
                {mapPosition && <Marker position={mapPosition} />}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 border-l-4 border-[#800000] pl-3">Verification & Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
              <input required type="text" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Security Question</label>
              <input type="text" name="securityQuestion" value={formData.securityQuestion} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-[#800000] text-white font-bold py-4 rounded-xl hover:bg-[#600000] transition-all shadow-lg shadow-[#800000]/20 active:scale-[0.99] disabled:opacity-70 mt-8 text-lg">
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </motion.div>
  );
};

export default EditItemPage;
