import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { activeHotelId } = useHotel();
  const [activeTab, setActiveTab] = useState<'categories' | 'packages'>('categories');

  const { data: categories, isLoading: loadingCat } = useQuery({
    queryKey: ['categories', activeHotelId],
    queryFn: async () => (await api.get(`/admin/categories?hotel_id=${activeHotelId}`)).data.data,
    enabled: !!activeHotelId
  });

  const { data: packages, isLoading: loadingPkg } = useQuery({
    queryKey: ['packages', activeHotelId],
    queryFn: async () => (await api.get(`/admin/packages?hotel_id=${activeHotelId}`)).data.data,
    enabled: !!activeHotelId
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="border-b border-gray-200 pb-5">
         <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><Settings className="text-gold" size={32} /> Hotel Settings</h1>
         <p className="text-gray-500 mt-2 font-medium">Manage operational categories and package definitions</p>
      </div>

      <div className="flex gap-4 border-b border-gray-100">
        <button onClick={() => setActiveTab('categories')} className={`pb-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'categories' ? 'border-navy text-navy font-bold' : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-200'}`}>
          Room Categories
        </button>
        <button onClick={() => setActiveTab('packages')} className={`pb-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'packages' ? 'border-navy text-navy font-bold' : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-200'}`}>
          Package Types
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-navy">{activeTab === 'categories' ? 'Category Setup' : 'Package Setup'}</h2>
          <button className="bg-navy hover:bg-navy/90 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm shadow-sm transition transform hover:-translate-y-0.5">
            <Plus size={16} /> Add {activeTab === 'categories' ? 'Category' : 'Package'}
          </button>
        </div>

        {activeTab === 'categories' && (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
                 <tr>
                   <th className="px-5 py-4">Name</th>
                   <th className="px-5 py-4">Base Price</th>
                   <th className="px-5 py-4">Description</th>
                   <th className="px-5 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {loadingCat && <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-medium">Loading categories...</td></tr>}
                 {!loadingCat && categories?.map((c: any) => (
                   <tr key={c.id} className="hover:bg-gray-50/50 transition">
                     <td className="px-5 py-4 font-bold text-gray-800">{c.name}</td>
                     <td className="px-5 py-4 text-emerald-600 font-bold">LKR {parseFloat(c.base_price).toFixed(2)}</td>
                     <td className="px-5 py-4 text-gray-500 max-w-sm truncate">{c.description || '-'}</td>
                     <td className="px-5 py-4 text-right space-x-2">
                        <button className="text-gray-400 hover:text-navy transition p-2 border border-transparent hover:bg-gray-100 rounded-lg outline-none"><Edit2 size={16} /></button>
                        <button className="text-gray-400 hover:text-red-500 transition p-2 border border-transparent hover:bg-red-50 hover:border-red-100 rounded-lg outline-none"><Trash2 size={16} /></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase text-xs tracking-wider">
                 <tr>
                   <th className="px-5 py-4">Name</th>
                   <th className="px-5 py-4">Pricing Scheme</th>
                   <th className="px-5 py-4">Description</th>
                   <th className="px-5 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {loadingPkg && <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-medium">Loading packages...</td></tr>}
                 {!loadingPkg && packages?.map((p: any) => (
                   <tr key={p.id} className="hover:bg-gray-50/50 transition">
                     <td className="px-5 py-4 font-bold text-gray-800">{p.name}</td>
                     <td className="px-5 py-4 text-gold font-bold">
                        {parseFloat(p.price_multiplier) !== 1.00 ? `Multiplier: x${parseFloat(p.price_multiplier).toFixed(2)}` : `Flat: LKR ${parseFloat(p.flat_price || '0').toFixed(2)}`}
                     </td>
                     <td className="px-5 py-4 text-gray-500 max-w-sm truncate">{p.description || '-'}</td>
                     <td className="px-5 py-4 text-right space-x-2">
                        <button className="text-gray-400 hover:text-navy transition p-2 border border-transparent hover:bg-gray-100 rounded-lg outline-none"><Edit2 size={16} /></button>
                        <button className="text-gray-400 hover:text-red-500 transition p-2 border border-transparent hover:bg-red-50 hover:border-red-100 rounded-lg outline-none"><Trash2 size={16} /></button>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
