import { useState, useEffect, useRef, useMemo } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  speed?: number; // Characters per frame (higher = faster)
}

const StreamingMessage = ({ content, isStreaming = false, speed = 5 }: StreamingMessageProps) => {
  const [displayIndex, setDisplayIndex] = useState(0);
  const prevContentRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    // If content changed, reset the streaming index
    if (content !== prevContentRef.current) {
      setDisplayIndex(0);
      prevContentRef.current = content;
    }

    if (!isStreaming) {
      setDisplayIndex(content.length);
      return;
    }

    const animate = (time: number) => {
      // Throttle updates to ~60fps (16ms between frames)
      if (time - lastTimeRef.current < 16) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTimeRef.current = time;

      setDisplayIndex(prev => {
        if (prev >= content.length) {
          return prev;
        }
        // Add multiple characters per frame for faster streaming
        return Math.min(prev + speed, content.length);
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    if (displayIndex < content.length) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [content, isStreaming, speed, displayIndex]);

  // Memoize the displayed content to avoid recalculation on every render
  const displayedContent = useMemo(() => {
    return content.slice(0, displayIndex);
  }, [content, displayIndex]);

  const isComplete = displayIndex >= content.length;

  return (
    <>
      <MarkdownRenderer content={displayedContent} />
      {isStreaming && !isComplete && (
        <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
      )}
    </>
  );
};

export default StreamingMessage;
