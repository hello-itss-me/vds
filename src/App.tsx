import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { TranscriptionQueue } from '@/components/TranscriptionQueue';
import { TranscriptionJob } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);

  const handleUpload = async (file: File) => {
    const newJob: TranscriptionJob = {
      id: crypto.randomUUID(),
      status: 'pending',
      fileName: file.name,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setJobs((prev) => [newJob, ...prev]);
    toast.info('Video upload started');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/.netlify/functions/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader');
      }

      let partialResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        partialResponse += new TextDecoder().decode(value);
        const messages = partialResponse.split('\n\n').filter(Boolean);
        for (const message of messages) {
          try {
            const data = JSON.parse(message.replace('data: ', ''));
            if (data.progress) {
              newJob.progress = data.progress;
              newJob.status = 'processing';
              newJob.updatedAt = new Date();
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === newJob.id ? { ...job, ...newJob } : job
                )
              );
            } else if (data.transcriptions) {
              newJob.status = 'completed';
              newJob.updatedAt = new Date();
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === newJob.id ? { ...job, ...newJob } : job
                )
              );
              toast.success('Transcription completed');
            } else if (data.error) {
              newJob.status = 'failed';
              newJob.error = String(data.error);
              newJob.updatedAt = new Date();
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === newJob.id ? { ...job, ...newJob } : job
                )
              );
              toast.error('Video upload failed');
            }
          } catch (e) {
            console.error('Error parsing message', e);
          }
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      newJob.status = 'failed';
      newJob.error = String(error);
      newJob.updatedAt = new Date();
      setJobs((prev) =>
        prev.map((job) => (job.id === newJob.id ? { ...job, ...newJob } : job))
      );
      toast.error('Video upload failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Video Transcription</h1>
            <p className="text-muted-foreground">
              Upload your video files for automatic transcription
            </p>
          </div>

          <FileUpload onUpload={handleUpload} />

          {jobs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Transcription Queue</h2>
              <TranscriptionQueue jobs={jobs} />
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
