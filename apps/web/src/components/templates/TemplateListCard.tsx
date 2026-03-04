import type { Template } from '../../lib/api'

export function TemplateListCard(props: {
  items: Template[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="card">
      <h3>Existing</h3>
      <ul>
        {props.items.map(t => (
          <li key={t.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span>
              {t.name} <span className="small">{t.notes ?? ''}</span>
              <span className="small" style={{ marginLeft: 8 }}>({t.exercises.length} exercises)</span>
            </span>
            <div className="row">
              <button onClick={() => props.onEdit(t.id)}>Edit</button>
              <button onClick={() => props.onDelete(t.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
