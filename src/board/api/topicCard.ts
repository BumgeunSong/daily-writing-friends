import { doc, getDoc } from "firebase/firestore"
import { firestore } from "../../firebase"

export type TopicCard = {
  id: string
  title: string
  description: string
  createdAt: any // Timestamp (firebase)
  createdBy: string
}

export type TopicCardState = {
  bookmarked?: boolean
  deleted?: boolean
}

export const getTopicStateDocRef = (userId: string, topicId: string) =>
  doc(firestore, "users", userId, "topicStates", topicId)

export async function fetchTopicCardStates(userId: string, topicCards: TopicCard[]): Promise<Record<string, TopicCardState>> {
  const states: Record<string, TopicCardState> = {}
  for (const card of topicCards) {
    const ref = getTopicStateDocRef(userId, card.id)
    const snap = await getDoc(ref)
    states[card.id] = snap.exists() ? (snap.data() as TopicCardState) : {}
  }
  return states
} 