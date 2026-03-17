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
    "Жекшемби",
    "Дүйшөмбү",
    "Шейшемби",
    "Шаршемби",
    "Бейшемби",
    "Жума",
    "Ишемби",
  ];
  const months = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${
    months[d.getMonth()]
  } ${d.getFullYear()}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function strToDate(s) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd);
}





export default function App() {
  const [maqsadlar, setMaqsadlar] = useState(() => {
    const saved = localStorage.getItem("maqsadlar");
    return saved ? JSON.parse(saved) : ["", "", ""];
  });

  const [saved, setSaved] = useState(() => {
    const s = localStorage.getItem("maqsadlar_saved");
    return s ? JSON.parse(s) : [false, false, false];
  });
  
  useEffect(() => {
    localStorage.setItem("maqsadlar_saved", JSON.stringify(saved));
  }, [saved]);

  function tahrirlash(index) {
    const yangiSaved = [...saved];
    yangiSaved[index] = false;
    setSaved(yangiSaved);
  }
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [entries, setEntries] = useState({});
  const [showAuth, setShowAuth] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [pendingCell, setPendingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dateToStr(new Date()));
 

  function handleChange(index, value) {
    const yangi = [...maqsadlar];
    yangi[index] = value;
    setMaqsadlar(yangi);
  }

  function handleKeyDown(e, index) {
    if (e.key === "Enter") {
      const yangiSaved = [...saved];
      yangiSaved[index] = true;
      setSaved(yangiSaved);
    }
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "";
        setUserName(name);
      }
    });
    getCurrentUser().then((u) => {
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "";
        setUserName(name);
      }
      setLoading(false);
    });
  }, []);

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

  function handleCellClick(hour, colKey) {
    if (!user) {
      setPendingCell({ hour, colKey });
      setShowAuth(true);
    } else setActiveCell({ hour, colKey });
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
    if (pendingCell) {
      setActiveCell(pendingCell);
      setPendingCell(null);
    }
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
                <div className="avatar">
                  {userName[0]?.toUpperCase() || "?"}
                </div>
                <span className="user-name">{userName}</span>
                <button className="btn-sm" onClick={handleLogout}>
                  Чыгуу
                </button>
              </div>
            ) : (
              <button className="btn-sm" onClick={() => setShowAuth(true)}>
                Кирүү
              </button>
            )}
          </div>
          <div></div>
        </div>
        <div>
        {maqsadlar.map((item, index) => (
  <div key={index} className="item">
    {saved[index] ? (
      <div className="maqsad-saved">
        <p className="text">{item}</p>
        <button className="btn-edit-small" onClick={() => tahrirlash(index)}>✏️</button>
      </div>
    ) : (
      <input
        type="text"
        placeholder={`${index + 1}-мақсат`}
        value={item}
        onChange={(e) => handleChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        autoFocus
      />
    )}
  </div>
))}
        </div>

        {/* Sana navigatsiya */}
        <div className="date-nav">
          <button className="date-arrow" onClick={() => changeDate(-1)}>
            ‹
          </button>
          <div className="date-center">
            <span className="date-main">
              {formatDate(strToDate(selectedDate))}
            </span>
            {isToday && <span className="today-badge">Бүгүн</span>}
          </div>
          <button className="date-arrow" onClick={() => changeDate(1)}>
            ›
          </button>
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
          }}
        />
      )}
      {activeCell && (
        <EntryModal
          hour={activeCell.hour}
          colName={COLS[COL_KEYS.indexOf(activeCell.colKey)]}
          initialContent={
            entries[`${activeCell.hour}_${activeCell.colKey}`] || ""
          }
          onSave={handleSave}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  );
}
