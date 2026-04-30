export interface BlueprintAnalysis {
  id: string;
  userId: string;
  timestamp: Date;
  fileName: string;
  fileUrl?: string; // Optional: if using Firebase Storage later
  report: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  createdAt: Date;
}
