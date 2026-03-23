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
  is_sponsored: false,
};

const LISTING_FEE_AMOUNT = 10;
const SPONSORED_FEE_AMOUNT = 49;

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
  const [payoutDetails, setPayoutDetails] = useState({ upi_id: '', upi_qr_url: '' });
  const [savingPayoutDetails, setSavingPayoutDetails] = useState(false);

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

  useEffect(() => {
    const fetchPayoutDetails = async () => {
      if (!profile?.id) {
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('upi_id, upi_qr_url')
        .eq('id', profile.id)
        .single();

      if (!error && data) {
        setPayoutDetails({
          upi_id: data.upi_id || '',
          upi_qr_url: data.upi_qr_url || '',
        });
      }
    };

    fetchPayoutDetails();
  }, [profile?.id]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPayoutDetailsChange = (key, value) => {
    setPayoutDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePayoutDetails = async (event) => {
    event.preventDefault();
    if (!profile?.id) {
      setErrorMessage('Please log in again to save payout details.');
      return;
    }

    setSavingPayoutDetails(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const normalizedUpiId = payoutDetails.upi_id.trim();

      if (normalizedUpiId && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(normalizedUpiId)) {
        throw new Error('Please enter a valid UPI ID (example: name@bank).');
      }

      const { error } = await supabase
        .from('users')
        .update({
          upi_id: normalizedUpiId || null,
          upi_qr_url: payoutDetails.upi_qr_url.trim() || null,
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      setSuccessMessage('Payout details saved successfully. Admin can now use these for payout.');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save payout details.');
    } finally {
      setSavingPayoutDetails(false);
    }
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
        is_sponsored: Boolean(form.is_sponsored),
        verification_status: 'pending',
        price_offer_status: 'none',
        proposed_price: null,
        final_price: Number(form.price),
      };

      const { data, error } = editingId
        ? await supabase
            .from('products')
            .update(payload)
            .eq('id', editingId)
            .eq('seller_id', profile.id)
        : { data: null, error: null };

      if (error) throw error;

      let createdListingResult = null;

      if (!editingId) {
        if (!session?.access_token) {
          throw new Error('Please sign in again to continue.');
        }

        const prepareResult = await apiRequest('/api/products/listing-fee/prepare', 'POST', session.access_token, {
          listingDraft: payload,
        });

        if (prepareResult.requiresPayment) {
          const isRazorpayLoaded = await loadRazorpayScript();
          if (!isRazorpayLoaded) {
            throw new Error('Could not load payment gateway. Please try again.');
          }

          const paymentResult = await new Promise((resolve, reject) => {
            const razorpayInstance = new window.Razorpay({
              key: import.meta.env.VITE_RAZORPAY_KEY_ID,
              amount: prepareResult.order.amount,
              currency: prepareResult.order.currency,
              name: 'Student Marketplace',
              description: 'Listing & sponsored fee payment',
              order_id: prepareResult.order.id,
              handler: (response) => resolve(response),
              modal: {
                ondismiss: () => reject(new Error('Payment cancelled by user.')),
              },
              prefill: {
                email: profile?.email || '',
              },
              theme: { color: '#4f46e5' },
            });

            razorpayInstance.open();
          });

          createdListingResult = await apiRequest('/api/products/listing-fee/verify-and-create', 'POST', session.access_token, {
            listingDraft: payload,
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          });
        } else {
          createdListingResult = await apiRequest('/api/products/listing-fee/verify-and-create', 'POST', session.access_token, {
            listingDraft: payload,
          });
        }
      }

      setForm(initialForm);
      setEditingId(null);

      if (editingId) {
        setSuccessMessage('Your listing has been updated successfully! ✨');
      } else {
        const chargedListingFee = Number(createdListingResult?.feeBreakup?.listingFee || 0);
        const chargedSponsoredFee = Number(createdListingResult?.feeBreakup?.sponsoredFee || 0);

        const feeNotes = [];
        if (chargedListingFee > 0) {
          feeNotes.push(`Listing fee: ₹${chargedListingFee.toFixed(2)}`);
        }
        if (chargedSponsoredFee > 0) {
          feeNotes.push(`Sponsored fee: ₹${chargedSponsoredFee.toFixed(2)}`);
        }

        if (feeNotes.length > 0) {
          setSuccessMessage(`Your product has been posted! ${feeNotes.join(' • ')}`);
        } else {
          setSuccessMessage('Your product has been posted successfully! First listing is free. 🎉');
        }
      }

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
      is_sponsored: Boolean(listing.is_sponsored),
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

        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Listing fee policy: 1st listing is free. From 2nd listing onward, ₹{LISTING_FEE_AMOUNT.toFixed(2)} is charged per new listing.
        </div>

        <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          Sponsored listing policy: promote your listing at the top with a ₹{SPONSORED_FEE_AMOUNT.toFixed(2)} fee for 7 days.
        </div>

        <div className="mt-4 space-y-2">
          <SuccessMessage message={successMessage} />
          <ErrorMessage message={errorMessage} />
        </div>

        <form onSubmit={handleSavePayoutDetails} className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Payout Details (for receiving money)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="form-input"
              value={payoutDetails.upi_id}
              onChange={(event) => onPayoutDetailsChange('upi_id', event.target.value)}
              placeholder="UPI ID (example: yourname@bank)"
            />
            <input
              className="form-input"
              value={payoutDetails.upi_qr_url}
              onChange={(event) => onPayoutDetailsChange('upi_qr_url', event.target.value)}
              placeholder="UPI QR image URL (optional)"
            />
          </div>
          <button
            type="submit"
            disabled={savingPayoutDetails}
            className="btn-gradient-secondary px-4 py-2 text-sm"
          >
            {savingPayoutDetails ? 'Saving payout details...' : 'Save Payout Details'}
          </button>
        </form>

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

          <label className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <input
              type="checkbox"
              checked={Boolean(form.is_sponsored)}
              onChange={(event) => onChange('is_sponsored', event.target.checked)}
              disabled={Boolean(editingId)}
              className="mt-0.5"
            />
            <span>
              Mark this as Sponsored Listing (₹{SPONSORED_FEE_AMOUNT.toFixed(2)} for 7 days)
              {editingId ? ' — sponsorship can only be changed while creating a listing.' : ''}
            </span>
          </label>

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
                {listing.is_sponsored && (
                  <p className="mt-1 text-xs text-indigo-700 font-semibold">
                    Sponsored{listing.sponsored_until ? ` until ${new Date(listing.sponsored_until).toLocaleDateString()}` : ''}
                    {Number(listing.sponsored_fee || 0) > 0 ? ` • Fee: ₹${Number(listing.sponsored_fee).toFixed(2)}` : ''}
                  </p>
                )}
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
