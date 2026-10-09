import { Snapshot } from '../types/snapshot';

export type SnapshotCallback = (snapshot: Snapshot) => void;
export type StatusCallback = (connected: boolean) => void;

export class MissionSocket {
  private ws: WebSocket | null = null;
  private runId: string;
  private onSnapshot: SnapshotCallback;
  private onStatusChange?: StatusCallback;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;

  constructor(
    runId: string,
    onSnapshot: SnapshotCallback,
    onStatusChange?: StatusCallback
  ) {
    this.runId = runId;
    this.onSnapshot = onSnapshot;
    this.onStatusChange = onStatusChange;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/runs/${this.runId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const snapshot: Snapshot = JSON.parse(event.data);
          this.onSnapshot(snapshot);
        } catch (err) {
          console.error('Failed to parse websocket snapshot:', err);
        }
      };

      this.ws.onclose = () => {
        this.onStatusChange?.(false);
        if (this.shouldReconnect) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, delay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('WebSocket creation error:', err);
    }
  }

  public sendAction(action: 'play' | 'pause' | 'step' | 'speed' | 'reset', value?: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, value }));
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatusChange?.(false);
  }
}
