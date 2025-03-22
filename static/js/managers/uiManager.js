/**
 * UI Manager
 * Handles all UI-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";

export class UiManager {
  /**
   * Create a new UiManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.setupEventListeners();
    this.setupStateSubscriptions();
    this.setupTabs();
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    this.elements.resetAllBtn.addEventListener("click", () => this.resetAll());
    this.elements.togglePanelBtn.addEventListener("click", () =>
      this.toggleLeftPanel()
    );
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("ui.leftPanelCollapsed:changed", (collapsed) => {
      this.updatePanelState(collapsed);
    });
  }

  /**
   * Set up tab switching functionality
   */
  setupTabs() {
    const { tabButtons, tabContents } = this.elements;

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Add active class to current button
        button.classList.add("active");

        // Show the corresponding tab content
        const tabId = button.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  /**
   * Toggle the left panel
   */
  toggleLeftPanel() {
    const currentState = appState.get("ui.leftPanelCollapsed");
    appState.update("ui.leftPanelCollapsed", !currentState);
  }

  /**
   * Update the panel state based on collapsed state
   * @param {boolean} collapsed - Whether the panel is collapsed
   */
  updatePanelState(collapsed) {
    this.elements.leftPanel.classList.toggle("collapsed", collapsed);

    // Update the toggle icon based on the panel state
    const toggleIcon =
      this.elements.togglePanelBtn.querySelector(".toggle-icon");
    if (toggleIcon) {
      toggleIcon.textContent = collapsed ? "◀" : "▶";
    }
  }

  /**
   * Reset all data
   */
  async resetAll() {
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });

      const data = await response.json();

      if (data.status === "success") {
        console.log("All data reset successfully");

        // Reset state
        appState.update("recording.transcriptionCount", 0);
        appState.update("screenshots.items", []);
        appState.update("question.current", null);
        appState.update("question.currentExtractedQuestion", "");
        appState.update("screenshots.currentScreenshotPath", "");
        appState.update("screenshots.manuallySelectedScreenshot", false);
        appState.update("solution.currentSolution", null);

        // Reset UI elements
        this.elements.extractedQuestionContainer.innerHTML =
          "<p><em>No coding question extracted yet...</em></p>";
        this.elements.explanationTab.innerHTML =
          '<p><em>No solution yet. Click "Get Solution" to generate one.</em></p>';
        this.elements.complexityTab.innerHTML =
          "<p><em>No complexity analysis yet.</em></p>";
        this.elements.strategyTab.innerHTML =
          "<p><em>No interview strategy yet.</em></p>";
        this.elements.codeTab.innerHTML =
          "<pre><code id='code-content'><em>No code solution yet.</em></code></pre>";
        this.elements.interviewerTranscription.innerHTML =
          "<p><em>Waiting for transcription...</em></p>";
        this.elements.latestTranscription.innerHTML =
          "<p><em>Waiting for transcription...</em></p>";
        this.elements.transcriptionHistory.innerHTML =
          "<p><em>No transcriptions yet...</em></p>";
        this.elements.screenshotsContainer.innerHTML =
          "<p><em>No screenshots yet...</em></p>";

        // Disable solution buttons
        this.elements.getSolutionBtn.disabled = true;
        this.elements.getSolutionWithOpenaiBtn.disabled = true;
        this.elements.getSolutionWithGeminiBtn.disabled = true;
      } else {
        console.error("Error resetting data:", data.message);
      }
    } catch (error) {
      console.error("Error resetting data:", error);
    }
  }

  /**
   * Poll for UI updates
   */
  poll() {
    // No polling needed for UI
  }
}
