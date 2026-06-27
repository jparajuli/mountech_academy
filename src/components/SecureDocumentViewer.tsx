import React from 'react';
import { X, ShieldAlert, Eye, Lock, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageInputValue, setPageInputValue] = React.useState("1");
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastScrollTime = React.useRef(0);

  // Reset to first page when opened
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setPageInputValue("1");
    }
  }, [isOpen]);

  // Synchronize internal page with input display value
  React.useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const commitPageChange = () => {
    const parsed = parseInt(pageInputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCurrentPage(parsed);
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  const handlePageInputBlur = () => {
    commitPageChange();
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitPageChange();
      e.currentTarget.blur();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 800) return; // 800ms throttle

    if (e.deltaY > 20) {
      goToNextPage();
      lastScrollTime.current = now;
    } else if (e.deltaY < -20) {
      goToPrevPage();
      lastScrollTime.current = now;
    }
  };

  const handleClose = async () => {
    if (document.fullscreenElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error("Error exiting fullscreen on close:", err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  // Make sure we strip any existing hash before appending ours
  const baseUrl = documentUrl || "/api/download/syllabus";
  const cleanBaseUrl = baseUrl.split('#')[0];
  const viewerUrl = `${cleanBaseUrl}#page=${currentPage}&zoom=page-fit&view=Fit&toolbar=0&navpanes=0&scrollbar=0`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4 md:p-6 select-none"
      onContextMenu={(e) => e.preventDefault()}
      id="secure-viewer-modal"
    >
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative flex flex-col bg-white overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? "w-screen h-screen max-w-none rounded-none border-none" 
            : "w-full h-full max-w-6xl rounded-2xl border border-gray-200 shadow-2xl"
        }`}
      >
        {/* Secure Watermark banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-amber-800 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>PROTECTED INTELLECTUAL PROPERTY — MOUNTECH ACADEMY IN-APP READER MODE ONLY</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono tracking-wider bg-amber-100 px-2 py-0.5 rounded text-amber-900 uppercase">
            <Lock className="w-3 h-3 inline mr-0.5" /> Read-Only Secure Box
          </div>
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                {documentTitle}
              </h3>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <span>Secure Presentation Viewer</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>Watermarked Session</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Exit Secure Viewer"
            id="close-secure-viewer-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PDF Document Viewer Box */}
        <div className="flex-1 bg-gray-100 relative min-h-0 overflow-hidden" onWheel={handleWheel}>
          <iframe
            src={viewerUrl}
            title={documentTitle}
            className="w-full h-full border-0 bg-gray-100"
            referrerPolicy="no-referrer"
            id="secure-document-iframe"
          />
          
          {/* Slide Navigation Left Click Zone */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              goToPrevPage();
            }}
            className="group absolute left-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer flex items-center justify-start pl-6 select-none"
            title="Previous Page (Click Left Side)"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-950/40 hover:bg-gray-950/60 text-white p-3 rounded-full backdrop-blur-xs transform -translate-x-2 group-hover:translate-x-0 shadow-lg">
              <ChevronLeft className="w-6 h-6" />
            </div>
          </div>

          {/* Slide Navigation Right Click Zone */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              goToNextPage();
            }}
            className="group absolute right-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer flex items-center justify-end pr-6 select-none"
            title="Next Page (Click Right Side)"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-950/40 hover:bg-gray-950/60 text-white p-3 rounded-full backdrop-blur-xs transform translate-x-2 group-hover:-translate-x-0 shadow-lg">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>

          {/* Floating Navigation Toolbar */}
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white/95 border border-gray-200 px-4 py-2.5 rounded-full shadow-xl select-none backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevPage();
              }}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Input Field */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Page</span>
              <input
                type="number"
                min={1}
                value={pageInputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                className="w-12 text-center text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 py-0.5 px-1"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextPage();
              }}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-200" />

            {/* Fullscreen Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer with warnings */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0">
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
