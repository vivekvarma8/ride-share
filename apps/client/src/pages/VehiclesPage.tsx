import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { Car, Plus, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Vehicle } from '@rideshare/shared';
import { useAuth } from '../context/AuthContext';

export const VehiclesPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: Vehicle[] }>('/vehicles');
      if (res.success) setVehicles(res.data);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          make,
          model,
          year: Number(year),
          color,
          licensePlate,
          capacity: Number(capacity),
        }),
      });

      if (res.success) {
        setSuccess('Vehicle registered successfully! You are an authorized driver.');
        await refreshUser();
        setShowAddModal(false);
        // Reset form
        setMake('');
        setModel('');
        setColor('');
        setLicensePlate('');
        fetchVehicles();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle from your profile?')) return;
    try {
      await apiRequest(`/vehicles/${id}`, { method: 'DELETE' });
      setSuccess('Vehicle removed.');
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Vehicle Garage</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register personal vehicles to offer rides to your community.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Car className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800">No vehicles registered yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You must register at least one vehicle before creating ride listings.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow"
          >
            Register a Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition flex items-start justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Car className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900">
                    {v.year} {v.make} {v.model}
                  </h3>
                  <div className="text-xs text-slate-500">Color: <span className="font-semibold text-slate-700">{v.color}</span></div>
                  <div className="text-xs text-slate-500">Max Passenger Capacity: <span className="font-semibold text-slate-700">{v.capacity} seats</span></div>
                  <div className="inline-block mt-2 px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {v.licensePlate}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteVehicle(v.id)}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                title="Remove vehicle"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVehicle}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-slate-900">Register New Vehicle</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Make</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="e.g. Toyota"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Prius"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={1995}
                  max={new Date().getFullYear() + 1}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exterior Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Blue"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">License Plate</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC-1234"
                  required
                  className="w-full px-3 py-2 text-xs uppercase font-mono rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Passenger Seats</label>
                <select
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="1">1 Seat</option>
                  <option value="2">2 Seats</option>
                  <option value="3">3 Seats</option>
                  <option value="4">4 Seats</option>
                  <option value="5">5 Seats</option>
                  <option value="6">6+ Seats</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {submitting ? 'Registering...' : 'Save Vehicle'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
