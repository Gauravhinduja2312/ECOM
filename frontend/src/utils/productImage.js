const CATEGORY_IMAGE_MAP = {
  electronics: 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=1200',
  books: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'books & notes': 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
  furniture: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
  stationery: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&w=1200',
  accessories: 'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=1200',
  fashion: 'https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg?auto=compress&cs=tinysrgb&w=1200',
  sports: 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

const KEYWORD_IMAGE_MAP = {
  textbook: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
  notebook: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=1200',
  notes: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=1200',
  drawing: 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&w=1200',
  backpack: 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg?auto=compress&cs=tinysrgb&w=1200',
  laptop: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
  calculator: 'https://images.pexels.com/photos/4386158/pexels-photo-4386158.jpeg?auto=compress&cs=tinysrgb&w=1200',
  chemistry: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=1200',
  physics: 'https://images.pexels.com/photos/256369/pexels-photo-256369.jpeg?auto=compress&cs=tinysrgb&w=1200',
  book: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
};

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1200';

export function getProductFallbackImage(product) {
  const name = String(product?.name || '').toLowerCase();
  const category = String(product?.category || '').toLowerCase();

  const keywordMatch = Object.entries(KEYWORD_IMAGE_MAP).find(([keyword]) =>
    name.includes(keyword)
  );

  if (keywordMatch) {
    return keywordMatch[1];
  }

  const categoryMatch = Object.entries(CATEGORY_IMAGE_MAP).find(([label]) =>
    category.includes(label)
  );

  if (categoryMatch) {
    return categoryMatch[1];
  }

  return DEFAULT_IMAGE;
}

export function getProductDisplayImage(product) {
  return product?.image_url || getProductFallbackImage(product);
}
