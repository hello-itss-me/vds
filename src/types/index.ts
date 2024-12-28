export interface TranscriptionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string;
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoChunk {
  id: string;
  jobId: string;
  startTime: number;
  endTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
