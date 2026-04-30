'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ── Safari Fix #1: localStorage is unavailable in Private Browsing on iOS.
  // Wrap every access in try/catch to prevent a crash that freezes the page.
  const safeGetStorage = (key) => {
    try { return localStorage.getItem(key) } catch { return null }
  }
  const safeSetStorage = (key, val) => {
    try { localStorage.setItem(key, val) } catch {}
  }
  const safeRemoveStorage = (key) => {
    try { localStorage.removeItem(key) } catch {}
  }

  useEffect(() => {
    const savedUser = safeGetStorage('user')
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch { safeRemoveStorage('user') }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      // ── Safari Fix #2: Add an AbortController timeout.
      // On weak mobile connections, fetch can hang indefinitely on Safari iOS,
      // causing the "Memverifikasi..." spinner to freeze forever.
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      let res, data
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        })
        data = await res.json()
      } finally {
        clearTimeout(timeoutId)
      }

      if (res.ok) {
        if (data.mustChangePassword) {
          return { success: true, mustChangePassword: true, tempUser: data.user }
        }

        setUser(data.user)
        safeSetStorage('user', JSON.stringify(data.user))

        // ── Safari Fix #3: router.push() from next/navigation sometimes fails
        // to trigger a navigation on Safari iOS due to a timing issue with
        // the React rendering cycle. window.location.href is the reliable fallback.
        window.location.href = '/dashboard'
        return { success: true, mustChangePassword: false }
      } else {
        throw new Error(data.error || 'Login Gagal')
      }
    } catch (err) {
      // ── Safari Fix #4: Handle the AbortError specifically so the user gets
      // a clear timeout message instead of a generic "network error".
      if (err.name === 'AbortError') {
        return { success: false, error: 'Koneksi timeout. Periksa jaringan internet Anda dan coba lagi.' }
      }
      console.error('Login Error:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    safeRemoveStorage('user')
    window.location.href = '/'
  }

  const switchRole = (role) => {
    if (user) {
      const updatedUser = { ...user, role }
      setUser(updatedUser)
      safeSetStorage('user', JSON.stringify(updatedUser))
    }
  }

  const updateUser = (updates) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      safeSetStorage('user', JSON.stringify(updatedUser))
    }
  }

  const finalizeLogin = (userObj) => {
    setUser(userObj)
    safeSetStorage('user', JSON.stringify(userObj))
    window.location.href = '/reset-password'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, finalizeLogin, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
