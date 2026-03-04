import { useEffect, useMemo, useState } from 'react'

import type { ExerciseOption } from '../../lib/api'
import type { EditableTemplate } from './types'

function fuzzyScore(query: string, candidate: string): number {
  const q = query.trim().toLowerCase()
  const c = candidate.toLowerCase()
  if (!q) return 0
  if (c === q) return 1000
  if (c.startsWith(q)) return 700
  if (c.includes(q)) return 500

  // lightweight subsequence scoring (fuzzy)
  let qi = 0
  let score = 0
  for (let i = 0; i < c.length && qi < q.length; i += 1) {
    if (c[i] === q[qi]) {
      score += 10
      qi += 1
    }
  }
  return qi === q.length ? score : -1
}

export function TemplateEditorCard(props: {
  editing: EditableTemplate
  saving: boolean
  exerciseOptions: ExerciseOption[]
  onChange: (next: EditableTemplate) => void
  onCancel: () => void
  onSave: () => void
  onCreateExercise: (name: string) => Promise<ExerciseOption>
}) {
  const editing = props.editing

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    props.exerciseOptions.forEach(e => m.set(e.id, e.name))
    return m
  }, [props.exerciseOptions])

  const [queries, setQueries] = useState<string[]>([])
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    setQueries(editing.exercises.map(ex => nameById.get(ex.exercise_id) ?? ''))
  }, [editing.id, editing.exercises.length, nameById])

  const setExerciseAt = (idx: number, patch: Partial<(typeof editing.exercises)[number]>) => {
    const next = [...editing.exercises]
    next[idx] = { ...next[idx], ...patch }
    props.onChange({ ...editing, exercises: next })
  }

  return (
    <div className="card">
      <h3>Edit Template</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <input value={editing.name} onChange={e => props.onChange({ ...editing, name: e.target.value })} placeholder="Template name" />
        <input value={editing.notes} onChange={e => props.onChange({ ...editing, notes: e.target.value })} placeholder="Notes" />
      </div>

      <h4 style={{ marginBottom: 8 }}>Exercises</h4>
      {editing.exercises.map((ex, idx) => {
        const query = queries[idx] ?? ''
        const ranked = props.exerciseOptions
          .map(opt => ({ opt, score: fuzzyScore(query, opt.name) }))
          .filter(x => (query ? x.score >= 0 : true))
          .sort((a, b) => b.score - a.score || a.opt.name.localeCompare(b.opt.name))
          .slice(0, 6)

        const exact = props.exerciseOptions.find(o => o.name.toLowerCase() === query.trim().toLowerCase())
        const selectedName = nameById.get(ex.exercise_id)
        const showSuggestions = focusedIndex === idx && query.trim().length > 0 && query.trim() !== (selectedName ?? '')

        return (
          <div key={`${ex.exercise_id}-${idx}`} className="row" style={{ marginBottom: 8, alignItems: 'center' }}>
            <div style={{ minWidth: 260, position: 'relative' }}>
              <input
                value={query}
                onChange={e => {
                  const next = [...queries]
                  next[idx] = e.target.value
                  setQueries(next)
                }}
                onFocus={() => setFocusedIndex(idx)}
                onBlur={() => window.setTimeout(() => setFocusedIndex(prev => (prev === idx ? null : prev)), 120)}
                placeholder="Exercise (type to search)"
                style={{ width: '100%' }}
              />
              {showSuggestions && (
                <div className="suggestions">
                  {ranked.map(({ opt }) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setExerciseAt(idx, { exercise_id: opt.id })
                        const next = [...queries]
                        next[idx] = opt.name
                        setQueries(next)
                        setFocusedIndex(null)
                      }}
                    >
                      {opt.name}
                    </button>
                  ))}
                  {!exact && (
                    <button
                      type="button"
                      className="suggestion-item suggestion-create"
                      disabled={creatingIndex === idx}
                      onClick={async () => {
                        const raw = query.trim()
                        if (!raw) return
                        setCreatingIndex(idx)
                        try {
                          const created = await props.onCreateExercise(raw)
                          setExerciseAt(idx, { exercise_id: created.id })
                          const next = [...queries]
                          next[idx] = created.name
                          setQueries(next)
                          setFocusedIndex(null)
                        } finally {
                          setCreatingIndex(null)
                        }
                      }}
                    >
                      {creatingIndex === idx ? 'Creating…' : `+ Create "${query.trim()}"`}
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              type="number"
              min={1}
              value={ex.planned_sets}
              onChange={e => setExerciseAt(idx, { planned_sets: Number(e.target.value || 1) })}
              placeholder="Sets"
              style={{ width: 90 }}
            />
            <input
              type="number"
              min={1}
              value={ex.planned_reps}
              onChange={e => setExerciseAt(idx, { planned_reps: Number(e.target.value || 1) })}
              placeholder="Reps"
              style={{ width: 90 }}
            />
            <input
              type="number"
              step="0.5"
              value={ex.planned_weight ?? ''}
              onChange={e => setExerciseAt(idx, { planned_weight: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="Weight"
              style={{ width: 110 }}
            />
            <input
              type="number"
              min={0}
              value={ex.rest_seconds ?? ''}
              onChange={e => setExerciseAt(idx, { rest_seconds: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="Rest sec"
              style={{ width: 110 }}
            />
            <input
              value={ex.notes ?? ''}
              onChange={e => setExerciseAt(idx, { notes: e.target.value || undefined })}
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
        )
      })}

      <div className="row">
        <button
          onClick={() => {
            props.onChange({
              ...editing,
              exercises: [...editing.exercises, { exercise_id: '', planned_sets: 3, planned_reps: 8 }],
            })
            setQueries(prev => [...prev, ''])
          }}
        >+ Add Exercise</button>
        <button onClick={props.onCancel} disabled={props.saving}>Cancel</button>
        <button onClick={props.onSave} disabled={props.saving || !editing.name.trim()}>{props.saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}
