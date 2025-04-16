export interface JoinFormDataForNewUser {
  name: string
  phoneNumber: string
  nickname?: string
  referrer: string
}

export interface JoinFormDataForActiveUser {
  name?: string
  phoneNumber?: string
  nickname?: string
  referrer?: string
  positiveExperience?: string
  negativeExperience?: string
  suggestions?: string
  recommendationScore: number
  willContinue: "yes" | "no"
} 