import { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  speed?: number; // 每个字符的延迟时间（毫秒）
}

const StreamingMessage = ({ content, isStreaming = false, speed = 20 }: StreamingMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const indexRef = useRef(0);
  const prevContentRef = useRef(content);

  useEffect(() => {
    // If content changed, reset the streaming index
    if (content !== prevContentRef.current) {
      indexRef.current = 0;
      prevContentRef.current = content;
    }

    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    if (indexRef.current < content.length) {
      const timeout = setTimeout(() => {
        indexRef.current += 1;
        setDisplayedContent(content.slice(0, indexRef.current));
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [content, isStreaming, speed, displayedContent]);

  return (
    <>
      <MarkdownRenderer content={displayedContent} />
      {isStreaming && indexRef.current < content.length && (
        <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
      )}
    </>
  );
};

export default StreamingMessage;
