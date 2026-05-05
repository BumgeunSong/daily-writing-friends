export interface DonatorStatusRow {
  user_id: string;
  latest_donated_at: string;
  active_until: string;
  donation_count: number;
}

export interface DonatorStatus {
  userId: string;
  latestDonatedAt: Date;
  activeUntil: Date;
  donationCount: number;
}

export function mapDonatorStatusRow(row: DonatorStatusRow): DonatorStatus {
  return {
    userId: row.user_id,
    latestDonatedAt: new Date(row.latest_donated_at),
    activeUntil: new Date(row.active_until),
    donationCount: row.donation_count,
  };
}

export function isDonatorActive(activeUntil: Date | undefined, now: Date): boolean {
  if (!activeUntil) return false;
  return activeUntil.getTime() > now.getTime();
}
