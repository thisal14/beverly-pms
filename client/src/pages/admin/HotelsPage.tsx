import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Plus, Building2, MapPin, X, Save, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const COMMON_TIMEZONES = [
  'Asia/Colombo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'UTC'
];

export default function HotelsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    timezone: 'Asia/Colombo'
  });

  const { data: hotels, isLoading } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => (await api.get('/hotels')).data.data
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingHotel) {
        return api.put(`/hotels/${editingHotel.id}`, data);
      }
      return api.post('/hotels', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      toast.success(editingHotel ? 'Hotel updated' : 'Hotel created');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  });

  const openModal = (hotel: any = null) => {
    if (hotel) {
      setEditingHotel(hotel);
      setFormData({
        name: hotel.name,
        slug: hotel.slug,
        address: hotel.address || '',
        phone: hotel.phone || '',
        timezone: hotel.timezone || 'Asia/Colombo'
      });
    } else {
      setEditingHotel(null);
      setFormData({ name: '', slug: '', address: '', phone: '', timezone: 'Asia/Colombo' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHotel(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
           <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><Building2 className="text-gold" size={32} /> Network Hotels</h1>
           <p className="text-gray-500 mt-2 font-medium">Manage all properties in the Beverly network (Super Admin only)</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-navy hover:bg-navy/90 text-white font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition transform hover:-translate-y-0.5"
        >
          <Plus size={18} /> New Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {isLoading && <div className="p-12 text-center text-gray-400 animate-pulse col-span-full font-medium">Loading properties list...</div>}
         {!isLoading && hotels?.map((h: any) => (
           <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left">
              <div className="h-36 bg-gradient-to-br from-navy/5 to-gray-100 flex items-center justify-center border-b border-gray-100 relative">
                 <Building2 size={56} className="text-gold/30 drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
                 <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md text-xs font-bold text-navy shadow-sm border border-gray-100/50 uppercase tracking-widest">{h.slug}</div>
                 <button 
                  onClick={() => openModal(h)}
                  className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow hover:text-gold transition-colors"
                 >
                   <Plus size={16} className="rotate-45" /> {/* Use Plus rotated for "Edit" or just icon */}
                 </button>
              </div>
              <div className="p-6">
                 <h2 className="text-xl font-serif font-bold text-navy mb-1.5 group-hover:text-gold transition-colors">{h.name}</h2>
                 <p className="text-sm text-gray-500 flex items-start gap-1.5 opacity-80 mb-5 leading-relaxed h-10"><MapPin size={16} className="shrink-0 mt-0.5" /> {h.address}</p>
                 
                 <div className="space-y-3 text-sm pt-5 border-t border-gray-100/60 font-sans">
                    <div className="flex justify-between items-center"><span className="text-gray-400 font-medium">Phone</span><span className="font-semibold text-gray-700">{h.phone || '-'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400 font-medium">Timezone</span><span className="font-semibold text-gray-700 flex items-center gap-1.5"><Globe size={14} className="text-gold" /> {h.timezone}</span></div>
                 </div>
                 
                 <Link to={`/${h.slug}/dashboard`} className="block text-center w-full mt-6 bg-gray-50 hover:bg-navy hover:text-white border border-gray-200 hover:border-navy text-navy font-bold py-2.5 rounded-xl transition-all duration-300 text-sm shadow-sm group-hover:shadow">
                    Access Property Dashboard
                 </Link>
              </div>
           </div>
         ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 translate-y-0 scale-100 transition-all">
            <div className="bg-navy p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-bold">{editingHotel ? 'Edit Property' : 'Add New Property'}</h2>
                <p className="text-navy-100 text-xs mt-1 uppercase tracking-widest opacity-70">Property Configuration</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2 ml-1">Hotel Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Beverly Grand Hotel"
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-gold focus:border-gold outline-none font-medium text-gray-800 transition-all placeholder:text-gray-300" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2 ml-1">Unique Slug</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    placeholder="e.g. grand"
                    disabled={!!editingHotel}
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-gold focus:border-gold outline-none font-medium text-gray-800 transition-all disabled:opacity-50 placeholder:text-gray-300" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="+94 ..."
                    className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-gold focus:border-gold outline-none font-medium text-gray-800 transition-all placeholder:text-gray-300" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2 ml-1">Address</label>
                <textarea 
                  rows={2}
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Street, City, Country"
                  className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-gold focus:border-gold outline-none font-medium text-gray-800 transition-all placeholder:text-gray-300 resize-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2 ml-1">Operational Timezone</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gold opacity-50" size={18} />
                  <select 
                    value={formData.timezone} 
                    onChange={e => setFormData({...formData, timezone: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-gold focus:border-gold outline-none font-medium text-gray-800 transition-all appearance-none cursor-pointer"
                  >
                    {COMMON_TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 px-1">All check-in/out logic will automatically align with this timezone.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3.5 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition-colors"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-2 bg-gold hover:bg-gold/90 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-gold/20 flex items-center justify-center gap-2 transform transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Save size={18} /> {mutation.isPending ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
