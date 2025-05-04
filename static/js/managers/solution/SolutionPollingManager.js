import { appState } from "../../state/AppState.js";
import { apiRequest } from "../../utils/utils.js";

/**
 * Manages polling for solutions and follow-up solutions.
 */
export class SolutionPollingManager {
  /**
   * Create a new SolutionPollingManager
   * @param {Object} elements - DOM elements (used for displaying errors)
   * @param {SolutionUIStateManager} uiStateManager - Instance for managing UI state
   */
  constructor(elements, uiStateManager) {
    this.elements = elements; // Needed for potential error display in tabs
    this.uiStateManager = uiStateManager;
    this.pollIntervals = {}; // Store polling intervals { key: intervalId }
    this.pollTimeouts = {}; // Store polling timeouts { key: timeoutId }
    this.POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
    this.POLL_TIMEOUT_MS = 60000; // Stop polling after 60 seconds
  }

  /**
   * Poll for the main solution (standard or React).
   * @param {string} key - The key identifying the solution (screenshot path or storage key like 'transcript_latest').
   */
  pollForSolution(key) {
    // Use the key directly for polling identification
    const pollKey = `solution-${key}`; // Use the full key

    console.log(`Starting to poll for solution with key: ${key}`);
    this._clearPolling(pollKey); // Clear any previous polling for this key

    this.pollIntervals[pollKey] = setInterval(async () => {
      try {
        // Construct the URL with the key as a query parameter
        const encodedKey = encodeURIComponent(key);
        const pollUrl = `/api/solution/status?key=${encodedKey}`;
        console.log(`Polling URL: ${pollUrl}`); // Log the polling URL

        const data = await apiRequest(pollUrl); // Use the new URL

        // Check if either standard solution or react_solution is present
        if (data.solution || data.react_solution) {
          console.log(`Solution found for key: ${key}`);
          // Update state with both parts (one might be null)
          appState.update("solution.currentSolution", {
            solution: data.solution,
            react_solution: data.react_solution,
          });
          appState.update("solution.isGenerating", false);
          this._clearPolling(pollKey); // Stop polling
        }
        // else: Continue polling
      } catch (error) {
        console.error(`Error polling for solution (key: ${key}):`, error);
        this._handlePollingError(
          pollKey,
          "Error retrieving solution. Please try again."
        );
      }
    }, this.POLL_INTERVAL_MS);

    // Set timeout to stop polling if no result after POLL_TIMEOUT_MS
    this.pollTimeouts[pollKey] = setTimeout(() => {
      this._handlePollingTimeout(
        pollKey,
        "Could not generate solution. Please try again."
      );
    }, this.POLL_TIMEOUT_MS);
  }

  /**
   * Poll for the standard follow-up solution.
   * @param {string} screenshotPath - The screenshot path.
   */
  pollForFollowupSolution(screenshotPath) {
    const filename = this._getFilename(screenshotPath);
    const pollKey = `followup-${filename}`;
    const solutionKeyPrefix = `${screenshotPath}:followup:`;

    console.log(`Starting to poll for follow-up solution: ${pollKey}`);
    this._clearPolling(pollKey);

    this.pollIntervals[pollKey] = setInterval(async () => {
      try {
        const data = await apiRequest("/api/solutions"); // Get all solutions

        // Find the LATEST follow-up key based on timestamp
        const allKeys = Object.keys(data.solutions || data); // Check both root and solutions object
        const matchingKeys = allKeys.filter((key) =>
          key.startsWith(solutionKeyPrefix)
        );
        let latestKey = null;
        let latestTimestamp = 0;

        if (matchingKeys.length > 0) {
          matchingKeys.forEach((key) => {
            const parts = key.split(":");
            const timestamp = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(timestamp) && timestamp >= latestTimestamp) {
              // Use >= to handle potential simultaneous requests
              latestTimestamp = timestamp;
              latestKey = key;
            }
          });
        }

        // Check if the latest key was found and exists in the data
        const followupSolution = latestKey
          ? data.solutions
            ? data.solutions[latestKey]
            : data[latestKey]
          : null;

        if (latestKey && followupSolution) {
          console.log(`Latest follow-up solution found: ${latestKey}`);

          // Trigger event for display manager to handle
          StateEvents.emit("solution:followupAvailable", {
            type: "standard",
            solution: followupSolution,
          });

          appState.update("solution.isGenerating", false);
          this._clearPolling(pollKey);
        }
      } catch (error) {
        console.error(
          `Error polling for follow-up solution (${pollKey}):`,
          error
        );
        this.uiStateManager.showFollowupError(
          "Error retrieving follow-up solution. Please try again."
        );
        this._handlePollingError(pollKey); // Stop polling on error
      }
    }, this.POLL_INTERVAL_MS);

