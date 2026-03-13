import { useState } from 'react'

export default function DayAnalysis({ entries, hours, cols, colKeys, date }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    setError('')
    const filled = []
    hours.forEach(h => {
      colKeys.forEach((ck, i) => {
        const val = entries[`${h}_${ck}`]
        if (val) filled.push(`${String(h).padStart(2,'0')}:00 [${cols[i]}]: ${val}`)
      })
    })
    if (filled.length === 0) { setError('Жок дегенде бир уяча толтуруңуз!'); return }

    setLoading(true)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Төмөндө адамдын ${date} күнүнүн саат боюнча журналы берилген. Кыргыз тилинде жылуу жана колдоочу маанайда кыска анализ бер:\n1. Күн кандай өттү\n2. Эң күчтүү учурлар\n3. Эртеңки күн үчүн бир кеңеш\n\nЖурнал:\n${filled.join('\n')}`
          }]
        })
      })
      const data = await resp.json()
      setAnalysis(data.content?.[0]?.text || 'Анализ жасоо мүмкүн болгон жок.')
    } catch(e) {
      setError('Ката кетти. Интернетти текшериңиз.')
    }
    setLoading(false)
  }

  return (
    <div className="analysis-section">
      <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Анализ жасалууда...' : '✦ Күндүн анализи'}
      </button>
      {error && <p className="msg error">{error}</p>}
      {analysis && (
        <div className="analysis-box">
          <h3>Күндүн анализи</h3>
          <div className="analysis-text">
            {analysis.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}
    </div>
  )
}