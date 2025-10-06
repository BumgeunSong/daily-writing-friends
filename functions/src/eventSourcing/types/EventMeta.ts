export interface EventMeta {
  lastSeq: number;
  lastClosedLocalDate?: string; // dayKey (YYYY-MM-DD) of the last closed day
}
