import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

const PageNavigation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto w-full">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-[#800000] font-medium transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back
      </button>
    </div>
  );
};

export default PageNavigation;
