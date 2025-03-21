
import React from 'react';

interface StatusMessageProps {
  message: string;
}

export function StatusMessage({ message }: StatusMessageProps) {
  return (
    <div className="text-sm text-muted-foreground text-center my-2">
      {message}
    </div>
  );
}
