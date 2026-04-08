'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.mustChangePassword) {
          return { success: true, mustChangePassword: true, tempUser: data.user }
        }

        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
        return { success: true, mustChangePassword: false }
      } else {
        throw new Error(data.error || 'Login Gagal')
      }
    } catch (err) {
      console.error('Login Error:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    router.push('/')
  }

  const switchRole = (role) => {
    if (user) {
      const updatedUser = { ...user, role }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  const finalizeLogin = (userObj) => {
    setUser(userObj)
    localStorage.setItem('user', JSON.stringify(userObj))
    router.push('/dashboard')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, finalizeLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
