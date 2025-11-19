import { useEffect, useState } from 'react'

function App() {
  const [query, setQuery] = useState('')
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState({})
  const [message, setMessage] = useState('')

  const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const search = async () => {
    setLoading(true)
    setMessage('')
    try {
      const url = new URL(`${backend}/api/licenses`)
      if (query) url.searchParams.set('q', query)
      url.searchParams.set('vendor', 'Saad')
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setLicenses(data)
      if (data.length === 0) setMessage('No results. Try seeding the catalog.')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  const seed = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${backend}/api/licenses/seed`, { method: 'POST' })
      const data = await res.json()
      setMessage(data.message || `Seeded ${data.inserted || 0} items`)
      await search()
    } catch (e) {
      setMessage('Seed failed')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (sku, license) => {
    setCart(prev => {
      const qty = (prev[sku]?.quantity || 0) + 1
      return { ...prev, [sku]: { ...license, quantity: qty } }
    })
  }

  const updateQty = (sku, qty) => {
    setCart(prev => ({ ...prev, [sku]: { ...prev[sku], quantity: qty } }))
  }

  const removeFromCart = (sku) => {
    setCart(prev => {
      const p = { ...prev }
      delete p[sku]
      return p
    })
  }

  const total = Object.values(cart).reduce((sum, i) => sum + i.price * i.quantity, 0)

  const placeOrder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const form = new FormData(e.target)
    const payload = {
      company: form.get('company') || undefined,
      contact_name: form.get('name'),
      contact_email: form.get('email'),
      contact_phone: form.get('phone') || undefined,
      items: Object.values(cart).map(i => ({ sku: i.sku, name: i.name, quantity: i.quantity, unit_price: i.price, subtotal: i.price * i.quantity })),
      notes: form.get('notes') || undefined,
    }
    try {
      const res = await fetch(`${backend}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Order failed')
      setCart({})
      setMessage(`Order placed! ID: ${data.order_id} • Total: $${data.total}`)
    } catch (e) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500"></div>
            <div className="font-bold">NWTech Services</div>
          </div>
          <div className="flex gap-2">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Saad licenses" className="px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none w-72" />
            <button onClick={search} disabled={loading} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60">Search</button>
            <button onClick={seed} disabled={loading} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60">Seed Catalog</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">License Catalog</h2>
          {message && <div className="mb-4 text-sm text-blue-300">{message}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            {licenses.map(lic => (
              <div key={lic.sku} className="border border-slate-800 rounded-lg p-4 bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{lic.name}</h3>
                    <p className="text-xs text-slate-400">{lic.sku} • {lic.duration_months} mo • {lic.tier || 'Standard'}</p>
                  </div>
                  <div className="text-white font-bold">${lic.price.toFixed(2)}</div>
                </div>
                {lic.features?.length > 0 && (
                  <ul className="mt-3 text-sm text-slate-300 list-disc list-inside space-y-1">
                    {lic.features.slice(0,4).map((f,i)=> <li key={i}>{f}</li>)}
                  </ul>
                )}
                <button onClick={()=>addToCart(lic.sku, lic)} className="mt-4 w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">Add to Cart</button>
              </div>
            ))}
          </div>
        </section>

        <aside className="lg:col-span-1 border border-slate-800 rounded-lg p-4 bg-slate-900">
          <h2 className="text-xl font-semibold mb-4">Order</h2>
          <div className="space-y-3">
            {Object.values(cart).length === 0 && (
              <div className="text-sm text-slate-400">Your cart is empty.</div>
            )}
            {Object.values(cart).map(item => (
              <div key={item.sku} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.sku}</div>
                </div>
                <input type="number" min="1" value={item.quantity} onChange={e=>updateQty(item.sku, Math.max(1, parseInt(e.target.value||'1')))} className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700" />
                <div className="w-20 text-right">${(item.price * item.quantity).toFixed(2)}</div>
                <button onClick={()=>removeFromCart(item.sku)} className="text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 font-semibold">
              <div>Total</div>
              <div>${total.toFixed(2)}</div>
            </div>
          </div>

          <form onSubmit={placeOrder} className="mt-4 space-y-3">
            <input name="company" placeholder="Company (optional)" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <input name="name" placeholder="Contact name" required className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <input type="email" name="email" placeholder="Contact email" required className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <input name="phone" placeholder="Phone (optional)" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <textarea name="notes" placeholder="Notes (optional)" className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
            <button type="submit" disabled={Object.values(cart).length===0 || loading} className="w-full px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-60">Place Order</button>
          </form>
          <div className="text-xs text-slate-500 mt-3">Orders are created as pending. Your team can review and fulfill them.</div>
        </aside>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-slate-400 text-sm">© {new Date().getFullYear()} NWTech Services • VAR License Automation</footer>
    </div>
  )
}

export default App
