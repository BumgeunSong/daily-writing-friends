import { Timestamp } from "firebase/firestore"

export type TopicCardState = {
    bookmarked?: boolean
    deleted?: boolean
    updatedAt?: Timestamp
  }