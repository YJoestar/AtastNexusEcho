import { useState } from 'react'
import {
  LINK_KINDS,
  LINK_STATUSES,
  linkAnnotationKey,
  type AnnotationKind,
  type EvidenceHypothesis,
  type InvestigationWorkspace,
  type LinkKind,
  type LinkStatus,
} from '@/lib/investigationWorkspace'
import { artifactCondition, artifactType, type CaseArtifact } from '../types'
import { LINK_STATUS_STYLE } from './linkStyle'

const NOTE_KINDS: AnnotationKind[] = ['NOTE', 'QUESTION', 'CONTRADICTION', 'REFERENCE']

const KIND_HELP: Record<LinkKind, string> = {
  CORROBORATES: 'The two objects support each other.',
  CONTRADICTS: 'The two objects cannot both be right.',
  TEMPORAL: 'They share or conflict on a time.',
  LOCATION: 'They share a place.',
  PERSON: 'They concern the same person.',
  OBJECT: 'They concern the same physical object.',
  UNKNOWN: 'A connection exists, its nature does not.',
  HYPOTHESIS: 'A suspected relation, not yet tested.',
}

const fieldClass = 'min-h-10 w-full border border-nexus-border bg-nexus-bg px-2 font-mono text-xs text-nexus-text'
const buttonClass = 'min-h-10 border px-3 font-mono text-[0.55rem] uppercase tracking-[0.1em] disabled:opacity-40'

export interface BoardInspectorProps {
  workspace: InvestigationWorkspace
  artifactById: Map<string, CaseArtifact>
  selectedArtifacts: CaseArtifact[]
  selectedLink: EvidenceHypothesis | null
  liveLinks: EvidenceHypothesis[]
  dormantLinks: EvidenceHypothesis[]
  onCreateLink: (kind: LinkKind, note: string) => void
  onUpdateLink: (id: string, patch: Partial<Pick<EvidenceHypothesis, 'kind' | 'status' | 'note'>>) => void
  onRemoveLink: (id: string) => void
  onSelectLink: (id: string) => void
  onAddNote: (targetKey: string, kind: AnnotationKind, text: string) => void
  onEditNote: (targetKey: string, id: string, text: string) => void
  onDeleteNote: (targetKey: string, id: string) => void
  onOpen: (id: string) => void
  onFocus: (id: string) => void
  onClear: () => void
}

