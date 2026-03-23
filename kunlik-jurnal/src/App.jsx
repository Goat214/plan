import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  getCurrentUser,
  signOut,
  fetchEntriesByDate,
  saveEntry,
  deleteEntry,
} from "./lib/supabase";
import AuthModal from "./components/AuthModal";
import EntryModal from "./components/EntryModal";
import DayAnalysis from "./components/DayAnalysis";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const COLS = ["Ойлор", "Сөздөр", "Сезимдер", "Ийгиликтер", "Шүгүрлөр"];
const COL_KEYS = ["thoughts", "words", "feelings", "achievements", "gratitude"];

function formatDate(d) {
  const days = [
    "Жекшемби", "Дүйшөмбү", "Шейшемби", "Шаршемби",
    "Бейшемби", "Жума", "Ишемби",
  ];
  const months = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function strToDate(s) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}

// --- Supabase goals helpers ---
async function fetchGoals(userId) {
  const { data, error } = await supabase
    .from("goals")
    .select("index, text, saved")
    .eq("user_id", userId)
    .order("index");
  if (error) throw error;
  return data || [];
}

async function upsertGoal(userId, index, text, saved) {
  const { error } = await supabase.from("goals").upsert(
    { user_id: userId, index, text, saved },
    { onConflict: "user_id,index" }
  );
  if (error) throw error;
}

