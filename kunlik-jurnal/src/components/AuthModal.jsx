import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

export default function AuthModal({ onSuccess, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email || !password) { setError('Email жана сырсөз киргизиңиз'); return }
    if (password.length < 6) { setError('Сырсөз кеминде 6 белгиден турушу керек'); return }
    if (isSignUp && !name.trim()) { setError('Атыңызды киргизиңиз'); return }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUp(email, password, name.trim())
        setSuccess('Ырастоо каты жөнөтүлдү! Emailиңизди текшериңиз.')
      } else {
        const user = await signIn(email, password)
        onSuccess(user, name.trim())
      }
    } catch (err) {
      const msg = err.message
      setError(
        msg === 'Invalid login credentials' ? 'Email же сырсөз туура эмес' :
        msg === 'User already registered' ? 'Бул email менен каттоо бар' :
        msg
      )
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem'
    }}>
      <div style={{
        background: '#fff', borderRadius: '14px', width: '100%',
        maxWidth: '380px', padding: '28px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
      }}>
        <h2 style={{ fontFamily: "'EB Garamond', serif", fontSize: '22px', fontWeight: 400, marginBottom: '6px' }}>
          {isSignUp ? 'Катталуу' : 'Кирүү'}
        </h2>
        <p style={{ fontSize: '13px', color: '#6b6860', marginBottom: '18px' }}>
          {isSignUp ? 'Жаңы аккаунт ачуу' : 'Журналыңызга кириңиз'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b6860', marginBottom: '4px' }}>Атыңыз</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Мисалы: Айгүл"
                style={inputStyle}
                autoFocus
              />
            </>
          )}
          <label style={{ display: 'block', fontSize: '12px', color: '#6b6860', marginBottom: '4px', marginTop: isSignUp ? '10px' : '0' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com" style={inputStyle} autoFocus={!isSignUp} />
          <label style={{ display: 'block', fontSize: '12px', color: '#6b6860', marginBottom: '4px', marginTop: '10px' }}>Сырсөз</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Кеминде 6 белги" style={inputStyle} />

          {error && <p style={{ fontSize: '13px', color: '#c0392b', marginTop: '8px' }}>{error}</p>}
          {success && <p style={{ fontSize: '13px', color: '#2a7a5a', marginTop: '8px' }}>{success}</p>}

          <button type="submit" disabled={loading} style={{
            width: '100%', marginTop: '16px', padding: '11px',
            background: '#2a7a5a', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1
          }}>
            {loading ? 'Күтүңүз...' : isSignUp ? 'Катталуу' : 'Кирүү'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#6b6860' }}>
          {isSignUp ? 'Аккаунтуңуз барбы? ' : 'Аккаунт жокпу? '}
          <span onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess('') }}
            style={{ color: '#2a7a5a', cursor: 'pointer', textDecoration: 'underline' }}>
            {isSignUp ? 'Кириңиз' : 'Катталыңыз'}
          </span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <span onClick={onClose} style={{ fontSize: '12px', color: '#a09c96', cursor: 'pointer' }}>Жокко чыгаруу</span>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #ddd9d0', borderRadius: '8px',
  fontSize: '14px', fontFamily: "'DM Sans', sans-serif",
  background: '#f5f3ee', color: '#1a1916', outline: 'none'
}