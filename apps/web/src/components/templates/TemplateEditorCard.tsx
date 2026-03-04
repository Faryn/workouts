import type { ExerciseOption } from '../../lib/api'
import type { EditableTemplate } from './types'

export function TemplateEditorCard(props: {
  editing: EditableTemplate
  saving: boolean
  exerciseOptions: ExerciseOption[]
  onChange: (next: EditableTemplate) => void
  onCancel: () => void
  onSave: () => void
}) {
  const editing = props.editing

  return (
    <div className="card">
      <h3>Edit Template</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <input value={editing.name} onChange={e => props.onChange({ ...editing, name: e.target.value })} placeholder="Template name" />
        <input value={editing.notes} onChange={e => props.onChange({ ...editing, notes: e.target.value })} placeholder="Notes" />
      </div>

      <h4 style={{ marginBottom: 8 }}>Exercises</h4>
      {editing.exercises.map((ex, idx) => (
        <div key={`${ex.exercise_id}-${idx}`} className="row" style={{ marginBottom: 8, alignItems: 'center' }}>
          <select
            value={ex.exercise_id}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], exercise_id: e.target.value }
              props.onChange({ ...editing, exercises: next })
            }}
          >
            <option value="">Select exercise</option>
            {props.exerciseOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={ex.planned_sets}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], planned_sets: Number(e.target.value || 1) }
              props.onChange({ ...editing, exercises: next })
            }}
            placeholder="Sets"
            style={{ width: 90 }}
          />
          <input
            type="number"
            min={1}
            value={ex.planned_reps}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], planned_reps: Number(e.target.value || 1) }
              props.onChange({ ...editing, exercises: next })
            }}
            placeholder="Reps"
            style={{ width: 90 }}
          />
          <input
            type="number"
            step="0.5"
            value={ex.planned_weight ?? ''}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], planned_weight: e.target.value === '' ? undefined : Number(e.target.value) }
              props.onChange({ ...editing, exercises: next })
            }}
            placeholder="Weight"
            style={{ width: 110 }}
          />
          <input
            type="number"
            min={0}
            value={ex.rest_seconds ?? ''}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], rest_seconds: e.target.value === '' ? undefined : Number(e.target.value) }
              props.onChange({ ...editing, exercises: next })
            }}
            placeholder="Rest sec"
            style={{ width: 110 }}
          />
          <input
            value={ex.notes ?? ''}
            onChange={e => {
              const next = [...editing.exercises]
              next[idx] = { ...next[idx], notes: e.target.value || undefined }
              props.onChange({ ...editing, exercises: next })
            }}
            placeholder="Exercise notes"
          />
          <button
            onClick={() => {
              if (idx === 0) return
              const next = [...editing.exercises]
              const tmp = next[idx - 1]
              next[idx - 1] = next[idx]
              next[idx] = tmp
              props.onChange({ ...editing, exercises: next })
            }}
            disabled={idx === 0}
          >↑</button>
          <button
            onClick={() => {
              if (idx === editing.exercises.length - 1) return
              const next = [...editing.exercises]
              const tmp = next[idx + 1]
              next[idx + 1] = next[idx]
              next[idx] = tmp
              props.onChange({ ...editing, exercises: next })
            }}
            disabled={idx === editing.exercises.length - 1}
          >↓</button>
          <button onClick={() => props.onChange({ ...editing, exercises: editing.exercises.filter((_, i) => i !== idx) })}>Remove</button>
        </div>
      ))}

      <div className="row">
        <button
          onClick={() => {
            const first = props.exerciseOptions[0]
            if (!first) return
            props.onChange({
              ...editing,
              exercises: [...editing.exercises, { exercise_id: first.id, planned_sets: 3, planned_reps: 8 }],
            })
          }}
        >+ Add Exercise</button>
        <button onClick={props.onCancel} disabled={props.saving}>Cancel</button>
        <button onClick={props.onSave} disabled={props.saving || !editing.name.trim()}>{props.saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}
