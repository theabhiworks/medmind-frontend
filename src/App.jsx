import React, { useEffect, useState } from 'react'
import Login from './pages/Login'
import Chat from './pages/Chat'

export default function App() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const name = localStorage.getItem('name')
    const mood = localStorage.getItem('mood')
    setAuthed(Boolean(name && mood))
  }, [])

  const handleLogin = () => setAuthed(true)

  return authed ? <Chat /> : <Login onLogin={handleLogin} />
}
