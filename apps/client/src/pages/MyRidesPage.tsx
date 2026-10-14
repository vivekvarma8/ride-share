import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import {
  Car,
  Users,
  MapPin,
  Clock,
  Check,
  X,
  CheckCircle,
  Star,
  Trash2,
  User as UserIcon,
  PlusCircle,
} from 'lucide-react';
import { UserRole } from '@rideshare/shared';
import { useAuth } from '../context/AuthContext';

export const MyRidesPage: React.FC = () => {
  const { user } = useAuth();

  // If Admin accesses /my-rides, immediately redirect to Admin Console
  if (user?.role === UserRole.ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  const isDriver = user?.role === UserRole.DRIVER;

  const [drives, setDrives] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRideForManage, setSelectedRideForManage] = useState<any | null>(null);

  // Review modal state
  const [reviewRide, setReviewRide] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isDriver) {
        const drivesRes = await apiRequest<{ success: boolean; data: any[] }>('/rides/my/drives').catch(() => ({ data: [] }));
        if (drivesRes.data) setDrives(drivesRes.data);
      } else {
        const bookingsRes = await apiRequest<{ success: boolean; data: any[] }>('/rides/my/bookings').catch(() => ({ data: [] }));
        if (bookingsRes.data) setBookings(bookingsRes.data);
      }
    } catch (err) {
      console.error('Failed to load rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  const handleApproveOrDecline = async (rideId: string, requestId: string, action: 'APPROVE' | 'DECLINE') => {
    try {
      await apiRequest(`/rides/${rideId}/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });

      setFeedback(`Request ${action === 'APPROVE' ? 'approved' : 'declined'} successfully!`);
      await fetchData();

      // Refresh manage modal view
      const updatedDrives = await apiRequest<{ success: boolean; data: any[] }>('/rides/my/drives');
      if (updatedDrives.success) {
        setDrives(updatedDrives.data);
        const curr = updatedDrives.data.find((d) => d.id === rideId);
        setSelectedRideForManage(curr || null);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to cancel this entire ride? All booked passengers will be notified.')) return;
    try {
      await apiRequest(`/rides/${rideId}/cancel`, { method: 'PATCH' });
      setFeedback('Ride cancelled successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ride');
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this ride listing? This will remove all associated booking records.')) return;
    try {
      await apiRequest(`/rides/${rideId}`, { method: 'DELETE' });
      setFeedback('Ride deleted successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ride');
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    try {
      await apiRequest(`/rides/${rideId}/complete`, { method: 'PATCH' });
      setFeedback('Ride marked as completed! Passengers can now review.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark ride completed');
    }
  };

  const handleCancelBooking = async (rideId: string, requestId: string) => {
    if (!window.confirm('Cancel your booking request?')) return;
    try {
      await apiRequest(`/rides/${rideId}/requests/${requestId}`, { method: 'DELETE' });
      setFeedback('Booking cancelled.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRide) return;
    setSubmittingReview(true);
    try {
      await apiRequest(`/reviews/ride/${reviewRide.ride.id}`, {
        method: 'POST',
        body: JSON.stringify({
          revieweeId: reviewRide.ride.driverId,
          rating: Number(reviewRating),
          comment: reviewComment || undefined,
        }),
      });

      setFeedback('Review submitted successfully! Thank you for strengthening community trust.');
      setReviewRide(null);
      setReviewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isDriver ? 'My Offered Drives' : 'My Booked Rides'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isDriver
              ? 'Manage passenger bookings, update departure status, or remove past ride listings.'
              : 'Track your seat requests, view departure details, and review drivers after trips.'}
          </p>
        </div>

        {isDriver && (
          <Link
            to="/rides/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition self-start"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Offer a New Ride</span>
          </Link>
        )}
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : isDriver ? (
        /* Driver View: Only Offered Drives */
        drives.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
            <Car className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800">You haven't offered any rides yet</h3>
            <p className="text-xs text-slate-500">Publish a ride to help peers commute and split fuel expenses.</p>
            <Link
              to="/rides/create"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
            >
              Offer a Ride Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {drives.map((ride) => {
              const pendingCount = ride.requests?.filter((r: any) => r.status === 'PENDING').length || 0;

              return (
                <div
                  key={ride.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      ride.status === 'SCHEDULED' ? 'bg-indigo-50 text-indigo-700' :
                      ride.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {ride.status}
                    </span>

                    <div className="text-right">
                      <div className="font-extrabold text-sm text-indigo-600">₹{ride.pricePerSeat}</div>
                      <div className="text-[10px] text-slate-400">{ride.availableSeats} of {ride.totalSeats} seats left</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold">{ride.origin}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold">{ride.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{new Date(ride.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {ride.vehicle && (
                      <span className="text-[11px] font-medium">{ride.vehicle.make} {ride.vehicle.model}</span>
                    )}
                  </div>

                  {/* Driver Action Controls */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/rides/${ride.id}`}
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Live Console</span>
                    </Link>
                    <button
                      onClick={() => setSelectedRideForManage(ride)}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Manage Requests</span>
                      {pendingCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </button>

                    {ride.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => handleCompleteRide(ride.id)}
                          className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 transition"
                          title="Mark trip complete"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleCancelRide(ride.id)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition"
                          title="Cancel ride"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* Delete Option to remove ride */}
                    <button
                      onClick={() => handleDeleteRide(ride.id)}
                      className="py-2 px-3 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold text-xs rounded-xl border border-slate-200 hover:border-rose-200 transition flex items-center gap-1"
                      title="Permanently delete ride"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Passenger View: Only Booked Rides */
        bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800">You haven't requested any rides yet</h3>
            <p className="text-xs text-slate-500">Search available rides and request a seat to start carpooling.</p>
            <Link
              to="/rides"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow"
            >
              Browse Available Rides
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      booking.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      booking.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {booking.status}
                  </span>

                  <div className="text-right">
                    <span className="font-extrabold text-sm text-indigo-600">
                      ₹{(booking.seats * (booking.ride?.pricePerSeat || 0)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {booking.seats} {booking.seats === 1 ? 'seat' : 'seats'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                    {booking.ride?.driver?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{booking.ride?.driver?.name}</div>
                    <div className="text-[11px] text-slate-500">{booking.ride?.driver?.phoneNumber || 'Driver'}</div>
                  </div>
                </div>

                {booking.status === 'APPROVED' && booking.otp && (
                  <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Boarding Security Pass</div>
                      <div className="text-base font-black tracking-widest text-indigo-900 font-mono">OTP: {booking.otp}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      booking.isBoarded
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-indigo-700 border-indigo-200'
                    }`}>
                      {booking.isBoarded ? 'Verified & Boarded' : 'Give OTP to Driver'}
                    </span>
                  </div>
                )}
                <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="truncate font-medium">From: {booking.ride?.origin}</div>
                  <div className="truncate font-medium">To: {booking.ride?.destination}</div>
                  <div className="text-slate-400 text-[11px] pt-1">
                    Departing: {new Date(booking.ride?.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/rides/${booking.rideId}`}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" /> Live Route Map & Tracking →
                  </Link>

                  <div className="flex items-center gap-2">
                    {['PENDING', 'APPROVED'].includes(booking.status) && (
                      <button
                        onClick={() => handleCancelBooking(booking.rideId, booking.id)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs rounded-xl transition"
                      >
                        Cancel Request
                      </button>
                    )}

                    {booking.ride?.status === 'COMPLETED' && booking.status === 'APPROVED' && (
                      <button
                        onClick={() => setReviewRide(booking)}
                        className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                      >
                        <Star className="h-3.5 w-3.5 text-amber-500" /> Rate Driver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Driver Request Management Modal */}
      {selectedRideForManage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Manage Ride Requests</h3>
                <p className="text-xs text-slate-500">
                  {selectedRideForManage.origin} → {selectedRideForManage.destination}
                </p>
              </div>
              <button
                onClick={() => setSelectedRideForManage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pending Requests List */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Requests ({selectedRideForManage.requests?.filter((r: any) => r.status === 'PENDING').length || 0})
              </div>

              {selectedRideForManage.requests?.filter((r: any) => r.status === 'PENDING').length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  No pending requests waiting for your approval.
                </div>
              ) : (
                selectedRideForManage.requests
                  ?.filter((r: any) => r.status === 'PENDING')
                  .map((reqItem: any) => (
                    <div
                      key={reqItem.id}
                      className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                            {reqItem.passenger?.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{reqItem.passenger?.name}</div>
                            <div className="text-[11px] text-slate-500">{reqItem.passenger?.department || 'Member'}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          {reqItem.seats} Seat(s) • ₹{(reqItem.seats * selectedRideForManage.pricePerSeat).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {reqItem.pickupNote && (
                        <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100">
                          "{reqItem.pickupNote}"
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApproveOrDecline(selectedRideForManage.id, reqItem.id, 'APPROVE')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleApproveOrDecline(selectedRideForManage.id, reqItem.id, 'DECLINE')}
                          className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1"
                        >
                          <X className="h-4 w-4" /> Decline
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Confirmed Passengers List */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Confirmed Passengers ({selectedRideForManage.requests?.filter((r: any) => r.status === 'APPROVED').length || 0})
              </div>

              {selectedRideForManage.requests?.filter((r: any) => r.status === 'APPROVED').length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                  No confirmed passengers yet.
                </div>
              ) : (
                selectedRideForManage.requests
                  ?.filter((r: any) => r.status === 'APPROVED')
                  .map((reqItem: any) => (
                    <div
                      key={reqItem.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                          {reqItem.passenger?.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{reqItem.passenger?.name}</div>
                          <div className="text-[11px] text-slate-500">{reqItem.passenger?.phoneNumber || 'No phone'}</div>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-700">{reqItem.seats} seat(s) confirmed</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewRide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-slate-900">Rate Your Driver</h3>
              <button type="button" onClick={() => setReviewRide(null)} className="text-slate-400 hover:text-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              How was your commute with <span className="font-bold text-slate-800">{reviewRide.ride?.driver?.name}</span>?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Star Rating (1 - 5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-2 rounded-xl transition"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Commentary</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Punctual, friendly conversation, safe driving on highway..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {submittingReview ? 'Submitting...' : 'Submit Rating'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
