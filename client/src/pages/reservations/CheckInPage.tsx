import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useHotel } from '../../context/HotelContext';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import PaymentPanel from '../../components/PaymentPanel';
import type { PaymentEntry } from '../../components/PaymentPanel';
import { AlertCircle, Plus, Trash2, UserCheck, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CheckInPage() {
  const { id, hotelSlug } = useParams();
  const navigate = useNavigate();
  const { activeHotel } = useHotel();
  const hotelTz = activeHotel?.timezone || 'Asia/Colombo';

  const [actualCheckin, setActualCheckin] = useState(
    formatInTimeZone(new Date(), hotelTz, "yyyy-MM-dd'T'HH:mm")
  );
  const [numPeople, setNumPeople] = useState(1);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [guests, setGuests] = useState([{ fullName: '', nicPassport: '' }]);
  const [loading, setLoading] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => {
      const data = (await api.get(`/reservations/${id}`)).data.data;
      setNumPeople(data.num_people);
      setGuests([{ fullName: data.customer_name, nicPassport: data.customer_nic_passport || '' }]);
      return data;
    },
    enabled: !!id
  });

  if (isLoading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading reservation details...</div>;
  if (!res) return null;

  const roomCapacity = res.room?.capacity || 2;
  const scheduledTime = new Date(res.scheduled_checkin).getTime();
  const actualTime = new Date(actualCheckin).getTime();
  const gracePeriod = 2 * 60 * 60 * 1000; // 2 hours

  const isEarly = actualTime < (scheduledTime - gracePeriod);
  const isExtraGuests = numPeople > roomCapacity;

  const handleAddGuest = () => setGuests([...guests, { fullName: '', nicPassport: '' }]);
  const handleUpdateGuest = (i: number, f: string, v: string) => {
    const nw = [...guests];
    nw[i] = { ...nw[i], [f]: v };
    setGuests(nw);
  };
  const handleRemoveGuest = (i: number) => setGuests(guests.filter((_, idx) => idx !== i));

  const onSubmit = async () => {
    try {
      setLoading(true);
      const utcDate = toDate(actualCheckin, { timeZone: hotelTz });
      const payload = {
        actual_checkin: utcDate.toISOString(),
        num_people: numPeople,
        payments: payments,
        guests: guests.filter(g => g.fullName)
      };
      await api.post(`/reservations/${id}/checkin`, payload);
      toast.success('Check-in process completed successfully!');
      navigate(`/${hotelSlug}/reservations/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <Link to={`/${hotelSlug}/reservations/${id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition font-medium">
        <ArrowLeft size={16} /> Back to Reservation
      </Link>

      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><UserCheck className="text-gold" size={32} /> Check-In Process</h1>
        <p className="text-gray-500 mt-2 font-medium">Reservation {res.reservation_number} • Room {res.room?.room_number}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
         <div className="flex-1">
           <label className="block text-sm font-bold text-navy mb-2">Actual Check-In Date & Time ({hotelTz})</label>
           <input type="datetime-local" value={actualCheckin} onChange={e => setActualCheckin(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-gold focus:border-gold outline-none bg-gray-50 font-medium" />
           <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"><Clock size={12} /> Scheduled: {formatInTimeZone(new Date(res.scheduled_checkin), hotelTz, 'PPp')} ({hotelTz})</p>
         </div>
         <div className="flex-1">
           <label className="block text-sm font-bold text-navy mb-2">Total Guests Staying</label>
           <input type="number" min="1" value={numPeople} onChange={e => setNumPeople(parseInt(e.target.value) || 1)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-gold outline-none bg-gray-50 font-medium" />
           <p className="text-xs text-gray-500 mt-2">Room Capacity: <span className="font-bold">{roomCapacity}</span> persons</p>
         </div>
      </div>

      {(isEarly || isExtraGuests) && (
        <div className="bg-orange-50/80 border border-orange-200 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
          <AlertCircle className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-orange-800">Additional Fees May Apply</h3>
            <ul className="text-orange-700 text-sm mt-2 list-disc pl-5 space-y-1 font-medium">
               {isEarly && <li>Early check-in fee (arriving before grace period)</li>}
               {isExtraGuests && <li>Surcharge for {numPeople - roomCapacity} extra person(s) beyond room capacity</li>}
            </ul>
            <p className="text-xs text-orange-600 mt-3 opacity-80 uppercase tracking-wider font-bold">Fees will be computed strictly by the server.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="p-5 border-b border-gray-100 bg-navy text-white flex justify-between items-center">
           <span className="font-bold">Guest Identification Registry</span>
           <button onClick={handleAddGuest} className="text-xs font-bold bg-white/10 text-white hover:bg-gold hover:text-white px-3 py-2 rounded-lg transition flex items-center gap-1.5"><Plus size={14} /> Add Guest ID</button>
         </div>
         <div className="p-6 space-y-4 bg-gray-50/30">
           {guests.map((g, i) => (
             <div key={i} className="flex gap-4">
               <input type="text" placeholder="Full Name (e.g. John Doe)" value={g.fullName} onChange={e => handleUpdateGuest(i, 'fullName', e.target.value)} className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:border-gold bg-white" />
               <input type="text" placeholder="NIC / Passport Nr." value={g.nicPassport} onChange={e => handleUpdateGuest(i, 'nicPassport', e.target.value)} className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:border-gold bg-white" />
               <button onClick={() => handleRemoveGuest(i)} disabled={guests.length === 1} className="text-red-500 p-3 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition disabled:opacity-30 disabled:hover:bg-transparent"><Trash2 size={20} /></button>
             </div>
           ))}
         </div>
      </div>

      <PaymentPanel 
         totalAmount={parseFloat(res.total_amount)} 
         paidAmount={parseFloat(res.paid_amount)} 
         stage="checkin" 
         requireFullPayment={false} 
         payments={payments} 
         onChange={setPayments} 
      />

      <div className="flex justify-between items-center pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-500 font-medium px-2">Ensure all identification is verified.</p>
        <button onClick={onSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-70 flex items-center gap-2">
           {loading ? 'Processing...' : 'Complete Check-In'} <UserCheck size={20} />
        </button>
      </div>
    </div>
  );
}
