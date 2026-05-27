import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Download, PlusCircle, ShieldCheck, Tag } from 'lucide-react';
import Swal from 'sweetalert2';

interface SmartTag {
  _id: string;
  title: string;
  description: string;
  category: string;
  date: string;
}

const QRTagsPage: React.FC = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<SmartTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Electronics');

  const qrRefs = useRef<{ [key: string]: SVGSVGElement | null }>({});

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await api.get('/items/my/smart-tags');
      setTags(res.data || []);
    } catch (error) {
      console.error('Failed to fetch tags', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTag = {
        title,
        description,
        category,
        type: 'SMART_TAG'
      };

      await api.post('/items', newTag);
      Swal.fire('Created!', 'Your new Smart QR Tag has been generated.', 'success');
      setShowForm(false);
      setTitle('');
      setDescription('');
      fetchTags();
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to create tag', 'error');
    }
  };

  const handleDownloadQR = (id: string, itemTitle: string) => {
    const svg = qrRefs.current[id];
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Add padding and background for the downloaded image
      canvas.width = img.width + 40;
      canvas.height = img.height + 80;
      if (ctx) {
         ctx.fillStyle = "#ffffff";
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         ctx.drawImage(img, 20, 20);
         
         // Add text label at the bottom
         ctx.font = "bold 16px sans-serif";
         ctx.fillStyle = "#333333";
         ctx.textAlign = "center";
         ctx.fillText(`Smart Tag: ${itemTitle}`, canvas.width / 2, canvas.height - 20);
      }

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `SmartTag_${itemTitle.replace(/\s+/g, '_')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-[#800000] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <ShieldCheck className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 flex items-center">
            Proactive Smart QR Tags <ShieldCheck className="ml-3 w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-red-100 text-lg leading-relaxed mb-6">
            Generate secure, printable QR Codes for your most valuable belongings (laptops, keys, pet collars). 
            If someone finds your item and scans the tag, it instantly opens a secure chat room with you!
          </p>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-[#800000] px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center shadow-md active:scale-95"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Smart Tag
          </button>
        </div>
      </div>

      {/* Creation Form */}
      {showForm && (
        <form onSubmit={handleCreateTag} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-[#800000]" /> Tag Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. MacBook Pro M3, House Keys"
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none bg-white"
              >
                <option value="Electronics">Electronics</option>
                <option value="Documents">Documents</option>
                <option value="Keys">Keys</option>
                <option value="Bags">Bags</option>
                <option value="Wallets">Wallets</option>
                <option value="Pets">Pets</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Private Description / Message</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. If found, please scan this code and message me to arrange a reward!"
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-[#800000] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#600000] transition-colors shadow-md shadow-[#800000]/20"
            >
              Generate QR Tag
            </button>
          </div>
        </form>
      )}

      {/* Grid of Existing Tags */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <ShieldCheck className="w-6 h-6 mr-2 text-emerald-600" /> Active Smart Tags
        </h2>
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div></div>
        ) : tags.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
             <ShieldCheck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
             <h3 className="text-lg font-bold text-gray-700 mb-2">No Smart Tags Yet</h3>
             <p className="text-gray-500">Create your first tag to digitally secure your items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tags.map((tag) => {
              // The QR code URL points exactly to the Item Detail page
              const scanUrl = `${window.location.origin}/items/${tag._id}`;
              
              return (
                <div key={tag._id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-transform">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{tag.title}</h3>
                  <span className="text-xs font-bold text-[#800000] bg-red-50 px-2.5 py-1 rounded-full mb-6 whitespace-nowrap">
                    {tag.category}
                  </span>
                  
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 mb-6 w-full max-w-[220px] aspect-square flex items-center justify-center">
                    <QRCodeSVG 
                      id={`qr-${tag._id}`}
                      value={scanUrl} 
                      size={180} 
                      level={"Q"}
                      includeMargin={false}
                      ref={(el) => (qrRefs.current[tag._id] = el)}
                      fgColor="#800000"
                    />
                  </div>
                  
                  <button 
                    onClick={() => handleDownloadQR(tag._id, tag.title)}
                    className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm mt-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Label</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRTagsPage;
