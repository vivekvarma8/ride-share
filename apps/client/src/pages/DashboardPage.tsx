import React, { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiRequest } from '../api/client';
import {
  Car,
  Search,
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Clock,
  IndianRupee,
  Shield,
  Sparkles,
  TrendingUp,
  Star,
} from 'lucide-react';
import { Ride, UserRole } from '@rideshare/shared';

export const DashboardPage: React.FC = () => {
  const { user, becomeDriver } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [drives, setDrives] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  const isDriver = user?.role === UserRole.DRIVER;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isPassenger = user?.role === UserRole.PASSENGER;

  // If Admin, directly send to Admin Console (no redundant dashboard)
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // View mode is strictly constrained: passengers CANNOT switch to driver!
  // Drivers can optionally switch to passenger view to inspect their bookings.
  const [driverViewTab, setDriverViewTab] = useState<'driver' | 'passenger'>('driver');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        apiRequest<{ success: boolean; data: Ride[] }>('/rides?limit=6'),
        apiRequest<{ success: boolean; data: any[] }>('/rides/my/bookings').catch(() => ({ data: [] })),
      ];

      if (isDriver || isAdmin) {
        promises.push(
          apiRequest<{ success: boolean; data: any[] }>('/rides/my/drives').catch(() => ({ data: [] }))
        );
      }

      const results = await Promise.all(promises);
      const ridesRes = results[0];
      const bookingsRes = results[1];
      const drivesRes = isDriver || isAdmin ? results[2] : { data: [] };

      if (ridesRes.success && ridesRes.data) setAvailableRides(ridesRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (drivesRes.data) setDrives(drivesRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, user?.role]);

  // Real-time listener for live ride updates without page refresh
  useEffect(() => {
    if (!socket) return;

    const handleRideCreated = (newRide: Ride) => {
      if (user?.id && newRide.driverId === user.id) {
        setDrives((prev) => {
          if (prev.some((d) => d.id === newRide.id)) return prev;
          return [newRide, ...prev];
        });
      } else {
        setAvailableRides((prev) => {
          if (prev.some((r) => r.id === newRide.id)) return prev;
          return [newRide, ...prev.slice(0, 5)];
        });
      }
    };

    const handleRideDeleted = ({ rideId }: { rideId: string }) => {
      setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
      setDrives((prev) => prev.filter((d) => d.id !== rideId));
    };

    socket.on('ride:created', handleRideCreated);
    socket.on('ride:deleted', handleRideDeleted);

    return () => {
      socket.off('ride:created', handleRideCreated);
      socket.off('ride:deleted', handleRideDeleted);
    };
  }, [socket, user?.id]);

  const handleBecomeDriver = async () => {
    if (window.confirm('Register as a Driver? You will be able to register vehicles and offer rides to earn in ₹.')) {
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

  const handleApproveOrDecline = async (rideId: string, requestId: string, action: 'APPROVE' | 'DECLINE') => {
    try {
      await apiRequest(`/rides/${rideId}/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setActionMsg(`Passenger request ${action === 'APPROVE' ? 'approved' : 'declined'} successfully!`);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  // Collect all pending requests waiting for this driver
  const pendingRequestsToReview = drives.flatMap((d) =>
    (d.requests || [])
      .filter((r: any) => r.status === 'PENDING')
      .map((r: any) => ({ ...r, ride: d })),
  );

  // Calculate stats
  const totalDriverSeatsFilled = drives.reduce(
    (acc, d) => acc + (d.totalSeats - d.availableSeats),
    0,
  );
  const estimatedEarnings = drives.reduce(
    (acc, d) => acc + (d.totalSeats - d.availableSeats) * d.pricePerSeat,
    0,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Role-Based Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Authenticated As:</span>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
            isAdmin
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isDriver
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isAdmin ? (
              <>
                <Shield className="h-3.5 w-3.5" />
                <span>Administrator Console</span>
              </>
            ) : isDriver ? (
              <>
                <Car className="h-3.5 w-3.5" />
                <span>Verified Driver Portal</span>
              </>
            ) : (
              <>
                <Users className="h-3.5 w-3.5" />
                <span>Verified Passenger Portal</span>
              </>
            )}
          </span>
        </div>

        {isDriver && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/rides/create"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Offer a Ride</span>
            </Link>
          </div>
        )}

        {isPassenger && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleBecomeDriver}
              disabled={isPromoting}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Car className="h-3.5 w-3.5 text-amber-600" />
              {isPromoting ? 'Upgrading...' : 'Want to offer rides? Become a Driver'}
            </button>
          </div>
        )}

        {isAdmin && (
          <Link
            to="/admin"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Shield className="h-3.5 w-3.5 text-indigo-400" />
            <span>Open Full Admin Console →</span>
          </Link>
        )}
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: DRIVER DASHBOARD (Only accessible to Drivers and Admins)          */}
      {/* ========================================================================= */}
      {isDriver && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Driver Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-8 sm:p-10 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-100 text-xs font-semibold backdrop-blur border border-indigo-400/20">
                <Car className="h-3.5 w-3.5" />
                <span>Driver Control Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Welcome back, Driver {user?.name.split(' ')[0]}
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                Manage your scheduled rides, approve incoming passenger requests, and keep track of your cost-sharing contributions in ₹ (INR).
              </p>

              <div className="pt-3 flex flex-wrap gap-3">
                <Link
                  to="/rides/create"
                  className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm shadow hover:bg-indigo-50 transition flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Offer New Ride</span>
                </Link>
                <Link
                  to="/vehicles"
                  className="px-5 py-2.5 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-bold text-sm border border-indigo-400/30 backdrop-blur transition flex items-center gap-2"
                >
                  <Car className="h-4 w-4" />
                  Manage My Vehicles
                </Link>
              </div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
              <Car className="w-96 h-96 -mr-16" />
            </div>
          </div>

          {/* Driver Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Published Rides</div>
              <div className="text-2xl font-black text-slate-900">{drives.length}</div>
              <div className="text-[11px] text-indigo-600 font-semibold">Active itineraries</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Passenger Seats Filled</div>
              <div className="text-2xl font-black text-emerald-600">{totalDriverSeatsFilled}</div>
              <div className="text-[11px] text-slate-500">Confirmed carpoolers</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Total Fuel Share (INR)</div>
              <div className="text-2xl font-black text-indigo-600">₹{estimatedEarnings.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Saved commute costs</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Driver Rating</div>
              <div className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span>4.9 / 5.0</span>
              </div>
              <div className="text-[11px] text-slate-500">Community verified</div>
            </div>
          </div>

          {/* Urgent: Pending Passenger Requests Needing Driver Approval */}
          {pendingRequestsToReview.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-amber-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Incoming Join Requests Needing Your Approval ({pendingRequestsToReview.length})
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Passengers have requested seats on your published rides. Approve or decline to update capacity.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequestsToReview.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                          {item.passenger?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{item.passenger?.name}</div>
                          <div className="text-[11px] text-slate-500">{item.passenger?.department || 'Commuter'}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {item.seats} Seat(s) • ₹{(item.seats * item.ride.pricePerSeat).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-800">Trip: </span>
                      {item.ride.origin} → {item.ride.destination}
                      {item.pickupNote && (
                        <div className="mt-1 italic text-slate-500">"{item.pickupNote}"</div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApproveOrDecline(item.rideId, item.id, 'APPROVE')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Approve Passenger
                      </button>
                      <button
                        onClick={() => handleApproveOrDecline(item.rideId, item.id, 'DECLINE')}
                        className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5"
                      >
                        <X className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Drives Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Your Active Scheduled Drives</h2>
                <p className="text-xs text-slate-500">Rides you are currently hosting as a driver</p>
              </div>
              <Link to="/my-rides" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Manage all drives →
              </Link>
            </div>

            {drives.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                <Car className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800">You don't have any scheduled drives</h3>
                <p className="text-xs text-slate-500">Offer a ride along your daily route to start earning fuel share.</p>
                <Link
                  to="/rides/create"
                  className="inline-block mt-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Create Your First Ride
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {drives.map((ride) => (
                  <div
                    key={ride.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-200 transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {ride.status}
                        </span>
                        <div className="font-extrabold text-base text-indigo-600">
                          ₹{ride.pricePerSeat} <span className="text-[10px] text-slate-400 font-normal">/ seat</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span className="font-medium line-clamp-1">{ride.origin}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="font-medium line-clamp-1">{ride.destination}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">
                        {ride.availableSeats} of {ride.totalSeats} seats left
                      </span>
                      <Link
                        to="/my-rides"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Manage Roster →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: PASSENGER DASHBOARD                                               */}
      {/* ========================================================================= */}
      {(isPassenger || (isDriver && driverViewTab === 'passenger')) && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Become a Driver Promotion Card for pure passengers */}
          {isPassenger && (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 border border-amber-200 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    <Car className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Exclusive Driver Opportunity</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Do you commute daily by car?</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Register your vehicle on RouteMate in 1 minute. Offer your spare seats, connect with verified co-commuters, and offset your daily fuel costs in INR (₹).
                </p>
              </div>
              <button
                onClick={handleBecomeDriver}
                disabled={isPromoting}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 flex-shrink-0"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{isPromoting ? 'Upgrading...' : 'Become a Driver Now'}</span>
              </button>
            </div>
          )}

          {/* Passenger Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-800 text-white p-8 sm:p-10 shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-100 text-xs font-semibold backdrop-blur border border-indigo-400/20">
                <Users className="h-3.5 w-3.5" />
                <span>Passenger Commuter Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Where are you commuting, {user?.name.split(' ')[0]}?
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                Connect with verified drivers heading your way. Split fuel costs in ₹ (INR), avoid public transit delays, and travel comfortably.
              </p>

              <div className="pt-3 flex flex-wrap gap-3">
                <Link
                  to="/rides"
                  className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm shadow hover:bg-indigo-50 transition flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search Available Rides
                </Link>
                <Link
                  to="/my-rides"
                  className="px-5 py-2.5 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-bold text-sm border border-indigo-400/30 backdrop-blur transition flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  View My Bookings ({bookings.length})
                </Link>
              </div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
              <Users className="w-96 h-96 -mr-16" />
            </div>
          </div>

          {/* Passenger Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Total Bookings</div>
              <div className="text-2xl font-black text-slate-900">{bookings.length}</div>
              <div className="text-[11px] text-indigo-600 font-semibold">Carpools joined</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Confirmed Seats</div>
              <div className="text-2xl font-black text-emerald-600">
                {bookings.filter((b) => b.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold">Ready to depart</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Estimated Transit Savings</div>
              <div className="text-2xl font-black text-purple-600">
                ₹{(bookings.length * 220).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500">Vs cab/auto fares</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="text-xs font-bold uppercase text-slate-400">Community Safety</div>
              <div className="text-2xl font-black text-emerald-600">100%</div>
              <div className="text-[11px] text-slate-500">Verified members</div>
            </div>
          </div>

          {/* Passenger's Active Bookings Snapshot */}
          {bookings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">Your Upcoming Booked Trips</h2>
                <Link to="/my-rides" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                  View full history →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          b.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {b.status === 'APPROVED' ? (
                          <span className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Booking Confirmed</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                      </span>
                      <span className="font-extrabold text-sm text-indigo-600">
                        ₹{(b.seats * (b.ride?.pricePerSeat || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {b.ride?.driver?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">Driver: {b.ride?.driver?.name}</div>
                        <div className="text-[11px] text-slate-500">{b.ride?.vehicle?.make} {b.ride?.vehicle?.model}</div>
                      </div>
                    </div>

                    {b.status === 'APPROVED' && b.otp && (
                      <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Boarding Security Pass</div>
                          <div className="text-base font-black tracking-widest text-indigo-900 font-mono">OTP: {b.otp}</div>
                        </div>
                        <Link to={`/rides/${b.rideId}`} className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs hover:bg-indigo-50">
                          Live Map →
                        </Link>
                      </div>
                    )}
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div><span className="font-semibold">From:</span> {b.ride?.origin}</div>
                      <div><span className="font-semibold">To:</span> {b.ride?.destination}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Rides Discover Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Available Daily Carpools (INR)</h2>
                <p className="text-xs text-slate-500">Published rides departing soon with open seats</p>
              </div>
              <Link to="/rides" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Browse all rides <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {availableRides
                .filter((ride) => ride.driverId !== user?.id)
                .map((ride) => (
                <Link
                  key={ride.id}
                  to={`/rides/${ride.id}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ride.driver?.avatarUrl ? (
                          <img
                            src={ride.driver.avatarUrl}
                            alt={ride.driver.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                            {ride.driver?.name?.charAt(0) || 'D'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                            {ride.driver?.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{ride.driver?.department || 'Verified Commuter'}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-base text-indigo-600">
                          {ride.pricePerSeat > 0 ? `₹${ride.pricePerSeat}` : 'Free'}
                        </div>
                        <div className="text-[10px] text-slate-400">per seat</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium line-clamp-1">{ride.origin}</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="font-medium line-clamp-1">{ride.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(ride.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {ride.availableSeats} seats left
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ADMIN DASHBOARD SHORTCUT                                          */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 text-indigo-300 text-xs font-bold rounded-full border border-indigo-400/20">
              <Shield className="h-3.5 w-3.5" />
              RouteMate System Administrator Console
            </div>
            <h1 className="text-3xl font-black">Platform Operations Dashboard</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              As an administrator, you have full oversight over platform governance, user activation states, flagged ride moderations, and system health metrics.
            </p>
            <div className="pt-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow transition"
              >
                Go to Administrative Operations Console →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
