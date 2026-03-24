import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Box, Layers, Hash, Users, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import toast from 'react-hot-toast';

interface EditRoomModalProps {
  room: any | null;
  onClose: () => void;
}

export default function EditRoomModal({ room, onClose }: EditRoomModalProps) {
  const { activeHotelId } = useHotel();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    room_number: '',
    room_category_id: '',
    floor: '',
    capacity: 2,
    status: 'available',
    extra_person_charge: 0,
    early_checkin_fee: 0,
    late_checkout_fee: 0
  });

  useEffect(() => {
    if (room) {
      setFormData({
        room_number: room.room_number || '',
        room_category_id: room.room_category_id?.toString() || '',
        floor: room.floor?.toString() || '',
        capacity: room.capacity || 2,
        status: room.status || 'available',
        extra_person_charge: parseFloat(room.extra_person_charge) || 0,
        early_checkin_fee: parseFloat(room.early_checkin_fee) || 0,
        late_checkout_fee: parseFloat(room.late_checkout_fee) || 0
      });
    }
  }, [room]);

  // Fetch categories for the dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories', activeHotelId],
    queryFn: async () => (await api.get(`/admin/categories?hotel_id=${activeHotelId}`)).data.data,
    enabled: !!room && !!activeHotelId
  });

  const mutation = useMutation({
    mutationFn: (updatedRoom: any) => api.put(`/admin/rooms/${room.id}`, { ...updatedRoom, hotel_id: activeHotelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', activeHotelId] });
      toast.success('Room updated successfully', {
        style: {
          background: '#1e293b',
          color: '#fff',
          borderRadius: '12px',
        },
        iconTheme: {
          primary: '#eab308',
          secondary: '#1e293b',
        },
      });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update room');
    }
  });

  if (!room) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      room_category_id: parseInt(formData.room_category_id),
      floor: formData.floor ? parseInt(formData.floor) : null,
      capacity: parseInt(formData.capacity as any),
      extra_person_charge: parseFloat(formData.extra_person_charge as any),
      early_checkin_fee: parseFloat(formData.early_checkin_fee as any),
      late_checkout_fee: parseFloat(formData.late_checkout_fee as any)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-navy/30 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-navy px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10 text-white">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
              <Box className="text-gold" /> Edit Room {room.room_number}
            </h2>
            <p className="text-navy-100/60 text-sm mt-1">Update inventory details and status</p>
          </div>
          <button 
            onClick={onClose}
            className="relative z-10 p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Room Identifier */}
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                   <Hash size={14} className="text-gold" /> Room Number
                 </label>
                 <input 
                   required
                   type="text" 
                   value={formData.room_number}
                   onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium"
                 />
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                   <Layers size={14} className="text-gold" /> Category
                 </label>
                 <select 
                   required
                   value={formData.room_category_id}
                   onChange={e => setFormData({ ...formData, room_category_id: e.target.value })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium appearance-none"
                 >
                   <option value="">Select Category</option>
                   {categories?.map((cat: any) => (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                   ))}
                 </select>
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                   <CheckCircle2 size={14} className="text-gold" /> Operating Status
                 </label>
                 <select 
                   required
                   value={formData.status}
                   onChange={e => setFormData({ ...formData, status: e.target.value })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium appearance-none"
                 >
                   <option value="available">Available / Clean</option>
                   <option value="maintenance">Under Maintenance</option>
                 </select>
               </div>
            </div>

            {/* Capacity & Fees */}
            <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                   <Users size={14} className="text-gold" /> Default Capacity
                 </label>
                 <input 
                   required
                   type="number" 
                   value={formData.capacity}
                   onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium"
                 />
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                   <DollarSign size={14} className="text-gold" /> Extra Person Charge
                 </label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={formData.extra_person_charge}
                   onChange={e => setFormData({ ...formData, extra_person_charge: parseFloat(e.target.value) })}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-2 block flex items-center gap-1">
                     <Clock size={12} className="text-gold" /> Early In Fee
                   </label>
                   <input 
                     type="number" 
                     step="0.01"
                     value={formData.early_checkin_fee}
                     onChange={e => setFormData({ ...formData, early_checkin_fee: parseFloat(e.target.value) })}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium text-sm"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-2 block flex items-center gap-1">
                     <Clock size={12} className="text-gold" /> Late Out Fee
                   </label>
                   <input 
                     type="number" 
                     step="0.01"
                     value={formData.late_checkout_fee}
                     onChange={e => setFormData({ ...formData, late_checkout_fee: parseFloat(e.target.value) })}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gold focus:ring-4 focus:ring-gold/5 transition-all font-medium text-sm"
                   />
                 </div>
               </div>
            </div>

          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="bg-navy hover:bg-navy/90 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-navy/20 transition transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {mutation.isPending ? 'Updating...' : <><Save size={18} /> Update Room</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
