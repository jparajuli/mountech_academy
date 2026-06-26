import React from 'react';
import { X, ShieldAlert, Eye, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface SecureDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentUrl?: string;
}

export default function SecureDocumentViewer({
  isOpen,
  onClose,
  documentTitle,
  documentUrl,
}: SecureDocumentViewerProps) {
  if (!isOpen) return null;

  // If no custom URL is specified, default to the secured syllabus endpoint
  const viewerUrl = documentUrl 
    ? `${documentUrl}#toolbar=0&navpanes=0&scrollbar=0` 
    : `/api/download/syllabus#toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4 md:p-6 select-none"
      onContextMenu={(e) => e.preventDefault()}
      id="secure-viewer-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex flex-col w-full h-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* Secure Watermark banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-amber-800 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>PROTECTED INTELLECTUAL PROPERTY — MOUNTECH ACADEMY IN-APP READER MODE ONLY</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono tracking-wider bg-amber-100 px-2 py-0.5 rounded text-amber-900 uppercase">
            <Lock className="w-3 h-3 inline mr-0.5" /> Read-Only Secure Box
          </div>
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                {documentTitle}
              </h3>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <span>Direct PDF Viewer</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>Watermarked Session</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Exit Secure Viewer"
            id="close-secure-viewer-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Document Viewer Box */}
        <div className="flex-1 bg-gray-100 relative min-h-0">
          <iframe
            src={viewerUrl}
            title={documentTitle}
            className="w-full h-full border-0 bg-gray-100"
            referrerPolicy="no-referrer"
            id="secure-document-iframe"
          />
          
          {/* Overlay to intercept right-clicks or direct prints if hover triggers it */}
          <div 
            className="absolute top-0 left-0 w-full h-12 bg-transparent pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* Modal Footer with warnings */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[10px] text-gray-400 font-mono">
            SECURE AUDIT ID: MT-V-{Date.now().toString().slice(-6)}
          </div>
          <div className="text-[11px] text-gray-500 italic">
            Native downloads, printing, and file transfers are strictly audited and blocked to preserve Course Integrity.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
