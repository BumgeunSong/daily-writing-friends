import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { firestore } from '@/firebase'
import { ContributionGrid, ActivityType } from '@/stats/model/ContributionGrid'

/**
 * Fetches a single contribution grid document
 */
export async function fetchContributionGrid(
  userId: string,
  activityType: ActivityType
): Promise<ContributionGrid | null> {
  const gridRef = doc(
    firestore,
    'contributionGrids',
    `${userId}_${activityType}`
  )

  const docSnap = await getDoc(gridRef)
  
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      contributions: data.contributions || [],
      maxValue: data.maxValue || 0,
      lastUpdated: data.lastUpdated as Timestamp,
      timeRange: data.timeRange || { startDate: '', endDate: '' },
    }
  }
  
  return null
}

/**
 * Fetches both posting and commenting contribution grids
 */
export async function fetchAllContributionGrids(userId: string): Promise<{
  postingGrid: ContributionGrid | null
  commentingGrid: ContributionGrid | null
}> {
  const [postingGrid, commentingGrid] = await Promise.all([
    fetchContributionGrid(userId, ActivityType.POSTING),
    fetchContributionGrid(userId, ActivityType.COMMENTING)
  ])

  return { postingGrid, commentingGrid }
}