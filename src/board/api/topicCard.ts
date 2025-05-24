import { doc, getDoc, setDoc } from "firebase/firestore"
import { firestore } from "../../firebase"
import { TopicCard } from "../model/TopicCard"

export type TopicCardState = {
  bookmarked?: boolean
  deleted?: boolean
}

/**
 * Firestore에서 TopicCard 상태 문서 참조 반환
 */
export function getTopicStateDocRef(userId: string, topicId: string) {
  return doc(firestore, "users", userId, "topicStates", topicId)
}

/**
 * 여러 TopicCard의 상태를 한 번에 읽어옴 (유저별)
 */
export async function fetchTopicCardStates(userId: string, topicCards: TopicCard[]): Promise<Record<string, TopicCardState>> {
  const states: Record<string, TopicCardState> = {}
  for (const card of topicCards) {
    const ref = getTopicStateDocRef(userId, card.id)
    const snap = await getDoc(ref)
    states[card.id] = snap.exists() ? (snap.data() as TopicCardState) : {}
  }
  return states
}

/**
 * 단일 TopicCard 상태 읽기
 */
export async function fetchTopicCardState(userId: string, topicId: string): Promise<TopicCardState | null> {
  const ref = getTopicStateDocRef(userId, topicId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TopicCardState) : null
}

/**
 * TopicCard 상태 생성/업데이트 (merge)
 */
export async function updateTopicCardState(userId: string, topicId: string, state: Partial<TopicCardState>): Promise<void> {
  const ref = getTopicStateDocRef(userId, topicId)
  await setDoc(ref, state, { merge: true })
} 