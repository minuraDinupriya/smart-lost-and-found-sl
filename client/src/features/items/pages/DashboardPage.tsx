import React, { useEffect, useState } from 'react';
import { Search, Trophy, PackageSearch, AlertCircle, MapPin, List, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import ItemCard, { ItemProps } from '../components/ItemCard';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';

// Fix Leaflet marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to center map
function MapUpdater({ province, district, city }: { province: string, district: string, city: string }) {
  const map = useMap();
  useEffect(() => {
    if (city || district || province) {
      map.setZoom(8);
    }
  }, [province, district, city, map]);
  return null;
}

const CATEGORIES = [
  'Electronics',
  'Wallets & Bags',
  'Keys',
  'Documents',
  'Jewelry',
  'Clothing',
  'Pets',
  'Other'
];

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Extract filters from URL or use defaults
  const searchTerm = searchParams.get('q') || '';
  const isOpenFilter = searchParams.get('openFilter') === 'true';
  const filterType = (searchParams.get('tab') || 'ALL') as 'ALL' | 'LOST' | 'FOUND' | 'MY_POSTS';
  
  // Local Filter State for the Panel
  const [locationFilter, setLocationFilter] = useState<LocationState>({ province: '', district: '', city: '' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  
  const [resetKey, setResetKey] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Scroll to highlighted item once loaded
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && items.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`item-${highlightId}`);
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
          const params = new URLSearchParams(searchParams);
          params.delete('highlight');
          setSearchParams(params, { replace: true });
        }
      }, 500);
    }
  }, [items, searchParams, setSearchParams]);

  useEffect(() => {
    api.get('/auth/leaderboard').then(res => {
      setLeaderboard(res.data.leaderboard);
    }).catch(err => console.error(err));
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = '/items?';
      if (locationFilter.province) query += `province=${encodeURIComponent(locationFilter.province)}&`;
      if (locationFilter.district) query += `district=${encodeURIComponent(locationFilter.district)}&`;
      if (locationFilter.city) query += `city=${encodeURIComponent(locationFilter.city)}&`;

      const response = await api.get(query);
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    setCurrentPage(1); // Reset to page 1 on new fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter]);

  // Client-side filtering
  const filteredItems = items.filter(item => {
    let matchesType = true;
    if (filterType === 'MY_POSTS') {
      matchesType = !!user && (item.createdBy._id === user._id || item.createdBy === user._id);
    } else {
      matchesType = filterType === 'ALL' || item.type === filterType;
    }

    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;

    // Search term from Navbar OR keyword from Filter Panel
    const searchToUse = keywordFilter || searchTerm;
    const matchesSearch = searchToUse ? (
      item.title.toLowerCase().includes(searchToUse.toLowerCase()) || 
      item.description.toLowerCase().includes(searchToUse.toLowerCase())
    ) : true;
    
    return matchesType && matchesCategory && matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    if (tab === filterType && tab !== 'ALL') {
      params.set('tab', 'ALL');
    } else {
      params.set('tab', tab);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };
  
  const resetFilters = () => {
    setCategoryFilter('');
    setKeywordFilter('');
    setResetKey(prev => prev + 1);
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Filter Panel (Collapsible) */}
      <AnimatePresence>
        {isOpenFilter && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl shadow-slate-100/70 border border-slate-100 space-y-5 relative z-40">
              
              {/* Integrated Map */}
              <div className="h-64 w-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
                <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={true} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapUpdater province={locationFilter.province} district={locationFilter.district} city={locationFilter.city} />
                  
                  {filteredItems.filter((i: any) => i.latitude && i.longitude).map((item: any) => {
                     if (item.type === 'FOUND' && item.isFuzzy) {
                        return (
                          <Circle 
                            key={item._id}
                            center={[item.latitude, item.longitude]}
                            radius={1000} // 1km radius
                            pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.4 }}
                            eventHandlers={{
                              mouseover: (e) => e.target.openPopup(),
                              mouseout: (e) => e.target.closePopup(),
                              click: () => navigate(`/items/${item._id}`)
                            }}
                          >
                            <Popup className="custom-map-popup" offset={[0, -20]} closeButton={false}>
                              <div className="w-48 p-1 cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); navigate(`/items/${item._id}`); }}>
                                {item.imageUrl ? (
                                  <div className="h-24 w-full rounded-lg overflow-hidden mb-2">
                                    <img src={item.imageUrl.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover" />
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
                            </Popup>
                          </Circle>
                        )
                      }
                      
                     return (
                        <Marker 
                          key={item._id} 
                          position={[item.latitude, item.longitude]}
                          eventHandlers={{
                            mouseover: (e) => e.target.openPopup(),
                            mouseout: (e) => e.target.closePopup(),
                            click: () => navigate(`/items/${item._id}`)
                          }}
                        >
                          <Popup className="custom-map-popup" offset={[0, -40]} closeButton={false}>
                            <div className="w-48 p-1 cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); navigate(`/items/${item._id}`); }}>
                              {item.imageUrl ? (
                                <div className="h-24 w-full rounded-lg overflow-hidden mb-2 relative">
                                  <div className={`absolute top-1 left-1 ${item.type === 'LOST' ? 'bg-rose-500' : 'bg-emerald-500'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10`}>
                                    {item.type}
                                  </div>
                                  <img src={item.imageUrl.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000'}/uploads/${item.imageUrl}`} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-24 w-full rounded-lg bg-gray-100 flex items-center justify-center mb-2 relative">
                                  <div className={`absolute top-1 left-1 ${item.type === 'LOST' ? 'bg-rose-500' : 'bg-emerald-500'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10`}>
                                    {item.type}
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-medium">{t('dashboard.noImage')}</span>
                                </div>
                              )}
                              <h4 className="font-bold text-gray-900 text-xs mb-0.5 leading-tight line-clamp-1">{item.title}</h4>
                              <p className="text-[9px] text-gray-500 mb-2 truncate">{item.city}, {item.district}</p>
                            </div>
                          </Popup>
                        </Marker>
                     );
                  })}
                </MapContainer>
              </div>

              {/* Filter Controls Row */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-grow">
                  <LocationSelector key={resetKey} onLocationChange={setLocationFilter} />
                </div>
                
                <div className="flex flex-col min-w-[200px]">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white text-gray-900 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="">{t('dashboard.categoryFilter')}</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(`categories.${c}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5">Keyword</label>
                  <input
                    type="text"
                    placeholder="Refine search with keywords..."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all shadow-inner bg-slate-50 focus:bg-white"
                  />
                </div>
                <button 
                  onClick={resetFilters}
                  className="px-6 py-2.5 h-[46px] bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors shadow-sm whitespace-nowrap"
                >
                  {t('dashboard.resetFilters')}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="flex justify-center border-b border-gray-200 pb-1 overflow-x-auto">
        <div className="flex space-x-2 sm:space-x-4 px-2">
          {['ALL', 'LOST', 'FOUND', ...(user && user.role !== 'police' ? ['MY_POSTS'] : [])].map(type => (
            <button
              key={type}
              onClick={() => handleTabChange(type)}
              className={`px-4 sm:px-6 py-3 font-bold text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap ${
                filterType === type 
                  ? 'border-[#800000] text-[#800000]' 
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {type === 'ALL' ? t('dashboard.all') : type === 'LOST' ? t('dashboard.lostTab') : type === 'FOUND' ? t('dashboard.foundTab') : t('dashboard.myPostsTab')}
            </button>
          ))}
        </div>
      </div>

      {/* Item Feed */}
      {loading ? (
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
      ) : paginatedItems.length > 0 ? (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {paginatedItems.map(item => (
              <div key={item._id} id={`item-${item._id}`} className={searchParams.get('highlight') === item._id ? 'ring-4 ring-[#800000] ring-offset-4 rounded-2xl transition-all duration-1000' : ''}>
                <ItemCard item={item} />
              </div>
            ))}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${
                      currentPage === i + 1 
                        ? 'bg-[#800000] text-white shadow-md' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <PackageSearch className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.noItemsFound')}</h3>
          <p className="text-gray-500 max-w-sm mx-auto">{t('dashboard.adjustFilters')}</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