function NoteList({
  targetKey,
  workspace,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: Pick<BoardInspectorProps, 'workspace' | 'onAddNote' | 'onEditNote' | 'onDeleteNote'> & { targetKey: string }) {
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<AnnotationKind>('NOTE')
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const notes = workspace.annotations[targetKey] ?? []

  return (
    <div className="space-y-2">
      <h4 className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
        INVESTIGATOR NOTES / {notes.length.toString().padStart(2, '0')}
      </h4>
      {notes.length === 0 && <p className="font-mono text-[0.6rem] text-nexus-textSubtle">No investigator notes recorded.</p>}
      <ul className="space-y-2">
        {notes.map(note => (
          <li key={note.id} className="border-l-2 border-[#d3b87b]/60 bg-nexus-surface px-2 py-1.5">
            <p className="font-mono text-[0.48rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
              {note.kind} / YOU / {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'UNDATED'}
            </p>
            {editing?.id === note.id ? (
              <div className="mt-1 space-y-1">
                <textarea
                  value={editing.text}
                  onChange={event => setEditing({ id: note.id, text: event.target.value })}
                  aria-label="Edit note"
                  rows={3}
                  maxLength={3000}
                  className={`${fieldClass} font-sans normal-case`}
                />
                <div className="flex gap-2">
                  <button type="button" className={`${buttonClass} border-nexus-accent text-nexus-accent`} onClick={() => { onEditNote(targetKey, note.id, editing.text); setEditing(null) }}>SAVE NOTE</button>
                  <button type="button" className={`${buttonClass} border-nexus-border text-nexus-textSubtle`} onClick={() => setEditing(null)}>CANCEL</button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-nexus-text">{note.text}</p>
                <div className="mt-1 flex gap-3 font-mono text-[0.5rem] uppercase">
                  <button type="button" className="min-h-8 text-nexus-textMuted underline-offset-2 hover:underline" onClick={() => setEditing({ id: note.id, text: note.text })} aria-label="Edit note">EDIT</button>
                  <button type="button" className="min-h-8 text-nexus-textMuted underline-offset-2 hover:underline" onClick={() => onDeleteNote(targetKey, note.id)} aria-label="Delete note">DELETE</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="space-y-1"
        onSubmit={event => {
          event.preventDefault()
          if (!draft.trim()) return
          onAddNote(targetKey, kind, draft)
          setDraft('')
        }}
      >
        <div className="flex gap-2">
          <select value={kind} onChange={event => setKind(event.target.value as AnnotationKind)} aria-label="Note category" className={`${fieldClass} w-32`}>
            {NOTE_KINDS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={3000} placeholder="ADD AN INVESTIGATOR NOTE…" aria-label="Investigator note" className={`${fieldClass} font-sans normal-case`} />
        </div>
        <button type="submit" disabled={!draft.trim()} className={`${buttonClass} border-nexus-border text-nexus-text`}>FILE NOTE</button>
      </form>
    </div>
  )
}

function LinkRow({ link, artifactById, onSelectLink, dormant }: {
  link: EvidenceHypothesis
  artifactById: Map<string, CaseArtifact>
  onSelectLink: (id: string) => void
  dormant: boolean
}) {
  const style = LINK_STATUS_STYLE[link.status]
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectLink(link.id)}
        disabled={dormant}
        className="grid min-h-10 w-full grid-cols-[1fr_auto] gap-2 py-1.5 text-left font-mono text-[0.6rem] disabled:opacity-60"
      >
        <span className="min-w-0 text-nexus-textMuted">
          <b className="text-nexus-text">{artifactById.get(link.from)?.code ?? link.from} ↔ {artifactById.get(link.to)?.code ?? link.to}</b>
          <span className="ml-2">{link.note || link.kind}</span>
        </span>
        <span className="uppercase" style={{ color: style.stroke }}>
          {style.glyph} {dormant ? 'DORMANT' : link.status}
        </span>
      </button>
    </li>
  )
}

export function BoardInspector(props: BoardInspectorProps) {
  const {
    workspace, artifactById, selectedArtifacts, selectedLink, liveLinks, dormantLinks,
    onCreateLink, onUpdateLink, onRemoveLink, onSelectLink, onOpen, onFocus, onClear,
  } = props
  const [kind, setKind] = useState<LinkKind>('HYPOTHESIS')
  const [note, setNote] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const first = selectedArtifacts[0]
  const second = selectedArtifacts[1]
  const existing = first && second
    ? workspace.hypotheses.find(link => (link.from === first.id && link.to === second.id) || (link.from === second.id && link.to === first.id))
    : undefined

  return (
    <aside className="space-y-4 border border-nexus-border bg-nexus-surfaceSubtle p-3" aria-label="Board inspector">
      {selectedLink ? (
        <section className="space-y-3" aria-label="Selected relationship">
          <header>
            <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">RELATIONSHIP / PLAYER-FILED</p>
            <h3 className="mt-1 font-mono text-xs font-bold uppercase text-nexus-text">
              {artifactById.get(selectedLink.from)?.code ?? selectedLink.from} ↔ {artifactById.get(selectedLink.to)?.code ?? selectedLink.to}
            </h3>
          </header>
          <label className="block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            RELATIONSHIP TYPE
            <select value={selectedLink.kind} onChange={event => onUpdateLink(selectedLink.id, { kind: event.target.value as LinkKind })} className={`${fieldClass} mt-1`}>
              {LINK_KINDS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <span className="mt-1 block normal-case tracking-normal text-nexus-textMuted">{KIND_HELP[selectedLink.kind]}</span>
          </label>
          <label className="block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            STATUS
            <select value={selectedLink.status} onChange={event => onUpdateLink(selectedLink.id, { status: event.target.value as LinkStatus })} className={`${fieldClass} mt-1`}>
              {LINK_STATUSES.map(option => <option key={option} value={option}>{LINK_STATUS_STYLE[option].glyph} {option}</option>)}
            </select>
          </label>
          <label className="block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            BASIS
            <input value={selectedLink.note} maxLength={300} onChange={event => onUpdateLink(selectedLink.id, { note: event.target.value })} placeholder="WHY DO THESE BELONG TOGETHER?" className={`${fieldClass} mt-1 font-sans normal-case tracking-normal`} />
          </label>
          <p className="font-mono text-[0.48rem] uppercase tracking-[0.1em] text-nexus-textSubtle">
            FILED {selectedLink.createdAt ? new Date(selectedLink.createdAt).toLocaleString() : '—'} / NOT SYSTEM-VERIFIED
          </p>
          <NoteList targetKey={linkAnnotationKey(selectedLink.id)} {...props} />
          {confirmingRemove ? (
            <div role="alertdialog" aria-label="Remove relationship" className="space-y-2 border border-nexus-danger bg-nexus-dangerBg p-3">
              <p className="font-mono text-[0.6rem] uppercase text-nexus-text">REMOVE THIS RELATIONSHIP?</p>
              <p className="text-xs text-nexus-textMuted">The link and its notes leave the table. The evidence itself is untouched.</p>
              <div className="flex gap-2">
                <button type="button" className={`${buttonClass} border-nexus-border text-nexus-textMuted`} onClick={() => setConfirmingRemove(false)}>CANCEL</button>
                <button type="button" className={`${buttonClass} border-nexus-danger text-nexus-danger`} onClick={() => { setConfirmingRemove(false); onRemoveLink(selectedLink.id) }}>REMOVE LINK</button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${buttonClass} border-nexus-border text-nexus-textMuted`} onClick={() => setConfirmingRemove(true)}>[ DISCONNECT ]</button>
          )}
        </section>
      ) : selectedArtifacts.length >= 2 ? (
        <section className="space-y-3" aria-label="Link evidence">
          <header>
            <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">LINK EVIDENCE / {selectedArtifacts.length} SELECTED</p>
            <p className="mt-1 break-words font-mono text-xs text-nexus-text">{selectedArtifacts.map(a => a.code).join(' ↔ ')}</p>
          </header>
          <label className="block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            RELATIONSHIP TYPE
            <select value={kind} onChange={event => setKind(event.target.value as LinkKind)} className={`${fieldClass} mt-1`}>
              {LINK_KINDS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <span className="mt-1 block normal-case tracking-normal text-nexus-textMuted">{KIND_HELP[kind]}</span>
          </label>
          <label className="block font-mono text-[0.52rem] uppercase tracking-[0.12em] text-nexus-textSubtle">
            PLAYER HYPOTHESIS
            <input value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="RECORD A SUSPECTED RELATION…" className={`${fieldClass} mt-1 font-sans normal-case tracking-normal`} />
          </label>
          {selectedArtifacts.length > 2 && (
            <p className="font-mono text-[0.5rem] uppercase text-nexus-textSubtle">Object 1 is linked to each of the others.</p>
          )}
          {existing && selectedArtifacts.length === 2 && (
            <p className="font-mono text-[0.55rem] uppercase text-nexus-warning">ALREADY LINKED / {existing.kind} / {existing.status}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${buttonClass} border-nexus-warning text-nexus-warning`}
              onClick={() => { onCreateLink(kind, note); setNote('') }}
            >
              [ FILE UNVERIFIED LINK ]
            </button>
            <button type="button" className={`${buttonClass} border-nexus-border text-nexus-textMuted`} onClick={onClear}>CLEAR SELECTION</button>
          </div>
        </section>
      ) : selectedArtifacts.length === 1 && first ? (
        <section className="space-y-3" aria-label="Selected object">
          <header>
            <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
              {artifactType(first)} / {first.code} / COND: {artifactCondition(first)}
            </p>
            <h3 className="mt-1 break-words font-type text-sm font-bold text-nexus-text">{first.title}</h3>
            {first.location && <p className="mt-0.5 font-mono text-[0.55rem] uppercase text-nexus-textMuted">LOC: {first.location}</p>}
          </header>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${buttonClass} border-nexus-accent text-nexus-accent`} onClick={() => onOpen(first.id)}>INSPECT</button>
            <button type="button" className={`${buttonClass} border-nexus-border text-nexus-text`} onClick={() => onFocus(first.id)}>FOCUS</button>
            <button type="button" className={`${buttonClass} border-nexus-border text-nexus-textMuted`} onClick={onClear}>CLEAR</button>
          </div>
          <p className="font-mono text-[0.5rem] uppercase text-nexus-textSubtle">Select a second object to link it.</p>
          <NoteList targetKey={first.id} {...props} />
        </section>
      ) : (
        <section className="space-y-2" aria-label="Board help">
          <p className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">NOTHING SELECTED</p>
          <p className="text-xs leading-relaxed text-nexus-textMuted">
            Tap an object to select it. Select two or more to file a relationship. Drag the table to pan, pinch or scroll to zoom.
          </p>
        </section>
      )}

      <section className="border-t border-nexus-borderSubtle pt-2" aria-label="Filed relationships">
        <h3 className="font-mono text-[0.52rem] uppercase tracking-[0.14em] text-nexus-textSubtle">
          PLAYER-FILED HYPOTHESES / NOT SYSTEM-VERIFIED / {workspace.hypotheses.length.toString().padStart(2, '0')}
        </h3>
        {workspace.hypotheses.length === 0 ? (
          <p className="mt-1 font-mono text-[0.6rem] text-nexus-textSubtle">No relationship has been filed.</p>
        ) : (
          <ul className="mt-1 divide-y divide-nexus-borderSubtle">
            {liveLinks.map(link => <LinkRow key={link.id} link={link} artifactById={artifactById} onSelectLink={onSelectLink} dormant={false} />)}
            {dormantLinks.map(link => <LinkRow key={link.id} link={link} artifactById={artifactById} onSelectLink={onSelectLink} dormant />)}
          </ul>
        )}
        {dormantLinks.length > 0 && (
          <p className="mt-1 font-mono text-[0.48rem] uppercase text-nexus-textSubtle">DORMANT LINKS RETURN WHEN BOTH OBJECTS ARE BACK ON THE TABLE.</p>
        )}
      </section>
    </aside>
  )
}

