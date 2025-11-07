'use client';

export function ChatMessage({ message, isUser }) {
  return (
    <div className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
      <div
        className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content || (
            <div className="flex items-center gap-2">
              <div className="animate-pulse">Thinking...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
