/**
 * Real-time service for WebSocket subscriptions
 * Provides pub/sub functionality for real-time updates
 */

type EventHandler = (data: any) => void;

class RealTimeService {
  private subscriptions: Map<string, Map<string, Set<EventHandler>>> = new Map();
  private connected: boolean = false;

  /**
   * Subscribe to a channel and event
   */
  subscribe(channel: string, event: string, handler: EventHandler): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Map());
    }

    const channelSubs = this.subscriptions.get(channel)!;
    if (!channelSubs.has(event)) {
      channelSubs.set(event, new Set());
    }

    channelSubs.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from a channel and event
   */
  unsubscribe(channel: string, event: string, handler: EventHandler): void {
    const channelSubs = this.subscriptions.get(channel);
    if (!channelSubs) return;

    const eventHandlers = channelSubs.get(event);
    if (!eventHandlers) return;

    eventHandlers.delete(handler);

    // Cleanup empty sets/maps
    if (eventHandlers.size === 0) {
      channelSubs.delete(event);
    }
    if (channelSubs.size === 0) {
      this.subscriptions.delete(channel);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(channel: string, event: string, data: any): void {
    const channelSubs = this.subscriptions.get(channel);
    if (!channelSubs) return;

    const eventHandlers = channelSubs.get(event);
    if (!eventHandlers) return;

    eventHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in real-time event handler for ${channel}:${event}`, error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to real-time service
   */
  connect(): void {
    this.connected = true;
  }

  /**
   * Disconnect from real-time service
   */
  disconnect(): void {
    this.connected = false;
    this.subscriptions.clear();
  }
}

export const realTimeService = new RealTimeService();
