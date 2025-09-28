'use client';

export function StreamingStatus({ isStreaming = false, isDone = false, inline = true }) {
  if (!isStreaming && !isDone) return null;

  return (
    <div className={inline ? 'mt-2 flex items-center text-xs text-muted-foreground' : 'mt-2 flex items-center text-xs text-muted-foreground'}>
      {isStreaming ? (
        <>
          <div className="animate-pulse h-2 w-2 mr-2 bg-primary rounded-full"></div>
          <span>Streaming...</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 mr-2 bg-blue-500 rounded-full"></div>
          <span>Done</span>
        </>
      )}
    </div>
  );
} 