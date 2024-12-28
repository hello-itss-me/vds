import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Cloud, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);

    try {
      await onUpload(file);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/x-msvideo': ['.avi'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-secondary/50' : 'border-muted-foreground/25',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-secondary">
          {uploading ? (
            <Cloud className="w-10 h-10 text-muted-foreground animate-pulse" />
          ) : (
            <File className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">
            {uploading ? 'Uploading...' : 'Drop your video here'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Support for MP4, WebM, and AVI files
          </p>
        </div>
        {!uploading && (
          <Button variant="secondary" className="mt-2">
            Select File
          </Button>
        )}
        {uploading && (
          <Progress value={progress} className="w-full max-w-xs mt-4" />
        )}
      </div>
    </div>
  );
}
