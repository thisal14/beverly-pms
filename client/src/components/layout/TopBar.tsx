import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';

export default function TopBar() {
  const { user } = useAuth();
  const { activeHotelId } = useHotel();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center">
        {isSuperAdmin ? (
          <div className="text-sm flex items-center bg-gray-100 rounded-lg px-3 py-1.5 border">
            <span className="text-gray-500 mr-2 text-xs uppercase tracking-wider font-semibold">Viewing</span>
            <span className="font-semibold text-navy">{activeHotelId ? `Hotel ID: ${activeHotelId}` : 'Global View'}</span>
          </div>
        ) : (
          <h2 className="text-xl font-serif font-semibold text-navy tracking-tight">{user?.hotel?.name || 'Beverly Hotel'}</h2>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </header>
  );
}
