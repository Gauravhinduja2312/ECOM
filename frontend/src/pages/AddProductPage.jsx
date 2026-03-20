import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadProductImage } from '../utils/storage';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  category: '',
  image_url: '',
  stock: '',
};

export default function AddProductPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [products, setProducts] = useState([]);

  const fetchProducts = async () => {
    const { data: productsData } = await supabase.from('products').select('*').order('id', { ascending: false });
    setProducts(productsData || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
    await fetchProducts();
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
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', id);
      await fetchProducts();
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Manage Products</h1>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="rounded-md bg-slate-200 px-4 py-2 text-slate-900 hover:bg-slate-300"
        >
          Back to Admin Dashboard
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProduct} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          {Object.keys(emptyProduct).map((key) => (
            <input
              key={key}
              required={key !== 'image_url'}
              placeholder={key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)}
              value={productForm[key]}
              onChange={(event) => setProductForm((prev) => ({ ...prev, [key]: event.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              type={key === 'price' || key === 'stock' ? 'number' : 'text'}
            />
          ))}
          <div>
            <label className="mb-1 block text-sm text-slate-600">Upload product image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {uploadingImage && <p className="text-xs text-slate-500">Uploading image...</p>}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-white font-medium">
              {editingId ? 'Update Product' : 'Create Product'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setProductForm(emptyProduct);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-slate-900"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">All Products ({products.length})</h2>
          <div className="mt-3 space-y-3 max-h-96 overflow-auto">
            {products.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No products yet. Add your first product!</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-600">₹{product.price} • Stock: {product.stock}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="rounded border border-blue-300 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
