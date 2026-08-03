import { useState, useCallback } from 'react';

/**
 * Custom hook for managing file uploads
 * Provides state and handlers for file management
 */
export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const replaceFiles = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
  }, []);

  return {
    files,
    setFiles,
    addFiles,
    removeFile,
    clearFiles,
    replaceFiles
  };
};
