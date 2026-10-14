import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { RideMap } from '../components/RideMap';
import { useSocket } from '../context/SocketContext';
import {
  Shield,
  Users,
  Car,
  Search,
  Calendar,
  MapPin,
  Trash2,
  X,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Compass,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Tab State: 'members' | 'rides' | 'vehicles'
  const [activeTab, setActiveTab] = useState<'members' | 'rides' | 'vehicles' | 'live-map'>('members');
  const [selectedRideForMap, setSelectedRideForMap] = useState<any | null>(null);
  const { socket } = useSocket();

  // Member search & filter
  const [memberRoleFilter, setMemberRoleFilter] = useState<'ALL' | 'DRIVER' | 'PASSENGER' | 'ADMIN'>('ALL');
  const [memberSearch, setMemberSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, usersRes, ridesRes, vehiclesRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any }>('/admin/metrics'),
        apiRequest<{ success: boolean; data: any[] }>('/admin/users'),
        apiRequest<{ success: boolean; data: any[] }>('/admin/rides').catch(() => ({ data: [] })),
        apiRequest<{ success: boolean; data: any[] }>('/admin/vehicles').catch(() => ({ data: [] })),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (ridesRes.data) setRides(ridesRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for live vehicle coordinate updates and ride status
  useEffect(() => {
    if (!socket) return;

    const handleRideLocation = ({ rideId, lat, lng }: { rideId: string; lat: number; lng: number }) => {
      setRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, currentLat: lat, currentLng: lng } : r))
      );
      setSelectedRideForMap((prev: any) =>
        prev && prev.id === rideId ? { ...prev, currentLat: lat, currentLng: lng } : prev
      );
    };

    const handleRideStarted = ({ rideId }: { rideId: string }) => {
      setRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, status: 'IN_PROGRESS' } : r))
      );
    };

    socket.on('ride:location', handleRideLocation);
    socket.on('ride:started', handleRideStarted);

    return () => {
      socket.off('ride:location', handleRideLocation);
      socket.off('ride:started', handleRideStarted);
    };
  }, [socket]);


  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user account?`)) return;

    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      setActionMsg(`User account successfully ${!currentStatus ? 'activated' : 'suspended'}.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle user status');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'PASSENGER' | 'DRIVER' | 'ADMIN') => {
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;

    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      setActionMsg(`User role updated to ${newRole} successfully.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (!window.confirm('Force cancel this platform ride? All passengers and driver will be notified.')) return;

    try {
      await apiRequest(`/admin/rides/${rideId}/cancel`, {
        method: 'PATCH',
      });

      setActionMsg('Ride successfully terminated by administrator.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate ride');
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    if (!window.confirm('Permanently delete this ride and all associated bookings from the system?')) return;
    try {
      await apiRequest(`/admin/rides/${rideId}`, { method: 'DELETE' });
      setActionMsg('Ride listing deleted permanently.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ride');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Permanently remove this vehicle from the system?')) return;
    try {
      await apiRequest(`/admin/vehicles/${vehicleId}`, { method: 'DELETE' });
      setActionMsg('Vehicle deleted successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Permanently delete this user account and all their records? This cannot be undone.')) return;
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
      setActionMsg('User account deleted permanently.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // Filtered members
  const filteredUsers = users.filter((u) => {
    const matchesRole = memberRoleFilter === 'ALL' || u.role === memberRoleFilter;
    const matchesSearch =
      u.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.department?.toLowerCase().includes(memberSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const driversCount = users.filter((u) => u.role === 'DRIVER').length;
  const passengersCount = users.filter((u) => u.role === 'PASSENGER').length;
  const adminsCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold mb-2">
          <Shield className="h-3.5 w-3.5 text-indigo-400" />
          RouteMate Administrative Console
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">System Operations Hub</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Monitor platform metrics, manage role permissions, moderate carpools, and inspect registered vehicles.
        </p>
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">Total Users</div>
            <div className="text-2xl font-black text-slate-900">{metrics.totalUsers}</div>
            <div className="text-[11px] text-emerald-600 font-semibold">{metrics.activeUsers} active accounts</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">Total Platform Rides</div>
            <div className="text-2xl font-black text-indigo-600">{metrics.totalRides}</div>
            <div className="text-[11px] text-slate-500 font-medium">{metrics.activeRides} currently scheduled</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">Completed Carpools</div>
            <div className="text-2xl font-black text-emerald-600">{metrics.completedRides}</div>
            <div className="text-[11px] text-slate-500 font-medium">{metrics.totalBookings} booked seats</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">Registered Vehicles</div>
            <div className="text-2xl font-black text-purple-600">{metrics.totalVehicles}</div>
            <div className="text-[11px] text-slate-500 font-medium">Platform garage capacity</div>
          </div>
        </div>
      )}

      {/* Main Tab Bar */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Community Members ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rides')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'rides'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Platform Carpools ({rides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vehicles')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'vehicles'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Registered Vehicles ({vehicles.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('live-map');
            if (!selectedRideForMap && rides.length > 0) {
              setSelectedRideForMap(rides[0]);
            }
          }}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'live-map'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Navigation className="h-4 w-4" />
          <span>Live Fleet & Route Map</span>
        </button>
      </div>

      {/* TAB 1: COMMUNITY MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          {/* Subfilter & Search */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMemberRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  memberRoleFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setMemberRoleFilter('DRIVER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  memberRoleFilter === 'DRIVER'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Drivers ({driversCount})</span>
              </button>
              <button
                onClick={() => setMemberRoleFilter('PASSENGER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  memberRoleFilter === 'PASSENGER'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>Passengers ({passengersCount})</span>
              </button>
              <button
                onClick={() => setMemberRoleFilter('ADMIN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  memberRoleFilter === 'ADMIN'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admins ({adminsCount})</span>
              </button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member name or email..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">User Details</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Registered Vehicles</th>
                  <th className="px-6 py-3.5">Activity</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{u.department || 'Member'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'DRIVER'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {u.role === 'ADMIN' ? (
                          <>
                            <Shield className="h-3 w-3" />
                            <span>Admin</span>
                          </>
                        ) : u.role === 'DRIVER' ? (
                          <>
                            <Car className="h-3 w-3" />
                            <span>Driver</span>
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-3 w-3" />
                            <span>Passenger</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.vehicles && u.vehicles.length > 0 ? (
                        <div className="space-y-1">
                          {u.vehicles.map((v: any) => (
                            <div key={v.id} className="flex items-center gap-1.5 text-slate-800">
                              <Car className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                              <span className="font-semibold">{v.make} {v.model}</span>
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {v.licensePlate}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No vehicle</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <div className="text-slate-900 font-semibold">{u.stats?.ridesDriven || 0} rides offered</div>
                      <div className="text-slate-400 text-[10px]">{u.stats?.requestsMade || 0} seats requested</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Role Change Option */}
                        {u.role === 'PASSENGER' && (
                          <button
                            onClick={() => handleUpdateRole(u.id, 'DRIVER')}
                            className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                          >
                            Promote to Driver
                          </button>
                        )}
                        {u.role === 'DRIVER' && (
                          <button
                            onClick={() => handleUpdateRole(u.id, 'PASSENGER')}
                            className="px-2.5 py-1 rounded-lg font-bold text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
                          >
                            Demote
                          </button>
                        )}

                        {/* Status Toggle */}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                              u.isActive
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}

                        {/* Permanent Delete */}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                            title="Delete user account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM CARPOOLS */}
      {activeTab === 'rides' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">All Scheduled & Past Rides ({rides.length})</h2>
            <span className="text-xs text-slate-500 font-medium">Real-time Platform Carpool Moderation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Driver</th>
                  <th className="px-6 py-3.5">Route</th>
                  <th className="px-6 py-3.5">Schedule</th>
                  <th className="px-6 py-3.5">Vehicle</th>
                  <th className="px-6 py-3.5">Seats & Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rides.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{r.driver?.name}</div>
                      <div className="text-slate-400 text-[11px]">{r.driver?.email}</div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        <span className="font-semibold">{r.origin}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <MapPin className="h-3 w-3 text-emerald-500" />
                        <span className="font-semibold">{r.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(r.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {r.vehicle ? (
                        <div>
                          <div className="font-semibold text-slate-800">{r.vehicle.make} {r.vehicle.model}</div>
                          <div className="text-[10px] font-mono text-slate-500">{r.vehicle.licensePlate}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-indigo-700">₹{r.pricePerSeat} / seat</div>
                      <div className="text-slate-500 text-[10px]">{r.availableSeats} of {r.totalSeats} seats left</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'SCHEDULED'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : r.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {r.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleCancelRide(r.id)}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-bold transition"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRide(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                          title="Permanently delete ride"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTERED VEHICLES GARAGE */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Registered Vehicles Garage ({vehicles.length})</h2>
            <span className="text-xs text-slate-500 font-medium">All Fleet Vehicles in the RouteMate System</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Owner / Driver</th>
                  <th className="px-6 py-3.5">Vehicle Model</th>
                  <th className="px-6 py-3.5">Year & Color</th>
                  <th className="px-6 py-3.5">License Plate</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{v.user?.name}</div>
                      <div className="text-slate-400 text-[11px]">{v.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {v.make} {v.model}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {v.year} • {v.color}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {v.licensePlate}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {v.capacity} seats
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                        title="Delete vehicle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE FLEET & ROUTE MAP */}
      {activeTab === 'live-map' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-600" />
                Live Fleet Tracking & Route Corridor Monitor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect real-time GPS locations, route geometries, passenger boarding verification, and driver statuses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Socket Live Sync Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rides List sidebar */}
            <div className="space-y-3 lg:col-span-1 max-h-[550px] overflow-y-auto pr-1">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Select Active or Scheduled Carpool ({rides.length})
              </div>
              {rides.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  No carpools found in the system.
                </div>
              ) : (
                rides.map((r) => {
                  const isSelected = selectedRideForMap?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRideForMap(r)}
                      className={`p-4 rounded-2xl border text-xs cursor-pointer transition space-y-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            r.status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                              : r.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {r.status === 'IN_PROGRESS' ? 'Moving Live' : r.status}
                        </span>
                        <span className="font-extrabold text-indigo-600">
                          ₹{r.pricePerSeat} / seat
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 truncate">
                        Driver: {r.driver?.name || 'Assigned Driver'}
                      </div>

                      <div className="space-y-1 text-slate-600">
                        <div className="truncate"><span className="text-slate-400 font-semibold">From:</span> {r.origin}</div>
                        <div className="truncate"><span className="text-slate-400 font-semibold">To:</span> {r.destination}</div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                        <span>{r.vehicle ? `${r.vehicle.make} ${r.vehicle.model}` : 'Standard Car'}</span>
                        <span>{r.requests?.length || 0} passengers</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Map Preview on Right */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRideForMap ? (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {selectedRideForMap.origin} → {selectedRideForMap.destination}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Driver: <strong>{selectedRideForMap.driver?.name}</strong> • Phone: {selectedRideForMap.driver?.phoneNumber || 'N/A'} • Status: <strong className="text-indigo-600">{selectedRideForMap.status}</strong>
                      </div>
                    </div>
                    {selectedRideForMap.currentLat && (
                      <div className="text-right text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                        GPS: {selectedRideForMap.currentLat.toFixed(4)}, {selectedRideForMap.currentLng.toFixed(4)}
                      </div>
                    )}
                  </div>

                  <RideMap
                    origin={selectedRideForMap.origin}
                    destination={selectedRideForMap.destination}
                    currentLat={selectedRideForMap.currentLat}
                    currentLng={selectedRideForMap.currentLng}
                    height="440px"
                    interactive={true}
                  />

                  {/* Passenger Boarding Manifest in Map Tab */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Passenger Boarding Manifest & Verification Status ({selectedRideForMap.requests?.length || 0})
                    </div>
                    {(!selectedRideForMap.requests || selectedRideForMap.requests.length === 0) ? (
                      <div className="text-xs text-slate-400">No passenger requests for this corridor yet.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {selectedRideForMap.requests.map((rq: any) => (
                          <div key={rq.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{rq.passenger?.name || 'Passenger'}</div>
                              <div className="text-[10px] text-slate-400">{rq.passenger?.email}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rq.isBoarded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {rq.isBoarded ? 'OTP Verified & Boarded' : `OTP: ${rq.otp || 'Pending'}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-[440px] bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-xs text-slate-400">
                  Select a ride from the list on the left to track its route corridor and live location.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
