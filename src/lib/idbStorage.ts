/**
 * IndexedDB-backed storage for Zustand persist.
 *
 * localStorage has a ~5 MB quota that base64 images blow through immediately.
 * IndexedDB supports hundreds of MB, making it the right home for project data
 * that includes sketch/reference/design image data URLs.
 *
 * Also performs a one-time migration of any existing data from localStorage so
 * nothing is lost when upgrading.
 */
import { createJSONStorage } from 'zustand/middleware'

const DB_NAME = 'fable_db'
const STORE_NAME = 'keyval'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDB()
  return dbPromise
}

const idbAdapter = {
  async getItem(name: string): Promise<string | null> {
    const db = await getDB()
    const stored = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(name)
      req.onsuccess = () => resolve((req.result as string) ?? null)
      req.onerror = () => reject(req.error)
    })
    if (stored !== null) return stored

    // One-time migration: lift existing data out of localStorage into IDB
    const legacy = localStorage.getItem(name)
    if (legacy !== null) {
      await idbAdapter.setItem(name, legacy)
      localStorage.removeItem(name)
      return legacy
    }
    return null
  },

  async setItem(name: string, value: string): Promise<void> {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, name)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  async removeItem(name: string): Promise<void> {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(name)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },
}

export const idbStorage = createJSONStorage(() => idbAdapter)
