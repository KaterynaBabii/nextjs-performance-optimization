/**
 * Mock Data Library
 * 
 * Provides mock product, category, and user data for the prototype application.
 * In production, this would connect to a real database.
 */

export interface Category {
  id: number
  name: string
  productCount: number
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  categoryId: number
  categoryName: string
  sku: string
  stock: number
}

export interface User {
  id: number
  name: string
  email: string
  memberSince: string
  orders: Array<{
    id: number
    total: number
    date: string
  }>
  recommendations: Product[]
}

// Mock data
const categories: Category[] = [
  { id: 1, name: 'Electronics', productCount: 45 },
  { id: 2, name: 'Clothing', productCount: 32 },
  { id: 3, name: 'Home & Garden', productCount: 28 },
  { id: 4, name: 'Sports', productCount: 19 },
  { id: 5, name: 'Books', productCount: 67 },
]

const products: Product[] = [
  { id: 1, name: 'Laptop Pro', description: 'High-performance laptop', price: 1299.99, categoryId: 1, categoryName: 'Electronics', sku: 'LAP-001', stock: 15 },
  { id: 2, name: 'Wireless Mouse', description: 'Ergonomic wireless mouse', price: 29.99, categoryId: 1, categoryName: 'Electronics', sku: 'MOU-001', stock: 50 },
  { id: 3, name: 'T-Shirt', description: 'Cotton t-shirt', price: 19.99, categoryId: 2, categoryName: 'Clothing', sku: 'TSH-001', stock: 100 },
  { id: 4, name: 'Garden Tool Set', description: 'Complete garden tool set', price: 89.99, categoryId: 3, categoryName: 'Home & Garden', sku: 'GAR-001', stock: 25 },
  { id: 5, name: 'Running Shoes', description: 'Professional running shoes', price: 129.99, categoryId: 4, categoryName: 'Sports', sku: 'SHO-001', stock: 30 },
  { id: 6, name: 'JavaScript Guide', description: 'Complete JavaScript guide', price: 39.99, categoryId: 5, categoryName: 'Books', sku: 'BOK-001', stock: 75 },
]

export async function getCategories(): Promise<Category[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50))
  return categories
}

export async function getCategory(id: number): Promise<Category | null> {
  await new Promise(resolve => setTimeout(resolve, 50))
  return categories.find(c => c.id === id) || null
}

export async function getProductsByCategory(
  categoryId: number,
  options?: { filter?: string; sort?: string }
): Promise<Product[]> {
  await new Promise(resolve => setTimeout(resolve, 100))
  let filtered = products.filter(p => p.categoryId === categoryId)

  if (options?.filter) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(options.filter!.toLowerCase()) ||
      p.description.toLowerCase().includes(options.filter!.toLowerCase())
    )
  }

  if (options?.sort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price)
  } else if (options?.sort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price)
  }

  return filtered
}

export async function getProduct(id: number): Promise<Product | null> {
  await new Promise(resolve => setTimeout(resolve, 100))
  return products.find(p => p.id === id) || null
}

export async function getRelatedProducts(productId: number): Promise<Product[]> {
  await new Promise(resolve => setTimeout(resolve, 100))
  const product = products.find(p => p.id === productId)
  if (!product) return []
  
  return products
    .filter(p => p.id !== productId && p.categoryId === product.categoryId)
    .slice(0, 3)
}

export async function getUserProfile(): Promise<User> {
  await new Promise(resolve => setTimeout(resolve, 150))
  return {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    memberSince: '2023-01-15',
    orders: [
      { id: 1001, total: 129.99, date: '2024-11-01' },
      { id: 1002, total: 89.99, date: '2024-11-15' },
    ],
    recommendations: products.slice(0, 3),
  }
}

