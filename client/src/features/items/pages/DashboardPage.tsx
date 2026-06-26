import React, { useEffect, useState } from 'react';
import { Search, Map as MapIcon, LayoutGrid, Trophy, MapPin, Filter, PackageSearch, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import ItemCard, { ItemProps } from '../components/ItemCard';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Fix Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [locationFilter, setLocationFilter] = useState<LocationState>({ province: '', district: '', city: '' });
  const [resetKey, setResetKey] = useState(0);
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [hiddenPins, setHiddenPins] = useState<Set<string>>(new Set());
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Top Samaritans
    api.get('/auth/leaderboard').then(res => {
      setLeaderboard(res.data.leaderboard);
    }).catch(err => console.error(err));
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Dynamic query string construction based on active filters
      let query = '/items?';
      if (locationFilter.province) query += `province=${encodeURIComponent(locationFilter.province)}&`;
      if (locationFilter.district) query += `district=${encodeURIComponent(locationFilter.district)}&`;
      if (locationFilter.city) query += `city=${encodeURIComponent(locationFilter.city)}`;

      const response = await api.get(query);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch backend feed when location filters adjust
  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter]);

  // Real-time client-side text and enum filtering
  const filteredItems = items.filter(item => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Control Hub */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl shadow-slate-100/70 border border-slate-100 space-y-5 relative lg:sticky lg:top-20 z-40">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all shadow-inner bg-slate-50 focus:bg-white"
            />
          </div>
          
          <div className="bg-gray-100 p-1.5 rounded-2xl inline-flex shadow-inner border border-gray-200/50">
              {['ALL', 'LOST', 'FOUND'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${filterType === type ? 'bg-white text-[#800000] shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                  {type === 'ALL' ? t('dashboard.all') : type === 'LOST' ? t('dashboard.lostTab') : t('dashboard.foundTab')}
                </button>
              ))}
            </div>
        </div>

        {/* Modular Location Dropdowns & Controls */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow w-full">
            <LocationSelector key={resetKey} onLocationChange={setLocationFilter} />
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'GRID' ? 'MAP' : 'GRID')}
              className="flex items-center justify-center px-4 py-2.5 bg-[#800000]/10 text-[#800000] font-semibold rounded-xl hover:bg-[#800000]/20 transition-colors shadow-sm whitespace-nowrap"
            >
              {viewMode === 'GRID' ? <><MapIcon className="w-5 h-5 mr-2" /> {t('dashboard.mapView')}</> : <><LayoutGrid className="w-5 h-5 mr-2" /> {t('dashboard.gridView')}</>}
            </button>
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterType('ALL');
                setResetKey(prev => prev + 1);
              }}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors shadow-sm whitespace-nowrap"
            >
              {t('dashboard.resetFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Item Feed or Map View */}
      {loading ? (
        // Skeleton Loading State
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-[28rem] border border-gray-100 overflow-hidden">
               <div className="h-48 bg-gray-200"></div>
               <div className="p-6 space-y-4">
                 <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                 <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                 <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                 <div className="pt-4 mt-auto">
                    <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        viewMode === 'GRID' ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredItems.map(item => (
              <ItemCard key={item._id} item={item} />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="h-[800px] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 relative z-0"
          >
            <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={true} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              {filteredItems.filter((i: any) => i.latitude && i.longitude).map((item: any) => {
                if (item.type === 'FOUND' && item.isFuzzy) {
                  return (
                    <Circle 
                      key={item._id}
                      center={[item.latitude, item.longitude]}
                      radius={1000} // 1km radius
                      pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.4 }}
                      eventHandlers={{ click: () => setHiddenPins(prev => { const next = new Set(prev); next.has(item._id) ? next.delete(item._id) : next.add(item._id); return next; }) }}
                    >
                      {!hiddenPins.has(item._id) && (
                        <Tooltip permanent direction="top" className="custom-map-tooltip" offset={[0, -20]}>
                          <div className="w-48 p-1 cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); navigate(`/items/${item._id}`); }}>
                            {item.imageUrl ? (
                              <div className="h-24 w-full rounded-lg overflow-hidden mb-2">
                                <img src={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                                <span className="text-[10px] text-gray-400 font-medium">{t('dashboard.noImage')}</span>
                              </div>
                            )}
                            <div className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mb-1 inline-block">{item.category}</div>
                            <h4 className="font-bold text-gray-900 text-xs mb-0.5 leading-tight line-clamp-1">{item.title}</h4>
                            <p className="text-[9px] text-gray-500 mb-2 truncate">{item.city}, {item.district}</p>
                            <button className="bg-emerald-600 text-white text-[10px] px-2 py-1.5 rounded-lg w-full font-bold hover:bg-emerald-700 transition shadow-sm pointer-events-none">{t('dashboard.reviewMatch')}</button>
                          </div>
                        </Tooltip>
                      )}
                    </Circle>
                  )
                }
                
                return (
                  <Marker 
                    key={item._id} 
                    position={[item.latitude, item.longitude]}
                    eventHandlers={{ click: () => setHiddenPins(prev => { const next = new Set(prev); next.has(item._id) ? next.delete(item._id) : next.add(item._id); return next; }) }}
                  >
                    {!hiddenPins.has(item._id) && (
                      <Tooltip permanent direction="top" className="custom-map-tooltip" offset={[0, -40]}>
                        <div className="w-48 p-1 cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); navigate(`/items/${item._id}`); }}>
                          {item.imageUrl ? (
                            <div className="h-24 w-full rounded-lg overflow-hidden mb-2 relative">
                               <div className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">{t('dashboard.lost')}</div>
                              <img src={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center mb-2 relative">
                               <div className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">{t('dashboard.lost')}</div>
                              <span className="text-[10px] text-gray-400 font-medium">{t('dashboard.noImage')}</span>
                            </div>
                          )}
                          <h4 className="font-bold text-gray-900 text-xs mb-0.5 leading-tight line-clamp-1">{item.title}</h4>
                          <p className="text-[9px] text-gray-500 mb-2 truncate">{item.city}, {item.district}</p>
                          <button className="bg-[#800000] text-white text-[10px] px-2 py-1.5 rounded-lg w-full font-bold hover:bg-[#600000] transition shadow-sm pointer-events-none">{t('dashboard.helpFind')}</button>
                        </div>
                      </Tooltip>
                    )}
                  </Marker>
                )
              })}
            </MapContainer>

            {/* Floating Leaderboard */}
            <div className="absolute bottom-8 right-8 z-[400] w-64 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden pointer-events-auto">
              <div className="bg-[#800000] text-white p-3 flex items-center justify-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold text-sm">{t('dashboard.localHeroes')}</h3>
              </div>
              <div className="p-3">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-center text-gray-500">{t('dashboard.noHeroesYet')}</p>
                ) : (
                  <ul className="space-y-2">
                    {leaderboard.map((u, index) => (
                      <li key={u._id} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                        <span className="font-medium text-gray-800 flex items-center">
                          <span className={`w-4 text-xs font-bold mr-2 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-gray-300'}`}>
                            #{index + 1}
                          </span>
                          {u.username}
                        </span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          {u.karmaPoints}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )
      ) : (
        // Empty Results State
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.noItemsFound')}</h3>
          <p className="text-gray-500 max-w-sm mx-auto">{t('dashboard.adjustFilters')}</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
