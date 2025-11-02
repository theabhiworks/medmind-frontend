import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import MessageBubble from '../shared/MessageBubble'

// const API_BASE = 'http://localhost:5000'
// const API_BASE = import.meta.env.VITE_BACKEND_URL;
const API_BASE = 'https://medmind-server-production.up.railway.app'



export default function Chat() {
  const name = localStorage.getItem('name') || ''
  const mood = localStorage.getItem('mood') || 'Neutral'
  const storageKey = `medmind_chat_${name || 'anon'}`
  const checkinKey = `medmind_checkin_${name || 'anon'}`
  const goalKey = `medmind_goal_${name || 'anon'}`
  const goalHistoryKey = `medmind_goal_history_${name || 'anon'}`
  const moodKey = `medmind_mood_${name || 'anon'}`

  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every(m => m && typeof m.role === 'string' && typeof m.text === 'string')) {
          return parsed
        }
      }
    } catch {}
    return [{ role: 'bot', text: `Hi ${name}. I'm here with you. How are you feeling right now?` }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)
  const [showPanels, setShowPanels] = useState(false)

  // Daily check-in state
  const [checkins, setCheckins] = useState(() => {
    try {
      const raw = localStorage.getItem(checkinKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })
  const [checkinInput, setCheckinInput] = useState('')

  const todayISO = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const hasTodayCheckin = checkins.some(c => c && c.date === todayISO)

  // Mood history for weekly graph
  const [moodHistory, setMoodHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(moodKey)
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr : []
    } catch { return [] }
  })
  useEffect(() => {
    // refresh mood history if it changes elsewhere
    try {
      const raw = localStorage.getItem(moodKey)
      const arr = raw ? JSON.parse(raw) : []
      setMoodHistory(Array.isArray(arr) ? arr : [])
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodKey])

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {}
  }, [messages, storageKey])

  // persist check-ins on change
  useEffect(() => {
    try {
      localStorage.setItem(checkinKey, JSON.stringify(checkins))
    } catch {}
  }, [checkins, checkinKey])

  // Tiny goal: choose per day/session and persist
  const GOALS = [
    'Drink one glass of water now',
    'Walk for 5 minutes',
    'Send a thank-you message to someone',
    'Stretch your shoulders for 30 seconds',
    'Take 3 slow deep breaths',
    'Write one thing you’re grateful for',
  ]
  const [goal, setGoal] = useState(() => {
    try {
      const raw = localStorage.getItem(goalKey)
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  })
  const [goalHistory, setGoalHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(goalHistoryKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return []
  })

  useEffect(() => {
    // initialize goal if missing or from a previous day
    const needsNew = !goal || goal.date !== todayISO
    if (needsNew) {
      const pick = GOALS[Math.floor(Math.random() * GOALS.length)]
      const newGoal = { date: todayISO, text: pick, done: false }
      setGoal(newGoal)
      try { localStorage.setItem(goalKey, JSON.stringify(newGoal)) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO])

  useEffect(() => {
    try { if (goal) localStorage.setItem(goalKey, JSON.stringify(goal)) } catch {}
  }, [goal, goalKey])

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text) return

    const userMsg = { role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const name = localStorage.getItem('name') || ''
      const mood = localStorage.getItem('mood') || ''
      const res = await axios.post(`${API_BASE}/chat`, { message: text, name, mood })
      const reply = res?.data?.reply || "I'm here for you."
      setMessages((prev) => [...prev, { role: 'bot', text: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: "I couldn't reach the server. Please check your connection." }
      ])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLogout = () => {
    try { localStorage.removeItem(storageKey) } catch {}
    try { localStorage.removeItem(goalKey) } catch {}
    try { localStorage.removeItem(goalHistoryKey) } catch {}
    localStorage.removeItem('name')
    localStorage.removeItem('mood')
    window.location.reload()
  }

  const getSuggestions = (m) => {
    switch (m) {
      case 'Sad':
        return [
          "I'm feeling low",
          "Can you share a grounding exercise?",
          "Help me reframe a negative thought"
        ]
      case 'Angry':
        return [
          "I'm frustrated",
          "How can I calm down?",
          "Help me express this constructively"
        ]
      case 'Stressed':
        return [
          "I'm overwhelmed",
          "Give me a 2‑minute reset",
          "Help me prioritize"
        ]
      case 'Happy':
        return [
          "I'd like a gratitude prompt",
          "Share a mindfulness tip",
          "How can I sustain this mood?"
        ]
      default:
        return [
          "Let's do a quick breathing exercise",
          "Share a coping strategy",
          "Help me organize my thoughts"
        ]
    }
  }

  const suggestions = getSuggestions(mood)

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="chat-title">MedMind</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="toggle-btn" onClick={() => setShowPanels(v => !v)}>
            {showPanels ? 'Hide insights' : 'Show insights'}
          </button>
          <div className="user-pill">{name} • {mood}</div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {showPanels && (
        <MoodWeek moodHistory={moodHistory} />
      )}

      {showPanels && goal && (
        <div className={`goal-card ${goal.done ? 'done' : ''}`}>
          <div className="goal-title">Tiny goal for today</div>
          <div className="goal-row">
            <div className="goal-text">{goal.done ? `✅ ${goal.text}` : goal.text}</div>
            {!goal.done && (
              <button
                className="goal-mark"
                onClick={() => {
                  setGoal((g) => {
                    const updated = { ...(g || { date: todayISO, text: '', done: false }), done: true }
                    // add to history if not already recorded for today
                    setGoalHistory((prev) => {
                      const exists = prev.some(h => h.date === updated.date && h.text === updated.text)
                      const next = exists ? prev : [...prev, { date: updated.date, text: updated.text, done: true }]
                      try { localStorage.setItem(goalHistoryKey, JSON.stringify(next)) } catch {}
                      return next
                    })
                    return updated
                  })
                }}
              >Mark done</button>
            )}
          </div>
          {goalHistory.length > 0 && (
            <div className="goal-history">
              <div className="goal-history-title">Completed goals</div>
              <ul>
                {[...goalHistory]
                  .sort((a,b) => (a.date < b.date ? 1 : -1))
                  .slice(0, 7)
                  .map((g, i) => (
                    <li key={`${g.date}-${i}`}> {formatDay(g.date)} – ✅ {g.text}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showPanels && !hasTodayCheckin && (
        <div className="checkin">
          <div className="checkin-title">Daily mental check‑in</div>
          <div className="checkin-question">What small thing made you smile today?</div>
          <div className="checkin-row">
            <input
              className="checkin-input"
              placeholder="e.g., talked with a friend"
              value={checkinInput}
              onChange={(e) => setCheckinInput(e.target.value)}
            />
            <button
              className="checkin-save"
              onClick={() => {
                const text = checkinInput.trim()
                if (!text) return
                setCheckins((prev) => {
                  const rest = prev.filter(c => c.date !== todayISO)
                  return [...rest, { date: todayISO, text }]
                })
                setCheckinInput('')
              }}
            >Save</button>
          </div>
        </div>
      )}

      {showPanels && checkins.length > 0 && (
        <div className="checkin-history">
          <div className="checkin-history-title">Recent smiles</div>
          <ul>
            {[...checkins]
              .sort((a,b) => (a.date < b.date ? 1 : -1))
              .slice(0, 10)
              .map((c, i) => (
                <li key={`${c.date}-${i}`}>
                  {formatDay(c.date)} – {c.text}
                </li>
              ))}
          </ul>
        </div>
      )}

      {showPanels && (
        <div className="chips">
          {suggestions.map((s, i) => (
            <button key={i} className="chip" onClick={() => sendMessage(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="message-list" ref={listRef}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} />
        ))}
        {loading && <MessageBubble role="bot" text="Typing…" />}
      </div>

      <div className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message..."
          rows={2}
        />
        <button onClick={() => sendMessage()} className="primary-btn" disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

function formatDay(iso) {
  try {
    const d = new Date(iso + 'T00:00:00')
    const day = d.getDate()
    const month = d.toLocaleString(undefined, { month: 'short' })
    return `${day} ${month}`
  } catch {
    return iso
  }
}

function MoodWeek({ moodHistory }) {
  const moods = ['Happy','Neutral','Stressed','Sad','Angry']
  const classFor = (m) => {
    switch (m) {
      case 'Happy': return 'mood-happy'
      case 'Sad': return 'mood-sad'
      case 'Angry': return 'mood-angry'
      case 'Stressed': return 'mood-stressed'
      case 'Neutral':
      default: return 'mood-neutral'
    }
  }
  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0,10)
    const label = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0,3)
    const found = (moodHistory || []).find(x => x && x.date === iso)
    return { iso, label, mood: found ? found.mood : null }
  })
  return (
    <div className="mood-week">
      <div className="mood-week-title">This week</div>
      <div className="mood-week-row">
        {days.map(d => (
          <div key={d.iso} className="mood-day">
            <div className={`mood-dot ${classFor(d.mood)}`} title={d.mood || 'No entry'} />
            <div className="mood-day-label">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
