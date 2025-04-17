export interface JoinFormDataForNewUser {
  name: string
  phoneNumber: string
  nickname?: string
  referrer: string
}

export interface JoinFormDataForActiveUser {
  keep?: string
  problem?: string
  try?: string
  nps: number
  willContinue: "yes" | "no"
}
