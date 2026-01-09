'use client';

import { useEffect, useState } from 'react';

export default function Header() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Format time as HH:MM:SS in 24-hour format
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);

      // Format date as YYYY-MM-DD
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      setCurrentDate(`${year}-${month}-${day}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 bg-base-850 border-b border-divider flex items-center justify-between px-4">
      {/* Left section - Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Logo/Icon */}
          <div className="w-6 h-6 relative">
            <div className="absolute inset-0 border-2 border-status-active rotate-45 animate-breathe" />
            <div className="absolute inset-1 border border-status-active-dim rotate-45" />
          </div>

          {/* Title */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-ultra text-text-primary uppercase">
              OBSERVATORY
            </span>
            <span className="text-xxs font-mono tracking-wider text-text-muted uppercase">
              COMMAND CENTER
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-divider" />

        {/* System Status */}
        <div className="flex items-center gap-2">
          <div className="status-dot status-dot-active" />
          <span className="text-xxs font-semibold tracking-wider text-status-active uppercase">
            SYSTEM ONLINE
          </span>
        </div>
      </div>

      {/* Center section - Classification Banner */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
        <span className="text-xxs font-bold tracking-ultra text-alert uppercase px-3 py-1 bg-alert/10 border border-alert/20">
          UNCLASSIFIED // FOR TRAINING USE ONLY
        </span>
      </div>

      {/* Right section - Time and Status */}
      <div className="flex items-center gap-4">
        {/* Network Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xxs font-mono tracking-wider text-text-muted uppercase">NET</span>
            <div className="status-dot status-dot-active" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs font-mono tracking-wider text-text-muted uppercase">SAT</span>
            <div className="status-dot status-dot-active" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xxs font-mono tracking-wider text-text-muted uppercase">SEC</span>
            <div className="status-dot status-dot-info" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-divider" />

        {/* UTC Clock */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-xxs font-mono tracking-wider text-text-muted">UTC</span>
            <span className="text-sm font-mono font-medium tracking-wide text-text-primary tabular-nums glow-green">
              {currentTime}
            </span>
          </div>
          <span className="text-xxs font-mono tracking-wider text-text-muted tabular-nums">
            {currentDate}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-divider" />

        {/* User/Session Info */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-base-700 border border-divider flex items-center justify-center">
            <span className="text-xxs font-semibold text-text-secondary">OP</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xxs font-medium tracking-wide text-text-primary uppercase">
              OPERATOR-01
            </span>
            <span className="text-xxs font-mono tracking-wider text-text-muted">
              SESSION: A7X9
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
