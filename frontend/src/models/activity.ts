export type ActivityHistoryItem = {
  date: string;
  /** Server-normalized calendar day in the user's timezone (preferred for streak keys). */
  dateKey?: string;
  stepCount: number;
};
