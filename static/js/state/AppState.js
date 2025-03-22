/**
 * Centralized state management using singleton pattern
 * Provides a single source of truth for application state
 */
import { StateEvents } from "./StateEvents.js";

class AppState {
  static instance = null;

  /**
   * Application state object
   * Contains all state categories and their values
   */
  state = {
    recording: {
      isRecording: false,
      transcriptionCount: 0,
      currentSpeaker: "interviewer",
    },
    screenshots: {
      items: [],
      manuallySelectedScreenshot: false,
      currentScreenshotPath: "",
    },
    question: {
      current: null,
      currentExtractedQuestion: "",
      type: "coding",
      notes: "",
    },
    solution: {
      isGenerating: false,
      currentSolution: null,
    },
    ui: {
      leftPanelCollapsed: false,
    },
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  constructor() {
    if (AppState.instance) {
      throw new Error(
        "AppState is a singleton. Use AppState.getInstance() instead."
      );
    }
  }

  /**
   * Get the singleton instance
   * @returns {AppState} The AppState instance
   */
  static getInstance() {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  /**
   * Get a deep copy of the entire state
   * @returns {Object} A copy of the state
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get a specific part of the state
   * @param {string} path - Dot notation path to the state property
   * @returns {any} The state value at the specified path
   */
  get(path) {
    return this._getValueAtPath(this.state, path);
  }

  /**
   * Update a specific part of the state
   * @param {string} path - Dot notation path to the state property
   * @param {any} value - The new value
   */
  update(path, value) {
    const oldValue = this.get(path);

    // Only update and emit if value has changed
    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      this._setValueAtPath(this.state, path, value);

      // Emit change events
      StateEvents.emit(`${path}:changed`, value);
      StateEvents.emit("state:changed", { path, value, oldValue });
    }
  }

  /**
   * Helper method to get a value at a path
   * @private
   */
  _getValueAtPath(obj, path) {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Helper method to set a value at a path
   * @private
   */
  _setValueAtPath(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }
}

// Export a singleton instance
export const appState = AppState.getInstance();
