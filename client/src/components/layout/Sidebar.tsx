import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, CalendarDays, BedDouble, FileBarChart, Settings, Users, Building2, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const hotelSlug = user?.hotel?.slug || 'admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="w-64 bg-navy text-white min-h-screen flex flex-col transition-all text-sm shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
        <h1 className="text-xl font-serif font-bold text-gold truncate">Beverly PMS</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {!isSuperAdmin && (
          <>
            <NavItem to={`/${hotelSlug}/dashboard`} icon={<Home size={18} />} label="Dashboard" />
            <NavItem to={`/${hotelSlug}/reservations`} icon={<CalendarDays size={18} />} label="Reservations" />
            <NavItem to={`/${hotelSlug}/rooms`} icon={<BedDouble size={18} />} label="Rooms" />
            {(user?.role === 'admin' || user?.role === 'purchasing_manager') && (
              <NavItem to={`/${hotelSlug}/reports`} icon={<FileBarChart size={18} />} label="Reports" />
            )}
            {user?.role === 'admin' && (
              <>
                <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400/80 uppercase tracking-wider">Administration</div>
                <NavItem to={`/${hotelSlug}/users`} icon={<Users size={18} />} label="Users" />
                <NavItem to={`/${hotelSlug}/settings`} icon={<Settings size={18} />} label="Settings" />
              </>
            )}
          </>
        )}
        
         {isSuperAdmin && (
           <>
             <div className="pt-2 pb-2 px-3 text-xs font-semibold text-gray-400/80 uppercase tracking-wider">Super Admin</div>
             <NavItem to="/admin/dashboard" icon={<Home size={18} />} label="Dashboard" />
             <NavItem to="/admin/hotels" icon={<Building2 size={18} />} label="Hotels" />
            <NavItem to="/admin/users" icon={<Users size={18} />} label="All Users" />
            <NavItem to="/admin/reports" icon={<FileBarChart size={18} />} label="Global Reports" />
          </>
        )}
      </div>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-400/90 hover:bg-white/5 rounded-lg transition"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }: { isActive: boolean }) => 
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition duration-200 ${isActive ? 'bg-gold/15 text-gold font-medium' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
