import { useEffect, useState } from 'react'
import { TemplateEditorCard } from '../components/templates/TemplateEditorCard'
import { TemplateListCard } from '../components/templates/TemplateListCard'
import type { EditableTemplate } from '../components/templates/types'
import { api, type ExerciseOption, type Template, type TemplateExerciseInput } from '../lib/api'
import { errorMessage } from '../lib/errors'

function toEditable(t: Template): EditableTemplate {
  return {
    id: t.id,
    name: t.name,
    notes: t.notes ?? '',
    exercises: t.exercises
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(e => ({
        exercise_id: e.exercise_id,
        planned_sets: e.planned_sets,
        planned_reps: e.planned_reps,
        planned_weight: e.planned_weight ?? undefined,
        rest_seconds: e.rest_seconds ?? undefined,
        notes: e.notes ?? undefined,
      })),
  }
}

export function TemplatesPage({ token }: { token: string }) {
  const [items, setItems] = useState<Template[]>([])
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditableTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setErr(null)
    try {
      const [templates, exercises] = await Promise.all([api.listTemplates(token), api.listExercises(token)])
      setItems(templates)
      setExerciseOptions(exercises.filter(e => e.type === 'strength'))
    } catch (e: unknown) {
      setErr(errorMessage(e))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function create() {
    await api.createTemplate(token, { name, notes: notes || undefined, exercises: [] })
    setName('')
    setNotes('')
    await load()
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const exercises: TemplateExerciseInput[] = editing.exercises.map((e, idx) => ({
        exercise_id: e.exercise_id,
        sort_order: idx + 1,
        planned_sets: e.planned_sets,
        planned_reps: e.planned_reps,
        planned_weight: e.planned_weight,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
      }))

      await api.patchTemplate(token, editing.id, {
        name: editing.name.trim() || 'Untitled Template',
        notes: editing.notes.trim() || undefined,
        exercises,
      })

      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="card">
        <h2>Templates</h2>
        <div className="row">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" />
          <button onClick={() => void create()} disabled={!name.trim()}>
            Create
          </button>
        </div>
        {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      </div>

      <TemplateListCard
        items={items}
        onEdit={id => {
          const t = items.find(x => x.id === id)
          if (t) setEditing(toEditable(t))
        }}
        onDelete={id => {
          void (async () => {
            await api.deleteTemplate(token, id)
            await load()
          })()
        }}
      />

      {editing && (
        <TemplateEditorCard
          editing={editing}
          saving={saving}
          exerciseOptions={exerciseOptions}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => void saveEdit()}
        />
      )}
    </>
  )
}
