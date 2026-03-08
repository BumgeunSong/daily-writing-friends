import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Holiday, HolidayYear } from '@/types/firestore'

/**
 * Fetch all holiday year documents
 */
export const fetchHolidayYears = async (): Promise<HolidayYear[]> => {
  const holidaysRef = collection(db, 'holidays')
  const q = query(holidaysRef, orderBy('__name__', 'desc')) // Order by document ID (year) descending
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    year: doc.id,
    items: doc.data().items || []
  })) as HolidayYear[]
}

/**
 * Fetch a specific year's holidays
 */
export const fetchHolidayYear = async (year: string): Promise<HolidayYear | null> => {
  const holidayRef = doc(db, 'holidays', year)
  const snapshot = await getDoc(holidayRef)

  if (!snapshot.exists()) {
    return null
  }

  return {
    year: snapshot.id,
    items: snapshot.data().items || []
  } as HolidayYear
}

/**
 * Create or update a holiday year document
 */
export const saveHolidayYear = async (year: string, items: Holiday[]): Promise<void> => {
  const holidayRef = doc(db, 'holidays', year)
  await setDoc(holidayRef, { items })
}

/**
 * Delete a holiday year document
 */
export const deleteHolidayYear = async (year: string): Promise<void> => {
  const holidayRef = doc(db, 'holidays', year)
  await deleteDoc(holidayRef)
}
