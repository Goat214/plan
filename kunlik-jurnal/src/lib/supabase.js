import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: name } }
  })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export async function fetchEntriesByDate(userId, date) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw error
  const result = {}
  data.forEach(row => { result[`${row.hour}_${row.col_key}`] = row.content })
  return result
}

export async function saveEntry(userId, date, hour, colKey, content) {
  const { error } = await supabase
    .from('entries')
    .upsert(
      { user_id: userId, date, hour, col_key: colKey, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date,hour,col_key' }
    )
  if (error) throw error
}

export async function deleteEntry(userId, date, hour, colKey) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
    .eq('hour', hour)
    .eq('col_key', colKey)
  if (error) throw error
}