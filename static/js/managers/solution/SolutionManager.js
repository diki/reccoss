import { appState } from "../../state/AppState.js";
import { StateEvents } from "../../state/StateEvents.js";
import { SolutionUIStateManager } from "./SolutionUIStateManager.js";
import { SolutionPollingManager } from "./SolutionPollingManager.js";
import { SolutionDisplayManager } from "./SolutionDisplayManager.js";
import { SolutionFetchManager } from "./SolutionFetchManager.js";
import { FollowupSolutionManager } from "./FollowupSolutionManager.js";

/**
 * Solution Manager
 * Coordinates all solution-related functionality by delegating to specialized managers.
 */
export class SolutionManager {
  /**
   * Create a new SolutionManager
   * @param {Object} elements - DOM elements relevant to solution functionality
   */
  constructor(elements) {
    this.elements = elements;

    // Instantiate specialized managers
    this.uiStateManager = new SolutionUIStateManager(elements);
    this.pollingManager = new SolutionPollingManager(
      elements,
      this.uiStateManager
    );
    this.displayManager = new SolutionDisplayManager(elements);
    this.fetchManager = new SolutionFetchManager(
      this.uiStateManager,
      this.pollingManager
    );
    this.followupManager = new FollowupSolutionManager(
      this.uiStateManager,
      this.pollingManager
    );

    this.setupEventListeners();
    this.setupStateSubscriptions();
  }

  /**
   * Set up DOM event listeners, delegating actions to the appropriate managers.
   */
  setupEventListeners() {
    // --- Solution Fetching ---
    this.elements.getSolutionBtn.addEventListener("click", () =>
      this.fetchManager.getSolution()
    );
    this.elements.getSolutionWithOpenaiBtn.addEventListener("click", () =>
      this.fetchManager.getSolutionWithOpenai()
    );
    this.elements.getSolutionWithGeminiBtn.addEventListener("click", () =>
      this.fetchManager.getSolutionWithGemini()
    );
    this.elements.getReactSolutionWithGeminiBtn.addEventListener("click", () =>
      this.fetchManager.getReactSolutionWithGemini()
    );
    this.elements.getReactSolutionWithClaudeBtn.addEventListener("click", () =>
      this.fetchManager.getReactSolutionWithClaude()
    );
    this.elements.getReactSolution2WithGeminiBtn.addEventListener("click", () =>
      this.fetchManager.getReactSolution2WithGemini()
    );

    // --- Follow-up Solution Fetching ---
    this.elements.getSolutionFollowupBtn.addEventListener("click", () =>
      this.followupManager.getFollowupSolution()
    );
    this.elements.getSolutionFollowupWithGeminiBtn.addEventListener(
      "click",
      () => this.followupManager.getFollowupSolutionWithGemini()
    );
  }

  /**
   * Set up state change subscriptions, delegating handling to appropriate managers.
   */
  setupStateSubscriptions() {
    // Update UI state (buttons) when generation status changes
    StateEvents.on("solution.isGenerating:changed", (isGenerating) => {
      this.uiStateManager.updateSolutionButtonsState(isGenerating);
    });

    // Display solution when it becomes available in the state
    StateEvents.on("solution.currentSolution:changed", (data) => {
      if (data) {
        // Pass both the regular solution and the raw react solution
        this.displayManager.displaySolution(data.solution, data.react_solution);
        // Re-evaluate button states now that a solution is available/changed
        this.uiStateManager.updateSolutionButtonsState(
          appState.get("solution.isGenerating")
        );
      } else {
        // Handle case where solution is cleared
        this.displayManager.displaySolution(null, null);
        this.uiStateManager.updateSolutionButtonsState(false); // Ensure buttons are updated
      }
    });

    // Listen for solution availability from other managers (e.g., polling)
    // This event might be redundant now if polling directly updates appState
    // StateEvents.on("solution:available", (solution) => {
    //   appState.update("solution.currentSolution", solution);
    // });

    // Listen for changes in the extracted question to enable/disable buttons
    StateEvents.on("question.currentExtractedQuestion:changed", (question) => {
      this.uiStateManager.updateSolutionButtonsAvailability(!!question);
      // Also update general button state as follow-up depends on question
      this.uiStateManager.updateSolutionButtonsState(
        appState.get("solution.isGenerating")
      );
    });

    // Listen for available follow-up solutions from the polling manager
    StateEvents.on("solution:followupAvailable", (data) => {
      if (data.type === "standard") {
        this.displayManager.displayFollowupSolution(data.solution);
      } else if (data.type === "gemini") {
        this.displayManager.displayFollowupSolutionWithGemini(data.solution);
      }
    });
  }

  /**
   * Placeholder for potential future polling needs directly in SolutionManager.
   * Currently, polling is handled by SolutionPollingManager.
   */
  poll() {
    // console.log("SolutionManager poll called - currently no action needed here.");
  }
}
