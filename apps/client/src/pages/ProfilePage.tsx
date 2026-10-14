import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { User, Mail, Phone, Building, Star, CheckCircle, ShieldCheck, Edit3 } from 'lucide-react';
import { Review } from '@rideshare/shared';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department || '');
      setPhoneNumber(user.phoneNumber || '');
      setBio(user.bio || '');

      // Fetch user reviews
      apiRequest<{ success: boolean; data: Review[] }>(`/reviews/user/${user.id}`)
        .then((res) => {
          if (res.success) setReviews(res.data);
        })
        .catch((err) => console.error('Failed to load reviews:', err));
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          department: department || undefined,
          phoneNumber: phoneNumber || undefined,
          bio: bio || undefined,
        }),
      });

      if (res.success) {
        setSuccess('Profile updated successfully!');
        setEditing(false);
        refreshUser();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-20 w-20 rounded-3xl object-cover border-2 border-indigo-200 shadow-sm"
            />
          ) : (
            <div className="h-20 w-20 rounded-3xl bg-indigo-600 text-white font-black flex items-center justify-center text-3xl shadow-sm">
              {user?.name.charAt(0)}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified {user?.role}
              </span>
            </div>
            <div className="text-xs text-slate-500">{user?.email}</div>
            <div className="text-xs text-indigo-600 font-semibold">{user?.department || 'Community Member'}</div>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" /> {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Edit Form or Bio Overview */}
      {editing ? (
        <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Update Personal Info</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Infosys, Wipro, Google"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (For Ride Pickup Coordination)</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91 98765-43210"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">About / Commute Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell other commuters about your typical schedule, music tastes, etc."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            {submitting ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      ) : (
        user?.bio && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Me</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
              "{user.bio}"
            </p>
          </div>
        )
      )}

      {/* Trust & Reputation Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Community Reputation & Reviews</h2>
          <span className="text-xs text-slate-500">{reviews.length} reviews received</span>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400 italic">
            No reviews yet. Reviews will appear here after you complete rides.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {rev.reviewer?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-bold text-xs text-slate-800">{rev.reviewer?.name}</span>
                  </div>
                  <div className="flex items-center text-amber-500 text-xs font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 mr-1" /> {rev.rating}.0
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{rev.comment}"
                  </p>
                )}

                <div className="text-[10px] text-slate-400">
                  {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
