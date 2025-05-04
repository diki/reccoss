import { appState } from "../../state/AppState.js";
import { StateEvents } from "../../state/StateEvents.js";
import { apiRequest } from "../../utils/utils.js"; // Import apiRequest
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
    // Add reference for the new button
    this.getDesignSolutionClaudeBtn = elements.getDesignSolutionClaudeBtn;

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

    // --- New Design Solution Fetching ---
    if (this.getDesignSolutionClaudeBtn) {
      this.getDesignSolutionClaudeBtn.addEventListener("click", () =>
        this.getDesignSolutionWithClaude()
      );
    } else {
      console.error(
        "Get Design Solution (Claude) button not found in DOM elements."
      );
    }
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

  /**
   * Fetch and display the design solution from Claude (direct response).
   */
  async getDesignSolutionWithClaude() {
    const currentQuestion = appState.get("question.currentExtractedQuestion");
    if (!currentQuestion) {
      console.error("No question extracted to get a design solution for.");
      // Optionally show a message to the user in the design solution area
      if (this.elements.designSolutionContent) {
        this.elements.designSolutionContent.innerHTML =
          "<p><em>Please extract a question first.</em></p>";
        if (this.elements.designSolutionContainer) {
          this.elements.designSolutionContainer.classList.remove("hidden");
        }
      }
      return;
    }

    console.log(
      "Requesting Claude design solution for:",
      currentQuestion.substring(0, 100) + "..."
    );

    // Ensure elements exist before using them
    if (
      !this.elements.designSolutionContainer ||
      !this.elements.designSolutionContent
    ) {
      console.error("Design solution container or content element not found.");
      return;
    }

    // Show loading state
    this.elements.designSolutionContainer.classList.remove("hidden");
    this.elements.designSolutionContent.innerHTML =
      "<p><em>Generating design solution with Claude...</em></p>";
    // Consider disabling the button while loading? Maybe handled by UIStateManager later.

    try {
      const data = await apiRequest("/api/solution/design/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: currentQuestion }),
      });

      if (data.status === "success" && data.solution_markdown) {
        console.log("Received Claude design solution.");
        // Display the raw Markdown for now. Needs a Markdown renderer for proper display.
        // Using innerHTML is a security risk if the markdown isn't sanitized.
        // For now, we'll display it directly, assuming the source is trusted.
        // TODO: Implement Markdown rendering (e.g., using 'marked' library)
        // Displaying raw markdown inside pre tag without escaping, as requested.
        this.elements.designSolutionContent.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${data.solution_markdown}</pre>`;
      } else {
        console.error("Error fetching design solution:", data.message);
        this.elements.designSolutionContent.innerHTML = `<p><em>Error generating design solution: ${
          data.message || "Unknown error"
        }</em></p>`;
      }
    } catch (error) {
      console.error("API error fetching design solution:", error);
      this.elements.designSolutionContent.innerHTML =
        "<p><em>API error fetching design solution. Please check logs.</em></p>";
    }
  }

  // Removed escapeHtml function as requested.
}
