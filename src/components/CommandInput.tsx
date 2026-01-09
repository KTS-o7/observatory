'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { StatusIndicator } from './StatusIndicator';

interface Command {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  status: 'success' | 'error' | 'pending' | 'info';
}

interface CommandInputProps {
  onCommand?: (command: string) => void;
  placeholder?: string;
  showHistory?: boolean;
  maxHistory?: number;
}

// Simulated command processor
function processCommand(input: string): { output: string; status: 'success' | 'error' | 'info' } {
  const cmd = input.trim().toLowerCase();
  const parts = cmd.split(' ');
  const baseCmd = parts[0];

  switch (baseCmd) {
    case 'help':
      return {
        output: `AVAILABLE COMMANDS:
  help              Show this help message
  status            Display system status
  clear             Clear command history
  time              Show current UTC time
  ping <node>       Check node connectivity
  list <type>       List resources (ops|nodes|threats)
  filter <cat>      Filter intel by category
  zoom <region>     Focus map on region
  alert <level>     Set alert threshold
  export            Export current view data`,
        status: 'info',
      };

    case 'status':
      return {
        output: `SYSTEM STATUS: OPERATIONAL
  Network Integrity: 98.7%
  Active Nodes: 7/8
  Data Latency: 42ms
  Uptime: 99.94%
  Last Sync: ${new Date().toISOString().substring(11, 19)}Z`,
        status: 'success',
      };

    case 'time':
      return {
        output: `UTC: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}Z`,
        status: 'success',
      };

    case 'clear':
      return {
        output: 'HISTORY CLEARED',
        status: 'success',
      };

    case 'list':
      if (parts[1] === 'ops') {
        return {
          output: `ACTIVE OPERATIONS:
  NORTHERN WATCH    [ACTIVE]   Arctic Circle      12 assets
  EASTERN SHIELD    [ACTIVE]   Baltic Sea         28 assets
  SILENT THUNDER    [STANDBY]  Classified          6 assets
  PACIFIC GUARDIAN  [ACTIVE]   Western Pacific    45 assets`,
          status: 'success',
        };
      } else if (parts[1] === 'nodes') {
        return {
          output: `NETWORK NODES:
  CENTCOM-PRIME     [ONLINE]    12ms   99.99%
  EUCOM-ALPHA       [ONLINE]    45ms   99.95%
  INDOPACOM-MAIN    [ONLINE]    89ms   99.91%
  RELAY-GULF        [DEGRADED] 156ms   98.23%
  BACKUP-WEST       [OFFLINE]    --    94.12%`,
          status: 'success',
        };
      } else if (parts[1] === 'threats') {
        return {
          output: `THREAT MATRIX:
  CYBER-GLOBAL      84  [CRITICAL]  ▲ RISING
  INDO-PACIFIC      78  [HIGH]      ▲ RISING
  MIDDLE-EAST       72  [HIGH]      ▲ RISING
  EUROPE-EAST       65  [ELEVATED]  ◆ STABLE
  AFRICA            41  [MODERATE]  ▼ FALLING
  AMERICAS          23  [LOW]       ◆ STABLE`,
          status: 'success',
        };
      }
      return {
        output: `ERROR: Unknown list type '${parts[1] || ''}'
Usage: list <ops|nodes|threats>`,
        status: 'error',
      };

    case 'ping':
      if (!parts[1]) {
        return {
          output: 'ERROR: Node name required\nUsage: ping <node>',
          status: 'error',
        };
      }
      return {
        output: `PING ${parts[1].toUpperCase()}: 64 bytes, time=${Math.floor(Math.random() * 100) + 20}ms, TTL=64`,
        status: 'success',
      };

    case 'filter':
      if (!parts[1]) {
        return {
          output: 'ERROR: Category required\nUsage: filter <military|political|economic|cyber|intel|alert|all>',
          status: 'error',
        };
      }
      return {
        output: `FILTER APPLIED: ${parts[1].toUpperCase()}\nIntel feed updated`,
        status: 'success',
      };

    case 'zoom':
      if (!parts[1]) {
        return {
          output: 'ERROR: Region required\nUsage: zoom <region>',
          status: 'error',
        };
      }
      return {
        output: `MAP FOCUS: ${parts.slice(1).join(' ').toUpperCase()}\nZoom level adjusted`,
        status: 'success',
      };

    case 'alert':
      if (!parts[1]) {
        return {
          output: 'ERROR: Level required\nUsage: alert <low|medium|high|critical>',
          status: 'error',
        };
      }
      return {
        output: `ALERT THRESHOLD SET: ${parts[1].toUpperCase()}\nNotifications updated`,
        status: 'success',
      };

    case 'export':
      return {
        output: `EXPORT INITIATED
  Format: JSON
  Timestamp: ${new Date().toISOString()}
  File: observatory_export_${Date.now()}.json`,
        status: 'success',
      };

    case '':
      return {
        output: '',
        status: 'info',
      };

    default:
      return {
        output: `ERROR: Unknown command '${baseCmd}'\nType 'help' for available commands`,
        status: 'error',
      };
  }
}

