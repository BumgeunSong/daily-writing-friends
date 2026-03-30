export type TopicMissionStatus = 'pending' | 'assigned' | 'completed' | 'skipped';

export interface TopicMission {
  id: string;
  boardId: string;
  userId: string;
  topic: string;
  orderIndex: number;
  status: TopicMissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssignedPresenter {
  userId: string;
  userName: string | null;
  topic: string;
}
