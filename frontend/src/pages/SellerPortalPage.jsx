import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadProductImage } from '../utils/storage';
import { apiRequest } from '../services/api';
import { useToast } from '../services/ToastContext';
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
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [myPitches, setMyPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      addToast('Photo uploaded.', 'info');
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
        addToast('Item details updated. ✨', 'success');
      } else {
        await apiRequest('/api/products/store/offer', 'POST', session.access_token, {
          listingDraft: payload,
        });
        addToast('Item listed to Campus Shop. 🎉', 'success');
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
      addToast(decision === 'accept' ? 'Offer accepted. We will contact you for pickup.' : 'Offer rejected.', 'success');
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
    if (!window.confirm('Are you sure you want to terminate this pitch?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id).eq('seller_id', profile.id);
      if (error) throw error;
      addToast('Listing removed.', 'info');
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
      addToast('Payment info updated.', 'success');
    } catch (err) {
      setErrorMessage('Failed to save settings.');
    } finally {
      setSavingPayout(false);
    }
  };

  if (loading) return <Loader text="Entering Seller Portal..." />;

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 stagger-standard text-white">
      <div className="mx-auto max-w-6xl px-6">
      <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase inline-flex items-center gap-4">
            <span className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)]">💼</span>
            Seller Dashboard
          </h1>
          <p className="text-slate-500 mt-2 text-[10px] font-black uppercase tracking-[0.25em]">Manage your items and sales</p>
        </div>
        <div className="flex gap-3">
          {[
            { id: 'dashboard', label: 'Stats', icon: '📊' },
            { id: 'submit', label: 'Sell Item', icon: '➕' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'submit') {
                  setEditingId(null);
                  setForm(initialForm);
                }
              }}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                  : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <ErrorMessage message={errorMessage} />

      {activeTab === 'dashboard' && (
        <div className="space-y-8 stagger-children">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="glass-primary p-8 rounded-3xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</p>
              <p className="mt-2 text-4xl font-black text-white tracking-tighter">{stats.pendingCount}</p>
            </div>
            <div className="glass-primary p-8 rounded-3xl">
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Sold Items</p>
              <p className="mt-2 text-4xl font-black text-white tracking-tighter">{stats.acceptedCount}</p>
            </div>
            <div className="glass-primary p-8 rounded-3xl bg-indigo-600/10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Earnings</p>
              <p className="mt-2 text-4xl font-black text-white tracking-tighter">{formatCurrency(stats.totalEarnings)}</p>
            </div>
          </div>

          {/* Active Pitches List */}
          <div className="glass-primary rounded-[2.5rem] overflow-hidden">
            <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Your Listed Items</h2>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{myPitches.length} Total</span>
            </div>
            <div className="divide-y divide-white/5">
              {myPitches.length > 0 ? myPitches.map(pitch => (
                <div key={pitch.id} className="p-8 transition hover:bg-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex gap-6">
                        <div className="h-20 w-20 rounded-2xl bg-white/5 flex-shrink-0 overflow-hidden border border-white/5">
                            {pitch.image_url ? <img src={pitch.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-3xl opacity-20">📦</div>}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{pitch.name}</h3>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{pitch.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">{pitch.category}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                    pitch.verification_status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                    pitch.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                    'bg-rose-500/10 text-rose-500'
                                }`}>{pitch.verification_status}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(pitch.price)}</p>
                        <p className="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-widest">Your Price</p>
                    </div>
                  </div>

                  {pitch.price_offer_status === 'pending_student_response' && (
                    <div className="mt-8 p-6 rounded-[1.5rem] bg-indigo-600/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 animate-pulse">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Our Buyout Offer</p>
                            <p className="text-xl font-black text-white uppercase tracking-tighter">Store Offer: {formatCurrency(pitch.proposed_price)}</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button onClick={() => handleOfferResponse(pitch.id, 'accept')} className="flex-1 sm:flex-none btn-primary px-6 py-3 text-[10px]">ACCEPT OFFER</button>
                            <button onClick={() => handleOfferResponse(pitch.id, 'reject')} className="flex-1 sm:flex-none px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition">DECLINE</button>
                        </div>
                    </div>
                  )}

                  {pitch.price_offer_status === 'accepted' && (
                    <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="text-lg">✓</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Sold to Campus Shop for {formatCurrency(pitch.price)}</p>
                    </div>
                  )}

                  {/* Pitch Controls */}
                  <div className="mt-8 flex justify-end gap-6 border-t border-white/5 pt-6">
                    <button 
                      onClick={() => handleEdit(pitch)} 
                      disabled={pitch.verification_status !== 'pending'}
                      className="text-[10px] font-black text-slate-500 hover:text-indigo-400 disabled:opacity-20 transition uppercase tracking-widest"
                    >
                      EDIT ITEM
                    </button>
                    <button 
                      onClick={() => handleDelete(pitch.id)}
                      className="text-[10px] font-black text-slate-500 hover:text-rose-500 transition uppercase tracking-widest"
                    >
                      TERMINATE
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center">
                    <p className="text-slate-500 text-sm font-black uppercase tracking-[0.2em] italic">No active pitches detected.</p>
                    <button onClick={() => setActiveTab('submit')} className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition">List your first item →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto stagger-standard">
            <div className="glass-primary p-10 rounded-[2.5rem]">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">{editingId ? 'Edit Item Details' : 'List New Item'}</h2>
                <form onSubmit={handleSubmitOffer} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Item Name</label>
                        <input className="standard-input" value={form.name} onChange={e => onChange('name', e.target.value)} required placeholder="e.g. Psychology Textbook..." />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Description & Condition</label>
                        <textarea className="standard-input min-h-32" value={form.description} onChange={e => onChange('description', e.target.value)} required placeholder="Explain what you are selling and its condition..." />
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Asking Price (₹)</label>
                            <input type="number" className="standard-input" value={form.price} onChange={e => onChange('price', e.target.value)} required placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Category</label>
                            <input className="standard-input" value={form.category} onChange={e => onChange('category', e.target.value)} required placeholder="e.g. Books, Electronics..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Item Photo</label>
                        <label className="standard-input flex flex-col items-center justify-center py-10 border-dashed border-white/10 hover:border-indigo-500/50 cursor-pointer group transition-all">
                            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                            {uploading ? <p className="text-[10px] font-black text-indigo-400 animate-pulse uppercase tracking-widest">UPLOADING...</p> : 
                             form.image_url ? <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">✓ PHOTO UPLOADED</p> : 
                             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-white transition">Upload Item Photo</p>}
                        </label>
                    </div>
                    <button type="submit" disabled={saving || uploading} className="btn-primary w-full py-5 text-[10px] tracking-[0.2em]">
                        {saving ? 'SAVING...' : editingId ? 'UPDATE ITEM' : 'LIST ITEM'}
                    </button>
                    {editingId && <button type="button" onClick={() => { setEditingId(null); setActiveTab('dashboard'); }} className="w-full text-[10px] font-black text-slate-500 hover:text-white transition uppercase tracking-widest pt-4">CANCEL</button>}
                </form>
            </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto stagger-standard">
            <div className="glass-primary p-10 rounded-[2.5rem]">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Settings</h2>
                <p className="text-slate-500 mb-8 text-[10px] font-black uppercase tracking-widest">Payment Info</p>
                
                <form onSubmit={handleSavePayout} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">UPI ID for Payment</label>
                        <input className="standard-input" value={payoutDetails.upi_id} onChange={e => setPayoutDetails({ upi_id: e.target.value })} required placeholder="yourname@upi" />
                        <p className="text-[9px] text-slate-600 mt-3 font-black uppercase tracking-widest italic opacity-60">We will use this to send you money after your item is sold.</p>
                    </div>
                    <button type="submit" disabled={savingPayout} className="btn-primary px-10 py-5 text-[10px] tracking-[0.2em]">
                        {savingPayout ? 'SAVING...' : 'SAVE PAYMENT INFO'}
                    </button>
                </form>
            </div>
        </div>
      )}
      </div>
    </div>
  );
}

