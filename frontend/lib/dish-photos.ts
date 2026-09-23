export interface DishPhoto {
  keyword: string;
  photo: string;
  label: string;
}

export const DISH_PHOTOS: DishPhoto[] = [
  { keyword: 'phở bò', photo: '/images/dish-pho-bo.jpg', label: 'Phở bò' },
  { keyword: 'cơm rang', photo: '/images/dish-com-rang.webp', label: 'Cơm rang' },
  { keyword: 'trà đá', photo: '/images/dish-tra-da.jpg', label: 'Trà đá' },
];

export function findDishPhoto(name: string): DishPhoto | null {
  const lower = name.toLowerCase();
  return DISH_PHOTOS.find((dish) => lower.includes(dish.keyword)) ?? null;
}

export function categoryIcon(category: string | null | undefined): string {
  const lower = (category ?? '').toLowerCase();
  if (lower.includes('khai vị')) return '🥗';
  if (lower.includes('tráng miệng')) return '🍰';
  if (lower.includes('uống')) return '🥤';
  if (lower.includes('chính')) return '🍜';
  return '🍽️';
}
