'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Mic, AudioLines, ArrowUp, Image as ImageIcon, Lightbulb, Search, Paperclip, X, FileText, Film, Check, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export type ChatMode = 'normal' | 'image' | 'think' | 'research';

export interface FilePreview {
  id: string;
  url: string;
  fileName: string;
  resourceType: 'image' | 'video' | 'raw';
}

export interface EphemeralUpload {
  fileName: string;
  resourceType: 'image' | 'video' | 'raw';
  mimeType: string;
  base64: string;
}

export interface ChatInputProps {
  conversationId?: string | null;
  onSendMessage?: (message: string, conversationId?: string | null, mode?: ChatMode, uploadIds?: string[], filePreviews?: FilePreview[], ephemeralUploads?: EphemeralUpload[]) => void;
  isLoading?: boolean;
  isTemporaryChat?: boolean;
  canUploadFiles?: boolean;
}

const menuOptions = [
  { id: 'files', label: 'Añadir fotos y archivos', icon: Paperclip, mode: null },
  { id: 'image', label: 'Crea una imagen', icon: ImageIcon, mode: 'image' as ChatMode },
  { id: 'think', label: 'Pensar', icon: Lightbulb, mode: 'think' as ChatMode },
  { id: 'research', label: 'Investigación avanzada', icon: Search, mode: 'research' as ChatMode },
];

// Define proper types for SpeechRecognition to avoid 'any'
interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface IWindow extends Window {
  SpeechRecognition: new () => ISpeechRecognition;
  webkitSpeechRecognition: new () => ISpeechRecognition;
}

// Fixed visualization data to avoid hydration mismatches
const WAVEFORM_BARS = [
  { height: '40%', duration: '0.5s', delay: '0s' },
  { height: '80%', duration: '0.7s', delay: '0.1s' },
  { height: '50%', duration: '0.4s', delay: '0.2s' },
  { height: '90%', duration: '0.6s', delay: '0.1s' },
  { height: '60%', duration: '0.5s', delay: '0.3s' },
  { height: '100%', duration: '0.8s', delay: '0s' },
  { height: '70%', duration: '0.6s', delay: '0.2s' },
  { height: '45%', duration: '0.5s', delay: '0.1s' },
];

