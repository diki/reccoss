/**
 * Event system for state changes
 * Allows components to subscribe to and emit state change events
 */
export class StateEvents {
  static listeners = new Map();

  /**
   * Subscribe to an event
   * @param {string} event - The event name to subscribe to
   * @param {Function} callback - The callback function to execute when the event is emitted
   */
  static on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      // Return unsubscribe function
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    };
  }

  /**
   * Emit an event with data
   * @param {string} event - The event name to emit
   * @param {any} data - The data to pass to subscribers
   */
  static emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => callback(data));
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - The event to clear listeners for
   */
  static clear(event) {
    if (this.listeners.has(event)) {
      this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners
   */
  static clearAll() {
    this.listeners.clear();
  }
}
