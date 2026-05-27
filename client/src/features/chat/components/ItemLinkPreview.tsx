import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Tag } from 'lucide-react';
import api from '../../../services/api';

interface ItemLinkPreviewProps {
  itemId: string;
  alignRight: boolean;
}

const ItemLinkPreview: React.FC<ItemLinkPreviewProps> = ({ itemId, alignRight }) => {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${itemId}`);
        setItem(res.data);
      } catch (error) {
        console.error('Failed to fetch item for link preview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [itemId]);

  if (loading) {
    return (
      <div className={`mt-2 p-3 rounded-xl border flex items-center justify-center h-20 ${alignRight ? 'bg-[#900000]/20 border-[#900000]' : 'bg-gray-50 border-gray-100'}`}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-white/50" />
      </div>
    );
  }

  if (!item) return null; // If fetch fails, just don't render the preview block

  // Get correct image path
  const imgUrl = item.imageUrl 
    ? (item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:5000/uploads/${item.imageUrl}`)
    : null;

  return (
    <div 
      onClick={() => navigate(`/items/${itemId}`)}
      className={`mt-2 flex flex-row items-center rounded-xl p-2 cursor-pointer transition-all active:scale-[0.98] border shadow-sm ${
        alignRight 
          ? 'bg-black/10 hover:bg-black/20 border-white/10' 
          : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-black/5 flex items-center justify-center">
        {imgUrl ? (
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Package className={`w-6 h-6 ${alignRight ? 'text-white/50' : 'text-gray-400'}`} />
        )}
      </div>

      {/* Info Block */}
      <div className="ml-3 flex flex-col justify-center flex-grow overflow-hidden">
        <h4 className={`text-xs font-bold truncate ${alignRight ? 'text-white' : 'text-gray-800'}`}>
          {item.title}
        </h4>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
            item.type === 'LOST' 
              ? (alignRight ? 'bg-red-500/20 text-red-100' : 'bg-red-100 text-red-700')
              : (alignRight ? 'bg-emerald-500/20 text-emerald-100' : 'bg-emerald-100 text-emerald-700')
          }`}>
            {item.type}
          </span>
          <span className={`text-[10px] flex items-center truncate ${alignRight ? 'text-white/70' : 'text-gray-500'}`}>
            <Tag className="w-3 h-3 mr-0.5" />
            {item.category}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ItemLinkPreview;