export default function ChatInput({ conversationId, onSendMessage, isLoading, isTemporaryChat, canUploadFiles }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('normal');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const transcriptRef = useRef('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const uploadEnabled = canUploadFiles !== false;

  const visibleMenuOptions = uploadEnabled
    ? menuOptions
    : menuOptions.filter((opt) => opt.id !== 'files');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!uploadEnabled) return;
      if (!acceptedFiles || acceptedFiles.length === 0) return;
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
    },
    [uploadEnabled]
  );

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled: !uploadEnabled,
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
      
      if (SpeechRecognitionConstructor) {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        
        recognition.onresult = (event: ISpeechRecognitionEvent) => {
           setErrorMessage(''); // Clear errors on success
           // Create a safe array from the results
           const resultsLength = event.results.length;
           let currentTranscript = '';
           
           for (let i = 0; i < resultsLength; i++) {
             const result = event.results[i];
             if (result && result[0]) {
               currentTranscript += result[0].transcript;
             }
           }
           
           transcriptRef.current = currentTranscript;
        };
        
        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
          if (event.error === 'no-speech') {
            setIsListening(false);
            return;
          }

          console.warn('Speech recognition error', event.error);
          
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
             alert('🚫 Acceso al micrófono denegado.\n\nPor favor, permite el acceso al micrófono en la configuración de tu navegador para usar el dictado por voz.');
             setErrorMessage(''); // Ensure no inline error is shown
          } else if (event.error === 'network') {
             setErrorMessage('Error de conexión');
             // Clear error message after 3 seconds for network errors
             setTimeout(() => setErrorMessage(''), 3000);
          } else {
             setErrorMessage('Error en reconocimiento de voz');
             // Clear error message after 3 seconds for other errors
             setTimeout(() => setErrorMessage(''), 3000);
          }

          setIsListening(false);
          setIsTranscribing(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            // Don't reset transcribing here as we might be processing
        };
        
        recognitionRef.current = recognition;
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
        alert('Reconocimiento de voz no soportado en este navegador');
        return;
    }
    transcriptRef.current = '';
    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleStopRecording = async () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
        setIsTranscribing(true);
        
        // Simular procesamiento para la UI
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (transcriptRef.current) {
            setMessage(prev => (prev ? prev + ' ' + transcriptRef.current : transcriptRef.current));
        }
        setIsTranscribing(false);
    }
  };

  const handleCancelRecording = () => {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      setIsListening(false);
      setIsTranscribing(false);
      transcriptRef.current = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || selectedFiles.length > 0) && !isLoading && !isUploading) {
      let uploadIds: string[] = [];
      let filePreviews: FilePreview[] = [];
      let ephemeralUploads: EphemeralUpload[] = [];

      // Si hay archivos, subirlos a Cloudinary (excepto en chat temporal)
      if (selectedFiles.length > 0) {
        if (isTemporaryChat) {
          const now = Date.now();

          filePreviews = selectedFiles.map((file) => {
            const mimeType = file.type || '';
            const resourceType: 'image' | 'video' | 'raw' = mimeType.startsWith('image/')
              ? 'image'
              : mimeType.startsWith('video/')
                ? 'video'
                : 'raw';

            return {
              id: `temp-${now}-${file.name}`,
              url: URL.createObjectURL(file),
              fileName: file.name,
              resourceType,
            };
          });

          ephemeralUploads = await Promise.all(
            selectedFiles.map(async (file) => {
              const mimeType = file.type || '';
              const resourceType: 'image' | 'video' | 'raw' = mimeType.startsWith('image/')
                ? 'image'
                : mimeType.startsWith('video/')
                  ? 'video'
                  : 'raw';

              const arrayBuffer = await file.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              const chunkSize = 0x8000;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
              }

              return {
                fileName: file.name,
                resourceType,
                mimeType,
                base64: btoa(binary),
              };
            })
          );
        } else {
          setIsUploading(true);
          try {
            const formData = new FormData();
            selectedFiles.forEach((file) => {
              formData.append('files', file);
            });

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const error = await response.json();
              alert(error.error || 'Error al subir archivos');
              setIsUploading(false);
              return;
            }

            const data = await response.json();
            uploadIds = data.uploadIds;
            
            // Crear previews con la info del upload
            if (data.uploads && Array.isArray(data.uploads)) {
              filePreviews = data.uploads.map((upload: { id: string; url: string; fileName: string; resourceType: string }) => ({
                id: upload.id,
                url: upload.url,
                fileName: upload.fileName,
                resourceType: upload.resourceType as 'image' | 'video' | 'raw',
              }));
            }
          } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error al subir archivos');
            setIsUploading(false);
            return;
          }
          setIsUploading(false);
        }
      }

      onSendMessage?.(message.trim() || 'Archivo adjunto', conversationId, selectedMode, uploadIds, filePreviews, ephemeralUploads);
      setMessage('');
      setSelectedMode('normal');
      setSelectedFiles([]);
    }
  };

  const handleOptionClick = (option: typeof menuOptions[0]) => {
    if (option.id === 'files') {
      if (!uploadEnabled) {
        setMenuOpen(false);
        return;
      }
      openFileDialog();
    } else if (option.mode) {
      setSelectedMode(option.mode);
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(el.scrollHeight, 200);
    el.style.height = `${next}px`;
  }, [message]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon size={24} className="text-blue-400" />;
    if (file.type.startsWith('video/')) return <Film size={24} className="text-purple-400" />;
    if (file.type.includes('pdf')) return <FileText size={24} className="text-red-500" />

    return <FileText size={24} className="text-blue-500" />;
  };

  const getModeLabel = () => {
    switch (selectedMode) {
      case 'image': return '🎨 Crear imagen';
      case 'think': return '💡 Modo pensar';
      case 'research': return '🔍 Investigación';
      default: return null;
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto flex flex-col gap-2">
      {/* Selected mode indicator */}
      {selectedMode !== 'normal' && (
        <div className="flex items-center gap-2 px-4">
          <span className="text-xs bg-[#424242] text-[#f3f3f3] px-2 py-1 rounded-full flex items-center gap-1">
            {getModeLabel()}
            <button type="button" onClick={() => setSelectedMode('normal')} className="ml-1 hover:text-white">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      <div
        {...getRootProps({
          className: `bg-[#2f2f2f] rounded-2xl shadow-lg relative ${
            isDragActive ? 'ring-2 ring-white/20' : ''
          }`,
        })}
      >
        <input {...getInputProps()} />
        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <div className="flex flex-wrap gap-3">
              {selectedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const previewUrl = isImage ? URL.createObjectURL(file) : null;

                return (
                  <div key={index} className="relative">
                    <div className="w-24 h-24 bg-[#424242] rounded-lg overflow-hidden flex items-center justify-center">
                      {isImage && previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt={file.name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-center p-2">
                          {getFileIcon(file)}
                          <span className="text-xs text-[#f3f3f3] mt-2 break-all line-clamp-2">{file.name}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)} 
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80 transition-colors"
                    >
                      <X size={13} className="text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center px-2 sm:px-4 py-2 sm:py-3">

        {/* Plus button with menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 sm:p-2 hover:bg-[#424242] rounded-full transition-colors mr-1 sm:mr-2"
          >
            <Plus size={18} className="text-[#afafaf] sm:w-5 sm:h-5" />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl bg-[#2a2a2a] py-2 shadow-xl border border-white/10 z-50">
              {visibleMenuOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#3a3a3a] flex items-center gap-3 transition-colors"
                >
                  <option.icon size={18} className="text-[#afafaf]" />
                  <span className="text-sm text-[#f3f3f3]">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {(isListening || isTranscribing) ? (
          <div className="flex-1 flex items-center gap-4 mx-2">
            <div className="flex-1 border-b border-dotted border-white/20 h-px"></div>
            
            {/* Visualizador de onda de audio */}
            <div className="flex items-center gap-0.5 h-6 shrink-0">
               {WAVEFORM_BARS.map((bar, i) => (
                 <div
                   key={i}
                   className="w-1 bg-white rounded-full animate-pulse"
                   style={{
                     height: bar.height,
                     animationDuration: bar.duration,
                     animationDelay: bar.delay
                   }}
                 />
               ))}
            </div>

            <div className="flex-1 border-b border-dotted border-white/20 h-px"></div>
            
            <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleCancelRecording}
                  className="p-2 bg-[#424242] hover:bg-[#525252] rounded-full transition-colors"
                >
                  <X size={18} className="text-[#afafaf]" />
                </button>
                {isTranscribing ? (
                    <div className="p-2 bg-[#424242] rounded-full">
                       <Loader2 size={18} className="text-white animate-spin" />
                    </div>
                ) : (
                    <button 
                      type="button"
                      onClick={handleStopRecording}
                      className="p-2 bg-[#424242] hover:bg-[#525252] rounded-full transition-colors"
                    >
                      <Check size={18} className="text-white" />
                    </button>
                )}
            </div>
          </div>
        ) : (
          <>
          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder={errorMessage || 'Pregunta lo que quieras'}
            className={`flex-1 bg-transparent outline-none text-sm sm:text-base resize-none overflow-y-auto max-h-[200px] leading-6 ${
              errorMessage ? 'placeholder-red-400' : 'text-[#f3f3f3] placeholder-[#afafaf]'
            }`}
          />

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={handleStartRecording}
              className="p-1.5 sm:p-2 hover:bg-[#424242] rounded-full transition-colors"
            >
              <Mic size={18} className="text-[#afafaf] sm:w-5 sm:h-5" />
            </button>
            <button
              type="submit"
              disabled={(!message.trim() && selectedFiles.length === 0) || isLoading || isUploading}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${(message.trim() || selectedFiles.length > 0) && !isLoading && !isUploading
                ? 'bg-white hover:bg-gray-100'
                : 'bg-[#565656] cursor-not-allowed'
                }`}
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-[#2f2f2f] border-t-transparent rounded-full animate-spin" />
              ) : (message.trim() || selectedFiles.length > 0) ? (
                <ArrowUp size={18} className='text-[#2f2f2f]' />
              ) : (
                <AudioLines size={18} className='text-[#2f2f2f]' />
              )}
            </button>
          </div>
          </>
        )}
        </div>
      </div>
    </form>
  );
}
