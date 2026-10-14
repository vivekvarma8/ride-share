import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Car, MapPin, Calendar, Clock, DollarSign, AlertCircle, PlusCircle } from 'lucide-react';
import { Vehicle } from '@rideshare/shared';
import { RideMap } from '../components/RideMap';
import { LocationAutocomplete } from '../components/LocationAutocomplete';

export const CreateRidePage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Form states
  const [vehicleId, setVehicleId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('150');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: Vehicle[] }>('/vehicles');
        if (res.success && res.data) {
          setVehicles(res.data);
          if (res.data.length > 0) {
            setVehicleId(res.data[0].id);
            setTotalSeats(Math.min(3, res.data[0].capacity));
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch vehicles:', err);
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();

    // Default departure: tomorrow at 08:30
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split('T')[0]);
    setDepartureTime('08:30');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }

    const isoDateTime = new Date(`${departureDate}T${departureTime}:00`).toISOString();

    if (new Date(isoDateTime).getTime() <= Date.now()) {
      setError('Departure time must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/rides', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId,
          origin,
          destination,
          departureTime: isoDateTime,
          totalSeats: Number(totalSeats),
          pricePerSeat: Number(pricePerSeat),
          notes: notes || undefined,
        }),
      });

      if (res.success) {
        navigate('/my-rides');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish ride');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Offer a Ride</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Share your daily drive, offset fuel costs, and help fellow commuters get around safely.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingVehicles ? (
        <div className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Car className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Vehicle Registration Required</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Before offering a ride, please register your vehicle (make, model, color, license plate, and capacity).
            </p>
          </div>
          <Link
            to="/vehicles"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow hover:bg-indigo-700 transition"
          >
            <PlusCircle className="h-4 w-4" /> Add Your Vehicle First
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Vehicle Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Your Vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                const veh = vehicles.find((v) => v.id === e.target.value);
                if (veh) setTotalSeats(Math.min(totalSeats, veh.capacity));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} ({v.color}) — Plate: {v.licensePlate} [Max {v.capacity} seats]
                </option>
              ))}
            </select>
          </div>

          {/* Live Interactive Route Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Live Route Map</label>
              <span className="text-[11px] font-medium text-slate-400">Route preview computed from stops</span>
            </div>
            <RideMap
              origin={origin || 'Select departure origin'}
              destination={destination || 'Select arrival destination'}
              originCoords={originCoords}
              destCoords={destCoords}
              height="260px"
            />
          </div>

          {/* Route details with Google Maps-style Autocomplete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LocationAutocomplete
              label="Departure Origin / Pickup Stop"
              value={origin}
              onChange={(val, coords) => {
                setOrigin(val);
                if (coords) setOriginCoords(coords);
              }}
              placeholder="Search any pickup location, street, or landmark across India..."
              iconColor="text-indigo-500"
              required
            />

            <LocationAutocomplete
              label="Arrival Destination Stop"
              value={destination}
              onChange={(val, coords) => {
                setDestination(val);
                if (coords) setDestCoords(coords);
              }}
              placeholder="Search any destination, college, or transit hub across India..."
              iconColor="text-emerald-500"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Departure Date</label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Departure Time</label>
              <div className="relative">
                <Clock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seats and Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Available Seats Offered</label>
              <select
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {Array.from({ length: selectedVehicle?.capacity || 4 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    {s} {s === 1 ? 'Passenger Seat' : 'Passenger Seats'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Price Contribution per Seat (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="10"
                  min="0"
                  max="5000"
                  value={pricePerSeat}
                  onChange={(e) => setPricePerSeat(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Trip Notes / Guidelines <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Departing punctually at 8:30 AM; trunk fits 2 backpacks; no smoking."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
          >
            {submitting ? 'Publishing...' : 'Publish Ride Listing'}
          </button>
        </form>
      )}
    </div>
  );
};
