import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore"
import { firestore } from "../../firebase"
import { TopicCard } from "../model/TopicCard"
import { TopicCardState } from "../model/TopicCardState"

/**
 * Firestore에서 TopicCard 상태 문서 참조 반환
 */
export function getTopicStateDocRef(userId: string, topicId: string) {
  return doc(firestore, "users", userId, "topicStates", topicId)
}

/**
 * 여러 TopicCard의 상태를 한 번에 읽어옴 (유저별)
 */
export async function fetchTopicCardStates(userId: string, topicIds: string[]): Promise<Record<string, TopicCardState>> {
  const states: Record<string, TopicCardState> = {}
  const colRef = collection(firestore, "users", userId, "topicStates")
  const snap = await getDocs(colRef)
  snap.forEach(doc => {
    const data = doc.data() as TopicCardState
    if (topicIds.includes(doc.id)) {
      states[doc.id] = data
    }
  })
  return states
}

/**
 * 단일 TopicCard 상태 읽기
 */
export async function fetchTopicCardState(userId: string, topicId: string): Promise<TopicCardState | null> {
  const ref = doc(firestore, "users", userId, "topicStates", topicId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TopicCardState) : null
}

/**
 * TopicCard 상태 생성/업데이트 (merge)
 */
export async function updateTopicCardState(userId: string, topicId: string, state: Partial<TopicCardState>): Promise<void> {
  const ref = doc(firestore, "users", userId, "topicStates", topicId)
  await setDoc(ref, { ...state, updatedAt: serverTimestamp(), topicId }, { merge: true })
}

/**
 * 모든 TopicCard 문서를 Firestore에서 가져옴
 */
export async function fetchAllTopicCards(): Promise<TopicCard[]> {
  const colRef = collection(firestore, "topicCards")
  const snap = await getDocs(colRef)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicCard))
} 