export default function App() {
  const EMPTY_GOALS = ["", "", ""];
  const EMPTY_SAVED = [false, false, false];

  const [maqsadlar, setMaqsadlar] = useState(EMPTY_GOALS);
  const [saved, setSaved] = useState(EMPTY_SAVED);

  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [entries, setEntries] = useState({});
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState(null); // 'cell' | 'goal'
  const [activeCell, setActiveCell] = useState(null);
  const [pendingCell, setPendingCell] = useState(null);
  const [pendingGoal, setPendingGoal] = useState(null); // { index, text }
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dateToStr(new Date()));

  // Load goals from Supabase when user is available
  const loadGoals = useCallback(async (u) => {
    if (!u) return;
    try {
      const data = await fetchGoals(u.id);
      if (data.length > 0) {
        const texts = [...EMPTY_GOALS];
        const savedArr = [...EMPTY_SAVED];
        data.forEach(({ index, text, saved: s }) => {
          if (index >= 0 && index < 3) {
            texts[index] = text || "";
            savedArr[index] = !!s;
          }
        });
        setMaqsadlar(texts);
        setSaved(savedArr);
      }
    } catch (e) {
      console.error("Goals fetch error:", e);
    }
  }, []);

  // Auth state
  useEffect(() => {
    supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "";
        setUserName(name);
        loadGoals(u);
      }
    });
    getCurrentUser().then((u) => {
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "";
        setUserName(name);
        loadGoals(u);
      }
      setLoading(false);
    });
  }, [loadGoals]);

  // Load journal entries
  const loadEntries = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchEntriesByDate(user.id, selectedDate);
      setEntries(data);
    } catch (e) {
      console.error(e);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // --- Goal handlers ---
  function handleChange(index, value) {
    const yangi = [...maqsadlar];
    yangi[index] = value;
    setMaqsadlar(yangi);
  }

  async function handleKeyDown(e, index) {
    if (e.key === "Enter") {
      await saveGoalConfirm(index, maqsadlar[index]);
    }
  }

  async function handleGoalBlur(index) {
    // Auto-save on blur if text is non-empty
    if (maqsadlar[index].trim()) {
      await saveGoalConfirm(index, maqsadlar[index]);
    }
  }

  async function saveGoalConfirm(index, text) {
    if (!user) {
      // Prompt login first, remember pending goal
      setPendingGoal({ index, text });
      setAuthReason("goal");
      setShowAuth(true);
      return;
    }
    const yangiSaved = [...saved];
    yangiSaved[index] = true;
    setSaved(yangiSaved);
    try {
      await upsertGoal(user.id, index, text, true);
    } catch (e) {
      console.error("Goal save error:", e);
    }
  }

  function tahrirlash(index) {
    const yangiSaved = [...saved];
    yangiSaved[index] = false;
    setSaved(yangiSaved);
  }

  // --- Cell handlers ---
  function handleCellClick(hour, colKey) {
    if (!user) {
      setPendingCell({ hour, colKey });
      setAuthReason("cell");
      setShowAuth(true);
    } else {
      setActiveCell({ hour, colKey });
    }
  }

  async function handleAuthSuccess(loggedUser, typedName) {
    setUser(loggedUser);
    const name =
      loggedUser.user_metadata?.full_name ||
      typedName ||
      loggedUser.email?.split("@")[0] ||
      "";
    setUserName(name);
    setShowAuth(false);

    const data = await fetchEntriesByDate(loggedUser.id, selectedDate);
    setEntries(data);
    await loadGoals(loggedUser);

    if (authReason === "goal" && pendingGoal) {
      // Save the pending goal now that user is logged in
      const { index, text } = pendingGoal;
      const yangiSaved = [...saved];
      yangiSaved[index] = true;
      setSaved(yangiSaved);
      try {
        await upsertGoal(loggedUser.id, index, text, true);
      } catch (e) {
        console.error("Pending goal save error:", e);
      }
      setPendingGoal(null);
    }

    if (authReason === "cell" && pendingCell) {
      setActiveCell(pendingCell);
      setPendingCell(null);
    }

    setAuthReason(null);
  }

  async function handleSave(text) {
    if (!user || !activeCell) return;
    const { hour, colKey } = activeCell;
    const key = `${hour}_${colKey}`;
    const newEntries = { ...entries };
    if (text) {
      newEntries[key] = text;
      await saveEntry(user.id, selectedDate, hour, colKey, text);
    } else {
      delete newEntries[key];
      await deleteEntry(user.id, selectedDate, hour, colKey);
    }
    setEntries(newEntries);
    setActiveCell(null);
  }

  async function handleLogout() {
    await signOut();
    setUser(null);
    setUserName("");
    setEntries({});
    setMaqsadlar(EMPTY_GOALS);
    setSaved(EMPTY_SAVED);
  }

  function changeDate(days) {
    const d = strToDate(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(dateToStr(d));
  }

  const isToday = selectedDate === dateToStr(new Date());
  const filledCells = Object.keys(entries).length;
  const totalCells = HOURS.length * COLS.length;
  const pct = Math.round((filledCells / totalCells) * 100);

  if (loading) return <div className="loading-screen">Жүктөлүүдө...</div>;

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>Күндүк журнал</h1>
          <div className="header-right">
            {user ? (
              <div className="user-info">
                <div className="avatar">{userName[0]?.toUpperCase() || "?"}</div>
                <span className="user-name">{userName}</span>
                <button className="btn-sm" onClick={handleLogout}>Чыгуу</button>
              </div>
            ) : (
              <button className="btn-sm" onClick={() => { setAuthReason(null); setShowAuth(true); }}>
                Кирүү
              </button>
            )}
          </div>
        </div>

        {/* Мақсаттар */}
        <div className="goals-section">
          <h3 className="goals-title">🎯 Бүгүнкү мақсаттар</h3>
          <div className="goals-list">
            {maqsadlar.map((item, index) => (
              <div key={index} className="goal-item">
                <span className="goal-number">{index + 1}</span>
                {saved[index] ? (
                  <div className="goal-saved">
                    <span className="goal-check">✓</span>
                    <p className="goal-text">{item || <em className="goal-empty">Мақсат жок</em>}</p>
                    <button className="btn-edit-small" onClick={() => tahrirlash(index)} title="Өзгөртүү">
                      ✏️
                    </button>
                  </div>
                ) : (
                  <input
                    className="goal-input"
                    type="text"
                    placeholder={`${index + 1}-мақсатыңызды жазыңыз…`}
                    value={item}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onBlur={() => handleGoalBlur(index)}
                    autoFocus={index === 0 && !item}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Дата навигация */}
        <div className="date-nav">
          <button className="date-arrow" onClick={() => changeDate(-1)}>‹</button>
          <div className="date-center">
            <span className="date-main">{formatDate(strToDate(selectedDate))}</span>
            {isToday && <span className="today-badge">Бүгүн</span>}
          </div>
          <button className="date-arrow" onClick={() => changeDate(1)}>›</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
            title="Күндү тандаңыз"
          />
        </div>

        {user && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress-label">
              {filledCells} / {totalCells} уяча • {pct}%
            </span>
          </div>
        )}
      </header>

      <main className="main">
        <div className="table-wrap">
          <table className="journal-table">
            <thead>
              <tr>
                <th className="th-hour">Саат</th>
                {COLS.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((h) => (
                <tr key={h}>
                  <td className="td-hour">{String(h).padStart(2, "0")}:00</td>
                  {COL_KEYS.map((ck) => {
                    const val = entries[`${h}_${ck}`];
                    return (
                      <td
                        key={ck}
                        className={`td-cell ${val ? "filled" : ""}`}
                        onClick={() => handleCellClick(h, ck)}
                      >
                        {val ? (
                          <div className="cell-content">
                            <span className="cell-check">✓</span>
                            <span className="cell-text">{val}</span>
                          </div>
                        ) : (
                          <span className="cell-plus">+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {user && (
          <DayAnalysis
            entries={entries}
            hours={HOURS}
            cols={COLS}
            colKeys={COL_KEYS}
            date={selectedDate}
          />
        )}
      </main>

      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => {
            setShowAuth(false);
            setPendingCell(null);
            setPendingGoal(null);
            setAuthReason(null);
          }}
        />
      )}
      {activeCell && (
        <EntryModal
          hour={activeCell.hour}
          colName={COLS[COL_KEYS.indexOf(activeCell.colKey)]}
          initialContent={entries[`${activeCell.hour}_${activeCell.colKey}`] || ""}
          onSave={handleSave}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}