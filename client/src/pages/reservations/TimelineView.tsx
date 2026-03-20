import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, differenceInMinutes, addDays, format, startOfDay, max, min, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';

interface TimelineProps {
  dateFrom: string;
  dateTo: string;
  onDateChange: (start: string, end: string) => void;
}

const DAILY_CELL_WIDTH = 100; // pixels per day
const HOURLY_CELL_WIDTH = 60; // pixels per hour

export default function TimelineView({ dateFrom, dateTo, onDateChange }: TimelineProps) {
  const { activeHotelId } = useHotel();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [viewMode, setViewMode] = useState<'daily' | 'hourly'>('daily');
  const [selectedHourlyDate, setSelectedHourlyDate] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['timeline', activeHotelId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get(`/reservations/timeline?hotel_id=${activeHotelId}&start_date=${dateFrom}&end_date=${dateTo}`);
      return res.data.data;
    },
    enabled: !!activeHotelId
  });

  // Generate array of days for the header and grid calculation
  const days = useMemo(() => {
    const start = startOfDay(parseISO(dateFrom));
    const end = startOfDay(parseISO(dateTo));
    const totalDays = differenceInDays(end, start) + 1;
    return Array.from({ length: totalDays }).map((_, i) => addDays(start, i));
  }, [dateFrom, dateTo]);

  const handlePrev = () => {
    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    onDateChange(format(addDays(start, -7), 'yyyy-MM-dd'), format(addDays(end, -7), 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    onDateChange(format(addDays(start, 7), 'yyyy-MM-dd'), format(addDays(end, 7), 'yyyy-MM-dd'));
  };

  const jumpToToday = () => {
    const today = new Date();
    onDateChange(
      format(addDays(today, -3), 'yyyy-MM-dd'),
      format(addDays(today, 17), 'yyyy-MM-dd')
    );
  };

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 text-gold mx-auto mb-4 animate-bounce" />
          <p className="text-navy font-bold">Loading Tape Chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-white rounded-2xl border border-red-100 shadow-sm">
        <div className="text-center text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p className="font-bold">Failed to load timeline data.</p>
        </div>
      </div>
    );
  }

  const { rooms = [], reservations = [] } = data || {};

  // Group reservations by room ID for O(1) rendering lookups
  const reservationsByRoom = reservations.reduce((acc: any, res: any) => {
    if (!acc[res.room_id]) acc[res.room_id] = [];
    acc[res.room_id].push(res);
    return acc;
  }, {});

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'reserved': return 'bg-navy/90 border-navy text-white shadow-navy/30';
      case 'checked_in': return 'bg-emerald-500/90 border-emerald-600 text-white shadow-emerald-500/30';
      case 'checked_out': return 'bg-gray-400/90 border-gray-500 text-white shadow-gray-400/30';
      case 'no_show': return 'bg-red-500/90 border-red-600 text-white shadow-red-500/30';
      default: return 'bg-navy border-navy text-white';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
      
      {/* Timeline Controls */}
      <div className="bg-gray-50/80 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {viewMode === 'hourly' ? (
             <button onClick={() => setViewMode('daily')} className="px-4 py-2 font-bold text-sm bg-white border border-gray-200 shadow-sm rounded-xl text-navy hover:border-gold hover:text-gold transition-colors flex items-center gap-2">
               <ArrowLeft size={16} /> Back to Daily View ({selectedHourlyDate && format(parseISO(selectedHourlyDate), 'MMM dd, yyyy')})
             </button>
          ) : (
            <>
              <button onClick={handlePrev} className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-200 transition-all text-gray-500 hover:text-navy">
                <ChevronLeft size={20} />
              </button>
              <button onClick={jumpToToday} className="px-4 py-2 font-bold text-sm bg-white border border-gray-200 shadow-sm rounded-xl text-navy hover:border-gold hover:text-gold transition-colors flex items-center gap-2">
                <CalendarIcon size={16} /> Today
              </button>
              <button onClick={handleNext} className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-200 transition-all text-gray-500 hover:text-navy">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        
        <div className="flex gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-navy"></div> Reserved</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500"></div> In House</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-400"></div> Checked Out</div>
        </div>
      </div>

      {/* Grid Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto custom-scrollbar relative"
        style={{ maxHeight: '70vh' }}
      >
        <div className="min-w-max">
          
          {/* Header Row (Dates) */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            {/* Corner Cell */}
            <div className="w-48 flex-shrink-0 sticky left-0 z-40 bg-white border-r border-gray-200 p-4 flex flex-col justify-end">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Room / Date</span>
            </div>
            
            {/* Days or Hours */}
            <div className="flex bg-gray-50">
              {viewMode === 'daily' ? days.map((day, i) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div 
                    key={i} 
                    onClick={() => {
                        setSelectedHourlyDate(format(day, 'yyyy-MM-dd'));
                        setViewMode('hourly');
                    }}
                    title="Click to view hourly layout"
                    className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center p-2 transition-colors cursor-pointer hover:bg-gold/10
                      ${isToday ? 'bg-gold/10' : isWeekend ? 'bg-gray-100/50' : 'bg-white'}
                    `}
                    style={{ width: DAILY_CELL_WIDTH }}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-gold' : 'text-gray-400'}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-lg font-black ${isToday ? 'text-navy' : 'text-gray-700'}`}>
                      {format(day, 'dd')}
                    </span>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-navy/60' : 'text-gray-400'}`}>
                      {format(day, 'MMM')}
                    </span>
                  </div>
                );
              }) : Array.from({ length: 24 }).map((_, hour) => (
                  <div 
                    key={hour} 
                    className="flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center p-2 bg-white"
                    style={{ width: HOURLY_CELL_WIDTH }}
                  >
                    <span className="text-xs font-bold text-gray-500">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {rooms.map((room: any) => {
              const roomRes = reservationsByRoom[room.id] || [];
              const isMaintenance = room.room_status === 'maintenance';

              return (
                <div key={room.id} className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                  
                  {/* Y-Axis Room Info */}
                  <div className="w-48 flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-200 p-4 group-hover:bg-gray-50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-navy flex items-center gap-2">
                        {room.room_number}
                        {isMaintenance && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Under Maintenance"></div>}
                      </div>
                      <div className="text-xs font-medium text-gray-400">{room.category_name}</div>
                    </div>
                  </div>

                  {/* X-Axis Timeline Track */}
                  <div className="flex relative">
                    {/* Background Grid Lines */}
                    {viewMode === 'daily' ? days.map((day, i) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div 
                          key={i} 
                          className={`flex-shrink-0 border-r border-gray-100 ${isWeekend ? 'bg-gray-50/50' : ''}`}
                          style={{ width: DAILY_CELL_WIDTH }}
                        />
                      );
                    }) : Array.from({ length: 24 }).map((_, hour) => (
                        <div 
                          key={hour} 
                          className="flex-shrink-0 border-r border-gray-100"
                          style={{ width: HOURLY_CELL_WIDTH }}
                        />
                    ))}

                    {/* Maintenance Striping Background */}
                    {isMaintenance && (
                      <div 
                        className="absolute inset-0 z-0 opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 25%, transparent 25%, transparent 75%, #ef4444 75%, #ef4444), repeating-linear-gradient(45deg, #ef4444 25%, #ffffff 25%, #ffffff 75%, #ef4444 75%, #ef4444)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}
                      />
                    )}

                    {/* Reservation Blocks */}
                    {roomRes.map((res: any) => {
                      const start = parseISO(res.scheduled_checkin);
                      const end = parseISO(res.scheduled_checkout);
                      
                      let timelineStart: Date;
                      let timelineEnd: Date;
                      let leftPx: number;
                      let widthPx: number;
                      
                      if (viewMode === 'hourly' && selectedHourlyDate) {
                          timelineStart = startOfDay(parseISO(selectedHourlyDate));
                          timelineEnd = addDays(timelineStart, 1); // Exact 24h boundary
                      } else {
                          timelineStart = startOfDay(parseISO(dateFrom));
                          timelineEnd = startOfDay(parseISO(dateTo));
                      }

                      // Calculate visible segment (clamp to timeline boundaries)
                      const visibleStart = max([start, timelineStart]);
                      const visibleEnd = min([end, timelineEnd]);

                      // If it's completely out of bounds, don't render (safety check)
                      if (visibleStart >= visibleEnd) return null;

                      // Calculate pixel positioning
                      if (viewMode === 'daily') {
                          leftPx = (differenceInDays(visibleStart, timelineStart) + (visibleStart.getHours() / 24)) * DAILY_CELL_WIDTH;
                          widthPx = (differenceInDays(visibleEnd, visibleStart) + ((visibleEnd.getHours() - visibleStart.getHours()) / 24)) * DAILY_CELL_WIDTH;
                      } else {
                          leftPx = (differenceInMinutes(visibleStart, timelineStart) / 60) * HOURLY_CELL_WIDTH;
                          widthPx = (differenceInMinutes(visibleEnd, visibleStart) / 60) * HOURLY_CELL_WIDTH;
                      }

                      // Visual adjustments for continuous blocks
                      const isCutStart = start < timelineStart;
                      const isCutEnd = end > timelineEnd;

                      return (
                         <div
                            key={res.reservation_id}
                            className={`absolute top-2 bottom-2 z-10 rounded-lg shadow-sm border p-2 overflow-hidden flex flex-col justify-center transform transition-transform hover:scale-[1.02] hover:z-50 cursor-pointer ${getStatusStyle(res.reservation_status)}`}
                            style={{ 
                              left: `${leftPx}px`, 
                              width: `${Math.max(widthPx, 20)}px`, // Ensure minimum width
                              borderTopLeftRadius: isCutStart ? 0 : '0.5rem',
                              borderBottomLeftRadius: isCutStart ? 0 : '0.5rem',
                              borderTopRightRadius: isCutEnd ? 0 : '0.5rem',
                              borderBottomRightRadius: isCutEnd ? 0 : '0.5rem',
                            }}
                            title={`${res.customer_name} (${format(start, 'MMM dd')} - ${format(end, 'MMM dd')})`}
                         >
                            <div className="truncate text-xs font-bold leading-tight">{res.customer_name}</div>
                            {widthPx > 80 && (
                               <div className="truncate text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
                                 <Clock size={10} /> {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                               </div>
                            )}
                         </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
