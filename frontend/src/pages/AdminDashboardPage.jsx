import { useEffect, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/format';
import { uploadProductImage } from '../utils/storage';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  category: '',
  image_url: '',
  stock: '',
};

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchAdminData = async () => {
    const analyticsData = await apiRequest('/api/admin/analytics', 'GET', session.access_token);
    setAnalytics(analyticsData);
    setUsers(analyticsData.crmUsers || []);

    const { data: productsData } = await supabase.from('products').select('*').order('id', { ascending: false });
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    setProducts(productsData || []);
    setOrders(ordersData || []);
  };

  useEffect(() => {
    if (session?.access_token) fetchAdminData();
  }, [session?.access_token]);

  const saveProduct = async (event) => {
    event.preventDefault();
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
    };

    if (editingId) {
      await supabase.from('products').update(payload).eq('id', editingId);
    } else {
      await supabase.from('products').insert(payload);
    }

    setProductForm(emptyProduct);
    setEditingId(null);
    await fetchAdminData();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadProductImage(file);
      setProductForm((prev) => ({ ...prev, image_url: url }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      image_url: product.image_url,
      stock: String(product.stock),
    });
  };

  const handleDelete = async (id) => {
    await supabase.from('products').delete().eq('id', id);
    await fetchAdminData();
  };

  const dailySalesLabels = analytics ? Object.keys(analytics.dailySales) : [];
  const dailySalesValues = analytics ? Object.values(analytics.dailySales) : [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-2xl font-semibold text-slate-900">{analytics.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Users</p>
            <p className="text-2xl font-semibold text-slate-900">{analytics.totalUsers}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-900">Daily Sales Analytics</h2>
        <div className="mt-4">
          <Line
            data={{
              labels: dailySalesLabels,
              datasets: [
                {
                  label: 'Daily Sales (INR)',
                  data: dailySalesValues,
                  borderColor: '#0f172a',
                  backgroundColor: '#1e293b',
                },
              ],
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProduct} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit Product' : 'Add Product'}</h2>
          {Object.keys(emptyProduct).map((key) => (
            <input
              key={key}
              required={key !== 'image_url'}
              placeholder={key.replace('_', ' ')}
              value={productForm[key]}
              onChange={(event) => setProductForm((prev) => ({ ...prev, [key]: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          ))}
          <div>
            <label className="mb-1 block text-sm text-slate-600">Upload product image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {uploadingImage && <p className="text-xs text-slate-500">Uploading image...</p>}
          </div>
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
            {editingId ? 'Update Product' : 'Create Product'}
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Products</h2>
          <div className="mt-3 space-y-3 max-h-96 overflow-auto">
            {products.map((product) => (
              <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{product.name}</p>
                <p className="text-sm text-slate-600">{formatCurrency(product.price)} • Stock: {product.stock}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(product)}
                    className="rounded border border-slate-300 px-3 py-1 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">All Orders</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium">Order #{order.id}</p>
                <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
                <p className="text-sm text-slate-600">{order.status}</p>
                <p className="text-sm">{formatCurrency(order.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Users (CRM)</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{user.email}</p>
                <p className="text-sm text-slate-600">Role: {user.role}</p>
                <p className="text-sm text-slate-600">Orders: {user.orders_count}</p>
                <p className="text-sm text-slate-700">Spend: {formatCurrency(user.total_spending)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
