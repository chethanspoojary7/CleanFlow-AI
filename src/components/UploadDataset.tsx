/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadDataset, getInfo } from '../services/api';

export default function UploadDataset() {
  const { setSessionId, setDatasetName, setDatasetInfo, setActiveModule } = useApp();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setUploading(true);
      setError(null);
      setSuccess(false);

      try {
        const data = await uploadDataset(file);
        setSessionId(data.session_id);
        setDatasetName(file.name);
        const info = await getInfo(data.session_id);
        setDatasetInfo(info);
        setSuccess(true);
        setTimeout(() => setActiveModule('preview'), 1500);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [setSessionId, setDatasetName, setDatasetInfo, setActiveModule]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'text/tab-separated-values': ['.tsv'],
    },
    multiple: false,
  });

  return (
    <div className="min-h-full p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <h2 className="mb-2 text-2xl font-bold text-white">Upload dataset</h2>
        <p className="mb-8 text-sm text-white/50">
          Drag and drop your file or click to browse. Supports CSV, Excel, JSON, and TSV.
        </p>

        <div
          {...getRootProps()}
          className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
            isDragActive
              ? 'border-primary bg-primary/10 shadow-glow'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8'
          }`}
        >
          <input {...getInputProps()} />
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-glow"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : (
              <Upload className="h-8 w-8 text-white" />
            )}
          </motion.div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            {isDragActive ? 'Drop your file here' : 'Drag and drop your file'}
          </h3>
          <p className="mb-4 text-sm text-white/40">or click to browse files</p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/30">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>CSV, Excel, JSON, TSV</span>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
            <p className="text-sm text-success">Upload successful. Redirecting to preview...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
