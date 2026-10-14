import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiRequest } from '../api/client';
import {
  MapPin,
  Calendar,
  Users,
  Car,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  DollarSign,
  Star,
  KeyRound,
  Play,
  Navigation,
  Phone,
  Building2,
  Check,
} from 'lucide-react';
import { RideMap } from '../components/RideMap';

export const RideDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [ride, setRide] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request form state
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [pickupNote, setPickupNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Driver OTP input state map: { [requestId: string]: string }
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifyingRequestId, setVerifyingRequestId] = useState<string | null>(null);

  // Real-time live coordinates
  const [liveCoords, setLiveCoords] = useState<[number, number] | null>(null);

  const fetchRide = async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: any }>(`/rides/${id}`);
      if (res.success) {
        setRide(res.data);
        if (res.data.currentLat && res.data.currentLng) {
          setLiveCoords([res.data.currentLat, res.data.currentLng]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [id]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket || !id) return;

    const handleRideStarted = (updatedRide: any) => {
      if (updatedRide.id === id) {
        setRide((prev: any) => ({ ...prev, ...updatedRide, status: 'IN_PROGRESS' }));
        setActionSuccess('The driver has officially started this ride! Live GPS tracking is active.');
      }
    };

    const handleRideLocation = ({ rideId, lat, lng }: { rideId: string; lat: number; lng: number }) => {
      if (rideId === id) {
        setLiveCoords([lat, lng]);
      }
    };

    const handlePassengerBoarded = ({ rideId, requestId }: { rideId: string; requestId: string }) => {
      if (rideId === id) {
        setRide((prev: any) => {
          if (!prev) return prev;
          const updatedRequests = (prev.requests || []).map((r: any) =>
            r.id === requestId ? { ...r, isBoarded: true, boardedAt: new Date().toISOString() } : r
          );
          return { ...prev, requests: updatedRequests };
        });
      }
    };

    const handleRideCompleted = ({ rideId }: { rideId: string }) => {
      if (rideId === id) {
        setRide((prev: any) => ({ ...prev, status: 'COMPLETED' }));
        setActionSuccess('This ride has been marked completed by the driver.');
      }
    };

    socket.on('ride:started', handleRideStarted);
    socket.on('ride:location', handleRideLocation);
    socket.on('passenger:boarded', handlePassengerBoarded);
    socket.on('ride:completed', handleRideCompleted);

    return () => {
      socket.off('ride:started', handleRideStarted);
      socket.off('ride:location', handleRideLocation);
      socket.off('passenger:boarded', handlePassengerBoarded);
      socket.off('ride:completed', handleRideCompleted);
    };
  }, [socket, id]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest(`/rides/${id}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          seats: Number(requestedSeats),
          pickupNote: pickupNote || undefined,
        }),
      });

      if (res.success) {
        setActionSuccess('Join request submitted! The driver has been notified in real-time.');
        fetchRide();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit join request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this join request?')) return;
    setSubmitting(true);
    try {
      await apiRequest(`/rides/${id}/requests/${requestId}`, {
        method: 'DELETE',
      });
      setActionSuccess('Your request has been cancelled.');
      fetchRide();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setSubmitting(false);
    }
  };

  // Driver verifies passenger OTP (Uber/Rapido style)
  const handleVerifyOtp = async (requestId: string) => {
    const inputOtp = otpInputs[requestId]?.trim();
    if (!inputOtp || inputOtp.length !== 4) {
      alert('Please enter a valid 4-digit OTP provided by the passenger.');
      return;
    }

    setVerifyingRequestId(requestId);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/rides/${id}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ requestId, otp: inputOtp }),
      });

      if (res.success) {
        setActionSuccess(res.message);
        fetchRide();
      }
    } catch (err: any) {
      alert(err.message || 'Invalid OTP');
    } finally {
      setVerifyingRequestId(null);
    }
  };

  // Driver starts the scheduled trip
  const handleStartRide = async () => {
    if (!window.confirm('Start this ride now? Passenger GPS tracking will activate and an automated start email will be sent.')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/rides/${id}/start`, {
        method: 'POST',
      });

      if (res.success) {
        setActionSuccess(res.message);
        fetchRide();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start ride');
    } finally {
      setSubmitting(false);
    }
  };

  // Driver completes the trip
  const handleCompleteRide = async () => {
    if (!window.confirm('Mark this trip as completed?')) return;

    setSubmitting(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/rides/${id}/complete`, {
        method: 'PATCH',
      });

      if (res.success) {
        setActionSuccess(res.message);
        fetchRide();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete ride');
    } finally {
      setSubmitting(false);
    }
  };

  // Broadcast simulated GPS location update
  const handleSimulateMove = async (lat: number, lng: number) => {
    setLiveCoords([lat, lng]);
    try {
      await apiRequest(`/rides/${id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ lat, lng }),
      });
    } catch {
      // Ignored for smooth demo animation
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">{error || 'Ride not found'}</h2>
        <Link to="/rides" className="inline-flex items-center gap-2 text-indigo-600 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Rides
        </Link>
      </div>
    );
  }

  const isDriver = user?.id === ride.driverId;
  const myRequest = ride.requests?.find(
    (r: any) => r.passengerId === user?.id && ['PENDING', 'APPROVED'].includes(r.status),
  );
  const confirmedPassengers = ride.requests?.filter((r: any) => r.status === 'APPROVED') || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Interactive Map, Route Details, Driver & Vehicle */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Map Component */}
          <div className="space-y-2">
            <RideMap
              origin={ride.origin}
              destination={ride.destination}
              originCoords={ride.originLat && ride.originLng ? [ride.originLat, ride.originLng] : null}
              destCoords={ride.destLat && ride.destLng ? [ride.destLat, ride.destLng] : null}
              currentCoords={liveCoords}
              status={ride.status}
              height="360px"
              showSimulateControl={isDriver}
              onSimulateMove={handleSimulateMove}
            />
          </div>

          {/* Route Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    ride.status === 'IN_PROGRESS'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : ride.status === 'COMPLETED'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {ride.status === 'IN_PROGRESS' ? '• Live In Progress' : ride.status}
                </span>
                {ride.status === 'IN_PROGRESS' && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <Navigation className="h-3 w-3 animate-spin" /> Live GPS Active
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-indigo-600">
                  {ride.pricePerSeat > 0 ? `₹${ride.pricePerSeat}` : 'Free'}
                </div>
                <div className="text-xs text-slate-400">fuel share / seat</div>
              </div>
            </div>

            {/* Origin to Destination */}
            <div className="space-y-6 border-l-2 border-indigo-200 pl-6 ml-2 relative">
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-emerald-600 border-2 border-white ring-4 ring-emerald-100" />
                <div className="text-xs text-slate-400 font-semibold uppercase">Pickup Origin</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{ride.origin}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(ride.departureTime).toLocaleDateString([], {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white ring-4 ring-indigo-100" />
                <div className="text-xs text-slate-400 font-semibold uppercase">Destination Stop</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{ride.destination}</div>
              </div>
            </div>

            {/* Ride Notes */}
            {ride.notes && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">Driver's Trip Notes:</span>
                "{ride.notes}"
              </div>
            )}
          </div>

          {/* Driver & Vehicle Profile */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Driver Profile */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Profile</div>
              <div className="flex items-center gap-3">
                {ride.driver?.avatarUrl ? (
                  <img
                    src={ride.driver.avatarUrl}
                    alt={ride.driver.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-lg">
                    {ride.driver?.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-base text-slate-900">{ride.driver?.name}</div>
                  <div className="text-xs text-slate-500">{ride.driver?.department || 'Verified Commuter'}</div>
                  <div className="text-xs text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{ride.driver?.ratingAverage || 5.0} ({ride.driver?.totalReviews || 0} reviews)</span>
                  </div>
                </div>
              </div>
              {ride.driver?.bio && (
                <p className="text-xs text-slate-600 italic">"{ride.driver.bio}"</p>
              )}
            </div>

            {/* Vehicle Profile */}
            {ride.vehicle && (
              <div className="space-y-4 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-6 pt-4 sm:pt-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicle Details</div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {ride.vehicle.year} {ride.vehicle.make} {ride.vehicle.model}
                    </div>
                    <div className="text-xs text-slate-500">Color: {ride.vehicle.color}</div>
                    <div className="inline-block px-2 py-0.5 mt-1 bg-slate-100 text-slate-700 font-mono text-[11px] rounded border border-slate-200 font-bold">
                      {ride.vehicle.licensePlate}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Driver Console: Passenger Boarding & Verification Roster (Rapido/Uber style) */}
          {isDriver && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" /> Passenger Boarding & OTP Verification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify each passenger's 4-digit OTP before they board your vehicle.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs">
                  {confirmedPassengers.filter((p: any) => p.isBoarded).length} / {confirmedPassengers.length} Boarded
                </span>
              </div>

              {confirmedPassengers.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                  No confirmed passengers for this trip yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {confirmedPassengers.map((reqItem: any) => (
                    <div
                      key={reqItem.id}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        reqItem.isBoarded
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                          {reqItem.passenger?.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                            <span>{reqItem.passenger?.name}</span>
                            {reqItem.isBoarded && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-md font-bold flex items-center gap-1">
                                <Check className="h-3 w-3" /> Boarded
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                            <span>{reqItem.seats} seat(s) booked</span>
                            {reqItem.passenger?.phoneNumber && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone className="h-3 w-3" /> {reqItem.passenger.phoneNumber}
                              </span>
                            )}
                            {reqItem.passenger?.department && (
                              <span>• {reqItem.passenger.department}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* OTP Verification Input (Uber/Rapido style) */}
                      {!reqItem.isBoarded ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="Enter 4-digit OTP"
                            value={otpInputs[reqItem.id] || ''}
                            onChange={(e) =>
                              setOtpInputs((prev) => ({ ...prev, [reqItem.id]: e.target.value }))
                            }
                            className="w-36 px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyOtp(reqItem.id)}
                            disabled={verifyingRequestId === reqItem.id}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            {verifyingRequestId === reqItem.id ? 'Checking...' : 'Verify OTP'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Boarding Verified
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Trip Execution Controls */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                {ride.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    onClick={handleStartRide}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Start Scheduled Ride</span>
                  </button>
                )}

                {ride.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={handleCompleteRide}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete Ride</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Contextual Action Box (Passenger Booking / Boarding Pass) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6 sticky top-24">
            {/* If Passenger is Approved: Display Boarding Pass & Unique OTP */}
            {myRequest && myRequest.status === 'APPROVED' && (
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-emerald-100/30 to-indigo-50 border-2 border-emerald-500/30 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Your Boarding Pass
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      myRequest.isBoarded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {myRequest.isBoarded ? '✓ Boarded & Verified' : 'Awaiting Boarding'}
                  </span>
                </div>

                <div className="text-center py-3 bg-white rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                  <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                    Unique Boarding OTP
                  </div>
                  <div className="text-3xl font-black tracking-widest text-emerald-700 font-mono">
                    {myRequest.otp || '----'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Share with driver <strong>{ride.driver?.name}</strong> when entering car
                  </div>
                </div>

                <div className="text-[11px] text-emerald-800 leading-relaxed text-center font-medium">
                  {ride.status === 'IN_PROGRESS'
                    ? 'Your ride is in progress! Watch the car location live on the route map.'
                    : 'Be at the pickup point 5 mins before departure time.'}
                </div>
              </div>
            )}

            {/* If Passenger has Pending Request */}
            {myRequest && myRequest.status === 'PENDING' && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl space-y-3">
                <div className="font-extrabold text-sm text-amber-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" /> Request Pending Driver Approval
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your request for {myRequest.seats} seat(s) has been dispatched to {ride.driver?.name}. Once approved, you will automatically receive your unique Boarding OTP via email.
                </p>
                <button
                  type="button"
                  onClick={() => handleCancelRequest(myRequest.id)}
                  disabled={submitting}
                  className="w-full py-2 bg-white text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl border border-rose-200 transition"
                >
                  Cancel Request
                </button>
              </div>
            )}

            {/* If Non-Driver and No Active Request: Show Booking Form */}
            {!isDriver && !myRequest && (
              <>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">Book Seats</h3>
                  <p className="text-xs text-slate-500">
                    {ride.availableSeats} of {ride.totalSeats} seats currently available.
                  </p>
                </div>

                {ride.availableSeats > 0 && ride.status === 'SCHEDULED' ? (
                  <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Seats
                      </label>
                      <select
                        value={requestedSeats}
                        onChange={(e) => setRequestedSeats(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      >
                        {Array.from({ length: ride.availableSeats }, (_, i) => i + 1).map((s) => (
                          <option key={s} value={s}>
                            {s} Seat{s > 1 ? 's' : ''} (₹{s * ride.pricePerSeat})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pickup Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={pickupNote}
                        onChange={(e) => setPickupNote(e.target.value)}
                        placeholder="e.g. Waiting by main gate pillar #2"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      {submitting ? 'Submitting...' : 'Request to Join Ride'}
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-bold">
                    This ride is no longer accepting new bookings.
                  </div>
                )}
              </>
            )}

            {/* Quick Safety Guideline */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> Commute Safety Guarantee
              </div>
              <p>
                All riders and drivers undergo workplace verification. Never board without confirming vehicle license plate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
