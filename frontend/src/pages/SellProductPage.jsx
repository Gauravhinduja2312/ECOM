import { useEffect, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadProductImage } from '../utils/storage';
import { apiRequest } from '../services/api';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  image_url: '',
  stock: '',
};

export default function SellProductPage() {
  const { profile, session } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMyListings = async () => {
    if (!profile?.id) {
      setMyListings([]);
      setLoadingListings(false);
      return;
    }

    setLoadingListings(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', profile.id)
      .order('id', { ascending: false });

    if (error) {
      setErrorMessage(error.message || 'Failed to load your listings.');
    } else {
      setMyListings(data || []);
    }

    setLoadingListings(false);
  };

  useEffect(() => {
    fetchMyListings();
  }, [profile?.id]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage('');

    try {
      const imageUrl = await uploadProductImage(file);
      onChange('image_url', imageUrl);
    } catch (error) {
      setErrorMessage(error.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!profile?.id) {
        throw new Error('Please log in again to verify your account.');
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category.trim(),
        image_url: form.image_url.trim(),
        stock: Number(form.stock),
        seller_id: profile.id,
        verification_status: 'pending',
        price_offer_status: 'none',
        proposed_price: null,
        final_price: Number(form.price),
      };

      const { error } = editingId
        ? await supabase
            .from('products')
            .update(payload)
            .eq('id', editingId)
            .eq('seller_id', profile.id)
        : await supabase.from('products').insert(payload);

      if (error) throw error;

      setForm(initialForm);
      setEditingId(null);
      setSuccessMessage(
        editingId ? 'Your listing has been updated successfully! ✨' : 'Your product has been posted successfully! 🎉'
      );
      await fetchMyListings();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (error) {
      setErrorMessage(error.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (listing) => {
    setEditingId(listing.id);
    setForm({
      name: listing.name || '',
      description: listing.description || '',
      price: String(listing.price ?? ''),
      category: listing.category || '',
      image_url: listing.image_url || '',
      stock: String(listing.stock ?? ''),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (listingId) => {
    const confirmed = window.confirm('Delete this listing? This cannot be undone.');
    if (!confirmed || !profile?.id) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', listingId)
      .eq('seller_id', profile.id);

    if (error) {
      setErrorMessage(error.message || 'Could not delete listing.');
      return;
    }

    if (editingId === listingId) {
      setEditingId(null);
      setForm(initialForm);
    }

    setSuccessMessage('Listing deleted successfully.');
    await fetchMyListings();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleOfferResponse = async (listingId, decision) => {
    if (!session?.access_token) {
      setErrorMessage('Please sign in again.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiRequest(`/api/products/${listingId}/offer-response`, 'POST', session.access_token, {
        decision,
      });

      setSuccessMessage(
        decision === 'accept'
          ? 'You accepted the admin price. Listing is now verified.'
          : 'You rejected the admin price offer.'
      );
      await fetchMyListings();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to respond to price offer.');
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 animate-fade-in-up">
      <div className="glass-panel soft-ring rounded-2xl p-6 sm:p-7">
        <h1 className="page-title inline-flex items-center gap-2 text-slate-900">
          <span className="icon-pill">🧑‍🎓</span>
          Sell Your Product
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Post your item so other students can discover and buy it.
        </p>
        {profile?.email ? (
          <p className="mt-1 text-xs text-slate-500">Posting as: {profile.email}</p>
        ) : null}

        <div className="mt-4 space-y-2">
          <SuccessMessage message={successMessage} />
          <ErrorMessage message={errorMessage} />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="e.g. Scientific Calculator"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input min-h-24 resize-none"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="Write a short, clear description..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => onChange('price', event.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.stock}
                onChange={(event) => onChange('stock', event.target.value)}
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              className="form-input"
              value={form.category}
              onChange={(event) => onChange('category', event.target.value)}
              placeholder="e.g. Books, Electronics, Accessories"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Product Image</label>
            <label className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-5 text-center text-sm text-indigo-700 transition hover:bg-indigo-100/60 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading ? 'Uploading image...' : 'Click to upload image'}
            </label>
            {form.image_url ? (
              <p className="text-xs font-medium text-emerald-700">✓ Image uploaded</p>
            ) : (
              <p className="text-xs text-slate-500">Image is optional but recommended.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="btn-gradient w-full px-5 py-2.5"
          >
            {saving ? 'Saving...' : editingId ? 'Update Listing' : 'Post Product'}
          </button>

          {editingId ? (
            <button
              type="button"
              className="btn-gradient-secondary w-full px-5 py-2.5"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
              }}
            >
              Cancel Edit
            </button>
          ) : null}
        </form>
      </div>

      <div className="glass-panel soft-ring mt-6 rounded-2xl p-6 sm:p-7">
        <h2 className="text-xl font-bold text-slate-900">My Listings</h2>
        <p className="mt-1 text-sm text-slate-600">Edit or remove products that you posted.</p>

        {loadingListings ? (
          <p className="mt-4 text-sm text-slate-600">Loading your listings...</p>
        ) : myListings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">You have not posted any products yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myListings.map((listing) => (
              <div key={listing.id} className="rounded-xl border border-slate-200 bg-white/90 p-4">
                <p className="font-semibold text-slate-900">{listing.name}</p>
                <p className="mt-1 text-sm text-slate-600">₹{Number(listing.price).toFixed(2)} • Stock: {listing.stock}</p>
                <p className="mt-1 text-xs text-slate-500">{listing.category || 'General'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Status: <span className="font-semibold capitalize">{listing.verification_status}</span>
                  {' • '}
                  Offer: <span className="font-semibold capitalize">{listing.price_offer_status}</span>
                </p>
                {listing.proposed_price !== null && listing.price_offer_status === 'pending_student_response' && (
                  <p className="mt-1 text-sm font-medium text-violet-700">
                    Admin offered: ₹{Number(listing.proposed_price).toFixed(2)}
                  </p>
                )}
                {listing.admin_review_note ? (
                  <p className="mt-1 text-xs text-slate-600">Admin note: {listing.admin_review_note}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-gradient-secondary px-3 py-2 text-sm"
                    onClick={() => handleEdit(listing)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    onClick={() => handleDelete(listing.id)}
                  >
                    Delete
                  </button>
                  {listing.price_offer_status === 'pending_student_response' && (
                    <>
                      <button
                        type="button"
                        className="btn-gradient px-3 py-2 text-sm"
                        onClick={() => handleOfferResponse(listing.id, 'accept')}
                      >
                        Accept Price
                      </button>
                      <button
                        type="button"
                        className="btn-gradient-secondary px-3 py-2 text-sm"
                        onClick={() => handleOfferResponse(listing.id, 'reject')}
                      >
                        Reject Price
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
