import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../../services/api';
import { Map, AlertCircle, Filter, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageNavigation from '../../../components/common/PageNavigation';

// Fix Leaflet's default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Hotspot {
  latitude: number;
  longitude: number;
  reportCount: number;
  lostCount: number;
  foundCount: number;
  activityLevel: 'High' | 'Medium-High' | 'Medium' | 'Low';
  mostCommonCategory: string;
  categories: { category: string; count: number }[];
}

const HotspotMapPage: React.FC = () => {
  const { t } = useTranslation();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [period, setPeriod] = useState('All Time');
  const [category, setCategory] = useState('All');

  // Sri Lanka center coordinates
  const defaultCenter: [number, number] = [7.8731, 80.7718]; 

  const fetchHotspots = async () => {
    setLoading(true);
    try {
      const res = await api.get('/items/hotspots', {
        params: { period, category }
      });
      setHotspots(res.data.hotspots);
    } catch (error) {
      console.error('Error fetching hotspots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
  }, [period, category]);

  const getColorByActivity = (level: string) => {
    switch(level) {
      case 'High': return '#ef4444'; // Red
      case 'Medium-High': return '#f97316'; // Orange
      case 'Medium': return '#eab308'; // Yellow
      default: return '#3b82f6'; // Blue
    }
  };
  
  const getRadiusByCount = (count: number) => {
     if (count >= 15) return 40;
     if (count >= 10) return 30;
     if (count >= 5) return 20;
     return 15;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageNavigation />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Map className="w-6 h-6 text-[#800000]" />
            Lost Item Hotspots
          </h1>
          <p className="text-gray-500 text-sm mt-1">Discover high-frequency areas for lost and found reports.</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-lg shadow-sm border border-gray-100 gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none"
            >
              <option value="All Time">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          
          <div className="h-6 w-px bg-gray-200"></div>
          
          <div className="flex items-center gap-2">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Wallet">Wallet</option>
              <option value="Keys">Keys</option>
              <option value="Documents">Documents</option>
              <option value="Bag">Bag</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative" style={{ height: '70vh', minHeight: '500px' }}>
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/70 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-[#800000] animate-spin" />
              <p className="text-gray-600 font-medium">Analyzing geographical data...</p>
            </div>
          </div>
        )}
        
        {!loading && hotspots.length === 0 && (
           <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
             <div className="bg-white/90 px-6 py-4 rounded-lg shadow-md flex flex-col items-center text-center">
                <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                <h3 className="font-bold text-gray-700">No Hotspots Found</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-1">Try adjusting your filters. Not enough overlapping reports were found to form a hotspot cluster.</p>
             </div>
           </div>
        )}

        <MapContainer 
          center={defaultCenter} 
          zoom={7} 
          scrollWheelZoom={true} 
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {hotspots.map((hotspot, idx) => (
             <CircleMarker 
                key={idx}
                center={[hotspot.latitude, hotspot.longitude]}
                pathOptions={{ 
                  color: getColorByActivity(hotspot.activityLevel), 
                  fillColor: getColorByActivity(hotspot.activityLevel),
                  fillOpacity: 0.4,
                  weight: 2
                }}
                radius={getRadiusByCount(hotspot.reportCount)}
             >
                <Popup className="hotspot-popup">
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorByActivity(hotspot.activityLevel) }}></span>
                       <h3 className="font-bold text-gray-800 m-0">{hotspot.activityLevel} Activity Hotspot</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded-md">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Lost</p>
                        <p className="font-bold text-red-600">{hotspot.lostCount}</p>
                      </div>
                      <div className="text-center border-l border-gray-200">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Found</p>
                        <p className="font-bold text-green-600">{hotspot.foundCount}</p>
                      </div>
                    </div>
                    
                    <div className="mb-1">
                      <p className="text-xs text-gray-500 mb-1">Most commonly lost here:</p>
                      <div className="flex items-center gap-2">
                         <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                           {hotspot.mostCommonCategory}
                         </span>
                      </div>
                    </div>
                  </div>
                </Popup>
             </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default HotspotMapPage;
