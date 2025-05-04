import { appState } from "../../state/AppState.js";
import { apiRequest } from "../../utils/utils.js";

/**
 * Manages fetching solutions from various API endpoints.
 */
export class SolutionFetchManager {
  /**
   * Create a new SolutionFetchManager
   * @param {SolutionUIStateManager} uiStateManager - Instance for managing UI state (loading indicators)
   * @param {SolutionPollingManager} pollingManager - Instance for starting polling after request submission
   */
  constructor(uiStateManager, pollingManager) {
    this.uiStateManager = uiStateManager;
    this.pollingManager = pollingManager;
  }

  /**
   * Get a solution using the default provider (Claude).
   */
  async getSolution() {
    await this._fetchSolution("/api/solution", "Claude");
  }

  /**
   * Get a solution using OpenAI.
   */
  async getSolutionWithOpenai() {
    await this._fetchSolution("/api/solution-with-openai", "OpenAI");
  }

  /**
   * Get a solution using Gemini.
   */
  async getSolutionWithGemini() {
    await this._fetchSolution("/api/solution-with-gemini", "Gemini");
  }

  /**
   * Get a React solution using Gemini.
   */
  async getReactSolutionWithGemini() {
    console.log("are yu here");
    await this._fetchSolution(
      "/api/react-solution-with-gemini",
      "React Gemini"
    );
  }

  /**
   * Get a React solution using Claude.
   */
  async getReactSolutionWithClaude() {
    await this._fetchSolution(
      "/api/react-solution-with-claude",
      "React Claude"
    );
  }

  /**
   * Get a React solution using Gemini with Claude's prompt (React Solution 2).
   */
  async getReactSolution2WithGemini() {
    await this._fetchSolution(
      "/api/react-solution2-with-gemini",
      "React Gemini2"
    );
  }

  // --- Private Helper Method ---

  /**
   * Generic method to fetch a solution from a specified endpoint.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} providerName - The name of the provider for logging and UI state.
   * @private
   */
  async _fetchSolution(endpoint, providerName) {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    // Get both potential keys
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );
    const currentStorageKey = appState.get("question.currentStorageKey"); // Get the storage key

    // Determine the key to use: prefer screenshot path, fallback to storage key
    const keyToSend = currentScreenshotPath || currentStorageKey;

    // Check if we have a question AND a key to identify it
    if (!currentExtractedQuestion || !keyToSend) {
      console.error(
        `Cannot fetch ${providerName} solution: No question or identifying key (screenshot/storage) available.`
      );
      // Optionally, show an error message to the user via UIStateManager if needed
      return;
    }

    // Update state and UI to show loading
    appState.update("solution.isGenerating", true);
    this.uiStateManager.showLoadingState(providerName); // Pass provider name for specific loading text

    try {
      const data = await apiRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          storage_key: keyToSend, // Send the key (could be path or 'transcript_latest')
        }),
      });

      if (data.status === "success") {
        console.log(`${providerName} solution request submitted successfully.`);
        // Start polling for the solution using the same key we sent
        this.pollingManager.pollForSolution(keyToSend);
      } else {
        console.error(
          `Error requesting ${providerName} solution:`,
          data.message
        );
        // Reset loading state on failure
        appState.update("solution.isGenerating", false);
        // Optionally, display error in UI via UIStateManager
        // this.uiStateManager.showErrorState(`Failed to request ${providerName} solution.`);
      }
    } catch (error) {
      console.error(`Error requesting ${providerName} solution:`, error);
      // Reset loading state on error
      appState.update("solution.isGenerating", false);
      // Optionally, display error in UI via UIStateManager
      // this.uiStateManager.showErrorState(`An error occurred while requesting the ${providerName} solution.`);
    }
  }
}
