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
  const solutionManager = new SolutionManager(elements);
  const uiManager = new UiManager(elements);

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
