import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function SignIn() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const { error } = await signIn({ email, password })
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-md shadow">
      <h2 className="text-2xl font-semibold mb-4">Iniciar sesión</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full p-2 border rounded" placeholder="Correo" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div className="text-red-600">{error}</div>}
        <button className="w-full bg-sky-600 text-white py-2 rounded">Entrar</button>
      </form>
    </div>
  )
}
