import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function TemplatesPage({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setErr(null)
    try { setItems(await api.listTemplates(token)) } catch (e: any) { setErr(e.message) }
  }

  useEffect(() => { void load() }, [])

  async function create() {
    await api.createTemplate(token, name, notes || undefined)
    setName(''); setNotes('')
    await load()
  }

  return (
    <>
      <div className="card">
        <h2>Templates</h2>
        <div className="row">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" />
          <button onClick={() => void create()} disabled={!name.trim()}>Create</button>
        </div>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      <div className="card">
        <h3>Existing</h3>
        <ul>
          {items.map(t => (
            <li key={t.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span>{t.name} <span className="small">{t.notes ?? ''}</span></span>
              <button onClick={async () => { await api.deleteTemplate(token, t.id); await load() }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
