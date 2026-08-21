export interface Task {
  id: number;
  title: string;
  summary: string;
  timeMinutes: number;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string;
  totalMinutes: number;
  entryCount: number;
}
