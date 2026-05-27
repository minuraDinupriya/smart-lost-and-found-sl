import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Activity, CheckCircle, Search, Map, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  totalItems: number;
  totalRecovered: number;
  totalLost: number;
  totalFound: number;
  itemsByCategory: { name: string; value: number }[];
  itemsByProvince: { name: string; value: number }[];
  timelineData: { name: string; value: number }[];
}

const COLORS = ['#800000', '#D4AF37', '#2E8B57', '#4682B4', '#D2691E', '#6A5ACD', '#708090', '#DC143C'];

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/items/analytics');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!data) return <div className="text-center p-10 font-bold text-gray-500">Failed to load analytics data.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <BarChart3 className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 flex items-center">
            National Analytics Dashboard <Activity className="ml-3 w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl">
            Live, nationwide statistics on the Lost & Found ecosystem. See what is being lost, where it's happening, and how effectively our community is recovering items.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Active</p>
            <h2 className="text-4xl font-black text-gray-900">{data.totalItems}</h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl text-gray-400">
             <BarChart3 className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-1">Successfully Recovered</p>
            <h2 className="text-4xl font-black text-emerald-700">{data.totalRecovered}</h2>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
             <CheckCircle className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-red-500 uppercase tracking-wider mb-1">Currently Lost</p>
            <h2 className="text-4xl font-black text-red-600">{data.totalLost}</h2>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl text-red-400">
             <Search className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-1">Currently Found</p>
            <h2 className="text-4xl font-black text-blue-600">{data.totalFound}</h2>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-400">
             <Map className="w-8 h-8" />
          </div>
        </div>

      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Lost & Found by Category</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.itemsByCategory} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#800000" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Province Heatmap / Pie Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Provincial Distribution</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.itemsByProvince}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.itemsByProvince.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Timeline Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-10">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Incident Timeline</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#800000" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#800000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="value" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;
