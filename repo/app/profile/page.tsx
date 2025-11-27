/**
 * Profile Page - Server-Side Rendered
 * 
 * Implements:
 * - SSR for user-specific content
 * - Authentication simulation
 * - Personalized recommendations
 */

import { getUserProfile } from '@/lib/data'

// Force SSR
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getUserProfile()

  return (
    <main className="container">
      <h1>User Profile</h1>

      <div style={{ marginTop: '2rem' }}>
        <h2>Account Information</h2>
        <div style={{ marginTop: '1rem' }}>
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Email:</strong> {user.email}
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Member Since:</strong> {user.memberSince}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Order History</h2>
        <div style={{ marginTop: '1rem' }}>
          {user.orders.length > 0 ? (
            <ul>
              {user.orders.map((order) => (
                <li key={order.id} style={{ marginTop: '0.5rem' }}>
                  Order #{order.id} - ${order.total.toFixed(2)} - {order.date}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No orders yet</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Recommended Products</h2>
        <div className="grid" style={{ marginTop: '1rem' }}>
          {user.recommendations.map((product) => (
            <a
              key={product.id}
              href={`/product/${product.id}`}
              className="card"
            >
              <h3>{product.name}</h3>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                ${product.price.toFixed(2)}
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}

