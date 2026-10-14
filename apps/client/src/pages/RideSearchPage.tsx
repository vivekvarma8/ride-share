import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiRequest } from '../api/client';
import { Search, MapPin, Calendar, Users, Filter, Car, ArrowRight, Star } from 'lucide-react';
import { Ride } from '@rideshare/shared';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

export const RideSearchPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [seats, setSeats] = useState(searchParams.get('seats') || '1');

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: Ride[];
        pagination: { totalPages: number };
      }>('/rides', {
        params: {
          origin: origin || undefined,
          destination: destination || undefined,
          date: date || undefined,
          seats: Number(seats) || 1,
          page,
          limit: 9,
          excludeDriverId: user?.id || undefined,
        },
      });

      if (res.success) {
        setRides(res.data);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to search rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [page]);

  // Real-time listener: when a driver posts a ride, passengers see it instantly!
  useEffect(() => {
    if (!socket) return;

    const handleRideCreated = (newRide: Ride) => {
      // If the current user is the driver, don't show it in their own passenger search
      if (user?.id && newRide.driverId === user.id) return;

      setRides((prev) => {
        if (prev.some((r) => r.id === newRide.id)) return prev;
        return [newRide, ...prev];
      });
    };

    const handleRideDeleted = ({ rideId }: { rideId: string }) => {
      setRides((prev) => prev.filter((r) => r.id !== rideId));
    };

    socket.on('ride:created', handleRideCreated);
    socket.on('ride:deleted', handleRideDeleted);

    return () => {
      socket.off('ride:created', handleRideCreated);
      socket.off('ride:deleted', handleRideDeleted);
    };
  }, [socket, user?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRides();
  };

  const handleClearFilters = () => {
    setOrigin('');
    setDestination('');
    setDate('');
    setSeats('1');
    setPage(1);
    setTimeout(fetchRides, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Find a Carpool
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search carpools by neighborhood stops, transit hubs, and schedules.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <LocationAutocomplete
            label="Departure Origin"
            value={origin}
            onChange={(val) => setOrigin(val)}
            placeholder="Search any origin across India..."
            iconColor="text-indigo-500"
          />
        </div>

        <div>
          <LocationAutocomplete
            label="Destination"
            value={destination}
            onChange={(val) => setDestination(val)}
            placeholder="Search any destination across India..."
            iconColor="text-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date</label>
          <div className="relative">
            <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Seats Needed</label>
          <div className="relative">
            <Users className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
            >
              <option value="1">1 Seat</option>
              <option value="2">2 Seats</option>
              <option value="3">3 Seats</option>
              <option value="4">4+ Seats</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition"
            title="Clear filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Ride Results Grid */}
      {(() => {
        const joinableRides = rides.filter((ride) => ride.driverId !== user?.id);
        const myRidesInSearch = rides.filter((ride) => ride.driverId === user?.id);

        if (loading) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-52 bg-slate-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          );
        }

        if (joinableRides.length === 0) {
          return (
            <div className="space-y-4">
              {myRidesInSearch.length > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-indigo-600" />
                    <span>You have offered <strong>{myRidesInSearch.length}</strong> ride(s) on this route. Your own rides are excluded from joinable search.</span>
                  </div>
                  <Link to="/my-rides" className="font-bold underline text-indigo-700">Manage in My Rides →</Link>
                </div>
              )}
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Car className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">No active carpools on this corridor yet</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No rides match these specific filter parameters or date.
                  </p>
                </div>
                {user?.role === 'DRIVER' ? (
                  <Link
                    to="/rides/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Offer a Ride on this Route
                  </Link>
                ) : (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    View All Available Corridors
                  </button>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {myRidesInSearch.length > 0 && (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  <span>You offered <strong>{myRidesInSearch.length}</strong> carpool(s) matching these locations. (Your own rides are not displayed for booking).</span>
                </div>
                <Link to="/my-rides" className="font-bold underline text-indigo-700 flex-shrink-0">My Rides →</Link>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {joinableRides.map((ride) => (
            <Link
              key={ride.id}
              to={`/rides/${ride.id}`}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition group flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ride.driver?.avatarUrl ? (
                      <img
                        src={ride.driver.avatarUrl}
                        alt={ride.driver.name}
                        className="h-11 w-11 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {ride.driver?.name?.charAt(0) || 'D'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">
                        {ride.driver?.name}
                      </div>
                      <div className="text-[11px] text-slate-500">{ride.driver?.department || 'Verified Member'}</div>
                      <div className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{ride.driver?.ratingAverage || 5.0} driver rating</span>
                      </div>
                    </div>
                  </div>
                    <div className="text-right">
                      <div className="font-extrabold text-base text-indigo-600">
                        {ride.pricePerSeat > 0 ? `₹${ride.pricePerSeat}` : 'Free'}
                      </div>
                      <div className="text-[10px] text-slate-400">per seat</div>
                    </div>
                </div>

                {/* Waypoints */}
                <div className="bg-slate-50/70 p-3 rounded-xl space-y-2 border border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Origin</div>
                      <div className="font-medium text-slate-800 line-clamp-1">{ride.origin}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Destination</div>
                      <div className="font-medium text-slate-800 line-clamp-1">{ride.destination}</div>
                    </div>
                  </div>
                </div>

                {/* Vehicle info */}
                {ride.vehicle && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {new Date(ride.departureTime).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    ride.availableSeats > 1
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : ride.availableSeats === 1
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {ride.availableSeats} {ride.availableSeats === 1 ? 'seat' : 'seats'} left
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
