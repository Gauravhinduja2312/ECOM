import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { profile, session } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = profile?.id || session?.user?.id;

  const fetchCart = async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('cart')
      .select('id, quantity, product_id, products(id, name, price, image_url, stock)')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [userId]);

  const value = useMemo(
    () => ({
      items,
      loading,
      async addToCart(productId, quantity = 1) {
        if (!userId) throw new Error('Please login first');

        const { data: existing } = await supabase
          .from('cart')
          .select('id, quantity')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('cart')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        } else {
          await supabase.from('cart').insert({
            user_id: userId,
            product_id: productId,
            quantity,
          });
        }

        await fetchCart();
      },
      async updateQuantity(cartId, quantity) {
        if (quantity <= 0) {
          await supabase.from('cart').delete().eq('id', cartId);
        } else {
          await supabase.from('cart').update({ quantity }).eq('id', cartId);
        }
        await fetchCart();
      },
      async removeItem(cartId) {
        await supabase.from('cart').delete().eq('id', cartId);
        await fetchCart();
      },
      async clearCart() {
        if (!userId) return;
        await supabase.from('cart').delete().eq('user_id', userId);
        await fetchCart();
      },
      fetchCart,
    }),
    [items, loading, userId]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
