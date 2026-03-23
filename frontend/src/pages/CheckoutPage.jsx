import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useCart } from '../services/CartContext';
import { apiRequest } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency } from '../utils/format';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { session, profile } = useAuth();
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce(
    (sum, item) => sum + Number(item.products?.price || 0) * Number(item.quantity),
    0
  );

  const handlePayment = async () => {
    setError('');

    if (!items.length) {
      setError('Cart is empty');
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError('Failed to load Razorpay checkout');
      return;
    }

    setLoading(true);

    try {
      const paymentOrder = await apiRequest(
        '/api/payment/create-order',
        'POST',
        session.access_token,
        {
          amount: total,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Student Marketplace',
        description: 'Order Payment',
        order_id: paymentOrder.id,
        handler: async function onPaymentSuccess(response) {
          try {
            const payloadItems = items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.products.price,
              name: item.products.name,
            }));

            const verification = await apiRequest(
              '/api/payment/verify-and-create-order',
              'POST',
              session.access_token,
              {
                ...response,
                items: payloadItems,
                total,
                userId: profile.id,
              }
            );

            await clearCart();
            navigate(`/order-success/${verification.order.id}`);
          } catch (verifyError) {
            setError(verifyError.message);
          }
        },
        prefill: {
          email: profile?.email,
        },
        theme: {
          color: '#0f172a',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 animate-fade-in-up sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          <span className="icon-pill">💳</span>
          Checkout
        </h1>
        <p className="text-sm text-slate-600">Secure Razorpay payment</p>
      </div>

      <div className="glass-panel soft-ring mt-6 rounded-2xl p-5 sm:p-6">
        <p className="text-slate-700">Items in order: <span className="font-semibold text-slate-900">{items.length}</span></p>
        <p className="mt-2 text-sm text-slate-600">Total payable</p>
        <p className="mt-1 text-3xl font-black text-gradient">{formatCurrency(total)}</p>

        <div className="mt-4 rounded-xl border border-indigo-100 bg-white/70 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Payment details</p>
          <p className="mt-1">You’ll be redirected to Razorpay to complete this transaction safely.</p>
        </div>

        <ErrorMessage message={error} />
        <button
          type="button"
          className="btn-gradient mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-75"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-indigo-200" />
              Processing...
            </>
          ) : (
            <>
              <span>🔐</span>
              Pay with Razorpay
            </>
          )}
        </button>
      </div>
    </section>
  );
}
