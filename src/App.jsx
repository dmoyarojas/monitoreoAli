import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import './App.css'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/signin" replace />
  return children
}

export default function App() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <nav className="flex gap-4 items-center">
          <Link to="/dashboard" className="font-semibold">Dashboard</Link>
          <Link to="/projects">Proyectos</Link>
        </nav>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700">{user.email}</div>
              <button onClick={signOut} className="px-3 py-1 border rounded">Salir</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/signin" className="px-3 py-1 border rounded">Entrar</Link>
              <Link to="/signup" className="px-3 py-1 bg-green-600 text-white rounded">Crear cuenta</Link>
            </div>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/projects" element={<Protected><Projects /></Protected>} />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />} />
        </Routes>
      </main>
    </div>
  )
}
