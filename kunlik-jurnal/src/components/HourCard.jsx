export default function HourCard({ hour, label, content, onClick }) {
    const hasCont = Boolean(content)
    return (
      <div
        className={`hour-card ${hasCont ? 'has-content' : ''}`}
        onClick={() => onClick(hour)}
      >
        <div className="card-header">
          <span className="card-label">{label}</span>
          <span className={`card-badge ${hasCont ? 'filled' : 'empty'}`}>
            {hasCont ? 'Жазылды' : 'Бош'}
          </span>
        </div>
        <p className={`card-preview ${!hasCont ? 'placeholder' : ''}`}>
          {hasCont ? content : 'Бул саат үчүн жазыңыз...'}
        </p>
      </div>
    )
  }