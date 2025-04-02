import { appState } from "../../state/AppState.js";

/**
 * Manages the UI state related to solutions, including button states and loading indicators.
 */
export class SolutionUIStateManager {
  /**
   * Create a new SolutionUIStateManager
   * @param {Object} elements - DOM elements relevant to solution UI state
   */
  constructor(elements) {
    this.elements = elements;
  }

  /**
   * Update solution buttons state based on generation status and availability
   * @param {boolean} isGenerating - Whether a solution is being generated
   */
  updateSolutionButtonsState(isGenerating) {
    const questionAvailable = !!appState.get(
      "question.currentExtractedQuestion"
    );
    const solutionAvailable = !!appState.get("solution.currentSolution");

    // Disable all buttons if generating or if the required data isn't available
    this.elements.getSolutionBtn.disabled = isGenerating || !questionAvailable;
    this.elements.getSolutionWithOpenaiBtn.disabled =
      isGenerating || !questionAvailable;
    this.elements.getSolutionWithGeminiBtn.disabled =
      isGenerating || !questionAvailable;
    this.elements.getReactSolutionWithGeminiBtn.disabled =
      isGenerating || !questionAvailable;
    this.elements.getReactSolutionWithClaudeBtn.disabled =
      isGenerating || !questionAvailable;
    this.elements.getReactSolution2WithGeminiBtn.disabled =
      isGenerating || !questionAvailable;
    this.elements.getSolutionFollowupBtn.disabled =
      isGenerating || !questionAvailable || !solutionAvailable;
    this.elements.getSolutionFollowupWithGeminiBtn.disabled =
      isGenerating || !questionAvailable || !solutionAvailable;

    // Reset button text if not generating
    if (!isGenerating) {
      this.elements.getSolutionBtn.textContent = "Get Solution";
      this.elements.getSolutionWithOpenaiBtn.textContent =
        "Get Solution with OpenAI";
      this.elements.getSolutionWithGeminiBtn.textContent =
        "Get Solution with Gemini";
      this.elements.getReactSolutionWithGeminiBtn.textContent =
        "Get React Solution (Gemini)";
      this.elements.getReactSolutionWithClaudeBtn.textContent =
        "Get React Solution (Claude)";
      this.elements.getReactSolution2WithGeminiBtn.textContent =
        "Get React Solution2 (Gemini)";
      this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";
      this.elements.getSolutionFollowupWithGeminiBtn.textContent =
        "Solve Follow-up with GEMini";
    }
  }

  /**
   * Enable or disable solution buttons based *only* on question availability.
   * This is typically called when the question state changes, but not during generation.
   * @param {boolean} questionAvailable - Whether an extracted question is available
   */
  updateSolutionButtonsAvailability(questionAvailable) {
    // Only change state if not currently generating a solution
    if (!appState.get("solution.isGenerating")) {
      this.elements.getSolutionBtn.disabled = !questionAvailable;
      this.elements.getSolutionWithOpenaiBtn.disabled = !questionAvailable;
      this.elements.getSolutionWithGeminiBtn.disabled = !questionAvailable;
      this.elements.getReactSolutionWithGeminiBtn.disabled = !questionAvailable;
      this.elements.getReactSolutionWithClaudeBtn.disabled = !questionAvailable;
      this.elements.getReactSolution2WithGeminiBtn.disabled =
        !questionAvailable;
      // Follow-up buttons depend on both question and existing solution, handled by updateSolutionButtonsState
    }
  }

  /**
   * Show loading state in the main solution tabs
   * @param {string} provider - The solution provider (optional, e.g., "OpenAI", "Gemini", "React Gemini")
   */
  showLoadingState(provider = "") {
    const providerText = provider ? ` with ${provider}` : "";

    // Update relevant button text based on provider
    if (!provider || provider === "Claude") {
      this.elements.getSolutionBtn.textContent = "Generating solution...";
    } else if (provider === "OpenAI") {
      this.elements.getSolutionWithOpenaiBtn.textContent =
        "Generating solution...";
    } else if (provider === "Gemini") {
      this.elements.getSolutionWithGeminiBtn.textContent =
        "Generating solution...";
    } else if (provider === "React Gemini") {
      this.elements.getReactSolutionWithGeminiBtn.textContent =
        "Generating solution...";
    } else if (provider === "React Claude") {
      this.elements.getReactSolutionWithClaudeBtn.textContent =
        "Generating solution...";
    } else if (provider === "React Gemini2") {
      this.elements.getReactSolution2WithGeminiBtn.textContent =
        "Generating solution...";
    }
    // Note: Follow-up loading state is handled separately

    // Update main solution tab content
    this.elements.explanationTab.innerHTML = `<p><em>Generating solution${providerText}, please wait...</em></p>`;
    const interviewStyleTab = document.getElementById("interview-style-tab");
    if (interviewStyleTab) {
      interviewStyleTab.innerHTML =
        "<p><em>Preparing interview-style explanation...</em></p>";
    }
    this.elements.complexityTab.innerHTML =
      "<p><em>Analyzing complexity...</em></p>";
    this.elements.strategyTab.innerHTML =
      "<p><em>Developing interview strategy...</em></p>";
    const codeTab = document.getElementById("code-tab");
    if (codeTab) {
      codeTab.innerHTML =
        "<pre><code id='code-content'><em>Generating code solution...</em></code></pre>";
    }
  }

