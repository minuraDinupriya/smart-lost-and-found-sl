import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../../services/api';
import LocationSelector, { LocationState } from '../components/LocationSelector';
import ItemCard, { ItemProps } from '../components/ItemCard';
import { motion } from 'framer-motion';

const DashboardPage: React.FC = () => {
  const [items, setItems] = useState<ItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [locationFilter, setLocationFilter] = useState<LocationState>({ province: '', district: '', city: '' });
  const [resetKey, setResetKey] = useState(0);

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
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl shadow-slate-100/70 border border-slate-100 space-y-5 sticky top-20 z-40">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search items by keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all shadow-inner bg-slate-50 focus:bg-white"
            />
          </div>
          
          <div className="flex space-x-2 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
            {['ALL', 'LOST', 'FOUND'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-semibold text-sm transition-all ${
                  filterType === type 
                    ? 'bg-white text-slate-900 shadow-sm font-semibold rounded-lg' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Modular Location Dropdowns & Reset */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow w-full">
            <LocationSelector key={resetKey} onLocationChange={setLocationFilter} />
          </div>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
              setResetKey(prev => prev + 1);
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Item Feed Grid View */}
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
        // Empty Results State
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your search keywords, switching categories, or clearing the location filters.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
