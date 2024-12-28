import { TranscriptionJob } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TranscriptionQueueProps {
  jobs: TranscriptionJob[];
}

export function TranscriptionQueue({ jobs }: TranscriptionQueueProps) {
  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Card key={job.id} className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-secondary">
              {job.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {job.status === 'failed' && (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {job.status === 'pending' && (
                <Clock className="w-5 h-5 text-muted-foreground" />
              )}
              {job.status === 'processing' && (
                <FileText className="w-5 h-5 text-primary animate-pulse" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{job.fileName}</h4>
                <span className="text-sm text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
              {job.status === 'processing' && (
                <Progress value={job.progress} className="mt-2" />
              )}
              {job.error && (
                <p className="text-sm text-destructive mt-2">{job.error}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
