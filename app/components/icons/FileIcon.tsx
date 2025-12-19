import { File, FileText, FileImage, FileVideo, FileArchive, FileQuestion } from 'lucide-react';

interface FileIconProps {
  fileName: string;
  className?: string;
}

export function FileIcon({ fileName, className }: FileIconProps) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const iconProps = { className: className || 'w-6 h-6' };

  switch (extension) {
    case 'pdf':
      return <FileText {...iconProps} color="#e53e3e" />;
    case 'doc':
    case 'docx':
      return <FileText {...iconProps} color="#4285f4" />;
    case 'ppt':
    case 'pptx':
      return <FileText {...iconProps} color="#d24726" />;
    case 'xls':
    case 'xlsx':
      return <FileText {...iconProps} color="#34a853" />;
    case 'txt':
    case 'md':
    case 'csv':
      return <File {...iconProps} color="#a0a0a0" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <FileImage {...iconProps} color="#fbbc05" />;
    case 'mp4':
    case 'webm':
    case 'mov':
      return <FileVideo {...iconProps} color="#ea4335" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive {...iconProps} color="#fbbc05" />;
    default:
      return <FileQuestion {...iconProps} color="#a0a0a0" />;
  }
}
