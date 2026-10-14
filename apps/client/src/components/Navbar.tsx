import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Car,
  Bell,
  Search,
  PlusCircle,
  Clock,
  Shield,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { UserRole } from '@rideshare/shared';

export const Navbar: React.FC = () => {
  const { user, logout, becomeDriver } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBecomeDriver = async () => {
    if (window.confirm('Register as a Driver? You will be able to register vehicles and offer rides to other commuters.')) {
      setIsPromoting(true);
      try {
        await becomeDriver();
        navigate('/vehicles');
      } catch (err: any) {
        alert(err.message || 'Failed to update role');
      } finally {
        setIsPromoting(false);
      }
    }
  };


  // Strictly define navigation links based on user role
  let navLinks: { name: string; path: string; icon: any }[] = [];

  if (user?.role === UserRole.PASSENGER) {
    navLinks = [
      { name: 'Dashboard', path: '/dashboard', icon: Clock },
      { name: 'Find Rides', path: '/rides', icon: Search },
      { name: 'My Bookings', path: '/my-rides', icon: Car },
    ];
  } else if (user?.role === UserRole.DRIVER) {
    navLinks = [
      { name: 'Driver Dashboard', path: '/dashboard', icon: Clock },
      { name: 'Offer a Ride', path: '/rides/create', icon: PlusCircle },
      { name: 'My Rides', path: '/my-rides', icon: Car },
      { name: 'My Vehicles', path: '/vehicles', icon: Car },
    ];
  } else if (user?.role === UserRole.ADMIN) {
    navLinks = [
      { name: 'Admin Console', path: '/admin', icon: Shield },
      { name: 'Browse Rides', path: '/rides', icon: Search },
      { name: 'Vehicles Garage', path: '/vehicles', icon: Car },
    ];
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link to={user?.role === UserRole.ADMIN ? '/admin' : '/dashboard'} className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900">Route<span className="text-indigo-600">Mate</span></span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Carpooling
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isActive(link.path)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}

              {/* Become a Driver CTA for Passengers */}
              {user.role === UserRole.PASSENGER && (
                <button
                  onClick={handleBecomeDriver}
                  disabled={isPromoting}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs transition"
                >
                  <Car className="h-3.5 w-3.5" />
                  {isPromoting ? 'Upgrading...' : 'Become a Driver'}
                </button>
              )}
            </nav>
          )}

          {/* Right Action Group */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Bell Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Card with Outside Click Backdrop */}
                  {showNotifications && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div className="font-semibold text-xs tracking-wider uppercase text-slate-700">Notifications</div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.slice(0, 10).map((n) => (
                              <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-3 text-xs cursor-pointer transition-colors ${
                                  n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/60'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <span className="font-semibold text-slate-800">{n.title}</span>
                                  {!n.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                                  )}
                                </div>
                                <p className="text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1.5 block">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                          <Link
                            to="/notifications"
                            onClick={() => setShowNotifications(false)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            View all notifications →
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile Pill */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate leading-tight">
                      {user.name}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                      user.role === UserRole.ADMIN ? 'text-rose-600' :
                      user.role === UserRole.DRIVER ? 'text-indigo-600' : 'text-emerald-600'
                    }`}>
                      {user.role === UserRole.ADMIN ? (
                        <>
                          <Shield className="h-2.5 w-2.5" />
                          <span>Admin</span>
                        </>
                      ) : user.role === UserRole.DRIVER ? (
                        <>
                          <Car className="h-2.5 w-2.5" />
                          <span>Driver</span>
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-2.5 w-2.5" />
                          <span>Passenger</span>
                        </>
                      )}
                    </span>
                  </div>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>



        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && user && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {link.name}
              </Link>
            ))}
            {user.role === UserRole.PASSENGER && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleBecomeDriver();
                }}
                className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-sm font-bold text-amber-700 hover:bg-amber-50"
              >
                <Car className="h-4 w-4" />
                <span>Become a Driver</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
