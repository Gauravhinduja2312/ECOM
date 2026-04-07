import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadProductImage } from '../utils/storage';
import { apiRequest } from '../services/api';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency } from '../utils/format';
import Loader from '../components/Loader';

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  image_url: '',
  stock: '1',
};

export default function SellerPortalPage() {
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [myPitches, setMyPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [payoutDetails, setPayoutDetails] = useState({ upi_id: '' });
  const [savingPayout, setSavingPayout] = useState(false);

  // Fetch Pitches & Payout Info
  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [pitchesRes, profileRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('seller_id', profile.id)
          .order('id', { ascending: false }),
        supabase
          .from('users')
          .select('upi_id')
          .eq('id', profile.id)
          .single()
      ]);

      setMyPitches(pitchesRes.data || []);
      if (profileRes.data) {
        setPayoutDetails({ upi_id: profileRes.data.upi_id || '' });
      }
    } catch (err) {
      setErrorMessage('Failed to connect to the store.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  // Stats for Dashboard
  const stats = useMemo(() => {
    const accepted = myPitches.filter(p => p.price_offer_status === 'accepted');
    const pending = myPitches.filter(p => p.verification_status === 'pending');
    const totalEarnings = accepted.reduce((sum, p) => sum + Number(p.price || 0), 0);
    return { acceptedCount: accepted.length, pendingCount: pending.length, totalEarnings };
  }, [myPitches]);

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange('image_url', url);
    } catch (err) {
      setErrorMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category.trim(),
        image_url: form.image_url.trim(),
        stock: Number(form.stock),
      };

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId)
          .eq('seller_id', profile.id);
        if (error) throw error;
        setSuccessMessage('Pitch updated successfully! ✨');
      } else {
        await apiRequest('/api/products/store/offer', 'POST', session.access_token, {
          listingDraft: payload,
        });
        setSuccessMessage('Product pitched to Campus Store! Awaiting review. 🎉');
      }

      setForm(initialForm);
      setEditingId(null);
      setActiveTab('dashboard');
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleOfferResponse = async (id, decision) => {
    try {
      await apiRequest(`/api/products/${id}/offer-response`, 'POST', session.access_token, { decision });
      setSuccessMessage(decision === 'accept' ? 'Offer accepted! We will contact you for pickup.' : 'Offer rejected.');
      fetchData();
    } catch (err) {
      setErrorMessage('Failed to respond to offer.');
    }
  };

  const handleEdit = (pitch) => {
    setEditingId(pitch.id);
    setForm({
      name: pitch.name || '',
      description: pitch.description || '',
      price: String(pitch.price || ''),
      category: pitch.category || '',
      image_url: pitch.image_url || '',
      stock: String(pitch.stock || '1'),
    });
    setActiveTab('submit');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pitch?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id).eq('seller_id', profile.id);
      if (error) throw error;
      setSuccessMessage('Pitch deleted.');
      fetchData();
    } catch (err) {
      setErrorMessage('Failed to delete pitch.');
    }
  };

  const handleSavePayout = async (e) => {
    e.preventDefault();
    setSavingPayout(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ upi_id: payoutDetails.upi_id.trim() })
        .eq('id', profile.id);
      if (error) throw error;
      setSuccessMessage('Payment settings updated.');
    } catch (err) {
      setErrorMessage('Failed to save settings.');
    } finally {
      setSavingPayout(false);
    }
  };

  if (loading) return <Loader text="Entering Seller Portal..." />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 animate-fade-in-up">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="icon-pill">💼</span>
            Seller Portal
          </h1>
          <p className="text-slate-600 mt-2">Manage your student-to-store inventory pitches and earnings.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Dashboard</button>
            <button onClick={() => { setActiveTab('submit'); setEditingId(null); setForm(initialForm); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'submit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>+ New Pitch</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Settings</button>
        </div>
      </header>

      <SuccessMessage message={successMessage} />
      <ErrorMessage message={errorMessage} />

      {activeTab === 'dashboard' && (
        <div className="space-y-8 stagger-children">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-panel soft-ring rounded-2xl p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Awaiting Review</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{stats.pendingCount}</p>
            </div>
            <div className="glass-panel soft-ring rounded-2xl p-6">
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">Accepted Deals</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{stats.acceptedCount}</p>
            </div>
            <div className="glass-panel soft-ring rounded-2xl p-6 bg-gradient-to-br from-indigo-50 to-white">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Total Earned Value</p>
              <p className="mt-2 text-3xl font-black text-indigo-700">{formatCurrency(stats.totalEarnings)}</p>
            </div>
          </div>

          {/* Active Pitches List */}
          <div className="glass-panel soft-ring rounded-3xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-900">Your Product Pitches</h2>
              <span className="text-xs text-slate-500 font-medium">{myPitches.length} Total</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {myPitches.length > 0 ? myPitches.map(pitch => (
                <div key={pitch.id} className="p-6 transition hover:bg-indigo-50/30">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            {pitch.image_url ? <img src={pitch.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-2xl">📦</div>}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{pitch.name}</h3>
                            <p className="text-sm text-slate-500 line-clamp-1">{pitch.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">{pitch.category}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                    pitch.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    pitch.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-rose-100 text-rose-700'
                                }`}>{pitch.verification_status}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900">{formatCurrency(pitch.price)}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Asking Price</p>
                    </div>
                  </div>

                  {pitch.price_offer_status === 'pending_student_response' && (
                    <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Admin Response: Counter Offer Received</p>
                            <p className="text-base font-black text-indigo-700">The store offered to buy this for {formatCurrency(pitch.proposed_price)}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => handleOfferResponse(pitch.id, 'accept')} className="flex-1 sm:flex-none btn-gradient px-4 py-2 text-xs">Accept & Sell</button>
                            <button onClick={() => handleOfferResponse(pitch.id, 'reject')} className="flex-1 sm:flex-none btn-gradient-secondary px-4 py-2 text-xs">Decline</button>
                        </div>
                    </div>
                  )}

                  {pitch.price_offer_status === 'accepted' && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="text-lg">✅</span>
                        <p className="text-xs font-bold uppercase tracking-wide">Marketplace Acquisition finalized for {formatCurrency(pitch.price)}</p>
                    </div>
                  )}

                  {/* Pitch Controls */}
                  <div className="mt-6 flex justify-end gap-3 border-t border-slate-50 pt-4">
                    <button 
                      onClick={() => handleEdit(pitch)} 
                      disabled={pitch.verification_status !== 'pending'}
                      className="text-xs font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      ✏️ EDIT PITCH
                    </button>
                    <button 
                      onClick={() => handleDelete(pitch.id)}
                      className="text-xs font-bold text-slate-400 hover:text-rose-600 transition"
                    >
                      🗑️ DELETE
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center">
                    <p className="text-slate-400 font-medium italic">No active pitches found.</p>
                    <button onClick={() => setActiveTab('submit')} className="mt-4 text-indigo-600 font-bold hover:underline">Pitch your first item →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto stagger-children">
            <div className="glass-panel soft-ring rounded-3xl p-8 border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-6">{editingId ? 'Edit Your Pitch' : 'Pitch to Campus Store'}</h2>
                <form onSubmit={handleSubmitOffer} className="space-y-6">
                    <div className="form-group">
                        <label className="form-label">Product Name</label>
                        <input className="form-input" value={form.name} onChange={e => onChange('name', e.target.value)} required placeholder="e.g. Scientific Calculator" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description & Condition</label>
                        <textarea className="form-input min-h-24" value={form.description} onChange={e => onChange('description', e.target.value)} required placeholder="Describe condition, age, and any flaws..." />
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Asking Price (₹)</label>
                            <input type="number" className="form-input" value={form.price} onChange={e => onChange('price', e.target.value)} required placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input className="form-input" value={form.category} onChange={e => onChange('category', e.target.value)} required placeholder="e.g. Books, Tech" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Upload Evidence/Photo</label>
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/30 cursor-pointer hover:bg-indigo-50 transition">
                            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                            {uploading ? <p className="text-sm font-bold text-indigo-600 animate-pulse">Uploading...</p> : 
                             form.image_url ? <p className="text-sm font-bold text-emerald-600">✓ Image ready</p> : 
                             <p className="text-sm text-slate-500">Click to upload photo</p>}
                        </label>
                    </div>
                    <button type="submit" disabled={saving || uploading} className="btn-gradient w-full py-4 text-lg">
                        {saving ? 'Submitting...' : editingId ? 'Update Offer' : 'Send Pitch to Store'}
                    </button>
                    {editingId && <button type="button" onClick={() => { setEditingId(null); setActiveTab('dashboard'); }} className="w-full text-sm font-bold text-slate-500 hover:text-slate-700">Cancel Edit</button>}
                </form>
            </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto stagger-children">
            <div className="glass-panel soft-ring rounded-3xl p-8 border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Settings</h2>
                <p className="text-slate-600 mb-6 text-sm">Where should the store send your money after acquisition?</p>
                
                <form onSubmit={handleSavePayout} className="space-y-6">
                    <div className="form-group">
                        <label className="form-label">UPI ID</label>
                        <input className="form-input" value={payoutDetails.upi_id} onChange={e => setPayoutDetails({ upi_id: e.target.value })} required placeholder="yourname@bank" />
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest italic">Verification via test transaction may apply.</p>
                    </div>
                    <button type="submit" disabled={savingPayout} className="btn-gradient px-8 py-3">
                        {savingPayout ? 'Saving...' : 'Update Payment Details'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
