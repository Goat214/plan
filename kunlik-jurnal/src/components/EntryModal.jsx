import { useState, useEffect } from 'react'

export default function EntryModal({ hour, colName, initialContent, onSave, onClose }) {
  const [text, setText] = useState(initialContent || '')

  useEffect(() => { setText(initialContent || '') }, [hour, colName, initialContent])

  function handleSave() {
    onSave(text.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box entry-box" onClick={e => e.stopPropagation()}>
        <div className="entry-header">
          <h3>{String(hour).padStart(2,'0')}:00 — {colName}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`${colName} жазыңыз...`}
          autoFocus
          rows={5}
        />
        <div className="entry-actions">
          {initialContent && (
            <button className="btn-danger" onClick={() => { onSave(''); }}>Өчүрүү</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose}>Жокко чыгаруу</button>
          <button className="btn-primary" onClick={handleSave}>Сактоо</button>
        </div>
      </div>
    </div>
  )
}