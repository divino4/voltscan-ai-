import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileType, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface BlueprintDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function BlueprintDropzone({ onFileSelect, isLoading }: BlueprintDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer border-2 border-dashed transition-all p-12 text-center
          ${isDragActive ? 'border-technical-accent bg-technical-accent/5' : 'border-technical-line/20 hover:border-technical-ink'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-technical-line/5 group-hover:bg-technical-accent/10 transition-colors">
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-technical-accent' : 'text-technical-ink/60'}`} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest font-bold">
              {isDragActive ? 'Solte o arquivo aqui' : 'Arraste sua planta elétrica'}
            </p>
            <p className="text-xs text-technical-ink/40 mt-1 uppercase tracking-tight">
              PNG, JPG ou PDF (Máx. 10MB)
            </p>
          </div>
          {!isLoading && (
            <button className="btn-primary mt-4">
              Selecionar Arquivo
            </button>
          )}
        </div>

        {isLoading && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            className="absolute bottom-0 left-0 h-1 bg-technical-accent"
          />
        )}
      </div>

      {fileRejections.length > 0 && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 text-xs font-mono uppercase">
          <AlertCircle size={14} />
          <span>Formato de arquivo não suportado</span>
        </div>
      )}
    </div>
  );
}
