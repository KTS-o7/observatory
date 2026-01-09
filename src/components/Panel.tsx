'use client';

import { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerRight?: ReactNode;
  noPadding?: boolean;
  fullHeight?: boolean;
}

export function Panel({
  children,
  title,
  subtitle,
  className = '',
  headerRight,
  noPadding = false,
  fullHeight = false,
}: PanelProps) {
  return (
    <div
      className={`
        bg-base-850
        border
        border-divider
        flex
        flex-col
        ${fullHeight ? 'h-full' : ''}
        ${className}
      `}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-divider bg-base-800">
          <div className="flex flex-col">
            {title && (
              <h3 className="text-xxs font-semibold tracking-ultra text-text-secondary uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-xxs font-mono text-text-muted tracking-wide">
                {subtitle}
              </span>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}
      <div className={`flex-1 overflow-auto ${noPadding ? '' : 'p-3'}`}>
        {children}
      </div>
    </div>
  );
}

// Panel section divider
interface PanelSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function PanelSection({ children, title, className = '' }: PanelSectionProps) {
  return (
    <div className={`${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xxs font-semibold tracking-widest text-text-muted uppercase">
            {title}
          </span>
          <div className="flex-1 h-px bg-divider" />
        </div>
      )}
      {children}
    </div>
  );
}

// Panel row for key-value displays
interface PanelRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  highlight?: 'active' | 'info' | 'alert' | 'critical' | 'cyber' | 'none';
}

export function PanelRow({ label, value, mono = false, highlight = 'none' }: PanelRowProps) {
  const highlightClass = {
    active: 'text-status-active',
    info: 'text-info',
    alert: 'text-alert',
    critical: 'text-critical',
    cyber: 'text-cyber-cyan',
    none: 'text-text-primary',
  }[highlight];

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-divider last:border-b-0">
      <span className="text-xxs font-medium tracking-wider text-text-muted uppercase">
        {label}
      </span>
      <span
        className={`
          text-xs
          ${mono ? 'font-mono tabular-nums' : 'font-medium'}
          ${highlightClass}
        `}
      >
        {value}
      </span>
    </div>
  );
}

// Collapsible panel variant
interface CollapsiblePanelProps extends PanelProps {
  defaultExpanded?: boolean;
}

export function CollapsiblePanel({
  children,
  title,
  subtitle,
  className = '',
  headerRight,
  noPadding = false,
  defaultExpanded = true,
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`
        bg-base-850
        border
        border-divider
        flex
        flex-col
        ${className}
      `}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-3 py-2 border-b border-divider bg-base-800 hover:bg-base-750 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3 h-3 text-text-muted transition-transform duration-150 ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex flex-col items-start">
            {title && (
              <h3 className="text-xxs font-semibold tracking-ultra text-text-secondary uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-xxs font-mono text-text-muted tracking-wide">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </button>
      {isExpanded && (
        <div className={`overflow-auto ${noPadding ? '' : 'p-3'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Import useState for CollapsiblePanel
import { useState } from 'react';

export default Panel;
