/**
 * Zyvora ERP 1.0.0 — Idle Session Timeout & Multi-Tab Synchronization Service
 * Implements Gate C1: Production-grade Auth Foundation
 * 
 * Features:
 * 1. 60-minute idle timeout since last user activity.
 * 2. Cross-tab logout synchronization via BroadcastChannel with localStorage storage-event fallback.
 * 3. Tab re-activation check (visibilitychange & window focus) before granting access.
 * 4. Token refresh / background tasks do NOT reset user idle timer.
 * 5. Complete state cleanup on timeout and redirect to Login.
 */

export const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes in milliseconds
export const ACTIVITY_STORAGE_KEY = 'zyvora_last_activity_time';
export const AUTH_SYNC_CHANNEL_NAME = 'zyvora_auth_sync';
export const AUTH_SYNC_STORAGE_KEY = 'zyvora_auth_sync_event';

export type AuthLogoutReason = 'manual' | 'idle_timeout' | 'cross_tab';

export interface AuthSyncMessage {
  type: 'AUTH_LOGOUT' | 'AUTH_LOGIN';
  reason?: AuthLogoutReason;
  timestamp: number;
}

export interface SessionTimeoutHandlers {
  onIdleTimeout: () => void;
  onCrossTabLogout: (reason: AuthLogoutReason) => void;
}

export class SessionTimeoutService {
  private static timeoutIntervalId: ReturnType<typeof setInterval> | null = null;
  private static broadcastChannel: BroadcastChannel | null = null;
  private static lastThrottledWrite = 0;
  private static handlers: SessionTimeoutHandlers | null = null;
  private static isInitialized = false;
  private static inMemoryStorage: Record<string, string> = {};
  private static activeCleanup: (() => void) | null = null;
  private static lastHandledMessageTimestamp = 0;

  /**
   * Pure evaluation helper: checks if a given timestamp has exceeded idle threshold.
   */
  static isTimestampTimedOut(
    lastActiveMs: number | null,
    currentMs: number = Date.now(),
    timeoutMs: number = IDLE_TIMEOUT_MS
  ): boolean {
    if (!lastActiveMs) return false;
    return currentMs - lastActiveMs > timeoutMs;
  }

