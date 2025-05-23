import { appState } from "../../state/AppState.js";
import { apiRequest } from "../../utils/utils.js";

/**
 * Manages fetching and handling follow-up solutions.
 */
export class FollowupSolutionManager {
  /**
   * Create a new FollowupSolutionManager
   * @param {SolutionUIStateManager} uiStateManager - Instance for managing UI state
   * @param {SolutionPollingManager} pollingManager - Instance for starting polling
   */
  constructor(uiStateManager, pollingManager) {
    this.uiStateManager = uiStateManager;
    this.pollingManager = pollingManager;
  }

  /**
   * Get a standard follow-up solution.
   */
  async getFollowupSolution() {
    await this._fetchFollowupSolution(
      "/api/solution/followup",
      "standard",
      this.uiStateManager.showFollowupLoadingState.bind(this.uiStateManager),
      this.uiStateManager.showFollowupError.bind(this.uiStateManager),
      this.pollingManager.pollForFollowupSolution.bind(this.pollingManager)
    );
  }

  /**
   * Get a follow-up solution using Gemini.
   */
  async getFollowupSolutionWithGemini() {
    await this._fetchFollowupSolution(
      "/api/solution/followup-with-gemini",
      "Gemini",
      this.uiStateManager.showFollowupLoadingStateWithGemini.bind(
        this.uiStateManager
      ),
      this.uiStateManager.showFollowupErrorWithGemini.bind(this.uiStateManager),
      this.pollingManager.pollForFollowupSolutionWithGemini.bind(
        this.pollingManager
      )
    );
  }

  /**
   * Get a follow-up solution using Claude (for React context).
   */
  async getFollowupSolutionWithClaudeReact() {
    // --- Generate Unique ID ---
    const followupId = `followup-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    console.log(`Generated followupId: ${followupId}`);
    // --- End Generate Unique ID ---

    // Get screenshot path needed for polling function call
    const screenshotPath = appState.get("screenshots.currentScreenshotPath");

    await this._fetchFollowupSolution(
      "/api/solution/followup-with-claude-react", // New endpoint
      "Claude React",
      this.uiStateManager.showFollowupLoadingStateWithClaudeReact.bind(
        this.uiStateManager
      ),
      this.uiStateManager.showFollowupErrorWithClaudeReact.bind(
        this.uiStateManager
      ),
      () =>
        this.pollingManager.pollForFollowupSolutionWithClaudeReact(followupId), // Pass followupId
      followupId // Pass followupId to _fetchFollowupSolution to include in request body
    );
  }

  /**
   * Get a React follow-up solution using Gemini.
   */
  async getReactFollowupSolutionWithGemini() {
    // Reuse Claude React UI functions for now, as they target the same display area
    await this._fetchFollowupSolution(
      "/api/solution/react-followup-with-gemini", // New endpoint
      "Gemini React",
      this.uiStateManager.showFollowupLoadingStateWithClaudeReact.bind(
        // Reuse UI loading
        this.uiStateManager
      ),
      this.uiStateManager.showFollowupErrorWithClaudeReact.bind(
        // Reuse UI error
        this.uiStateManager
      ),
      // Pass the key determination logic to the polling function starter
      (keyToUse) =>
        this.pollingManager.pollForReactFollowupSolutionWithGemini(keyToUse)
    );
  }

  // --- Private Helper Method ---

  /**
   * Generic method to fetch a follow-up solution.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} providerName - Name for logging ("standard" or "Gemini").
   * @param {Function} showLoadingFn - Function from UIStateManager to show loading state.
   * @param {Function} showErrorFn - Function from UIStateManager to show error state.
   * @param {Function} startPollingFn - Function from PollingManager to start polling (will accept followupId).
   * @param {string|null} [followupId=null] - Unique ID for this specific followup request.
   * @private
   */
  async _fetchFollowupSolution(
    endpoint,
    providerName,
    showLoadingFn,
    showErrorFn,
    startPollingFn,
    followupId = null // Add followupId parameter
  ) {
    // Get the current extracted question (could be coding or React)
    // Get the current extracted question (could be coding or React)
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    // Get both potential keys
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );
    const currentStorageKey = appState.get("question.currentStorageKey");

    // Determine the key to use for this follow-up context
    const keyToUse = currentScreenshotPath || currentStorageKey;

    // Follow-up needs the *current* solution's code.
    // Check both standard solution and React solution from the combined object.
    const currentSolutionData = appState.get("solution.currentSolution");
    const currentStandardSolutionCode = currentSolutionData?.solution?.code;
    const currentReactSolutionCode = currentSolutionData?.react_solution; // Raw React code

    // Prioritize React solution code if available, otherwise use standard code
    const currentSolutionCode =
      currentReactSolutionCode || currentStandardSolutionCode;

    // Use keyToUse in the validation check
    if (
      !currentExtractedQuestion ||
      !keyToUse || // Check the determined key
      !currentSolutionCode
    ) {
      console.error(
        `Cannot fetch ${providerName} follow-up: Missing question, identifying key (${keyToUse}), or current solution code.`
      );
      showErrorFn(
        "Missing required information (question, context key, or previous solution code) for follow-up."
      );
      return;
    }

    // Update state and UI to show loading
    appState.update("solution.isGenerating", true);
    showLoadingFn();

    try {
      console.log(
        `Getting recent transcriptions for ${providerName} follow-up solution`
      );
      const transcriptData = await apiRequest("/api/transcriptions/recent");

      if (!transcriptData || transcriptData.length === 0) {
        console.error("No recent transcriptions available for follow-up.");
        appState.update("solution.isGenerating", false);
        showErrorFn(
          "No recent transcriptions found. Please ensure there was recent conversation."
        );
        return;
      }

      console.log(`Found ${transcriptData.length} recent transcriptions.`);
      const transcriptText = transcriptData.map((item) => item.text).join("\n");
      console.log(
        `Combined transcript length: ${transcriptText.length} characters`
      );

      console.log(`Sending ${providerName} follow-up solution request`);
      const data = await apiRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Send both the extracted question and the current solution code
          react_question: currentExtractedQuestion,
          current_solution: currentSolutionCode,
          transcript: transcriptText,
          storage_key: keyToUse, // Send the determined key
          followup_id: followupId, // Include the unique ID (if applicable)
        }),
      });

      if (data.status === "success") {
        console.log(
          `${providerName} follow-up solution request submitted successfully.`
        );
        // Start polling, passing the keyToUse if the polling function needs it
        // (The binding in getReactFollowupSolutionWithGemini handles passing the key)
        startPollingFn(keyToUse); // Pass keyToUse to the bound polling function starter
      } else {
        console.error(
          `Error requesting ${providerName} follow-up solution:`,
          data.message
        );
        appState.update("solution.isGenerating", false);
        showErrorFn(
          `Error requesting ${providerName} follow-up. Please try again.`
        );
      }
    } catch (error) {
      console.error(
        `Error requesting ${providerName} follow-up solution:`,
        error
      );
      appState.update("solution.isGenerating", false);
      showErrorFn(
        `An error occurred processing the ${providerName} follow-up. Please try again.`
      );
    }
  }
}
