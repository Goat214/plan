// Kunlik yozuvlarni Claude AI ga yuborib tahlil olish
export async function analyzeDayWithClaude(entries, hours, hourLabels) {
    const filled = hours.filter(h => entries[h])
  
    if (filled.length === 0) {
      throw new Error('Жок дегенде бир саат жазылышы керек!')
    }
  
    const summary = filled
      .map(h => {
        const idx = hours.indexOf(h)
        return `${hourLabels[idx]}: ${entries[h]}`
      })
      .join('\n\n')
  
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Төмөндө бир адамдын бүгүнкү күнүнүн саат боюнча жазуулары берилген. Кыргыз тилинде анализ бер:
  
  1. Күн жалпысынан кандай өттү
  2. Эң натыйжалуу саат кайсылар болду
  3. Эмне жакшы болду
  4. Эртеңки күн үчүн кеңеш
  
  Жазуулар:
  ${summary}
  
  Мээрбандык менен, кыска жана пайдалуу анализ бер. 3-4 параграф болсун.`,
          },
        ],
      }),
    })
  
    if (!response.ok) {
      throw new Error('API жооп бербеди')
    }
  
    const data = await response.json()
    return data.content?.[0]?.text || 'Анализ жасоо мүмкүн болгон жок.'
  }