export default function CommandInput({
  onCommand,
  placeholder = 'Enter command...',
  showHistory = true,
  maxHistory = 50,
}: CommandInputProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Command[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    const trimmedInput = input.trim();
    setIsProcessing(true);

    // Special case for clear command
    if (trimmedInput.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      setIsProcessing(false);
      return;
    }

    // Create pending command entry
    const commandId = `CMD-${Date.now()}`;
    const pendingCommand: Command = {
      id: commandId,
      timestamp: new Date().toISOString(),
      input: trimmedInput,
      output: 'Processing...',
      status: 'pending',
    };

    setHistory((prev) => [...prev.slice(-(maxHistory - 1)), pendingCommand]);
    setInput('');
    setHistoryIndex(-1);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Process command
    const result = processCommand(trimmedInput);

    // Update command with result
    setHistory((prev) =>
      prev.map((cmd) =>
        cmd.id === commandId
          ? { ...cmd, output: result.output, status: result.status }
          : cmd
      )
    );

    setIsProcessing(false);
    onCommand?.(trimmedInput);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const inputHistory = history.filter((cmd) => cmd.input);
      if (inputHistory.length > 0) {
        const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]?.input || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const inputHistory = history.filter((cmd) => cmd.input);
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]?.input || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setInput('');
      setHistoryIndex(-1);
    }
  };

  const getStatusColor = (status: Command['status']) => {
    switch (status) {
      case 'success':
        return 'text-status-active';
      case 'error':
        return 'text-critical';
      case 'pending':
        return 'text-alert';
      case 'info':
        return 'text-info';
      default:
        return 'text-text-secondary';
    }
  };

  const getStatusIndicator = (status: Command['status']) => {
    switch (status) {
      case 'success':
        return 'active';
      case 'error':
        return 'critical';
      case 'pending':
        return 'alert';
      case 'info':
        return 'info';
      default:
        return 'inactive';
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">COMMAND INTERFACE</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-status-active rounded-full animate-breathe" />
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
              READY
            </span>
          </div>
        </div>
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {history.length} CMD{history.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* History */}
      {showHistory && (
        <div
          ref={historyRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-2"
        >
          {history.length === 0 ? (
            <div className="text-text-muted text-center py-4">
              <span className="text-xxs uppercase tracking-wider">
                Type 'help' for available commands
              </span>
            </div>
          ) : (
            history.map((cmd) => (
              <div key={cmd.id} className="animate-fade-in">
                {/* Input line */}
                <div className="flex items-start gap-2">
                  <span className="text-cyber-cyan flex-shrink-0">{'>'}</span>
                  <span className="text-text-primary">{cmd.input}</span>
                </div>

                {/* Output */}
                {cmd.output && (
                  <div className="flex items-start gap-2 mt-1 ml-4">
                    <StatusIndicator
                      status={getStatusIndicator(cmd.status) as 'active' | 'info' | 'alert' | 'critical' | 'inactive'}
                      size="sm"
                      pulse={cmd.status === 'pending'}
                    />
                    <pre
                      className={`whitespace-pre-wrap ${getStatusColor(cmd.status)} text-[11px] leading-relaxed`}
                    >
                      {cmd.output}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-divider bg-base-800">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-cyber-cyan font-mono text-sm flex-shrink-0">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isProcessing}
            className="
              flex-1 bg-transparent border-none outline-none
              font-mono text-sm text-text-primary
              placeholder:text-text-muted/50
              disabled:opacity-50
            "
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          {isProcessing && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-alert rounded-full animate-ping" />
              <span className="text-xxs font-mono text-alert uppercase tracking-wider">
                PROCESSING
              </span>
            </div>
          )}
        </div>

        {/* Hint bar */}
        <div className="px-3 py-1 border-t border-divider/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
              ↵ EXECUTE
            </span>
            <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
              ↑↓ HISTORY
            </span>
            <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
              ESC CLEAR
            </span>
          </div>
          <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
            SESSION: {Date.now().toString(36).toUpperCase().slice(-4)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact variant without visible history
export function CompactCommandInput() {
  return <CommandInput showHistory={false} />;
}
