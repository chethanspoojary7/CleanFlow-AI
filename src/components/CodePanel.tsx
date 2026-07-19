import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Download, FileCode } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CodePanel() {
  const { codePanelOpen, setCodePanelOpen, generatedCode } = useApp();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const handleDownload = (ext: string) => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanflow_script.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {codePanelOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed right-4 top-20 bottom-4 w-[480px] max-w-[calc(100vw-2rem)] glass-panel flex flex-col z-40"
          >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">Generated Pandas Code</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="p-1.5 rounded-lg glass-button" title="Copy">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDownload('py')} className="p-1.5 rounded-lg glass-button" title="Download .py">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCodePanelOpen(false)} className="p-1.5 rounded-lg glass-button">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap leading-relaxed">
              {generatedCode || '# Perform operations to generate Pandas code'}
            </pre>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
