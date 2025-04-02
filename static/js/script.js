/**
 * Main application script
 * Initializes all managers and sets up the application
 */
import { initDomElements } from "./domElements.js";
import { appState } from "./state/AppState.js";
import { RecordingManager } from "./managers/recordingManager.js";
import { TranscriptionManager } from "./managers/transcriptionManager.js";
import { ScreenshotManager } from "./managers/screenshotManager.js";
import { QuestionManager } from "./managers/questionManager.js";
import { SolutionManager } from "./managers/solution/SolutionManager.js";
import { UiManager } from "./managers/uiManager.js";
import { SolutionUIStateManager } from "./managers/solution/SolutionUIStateManager.js";
import { SolutionPollingManager } from "./managers/solution/SolutionPollingManager.js";
import { SolutionDisplayManager } from "./managers/solution/SolutionDisplayManager.js";
import { FollowupSolutionManager } from "./managers/solution/FollowupSolutionManager.js";
import { SolutionFetchManager } from "./managers/solution/SolutionFetchManager.js";
import { StateEvents } from "./state/StateEvents.js"; // Import StateEvents

// Polling interval for updates (in ms)
const POLLING_INTERVAL = 1000;

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
  // Initialize DOM elements
  const elements = initDomElements();

  // Initialize managers
  const recordingManager = new RecordingManager(elements);
  const transcriptionManager = new TranscriptionManager(elements);
  const screenshotManager = new ScreenshotManager(elements);
  const questionManager = new QuestionManager(elements);
  // Instantiate the solution sub-managers
  const solutionUIStateManager = new SolutionUIStateManager(elements);
  const solutionPollingManager = new SolutionPollingManager(
    elements,
    solutionUIStateManager
  );
  const solutionDisplayManager = new SolutionDisplayManager(elements);
  const followupSolutionManager = new FollowupSolutionManager(
    solutionUIStateManager,
    solutionPollingManager
  );
  const solutionFetchManager = new SolutionFetchManager(
    solutionUIStateManager,
    solutionPollingManager
  );
  // Instantiate SolutionManager with its dependencies
  const solutionManager = new SolutionManager(
    elements,
    solutionUIStateManager,
    solutionPollingManager,
    solutionDisplayManager,
    followupSolutionManager,
    solutionFetchManager
  );
  const uiManager = new UiManager(elements);

  // --- Event Listeners ---

  // Add listener for the new Claude React Followup button
  if (elements.getFollowupSolutionClaudeReactBtn) {
    elements.getFollowupSolutionClaudeReactBtn.addEventListener("click", () => {
      followupSolutionManager.getFollowupSolutionWithClaudeReact();
    });
  }

  // Add listener for the event when Claude React Followup solution is ready
  StateEvents.on("solution:claudeReactFollowupAvailable", (data) => {
    solutionDisplayManager.displayClaudeReactFollowupSolution(data.solution);
  });

  // Store managers for potential future access
  const managers = {
    recordingManager,
    transcriptionManager,
    screenshotManager,
    questionManager,
    solutionManager,
    uiManager,
  };

  // Set up polling for updates
  setInterval(() => {
    // Each manager handles its own polling
    recordingManager.poll();
    transcriptionManager.poll();
    screenshotManager.poll();
    questionManager.poll();
    solutionManager.poll();
    uiManager.poll();
  }, POLLING_INTERVAL);

  // Log initialization
  console.log("Application initialized with modular architecture");
});
