import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import PaymentPanel from '../../components/PaymentPanel';
import type { PaymentEntry } from '../../components/PaymentPanel';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

export default function NewReservationPage() {
  const { activeHotelId } = useHotel();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    guestName: '', guestPhone: '', guestNIC: '', numPeople: 1,
    checkin: '', checkout: '', packageId: '', packageQty: 1,
    roomId: null as number | null,
    payments: [] as PaymentEntry[]
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages', activeHotelId],
    queryFn: async () => (await api.get('/admin/packages')).data.data,
    enabled: !!activeHotelId
  });

  const { data: availableRooms = [], isFetching: findingRooms } = useQuery({
    queryKey: ['availableRooms', activeHotelId, form.checkin, form.checkout, form.packageId, form.packageQty],
    queryFn: async () => {
      const params = new URLSearchParams({
        checkin: new Date(form.checkin).toISOString(),
        checkout: new Date(form.checkout).toISOString(),
        packageTypeId: form.packageId,
        packageQty: form.packageQty.toString()
      });
      return (await api.get(`/hotels/${activeHotelId}/rooms/available?${params}`)).data.data;
    },
    enabled: step === 3 && !!form.checkin && !!form.checkout && !!form.packageId
  });

  // Derived state for pricing overview
  const selectedPackage = packages.find((p: any) => p.id.toString() === form.packageId);
  
  // Find base price of selected room
  let baseAmount = 0;
  let selectedRoomData = null;
  if (form.roomId) {
    for (const group of availableRooms) {
      const room = group.rooms.find((r: any) => r.id === form.roomId);
      if (room) {
        selectedRoomData = room;
        baseAmount = group.calculated_price;
        break;
      }
    }
  }

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const submitReservation = async () => {
    try {
      setLoading(true);
      const payload = {
        hotel_id: activeHotelId,
        room_id: form.roomId,
        package_type_id: parseInt(form.packageId),
        package_quantity: form.packageQty,
        customer_name: form.guestName,
        customer_phone: form.guestPhone,
        customer_nic_passport: form.guestNIC,
        num_people: form.numPeople,
        scheduled_checkin: new Date(form.checkin).toISOString(),
        scheduled_checkout: new Date(form.checkout).toISOString(),
        initial_payment: form.payments.length > 0 ? form.payments[0] : undefined
      };
      
      await api.post('/reservations', payload);
      toast.success('Reservation created successfully!');
      
      // Navigate to detail page
      // In a real app we'd have a detail page ready, for now go to dashboard
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (updates: any) => setForm(prev => ({ ...prev, ...updates }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-navy">New Reservation</h1>
        <p className="text-gray-500 mt-1">Create a new booking in 5 steps</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 h-1 bg-gold -z-10 rounded-full transition-all" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-gold text-white shadow-md' : 'bg-white text-gray-400 border-2 border-gray-200'}`}>
            {step > s ? <Check size={20} /> : s}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
        {/* Step 1: Guest Details */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold border-b pb-2">Guest Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input type="text" value={form.guestName} onChange={e => updateForm({ guestName: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input type="tel" value={form.guestPhone} onChange={e => updateForm({ guestPhone: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" placeholder="077 xxxxxxx" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NIC / Passport *</label>
                <input type="text" value={form.guestNIC} onChange={e => updateForm({ guestNIC: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" placeholder="ID Number" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Number of People</label>
                <input type="number" min="1" value={form.numPeople} onChange={e => updateForm({ numPeople: parseInt(e.target.value) || 1 })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" />
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <button disabled={!form.guestName || !form.guestPhone || !form.guestNIC} onClick={handleNext} className="bg-navy text-white px-6 py-2.5 rounded-lg flex items-center gap-2">Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Dates & Package */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold border-b pb-2">Dates & Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1">Check In *</label>
                <input type="datetime-local" value={form.checkin} onChange={e => updateForm({ checkin: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check Out *</label>
                <input type="datetime-local" value={form.checkout} onChange={e => updateForm({ checkout: e.target.value })} className="w-full p-3 border rounded-lg focus:ring-gold outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 mt-4">Select Package *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg: any) => (
                  <label key={pkg.id} className={`border p-4 rounded-xl cursor-pointer transition ${form.packageId === pkg.id.toString() ? 'border-navy bg-navy/5 shadow-sm' : 'hover:border-gold'}`}>
                    <input type="radio" value={pkg.id} checked={form.packageId === pkg.id.toString()} onChange={e => updateForm({ packageId: e.target.value })} className="sr-only" />
                    <div className="font-bold text-navy mb-1">{pkg.name}</div>
                    <div className="text-sm text-gray-500 mb-2">{pkg.description}</div>
                    <div className="text-gold font-medium text-sm">
                      {pkg.flat_price ? `LKR ${pkg.flat_price} flat` : `${pkg.price_multiplier}x multiplier`}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium mb-1">Package Quantity</label>
               <input type="number" min="1" max="5" value={form.packageQty} onChange={e => updateForm({ packageQty: parseInt(e.target.value) || 1 })} className="p-3 border rounded-lg w-32 focus:ring-gold outline-none" />
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button onClick={handlePrev} className="px-6 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /> Back</button>
              <button disabled={!form.checkin || !form.checkout || !form.packageId} onClick={handleNext} className="bg-navy text-white px-6 py-2.5 rounded-lg flex items-center gap-2">Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Room Selection */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold border-b pb-2 flex justify-between">
              <span>Room Selection</span>
              {findingRooms && <span className="text-sm text-gold animate-pulse">Checking availability...</span>}
            </h2>
            
            {!findingRooms && availableRooms.length === 0 && (
              <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">
                No rooms available for these dates and package. Please go back and select different dates.
              </div>
            )}

            <div className="space-y-6">
              {availableRooms.map((cat: any) => (
                <div key={cat.category_id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-navy">{cat.category_name}</h3>
                    <div className="text-emerald-600 font-medium">Est: LKR {cat.calculated_price.toFixed(2)}</div>
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {cat.rooms.map((r: any) => (
                      <button 
                        key={r.id}
                        onClick={() => updateForm({ roomId: r.id })}
                        className={`py-3 px-4 rounded-lg font-bold transition ${form.roomId === r.id ? 'bg-gold text-white shadow-md transform scale-[1.02]' : 'bg-white border hover:border-gold hover:text-gold text-gray-700'}`}
                      >
                        {r.room_number} <span className="block text-xs font-normal opacity-80">Floor {r.floor} • Cap: {r.capacity}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6 mt-8">
              <button onClick={handlePrev} className="px-6 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /> Back</button>
              <button disabled={!form.roomId} onClick={handleNext} className="bg-navy text-white px-6 py-2.5 rounded-lg flex items-center gap-2">Next <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold border-b pb-2">Initial Payment (Optional)</h2>
            
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
              Estimated Total: <span className="font-bold text-lg ml-2 block sm:inline">LKR {baseAmount.toFixed(2)}</span>
              <p className="mt-1 opacity-80">This is a base estimate based on room rate and package multiplier.</p>
            </div>

            <PaymentPanel 
               totalAmount={baseAmount} 
               paidAmount={0} 
               stage="reservation" 
               requireFullPayment={false} 
               payments={form.payments} 
               onChange={(p) => updateForm({ payments: p })}
            />

            <div className="flex justify-between pt-6 mt-8">
              <button onClick={handlePrev} className="px-6 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /> Back</button>
              <button onClick={handleNext} className="bg-navy text-white px-6 py-2.5 rounded-lg flex items-center gap-2">Review <ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold border-b pb-2">Confirm Reservation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
              <div>
                <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-3">Guest Info</h3>
                <p className="font-medium text-navy text-lg">{form.guestName}</p>
                <p className="text-gray-600 font-mono text-sm">{form.guestPhone} • {form.guestNIC}</p>
                <p className="text-gray-600 text-sm mt-1">{form.numPeople} People</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-3">Stay Details</h3>
                <p className="font-medium text-navy text-lg">Room {selectedRoomData?.room_number}</p>
                <p className="text-gray-600 text-sm">{selectedPackage?.name} (x{form.packageQty})</p>
                <p className="text-gray-600 text-sm mt-1">In: {new Date(form.checkin).toLocaleString()}</p>
                <p className="text-gray-600 text-sm">Out: {new Date(form.checkout).toLocaleString()}</p>
              </div>
              
              <div className="md:col-span-2 border-t pt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Total Amount</span>
                  <span className="font-bold text-navy">LKR {baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 text-sm text-emerald-600">
                  <span>Initial Payment</span>
                  <span className="font-medium">LKR {form.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 mt-8">
              <button disabled={loading} onClick={handlePrev} className="px-6 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /> Back</button>
              <button disabled={loading} onClick={submitReservation} className="bg-gold hover:bg-gold/90 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg transition transform hover:-translate-y-0.5">
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
