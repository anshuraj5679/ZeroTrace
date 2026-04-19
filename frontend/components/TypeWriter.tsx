"use client";

import { useEffect, useRef, useState } from "react";

interface TypeWriterProps {
  code: string;
  typingSpeed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypeWriter({
  code,
  typingSpeed = 20,
  className = "",
  onComplete
}: TypeWriterProps) {
  const [displayedCode, setDisplayedCode] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < code.length) {
        setDisplayedCode(code.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [hasStarted, code, typingSpeed, onComplete]);

  return (
    <pre ref={ref} className={className}>
      <code>
        {displayedCode}
        {!isComplete && hasStarted && (
          <span className="typing-cursor">▊</span>
        )}
      </code>
    </pre>
  );
}
