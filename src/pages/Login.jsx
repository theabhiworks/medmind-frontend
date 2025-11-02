import React, { useState } from 'react'

const moods = ['Happy', 'Sad', 'Angry', 'Stressed', 'Neutral']

export default function Login({ onLogin }) {
  const [name, setName] = useState(localStorage.getItem('name') || '')
  const [mood, setMood] = useState(localStorage.getItem('mood') || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !mood) return
    localStorage.setItem('name', name)
    localStorage.setItem('mood', mood)

    // Store today's mood into per-user mood history
    const moodKey = `medmind_mood_${name || 'anon'}`
    const todayISO = new Date().toISOString().slice(0, 10)
    try {
      const raw = localStorage.getItem(moodKey)
      const arr = raw ? JSON.parse(raw) : []
      const withoutToday = Array.isArray(arr) ? arr.filter(x => x && x.date !== todayISO) : []
      const next = [...withoutToday, { date: todayISO, mood }]
      localStorage.setItem(moodKey, JSON.stringify(next))
    } catch {}

    if (onLogin) onLogin()
  }

  return (
    <div className="center-container">
      <div className="card">
        <h1 className="title">MedMind</h1>
        <p className="subtitle">Your supportive mental health companion</p>
        <form onSubmit={handleSubmit} className="form">
          <label className="label">Your Name</label>
          <input
            className="input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="label">Your Mood</label>
          <div className="mood-grid">
            {moods.map((m) => (
              <button
                type="button"
                key={m}
                className={`mood-btn ${mood === m ? 'active' : ''}`}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <button type="submit" className="primary-btn" disabled={!name || !mood}>
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