  /**
   * Records user interaction timestamp.
   * Throttled to avoid unnecessary storage write operations during fast typing or mouse clicks.
   * NOTE: Must ONLY be called by user UI events (clicks, keypresses, touches, scrolls).
   * Background timers or token refresh events MUST NEVER call this method!
   */
  static recordUserActivity(forced = false, customTimestamp?: number): void {
    const now = customTimestamp ?? Date.now();

    // SECURITY CHECK: If the session has ALREADY timed out prior to this interaction,
    // NEVER overwrite the activity timestamp to revive the session! Immediately trigger timeout!
    if (!forced && this.isSessionTimedOut(IDLE_TIMEOUT_MS, now)) {
      this.handleTimeout();
      return;
    }

    if (!forced && now - this.lastThrottledWrite < 3000) {
      return; // Throttle storage writes within 3 seconds
    }
    this.lastThrottledWrite = now;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
      } catch (err) {
        console.warn('Unable to persist activity timestamp to localStorage:', err);
      }
    } else {
      this.inMemoryStorage[ACTIVITY_STORAGE_KEY] = now.toString();
    }
  }

  /**
   * Retrieves the timestamp of the last recorded user activity.
   */
  static getLastActivityTime(): number | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
        if (!stored) return null;
        const parsed = parseInt(stored, 10);
        return Number.isFinite(parsed) ? parsed : null;
      } catch {
        // Fall back to inMemoryStorage
      }
    }
    const mem = this.inMemoryStorage[ACTIVITY_STORAGE_KEY];
    if (!mem) return null;
    const parsed = parseInt(mem, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Evaluates whether the user's session has exceeded the 60-minute idle threshold.
   */
  static isSessionTimedOut(timeoutMs: number = IDLE_TIMEOUT_MS, currentMs: number = Date.now()): boolean {
    const lastActive = this.getLastActivityTime();
    return this.isTimestampTimedOut(lastActive, currentMs, timeoutMs);
  }

  /**
   * Resets the activity timer to current timestamp (e.g. upon successful login).
   */
  static resetActivityTimer(customTimestamp?: number): void {
    this.recordUserActivity(true, customTimestamp);
  }

  /**
   * Clears the stored activity timestamp upon logout or session termination.
   */
  static clearActivityTimer(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      } catch {
        // Ignore storage exceptions
      }
    }
    delete this.inMemoryStorage[ACTIVITY_STORAGE_KEY];
  }

  /**
   * Broadcasts an authentication state change to all other open tabs/windows.
   * Uses BroadcastChannel with a localStorage storage event as fallback.
   */
  static broadcastAuthEvent(message: AuthSyncMessage): void {
    // 1. Primary: BroadcastChannel API
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel postMessage failed:', err);
      }
    }

    // 2. Safe Fallback: localStorage storage event (notifies other tabs on same origin)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message));
      } catch {
        // Ignore storage quota or access errors
      }
    }
  }

  /**
   * Initializes idle session monitoring, tab re-activation checks, and cross-tab listener.
   */
  static init(handlers: SessionTimeoutHandlers): () => void {
    // Clean up any previously active listeners to prevent listener duplication
    if (this.activeCleanup) {
      this.activeCleanup();
      this.activeCleanup = null;
    }

    this.handlers = handlers;
    this.isInitialized = true;

    if (typeof window === 'undefined') {
      const nodeCleanup = () => {
        this.isInitialized = false;
        this.handlers = null;
        this.activeCleanup = null;
      };
      this.activeCleanup = nodeCleanup;
      return nodeCleanup;
    }

    // Reset activity timer upon initialization if authenticated
    if (!this.getLastActivityTime()) {
      this.resetActivityTimer();
    }

    // 1. DOM User Activity Listeners (Real user interaction ONLY)
    const onUserActivity = () => {
      this.recordUserActivity(false);
    };

    const userEvents: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    userEvents.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    // 2. Tab Re-activation Check: Immediately evaluate timeout when tab becomes visible or focused
    const checkTimeoutOnFocus = () => {
      if (this.isSessionTimedOut()) {
        this.handleTimeout();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeoutOnFocus();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', checkTimeoutOnFocus);

    // 3. Periodic Background Check (Every 15 seconds)
    if (this.timeoutIntervalId) {
      clearInterval(this.timeoutIntervalId);
    }
    this.timeoutIntervalId = setInterval(() => {
      if (this.isSessionTimedOut()) {
        this.handleTimeout();
      }
    }, 15000);

    // 4. Setup BroadcastChannel for cross-tab synchronization
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
          this.handleIncomingSyncMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel could not be instantiated, falling back to storage events:', err);
        this.broadcastChannel = null;
      }
    }

    // 5. Setup localStorage Storage Event Fallback for Cross-Tab Sync
    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === AUTH_SYNC_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as AuthSyncMessage;
          this.handleIncomingSyncMessage(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', onStorageEvent);

    // Create Cleanup function
    const cleanup = () => {
      userEvents.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkTimeoutOnFocus);
      window.removeEventListener('storage', onStorageEvent);

      if (this.timeoutIntervalId) {
        clearInterval(this.timeoutIntervalId);
        this.timeoutIntervalId = null;
      }

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.close();
        } catch {
          // Ignore
        }
        this.broadcastChannel = null;
      }

      this.isInitialized = false;
      this.handlers = null;
      this.activeCleanup = null;
    };

    this.activeCleanup = cleanup;
    return cleanup;
  }

  /**
   * Internal trigger when session times out due to idle threshold
   */
  private static handleTimeout(): void {
    if (!this.isInitialized || !this.handlers) return;
    this.clearActivityTimer();

    // Broadcast timeout to all other tabs
    this.broadcastAuthEvent({
      type: 'AUTH_LOGOUT',
      reason: 'idle_timeout',
      timestamp: Date.now()
    });

    // Notify local handler
    this.handlers.onIdleTimeout();
  }

  /**
   * Handles messages received from other tabs (via BroadcastChannel or Storage Event)
   * With deduplication to prevent double-firing when both channels receive the same broadcast.
   */
  private static handleIncomingSyncMessage(message: AuthSyncMessage): void {
    if (!message || !this.handlers) return;

    // Deduplicate identical events received from both BroadcastChannel and storage fallback
    if (message.timestamp && message.timestamp <= this.lastHandledMessageTimestamp) {
      return;
    }
    this.lastHandledMessageTimestamp = message.timestamp || Date.now();

    if (message.type === 'AUTH_LOGOUT') {
      const reason = message.reason || 'cross_tab';
      this.clearActivityTimer();
      this.handlers.onCrossTabLogout(reason);
    }
  }
}
