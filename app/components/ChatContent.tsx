'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatInput, { ChatMode, EphemeralUpload, FilePreview } from './ChatInput';
import ChatMessages, { Message, Upload } from './ChatMessages';
import NotificationBanner from './NotificationBanner';
import { useChatContext } from './ChatContext';
import { useUser } from '@clerk/nextjs';
import { Loader } from 'lucide-react';

interface ChatContentProps {
  initialConversationId?: string | null;
}

export default function ChatContent({ initialConversationId }: ChatContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTemporaryChat = searchParams.get('temporary-chat') === 'true';
  const groupStarted = searchParams.get('group-started') === 'true';
  const { selectedModel, fetchConversations } = useChatContext();
  const { user, isSignedIn } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(!!initialConversationId);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId ?? null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const effectiveTemporaryChat = isTemporaryChat || !isSignedIn;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      setIsLoadingConversation(true);
      try {
        const encodedId = encodeURIComponent(conversationId);
        const response = await fetch(`/api/conversations/${encodedId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Fallo al cargar conversación:', response.status, errorBody);
          throw new Error('Error al cargar el chat seleccionado');
        }
        const payload: { messages: Message[] } = await response.json();
        setMessages(payload.messages);
      } catch (error) {
        console.error('Error cargando conversación:', error);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isTemporaryChat) {
      setActiveConversationId(null);
      setMessages([]);
      setIsLoadingConversation(false);
      return;
    }

    if (!isSignedIn) {
      setActiveConversationId(null);
      setMessages([]);
      setIsLoadingConversation(false);
      return;
    }

    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      void loadConversationMessages(initialConversationId);
    } else {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [initialConversationId, loadConversationMessages, isTemporaryChat, isSignedIn]);

  useEffect(() => {
    if (!groupStarted) return;
    if (!activeConversationId) return;

    void loadConversationMessages(activeConversationId);
    router.replace(`/chat/${activeConversationId}`, { scroll: false });
  }, [activeConversationId, groupStarted, loadConversationMessages, router]);

  const handleSendMessage = async (
    content: string,
    conversationId?: string | null,
    mode?: ChatMode,
    uploadIds?: string[],
    filePreviews?: FilePreview[],
    ephemeralUploads?: EphemeralUpload[]
  ) => {
    // Convertir filePreviews a Upload para mostrar en el mensaje
    const uploads: Upload[] = filePreviews?.map(fp => ({
      id: fp.id,
      url: fp.url,
      fileName: fp.fileName,
      resourceType: fp.resourceType,
      folder: '',
      publicId: '',
    })) || [];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      uploads,
      author: user
        ? {
            id: user.id,
            name: user.fullName ?? null,
            image: user.imageUrl ?? null,
          }
        : null,
    };

    const outgoingMessages = [...messages, userMessage];
    setMessages(outgoingMessages);
    setIsLoading(true);

    try {
      const response = await fetch(effectiveTemporaryChat ? '/api/chat/temporary' : '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: effectiveTemporaryChat ? null : (conversationId ?? null),
          newMessage: content,
          messages: outgoingMessages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
          model: selectedModel.value,
          mode: mode || 'normal',
          uploadIds: uploadIds || [],
          ephemeralUploads: effectiveTemporaryChat ? (ephemeralUploads || []) : [],
        }),
      });

      if (!response.ok) {
        let errorText = 'Error en la respuesta';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = (await response.json()) as { error?: string };
            if (data?.error) errorText = data.error;
          } else {
            const txt = await response.text();
            if (txt) errorText = txt;
          }
        } catch {
          // ignore
        }
        throw new Error(errorText);
      }

      const decoder = new TextDecoder();
      const reader = response.body?.getReader();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      }

      if (!effectiveTemporaryChat) {
        const conversationFromHeader = response.headers.get('x-conversation-id');
        if (conversationFromHeader && conversationFromHeader !== activeConversationId) {
          setActiveConversationId(conversationFromHeader);
          router.replace(`/chat/${conversationFromHeader}`, { scroll: false });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const message = error instanceof Error && error.message ? error.message : 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setIsLoading(false);
      if (!effectiveTemporaryChat) {
        void fetchConversations();
      }
    }
  };

  return (
    <>
      {isLoadingConversation ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 animate-spin"/>
            <span className=" text-lg">Cargando conversación...</span>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
          {isTemporaryChat ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#f3f3f3]">
                Chat temporal
              </h1>
              <p className="text-sm sm:text-base text-[#afafaf] leading-relaxed">
                Este chat no aparecerá en el historial, no utilizará ni actualizará la memoria de ChatGPT, ni se usará para formar a nuestros modelos. Por motivos de seguridad, podemos conservar una copia de este chat hasta un máximo de 30 días.
              </p>
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#f3f3f3] text-center">
              ¿Qué toca hoy?
            </h1>
          )}
          <div className="w-full max-w-3xl">
            <ChatInput
              conversationId={activeConversationId}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isTemporaryChat={effectiveTemporaryChat}
              canUploadFiles={!!isSignedIn}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ChatMessages messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-[#2f2f2f] p-4">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                conversationId={activeConversationId}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isTemporaryChat={effectiveTemporaryChat}
                canUploadFiles={!!isSignedIn}
              />
            </div>
          </div>
        </div>
      )}

      {messages.length === 0 && !isLoadingConversation && !effectiveTemporaryChat && <NotificationBanner />}
    </>
  );
}
