'use client';

import { useEffect, useState } from 'react';

export type StatusType = 'active' | 'info' | 'alert' | 'critical' | 'inactive' | 'cyber';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
  showLabel?: boolean;
}

const statusConfig: Record<StatusType, { color: string; glow: string; label: string }> = {
  active: {
    color: 'bg-status-active',
    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    label: 'ACTIVE',
  },
  info: {
    color: 'bg-info',
    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]',
    label: 'INFO',
  },
  alert: {
    color: 'bg-alert',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    label: 'ALERT',
  },
  critical: {
    color: 'bg-critical',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
    label: 'CRITICAL',
  },
  inactive: {
    color: 'bg-inactive',
    glow: '',
    label: 'INACTIVE',
  },
  cyber: {
    color: 'bg-cyber-cyan',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    label: 'CYBER',
  },
};

const sizeConfig: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

export function StatusIndicator({
  status,
  size = 'md',
  pulse = true,
  label,
  showLabel = false,
}: StatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  // Breathing animation for active states
  useEffect(() => {
    if (!pulse || status === 'inactive') return;

    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, status === 'critical' ? 500 : 1500);

    return () => clearInterval(interval);
  }, [pulse, status]);

  const displayLabel = label || config.label;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          ${sizeClass}
          ${config.color}
          ${config.glow}
          rounded-full
          flex-shrink-0
          transition-opacity duration-300 ease-linear
          ${pulse && status !== 'inactive' ? (isVisible ? 'opacity-100' : 'opacity-40') : 'opacity-100'}
        `}
      />
      {showLabel && (
        <span className="text-xxs font-mono font-medium tracking-wider text-text-muted uppercase">
          {displayLabel}
        </span>
      )}
    </div>
  );
}

// Compound component for inline status with value
interface StatusValueProps {
  status: StatusType;
  value: string | number;
  unit?: string;
}

export function StatusValue({ status, value, unit }: StatusValueProps) {
  const config = statusConfig[status];

  const textColorClass = {
    active: 'text-status-active',
    info: 'text-info',
    alert: 'text-alert',
    critical: 'text-critical',
    inactive: 'text-inactive',
    cyber: 'text-cyber-cyan',
  }[status];

  return (
    <div className="flex items-center gap-2">
      <StatusIndicator status={status} size="sm" />
      <span className={`font-mono text-sm font-medium tabular-nums ${textColorClass}`}>
        {value}
        {unit && <span className="text-text-muted ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

// Live indicator that shows system is operational
export function LiveIndicator() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2 h-2 bg-status-active rounded-full" />
        <div
          className="absolute inset-0 w-2 h-2 bg-status-active rounded-full animate-ping opacity-75"
          style={{ animationDuration: '2s' }}
        />
      </div>
      <span className="text-xxs font-mono font-semibold tracking-widest text-status-active uppercase">
        LIVE
      </span>
      <span className="text-xxs font-mono text-text-muted tabular-nums">
        {String(tick).padStart(6, '0')}
      </span>
    </div>
  );
}

// Connection status indicator
interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latency?: number;
}

export function ConnectionStatus({ status, latency }: ConnectionStatusProps) {
  const statusMap: Record<string, StatusType> = {
    connected: 'active',
    connecting: 'alert',
    disconnected: 'inactive',
    error: 'critical',
  };

  const labelMap: Record<string, string> = {
    connected: 'CONNECTED',
    connecting: 'CONNECTING',
    disconnected: 'DISCONNECTED',
    error: 'ERROR',
  };

  return (
    <div className="flex items-center gap-3">
      <StatusIndicator
        status={statusMap[status]}
        size="sm"
        pulse={status === 'connecting'}
      />
      <span className="text-xxs font-mono font-medium tracking-wider text-text-secondary uppercase">
        {labelMap[status]}
      </span>
      {latency !== undefined && status === 'connected' && (
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {latency}MS
        </span>
      )}
    </div>
  );
}

export default StatusIndicator;