    this.pollTimeouts[pollKey] = setTimeout(() => {
      this.uiStateManager.showFollowupError(
        "Could not generate follow-up solution. Please try again."
      );
      this._handlePollingTimeout(pollKey);
    }, this.POLL_TIMEOUT_MS);
  }

  /**
   * Poll for the Gemini follow-up solution.
   * @param {string} screenshotPath - The screenshot path.
   */
  pollForFollowupSolutionWithGemini(screenshotPath) {
    const filename = this._getFilename(screenshotPath);
    const pollKey = `gemini-followup-${filename}`;
    const solutionKeyPrefix = `${screenshotPath}:gemini-followup:`;

    console.log(`Starting to poll for Gemini follow-up solution: ${pollKey}`);
    this._clearPolling(pollKey);

    this.pollIntervals[pollKey] = setInterval(async () => {
      try {
        const data = await apiRequest("/api/solutions"); // Get all solutions

        // Find the LATEST follow-up key based on timestamp
        const allKeys = Object.keys(data.solutions || data); // Check both root and solutions object
        const matchingKeys = allKeys.filter((key) =>
          key.startsWith(solutionKeyPrefix)
        );
        let latestKey = null;
        let latestTimestamp = 0;

        if (matchingKeys.length > 0) {
          matchingKeys.forEach((key) => {
            const parts = key.split(":");
            const timestamp = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(timestamp) && timestamp >= latestTimestamp) {
              // Use >= to handle potential simultaneous requests
              latestTimestamp = timestamp;
              latestKey = key;
            }
          });
        }

        // Check if the latest key was found and exists in the data
        const followupSolution = latestKey
          ? data.solutions
            ? data.solutions[latestKey]
            : data[latestKey]
          : null;

        if (latestKey && followupSolution) {
          console.log(`Latest Gemini follow-up solution found: ${latestKey}`);

          // Trigger event for display manager to handle
          StateEvents.emit("solution:followupAvailable", {
            type: "gemini",
            solution: followupSolution,
          });

          appState.update("solution.isGenerating", false);
          this._clearPolling(pollKey);
        }
      } catch (error) {
        console.error(
          `Error polling for Gemini follow-up solution (${pollKey}):`,
          error
        );
        this.uiStateManager.showFollowupErrorWithGemini(
          "Error retrieving Gemini follow-up solution. Please try again."
        );
        this._handlePollingError(pollKey); // Stop polling on error
      }
    }, this.POLL_INTERVAL_MS);

    this.pollTimeouts[pollKey] = setTimeout(() => {
      this.uiStateManager.showFollowupErrorWithGemini(
        "Could not generate Gemini follow-up solution. Please try again."
      );
      this._handlePollingTimeout(pollKey);
    }, this.POLL_TIMEOUT_MS);
  }

  /**
   * Poll for the Claude React follow-up solution using its unique ID.
   * @param {string} followupId - The unique ID for the specific followup request.
   */
  pollForFollowupSolutionWithClaudeReact(followupId) {
    // Use the followupId itself as the pollKey for uniqueness
    const pollKey = followupId;

    console.log(
      `Starting to poll for Claude React follow-up solution with ID: ${pollKey}`
    );
    this._clearPolling(pollKey);

    this.pollIntervals[pollKey] = setInterval(async () => {
      try {
        // Poll the generic /api/solutions endpoint which returns all data
        const data = await apiRequest("/api/solutions");

        // --- DEBUG LOGGING START ---
        console.log(
          `[Polling ${pollKey}] Received data:`,
          JSON.stringify(data, null, 2)
        );
        // --- DEBUG LOGGING END ---

        // Check if the solution exists for the specific followupId
        const specificFollowupSolution =
          data.followup_solutions && data.followup_solutions[followupId];

        // --- DEBUG LOGGING START ---
        console.log(
          `[Polling ${pollKey}] Checking for solution with ID ${followupId}:`,
          specificFollowupSolution
        );
        // --- DEBUG LOGGING END ---

        // Check if the solution for this ID is present
        if (specificFollowupSolution) {
          console.log(
            `Claude React follow-up solution found for ID: ${followupId}`
          );

          // Trigger a specific event for the display manager
          StateEvents.emit("solution:claudeReactFollowupAvailable", {
            solution: specificFollowupSolution, // Send the specific raw response string
          });

          appState.update("solution.isGenerating", false);
          this._clearPolling(pollKey); // Stop polling once found
        }
        // else: Continue polling if the specific ID is not found yet
      } catch (error) {
        console.error(
          `Error polling for Claude React follow-up solution (${pollKey}):`,
          error
        );
        // Use the specific error handler for this UI element
        this.uiStateManager.showFollowupErrorWithClaudeReact(
          "Error retrieving Claude follow-up solution. Please try again."
        );
        this._handlePollingError(pollKey); // Stop polling on error
      }
    }, this.POLL_INTERVAL_MS);

    this.pollTimeouts[pollKey] = setTimeout(() => {
      // Use the specific error handler for this UI element
      this.uiStateManager.showFollowupErrorWithClaudeReact(
        "Could not generate Claude follow-up solution. Please try again."
      );
      this._handlePollingTimeout(pollKey);
    }, this.POLL_TIMEOUT_MS);
  }

  /**
   * Poll for the Gemini React follow-up solution status.
   * @param {string} screenshotPath - The screenshot path.
   */
  pollForReactFollowupSolutionWithGemini(screenshotPath) {
    const filename = this._getFilename(screenshotPath);
    const pollKey = `gemini-react-followup-${filename}`;
    // Define a unique key prefix for storing this specific type of solution
    const solutionKeyPrefix = `${screenshotPath}:gemini-react-followup:`;

    console.log(
      `Starting to poll for Gemini React follow-up solution: ${pollKey}`
    );
    this._clearPolling(pollKey);

    this.pollIntervals[pollKey] = setInterval(async () => {
      try {
        const data = await apiRequest("/api/solutions");

        // Find the LATEST Gemini React follow-up key based on timestamp
        const allKeys = Object.keys(data.solutions || {});
        const matchingKeys = allKeys.filter((key) =>
          key.startsWith(solutionKeyPrefix)
        );
        let latestKey = null;
        let latestTimestamp = 0;

        if (matchingKeys.length > 0) {
          matchingKeys.forEach((key) => {
            const parts = key.split(":");
            const timestamp = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(timestamp) && timestamp >= latestTimestamp) {
              latestTimestamp = timestamp;
              latestKey = key;
            }
          });
        }

        const followupSolution = latestKey ? data.solutions[latestKey] : null;

        if (latestKey && followupSolution) {
          console.log(
            `Latest Gemini React follow-up solution found: ${latestKey}`
          );

          // Trigger a specific event for the display manager
          StateEvents.emit("solution:geminiReactFollowupAvailable", {
            solution: followupSolution, // Send the raw response string
          });

          appState.update("solution.isGenerating", false);
          this._clearPolling(pollKey);
        }
      } catch (error) {
        console.error(
          `Error polling for Gemini React follow-up solution (${pollKey}):`,
          error
        );
        // Reuse the Claude React error UI for now as it targets the same display area
        this.uiStateManager.showFollowupErrorWithClaudeReact(
          "Error retrieving Gemini follow-up solution. Please try again."
        );
        this._handlePollingError(pollKey); // Stop polling on error
      }
    }, this.POLL_INTERVAL_MS);

    this.pollTimeouts[pollKey] = setTimeout(() => {
      // Reuse the Claude React error UI for now
      this.uiStateManager.showFollowupErrorWithClaudeReact(
        "Could not generate Gemini follow-up solution. Please try again."
      );
      this._handlePollingTimeout(pollKey);
    }, this.POLL_TIMEOUT_MS);
  }

  // --- Private Helper Methods ---

  /**
   * Extracts the filename from a full path.
   * @param {string} path - The full file path.
   * @returns {string} The filename.
   * @private
   */
  _getFilename(path) {
    return path.split("/").pop();
  }

  /**
   * Clears the interval and timeout for a given polling key.
   * @param {string} pollKey - The key identifying the polling process.
   * @private
   */
  _clearPolling(pollKey) {
    // --- DEBUG LOGGING START ---
    console.log(`Attempting to clear polling for key: ${pollKey}`);
    // --- DEBUG LOGGING END ---
    if (this.pollIntervals[pollKey]) {
      clearInterval(this.pollIntervals[pollKey]);
      delete this.pollIntervals[pollKey];
      // --- DEBUG LOGGING START ---
      console.log(`Cleared polling interval for: ${pollKey}`);
      // --- DEBUG LOGGING END ---
    }
    if (this.pollTimeouts[pollKey]) {
      clearTimeout(this.pollTimeouts[pollKey]);
      delete this.pollTimeouts[pollKey];
      // --- DEBUG LOGGING START ---
      console.log(`Cleared polling timeout for: ${pollKey}`);
      // --- DEBUG LOGGING END ---
    }
  }

  /**
   * Handles errors during polling. Stops polling and updates state.
   * @param {string} pollKey - The key identifying the polling process.
   * @param {string} [errorMessage] - Optional message for main solution error display.
   * @private
   */
  _handlePollingError(pollKey, errorMessage) {
    this._clearPolling(pollKey);
    // Only update state if it's still generating (might have been updated by another process)
    if (appState.get("solution.isGenerating")) {
      appState.update("solution.isGenerating", false);
      // Display error for main solution polling if message provided
      if (errorMessage && pollKey.startsWith("solution-")) {
        if (this.elements.explanationTab) {
          this.elements.explanationTab.innerHTML = `<p><em>${errorMessage}</em></p>`;
        }
      }
      // Follow-up errors are handled directly in their polling functions via uiStateManager
    }
  }

  /**
   * Handles timeouts during polling. Stops polling and updates state.
   * @param {string} pollKey - The key identifying the polling process.
   * @param {string} [timeoutMessage] - Optional message for main solution timeout display.
   * @private
   */
  _handlePollingTimeout(pollKey, timeoutMessage) {
    this._clearPolling(pollKey);
    // Only update state and show message if it's still generating
    if (appState.get("solution.isGenerating")) {
      appState.update("solution.isGenerating", false);
      // Display timeout message for main solution polling if message provided
      if (timeoutMessage && pollKey.startsWith("solution-")) {
        if (this.elements.explanationTab) {
          this.elements.explanationTab.innerHTML = `<p><em>${timeoutMessage}</em></p>`;
        }
      }
      // Follow-up timeouts are handled directly in their polling functions via uiStateManager
    }
  }
}

// Import StateEvents for emitting events
import { StateEvents } from "../../state/StateEvents.js";
