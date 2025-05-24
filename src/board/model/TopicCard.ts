import { Timestamp } from "firebase/firestore"

export type TopicCard = {
  id: string
  title: string
  description: string
  createdAt: Timestamp
  createdBy: string
} 