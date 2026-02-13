export const categoriesResource = {
  uri: 'vinted://categories',
  name: 'Vinted Categories',
  description: 'Main Vinted category tree with IDs for search filtering',
  mimeType: 'application/json',
};

// Main Vinted categories (commonly used IDs)
const VINTED_CATEGORIES = [
  { id: 1, name: 'Women', children: [
    { id: 1904, name: 'Dresses' },
    { id: 1907, name: 'Tops & T-shirts' },
    { id: 1908, name: 'Sweaters & Knitwear' },
    { id: 1909, name: 'Coats & Jackets' },
    { id: 1910, name: 'Jeans' },
    { id: 1911, name: 'Trousers' },
    { id: 1912, name: 'Skirts' },
    { id: 1913, name: 'Shorts' },
    { id: 1914, name: 'Swimwear' },
    { id: 1915, name: 'Lingerie' },
    { id: 1916, name: 'Shoes' },
    { id: 1917, name: 'Bags' },
    { id: 1918, name: 'Accessories' },
    { id: 1919, name: 'Jewellery' },
  ]},
  { id: 5, name: 'Men', children: [
    { id: 2050, name: 'T-shirts' },
    { id: 2051, name: 'Shirts' },
    { id: 2052, name: 'Sweaters & Hoodies' },
    { id: 2053, name: 'Coats & Jackets' },
    { id: 2054, name: 'Jeans' },
    { id: 2055, name: 'Trousers' },
    { id: 2056, name: 'Shorts' },
    { id: 2057, name: 'Shoes' },
    { id: 2058, name: 'Bags' },
    { id: 2059, name: 'Accessories' },
  ]},
  { id: 29, name: 'Kids', children: [
    { id: 1100, name: 'Girls Clothing' },
    { id: 1200, name: 'Boys Clothing' },
    { id: 1300, name: 'Baby Clothing' },
    { id: 1400, name: 'Kids Shoes' },
  ]},
  { id: 1193, name: 'Home & Living', children: [
    { id: 1500, name: 'Decoration' },
    { id: 1501, name: 'Kitchen' },
    { id: 1502, name: 'Bedding' },
    { id: 1503, name: 'Bathroom' },
  ]},
  { id: 1194, name: 'Entertainment', children: [
    { id: 1600, name: 'Books' },
    { id: 1601, name: 'Games & Consoles' },
    { id: 1602, name: 'Music & Movies' },
  ]},
  { id: 1195, name: 'Electronics', children: [
    { id: 1700, name: 'Phones' },
    { id: 1701, name: 'Tablets' },
    { id: 1702, name: 'Laptops' },
    { id: 1703, name: 'Audio' },
    { id: 1704, name: 'Cameras' },
  ]},
];

export function getCategoriesData(): string {
  return JSON.stringify(VINTED_CATEGORIES, null, 2);
}
