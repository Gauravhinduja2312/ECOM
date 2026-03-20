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
  const { items } = useCart();
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
    <section className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Items: {items.length}</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">Total: {formatCurrency(total)}</p>
        <ErrorMessage message={error} />
        <button
          type="button"
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Pay with Razorpay'}
        </button>
      </div>
    </section>
  );
}
