import { supabase } from '../services/supabaseClient';

export async function uploadProductImage(file) {
  const filePath = `products/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}
