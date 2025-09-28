/**
 * Independent Thinking Timer Component
 * Completely separate from thinking content, manages its own timer state
 */
'use client';

import { useState, useEffect, useRef } from 'react';

export function ThinkingTimer({ 
  independentTimer, 
  isStreaming, 
  fallbackTime = 0 
}) {
  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  // Initialize display time
  useEffect(() => {
    if (independentTimer) {
      if (independentTimer.isComplete) {
        // Use completed timer duration
        setDisplayTime(independentTimer.duration || 0);
      } else if (isStreaming) {
        // Calculate current elapsed time for active timer
        const elapsed = Math.ceil((Date.now() - independentTimer.startTime) / 1000);
        setDisplayTime(elapsed);
      } else {
        // Use current calculated time
        const elapsed = Math.ceil((Date.now() - independentTimer.startTime) / 1000);
        setDisplayTime(elapsed);
      }
    } else {
      // Fallback to provided time or 0
      setDisplayTime(fallbackTime);
    }
  }, [independentTimer, isStreaming, fallbackTime]);

  // Real-time timer updates for active streaming
  useEffect(() => {
    if (independentTimer && !independentTimer.isComplete && isStreaming) {
      console.log(`🔥 Starting real-time timer updates for section`);
      
      const updateTimer = () => {
        const elapsed = Math.ceil((Date.now() - independentTimer.startTime) / 1000);
        setDisplayTime(elapsed);
        console.log(`⏱️ Timer tick: ${elapsed}s`);
      };
      
      // Update immediately
      updateTimer();
      
      // Then update every second
      intervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          console.log(`⏹️ Cleared real-time timer interval`);
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log(`⏹️ Cleared timer interval - not streaming or completed`);
    }
  }, [independentTimer, isStreaming]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    if (seconds === 0) return '';
    if (seconds === 1) return '1 second';
    return `${seconds} seconds`;
  };

  const timeText = formatTime(displayTime);

  return (
    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
      {isStreaming && independentTimer && !independentTimer.isComplete ? (
        `Thinking... ${timeText}`
      ) : (
        timeText ? `Thought for ${timeText}` : 'Thinking...'
      )}
    </span>
  );
}