  /**
   * Show loading state for the standard follow-up solution
   */
  showFollowupLoadingState() {
    this.elements.getSolutionFollowupBtn.textContent =
      "Processing follow-up...";
    this._updateFollowupContainer(
      "followup-solution-container",
      "Follow-up Solution",
      "followup-explanation",
      "followup-code",
      "Generating follow-up solution, please wait..."
    );
  }

  /**
   * Show loading state for the Gemini follow-up solution
   */
  showFollowupLoadingStateWithGemini() {
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Processing Gemini follow-up...";
    this._updateFollowupContainer(
      "gemini-followup-solution-container",
      "Gemini Follow-up Solution",
      "gemini-followup-explanation",
      "gemini-followup-code",
      "Generating Gemini follow-up solution, please wait...",
      "gemini-followup" // Additional class for styling
    );
  }

  /**
   * Show error message for the standard follow-up solution
   * @param {string} message - The error message
   */
  showFollowupError(message) {
    this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";
    this._updateFollowupTabsOnError(
      "followup-explanation-tab",
      "followup-code-tab",
      message
    );
  }

  /**
   * Show error message for the Gemini follow-up solution
   * @param {string} message - The error message
   */
  showFollowupErrorWithGemini(message) {
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Solve Follow-up with GEMini";
    this._updateFollowupTabsOnError(
      "gemini-followup-explanation-tab",
      "gemini-followup-code-tab",
      message
    );
  }

  // --- Private Helper Methods ---

  /**
   * Helper to create or update a follow-up solution container and its content for loading state.
   * @param {string} containerId - ID for the main container div
   * @param {string} headerText - Text for the h3 header
   * @param {string} explanationTabBaseId - Base ID for the explanation tab/button
   * @param {string} codeTabBaseId - Base ID for the code tab/button
   * @param {string} loadingMessage - Message to display in the tabs
   * @param {string} additionalContainerClass - Optional additional class for the main container
   * @private
   */
  _updateFollowupContainer(
    containerId,
    headerText,
    explanationTabBaseId,
    codeTabBaseId,
    loadingMessage,
    additionalContainerClass = ""
  ) {
    let followupContainer = document.getElementById(containerId);
    const parentContainer = document.getElementById("followup-container"); // Assumes a parent container exists

    if (!parentContainer) {
      console.error("Parent container 'followup-container' not found.");
      return;
    }

    if (!followupContainer) {
      followupContainer = document.createElement("div");
      followupContainer.id = containerId;
      followupContainer.className = `solution-container followup-solution ${additionalContainerClass}`;

      const header = document.createElement("h3");
      header.textContent = headerText;
      followupContainer.appendChild(header);

      const tabs = document.createElement("div");
      tabs.className = "tabs followup-tabs";
      tabs.innerHTML = `
        <button class="tab-button active" data-tab="${explanationTabBaseId}">${
        headerText.includes("Explanation") ? "Explanation" : "Explanation"
      }</button>
        <button class="tab-button" data-tab="${codeTabBaseId}">Code</button>
      `;
      followupContainer.appendChild(tabs);

      const content = document.createElement("div");
      content.className = "solution-box"; // Removed ID to avoid conflicts if called multiple times
      content.innerHTML = `
        <div id="${explanationTabBaseId}-tab" class="tab-content active">
          <p><em>${loadingMessage}</em></p>
        </div>
        <div id="${codeTabBaseId}-tab" class="tab-content">
          <pre><code><em>Generating code solution...</em></code></pre>
        </div>
      `;
      followupContainer.appendChild(content);

      parentContainer.appendChild(followupContainer);

      // Add event listeners for new tabs
      const tabButtons = tabs.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          tabButtons.forEach((btn) => btn.classList.remove("active"));
          const tabContents = content.querySelectorAll(".tab-content");
          tabContents.forEach((c) => c.classList.remove("active"));

          button.classList.add("active");
          const tabId = button.getAttribute("data-tab");
          document.getElementById(`${tabId}-tab`).classList.add("active");
        });
      });
    } else {
      // Update existing content
      const explanationTab = document.getElementById(
        `${explanationTabBaseId}-tab`
      );
      const codeTab = document.getElementById(`${codeTabBaseId}-tab`);

      if (explanationTab) {
        explanationTab.innerHTML = `<p><em>${loadingMessage}</em></p>`;
      }
      if (codeTab) {
        codeTab.innerHTML = `<pre><code><em>Generating code solution...</em></code></pre>`;
      }
    }
  }

  /**
   * Helper to update follow-up tabs content on error.
   * @param {string} explanationTabId - ID of the explanation tab content div
   * @param {string} codeTabId - ID of the code tab content div
   * @param {string} message - The error message
   * @private
   */
  _updateFollowupTabsOnError(explanationTabId, codeTabId, message) {
    const explanationTab = document.getElementById(explanationTabId);
    if (explanationTab) {
      explanationTab.innerHTML = `<p><em>${message}</em></p>`;
    }

    const codeTab = document.getElementById(codeTabId);
    if (codeTab) {
      codeTab.innerHTML =
        "<pre><code><em>No code solution available.</em></code></pre>";
    }
  }
}
