/**
 * Solution Manager
 * Handles all solution-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";
import { cleanCodeMarkdown, detectLanguage } from "../utils/utils.js";

export class SolutionManager {
  /**
   * Create a new SolutionManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.setupEventListeners();
    this.setupStateSubscriptions();
    this.pollIntervals = {};
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    this.elements.getSolutionBtn.addEventListener("click", () =>
      this.getSolution()
    );
    this.elements.getSolutionWithOpenaiBtn.addEventListener("click", () =>
      this.getSolutionWithOpenai()
    );
    this.elements.getSolutionWithGeminiBtn.addEventListener("click", () =>
      this.getSolutionWithGemini()
    );
    this.elements.getReactSolutionWithGeminiBtn.addEventListener("click", () =>
      this.getReactSolutionWithGemini()
    );
    this.elements.getReactSolutionWithClaudeBtn.addEventListener("click", () =>
      this.getReactSolutionWithClaude()
    );
    this.elements.getReactSolution2WithGeminiBtn.addEventListener("click", () =>
      this.getReactSolution2WithGemini()
    );
    this.elements.getSolutionFollowupBtn.addEventListener("click", () =>
      this.getFollowupSolution()
    );
    this.elements.getSolutionFollowupWithGeminiBtn.addEventListener(
      "click",
      () => this.getFollowupSolutionWithGemini()
    );
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("solution.isGenerating:changed", (isGenerating) => {
      this.updateSolutionButtonsState(isGenerating);
    });

    StateEvents.on("solution.currentSolution:changed", (data) => {
      if (data && data.solution) {
        // Pass both the regular solution and the raw react solution
        this.displaySolution(data.solution, data.react_solution);
      }
    });

    // Listen for solution availability from other managers
    StateEvents.on("solution:available", (solution) => {
      appState.update("solution.currentSolution", solution);
    });

    // Listen for changes in the extracted question to enable/disable buttons
    StateEvents.on("question.currentExtractedQuestion:changed", (question) => {
      this.updateSolutionButtonsAvailability(!!question);
    });
  }

  /**
   * Enable or disable solution buttons based on question availability
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
      // Follow-up buttons depend on both question and existing solution, handled elsewhere
    }
  }

  /**
   * Get a solution for the current question
   */
  async getSolution() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState();

    try {
      const data = await apiRequest("/api/solution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("Solution request submitted");

        // Start polling for the solution
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting solution:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting solution:", error);
      appState.update("solution.isGenerating", false);
    }
  }

  /**
   * Get a solution for the current question with OpenAI
   */
  async getSolutionWithOpenai() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState("OpenAI");

    try {
      const data = await apiRequest("/api/solution-with-openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("OpenAI solution request submitted");

        // Start polling for the solution
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting OpenAI solution:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting OpenAI solution:", error);
      appState.update("solution.isGenerating", false);
    }
  }

  /**
   * Get a solution for the current question with Gemini
   */
  async getSolutionWithGemini() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState("Gemini");

    try {
      const data = await apiRequest("/api/solution-with-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("Gemini solution request submitted");

        // Start polling for the solution
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting Gemini solution:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting Gemini solution:", error);
      appState.update("solution.isGenerating", false);
    }
  }

  /**
   * Get a follow-up solution for the current question
   */
  async getFollowupSolution() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );
    const currentSolution = appState.get("solution.currentSolution");

    if (
      !currentExtractedQuestion ||
      !currentScreenshotPath ||
      !currentSolution
    ) {
      console.error(
        "No question, screenshot path, or current solution available"
      );
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showFollowupLoadingState();

    try {
      console.log("Getting recent transcriptions for follow-up solution");
      // First, get recent transcriptions (last 2 minutes)
      const transcriptData = await apiRequest("/api/transcriptions/recent");

      if (!transcriptData || transcriptData.length === 0) {
        console.error("No recent transcriptions available");
        appState.update("solution.isGenerating", false);
        this.showFollowupError(
          "No recent transcriptions available for follow-up. Please ensure there is recent conversation."
        );
        return;
      }

      console.log(`Found ${transcriptData.length} recent transcriptions`);

      // Combine all recent transcriptions into a single text
      const transcriptText = transcriptData.map((item) => item.text).join("\n");
      console.log(
        `Combined transcript length: ${transcriptText.length} characters`
      );

      console.log("Sending follow-up solution request");
      // Send the follow-up request
      const data = await apiRequest("/api/solution/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem: currentExtractedQuestion,
          code: currentSolution.code,
          transcript: transcriptText,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("Follow-up solution request submitted successfully");

        // Start polling for the follow-up solution
        this.pollForFollowupSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting follow-up solution:", data.message);
        appState.update("solution.isGenerating", false);
        this.showFollowupError(
          "Error requesting follow-up solution. Please try again."
        );
      }
    } catch (error) {
      console.error("Error requesting follow-up solution:", error);
      appState.update("solution.isGenerating", false);
      this.showFollowupError(
        "An error occurred while processing the follow-up. Please try again."
      );
    }
  }

  /**
   * Poll for the follow-up solution
   * @param {string} screenshotPath - The screenshot path
   */
  pollForFollowupSolution(screenshotPath) {
    console.log("Starting to poll for follow-up solution");

    // Extract just the filename from the path
    const filename = screenshotPath.split("/").pop();

    // Clear any existing polling for this screenshot
    if (this.pollIntervals[`followup-${filename}`]) {
      clearInterval(this.pollIntervals[`followup-${filename}`]);
    }

    // Set up polling interval
    this.pollIntervals[`followup-${filename}`] = setInterval(async () => {
      try {
        // Get all solutions
        const data = await apiRequest("/api/solutions");

        // Look for follow-up solutions for this screenshot
        const followupKey = Object.keys(data).find((key) =>
          key.startsWith(`${screenshotPath}:followup:`)
        );

        if (followupKey && data[followupKey]) {
          console.log("Follow-up solution found:", followupKey);

          // We have a follow-up solution
          const followupSolution = data[followupKey];

          // Display the follow-up solution
          this.displayFollowupSolution(followupSolution);

          // Update state
          appState.update("solution.isGenerating", false);

          // Stop polling
          clearInterval(this.pollIntervals[`followup-${filename}`]);
          delete this.pollIntervals[`followup-${filename}`];
        }
      } catch (error) {
        console.error("Error polling for follow-up solution:", error);
        // Stop polling on error
        clearInterval(this.pollIntervals[`followup-${filename}`]);
        delete this.pollIntervals[`followup-${filename}`];
        appState.update("solution.isGenerating", false);
        this.showFollowupError(
          "Error retrieving follow-up solution. Please try again."
        );
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds if no result
    setTimeout(() => {
      if (this.pollIntervals[`followup-${filename}`]) {
        clearInterval(this.pollIntervals[`followup-${filename}`]);
        delete this.pollIntervals[`followup-${filename}`];

        // Check if we still don't have a solution
        if (appState.get("solution.isGenerating")) {
          this.showFollowupError(
            "Could not generate follow-up solution. Please try again."
          );
          appState.update("solution.isGenerating", false);
        }
      }
    }, 60000);
  }

  /**
   * Show loading state for follow-up solution
   */
  showFollowupLoadingState() {
    // Update button text
    this.elements.getSolutionFollowupBtn.textContent =
      "Processing follow-up...";

    // Create or get the follow-up container
    let followupContainer = document.getElementById(
      "followup-solution-container"
    );

    if (!followupContainer) {
      // Create the follow-up container if it doesn't exist
      followupContainer = document.createElement("div");
      followupContainer.id = "followup-solution-container";
      followupContainer.className = "solution-container followup-solution";

      // Create header
      const header = document.createElement("h3");
      header.textContent = "Follow-up Solution";
      followupContainer.appendChild(header);

      // Create tabs
      const tabs = document.createElement("div");
      tabs.className = "tabs followup-tabs";
      tabs.innerHTML = `
        <button class="tab-button active" data-tab="followup-explanation">Explanation</button>
        <button class="tab-button" data-tab="followup-code">Code</button>
      `;
      followupContainer.appendChild(tabs);

      // Create content div
      const content = document.createElement("div");
      content.id = "followup-content";
      content.className = "solution-box";
      content.innerHTML = `
        <div id="followup-explanation-tab" class="tab-content active">
          <p><em>Generating follow-up solution, please wait...</em></p>
        </div>
        <div id="followup-code-tab" class="tab-content">
          <pre><code><em>Generating code solution...</em></code></pre>
        </div>
      `;
      followupContainer.appendChild(content);

      // Add to the page inside the followup container
      document
        .getElementById("followup-container")
        .appendChild(followupContainer);

      // Add event listeners for tabs
      const tabButtons = tabs.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          // Remove active class from all buttons and contents
          tabButtons.forEach((btn) => btn.classList.remove("active"));
          const tabContents = content.querySelectorAll(".tab-content");
          tabContents.forEach((content) => content.classList.remove("active"));

          // Add active class to clicked button and corresponding content
          button.classList.add("active");
          const tabId = button.getAttribute("data-tab");
          document.getElementById(`${tabId}-tab`).classList.add("active");
        });
      });
    } else {
      // Update the content if container already exists
      const explanationTab = document.getElementById(
        "followup-explanation-tab"
      );
      const codeTab = document.getElementById("followup-code-tab");

      if (explanationTab) {
        explanationTab.innerHTML = `<p><em>Generating follow-up solution, please wait...</em></p>`;
      }

      if (codeTab) {
        codeTab.innerHTML = `<pre><code><em>Generating code solution...</em></code></pre>`;
      }
    }
  }

  /**
   * Show error message for follow-up solution
   * @param {string} message - The error message
   */
  showFollowupError(message) {
    // Update button text
    this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";

    // Get the explanation tab
    const explanationTab = document.getElementById("followup-explanation-tab");
    if (explanationTab) {
      explanationTab.innerHTML = `<p><em>${message}</em></p>`;
    }

    // Clear the code tab if it exists
    const codeTab = document.getElementById("followup-code-tab");
    if (codeTab) {
      codeTab.innerHTML =
        "<pre><code><em>No code solution available.</em></code></pre>";
    }
  }

  /**
   * Display the follow-up solution
   * @param {Object} solution - The follow-up solution object
   */
  displayFollowupSolution(solution) {
    console.log("Displaying follow-up solution");

    // Update button text
    this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";

    // Get the follow-up explanation and code tabs
    const explanationTab = document.getElementById("followup-explanation-tab");
    const codeTab = document.getElementById("followup-code-tab");

    if (explanationTab && codeTab) {
      // Update explanation tab with technical explanation
      if (solution.explanation) {
        // If we have both explanation and solution fields, show a header for the technical explanation
        const explanationHeader = solution.solution
          ? "<h4>Technical Explanation:</h4>"
          : "";
        explanationTab.innerHTML = `${explanationHeader}<p>${solution.explanation.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        explanationTab.innerHTML = "<p><em>No explanation available.</em></p>";
      }

      // Add the interview-style solution if available
      if (solution.solution) {
        // Add the solution with a header to the explanation tab
        const solutionHtml = `
          <h4>Interview-Style Explanation:</h4>
          <p class="interview-solution">${solution.solution.replace(
            /\n/g,
            "<br>"
          )}</p>
        `;

        // Append to the explanation tab (after the technical explanation if it exists)
        if (solution.explanation) {
          explanationTab.innerHTML += solutionHtml;
        } else {
          explanationTab.innerHTML = solutionHtml;
        }
      }

      // Update code tab
      if (solution.code) {
        // Remove code block markers and detect language
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);

        codeTab.innerHTML = `<pre><code class="language-${language}">${cleanCode}</code></pre>`;

        // Highlight code if Prism is available
        if (window.Prism) {
          const codeElement = codeTab.querySelector("code");
          if (codeElement) {
            window.Prism.highlightElement(codeElement);
          }
        }
      } else {
        codeTab.innerHTML =
          "<pre><code><em>No code solution available.</em></code></pre>";
      }
    }
  }

  /**
   * Poll for the solution
   * @param {string} screenshotPath - The screenshot path
   */
  pollForSolution(screenshotPath) {
    // Extract just the filename from the path
    const filename = screenshotPath.split("/").pop();

    // Clear any existing polling for this screenshot
    if (this.pollIntervals[filename]) {
      clearInterval(this.pollIntervals[filename]);
    }

    // Set up polling interval
    this.pollIntervals[filename] = setInterval(async () => {
      try {
        const data = await apiRequest(`/api/solution/${filename}`);

        // Check if either solution or react_solution is present
        if (data.solution || data.react_solution) {
          // We have a solution, update state with both parts
          appState.update("solution.currentSolution", {
            solution: data.solution,
            react_solution: data.react_solution,
          });
          appState.update("solution.isGenerating", false);

          // Stop polling
          clearInterval(this.pollIntervals[filename]);
          delete this.pollIntervals[filename];
        }
      } catch (error) {
        console.error("Error polling for solution:", error);
        // Stop polling on error
        clearInterval(this.pollIntervals[filename]);
        delete this.pollIntervals[filename];
        appState.update("solution.isGenerating", false);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds if no result
    setTimeout(() => {
      if (this.pollIntervals[filename]) {
        clearInterval(this.pollIntervals[filename]);
        delete this.pollIntervals[filename];

        // Check if we still don't have a solution
        if (appState.get("solution.isGenerating")) {
          this.elements.explanationTab.innerHTML =
            "<p><em>Could not generate solution. Please try again.</em></p>";
          appState.update("solution.isGenerating", false);
        }
      }
    }, 60000);
  }

  /**
   * Show loading state in the solution tabs
   * @param {string} provider - The solution provider (optional)
   */
  showLoadingState(provider = "") {
    const providerText = provider ? ` with ${provider}` : "";

    // Update button text
    if (!provider || provider === "Claude") {
      this.elements.getSolutionBtn.textContent = "Generating solution...";
    } else if (provider === "OpenAI") {
      this.elements.getSolutionWithOpenaiBtn.textContent =
        "Generating solution...";
    } else if (provider === "Gemini") {
      this.elements.getSolutionWithGeminiBtn.textContent =
        "Generating solution...";
    } else if (provider === "Follow-up") {
      this.elements.getSolutionFollowupBtn.textContent =
        "Processing follow-up...";
    }

    // Update tab content
    this.elements.explanationTab.innerHTML = `<p><em>Generating solution${providerText}, please wait...</em></p>`;

    // Update interview-style tab
    const interviewStyleTab = document.getElementById("interview-style-tab");
    if (interviewStyleTab) {
      interviewStyleTab.innerHTML =
        "<p><em>Preparing interview-style explanation...</em></p>";
    }

    this.elements.complexityTab.innerHTML =
      "<p><em>Analyzing complexity...</em></p>";
    this.elements.strategyTab.innerHTML =
      "<p><em>Developing interview strategy...</em></p>";

    // Update code tab content
    const codeTab = document.getElementById("code-tab");
    if (codeTab) {
      codeTab.innerHTML =
        "<pre><code id='code-content'><em>Generating code solution...</em></code></pre>";
    }
  }

  /**
   * Get a React solution for the current question with Gemini
   */
  async getReactSolutionWithGemini() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState("React Gemini");

    try {
      const data = await apiRequest("/api/react-solution-with-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("React Gemini solution request submitted");

        // Start polling for the solution
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting React Gemini solution:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting React Gemini solution:", error);
      appState.update("solution.isGenerating", false);
    }
  }

  /**
   * Get a React solution for the current question with Claude
   */
  async getReactSolutionWithClaude() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState("React Claude"); // Use a distinct identifier

    try {
      const data = await apiRequest("/api/react-solution-with-claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("React Claude solution request submitted");

        // Start polling for the solution
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting React Claude solution:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting React Claude solution:", error);
      appState.update("solution.isGenerating", false);
    }
  }

  /**
   * Update solution buttons state based on generation status
   * @param {boolean} isGenerating - Whether a solution is being generated
   */
  updateSolutionButtonsState(isGenerating) {
    this.elements.getSolutionBtn.disabled = isGenerating;
    this.elements.getSolutionWithOpenaiBtn.disabled = isGenerating;
    this.elements.getSolutionWithGeminiBtn.disabled = isGenerating;
    this.elements.getReactSolutionWithGeminiBtn.disabled = isGenerating;
    this.elements.getReactSolutionWithClaudeBtn.disabled = isGenerating;
    const questionAvailable = !!appState.get(
      "question.currentExtractedQuestion"
    );
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
      isGenerating || !questionAvailable; // Add Gemini2 button

    // Follow-up buttons also depend on having a current solution
    const solutionAvailable = !!appState.get("solution.currentSolution");
    this.elements.getSolutionFollowupBtn.disabled =
      isGenerating || !questionAvailable || !solutionAvailable;
    this.elements.getSolutionFollowupWithGeminiBtn.disabled =
      isGenerating || !questionAvailable || !solutionAvailable;

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
        "Get React Solution2 (Gemini)"; // Add Gemini2 button text reset
      this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";
      this.elements.getSolutionFollowupWithGeminiBtn.textContent =
        "Solve Follow-up with GEMini";
    }
  }

  /**
   * Get a follow-up solution for the current question with Gemini
   */
  async getFollowupSolutionWithGemini() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );
    const currentSolution = appState.get("solution.currentSolution");

    if (
      !currentExtractedQuestion ||
      !currentScreenshotPath ||
      !currentSolution
    ) {
      console.error(
        "No question, screenshot path, or current solution available"
      );
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showFollowupLoadingStateWithGemini();

    try {
      console.log(
        "Getting recent transcriptions for Gemini follow-up solution"
      );
      // First, get recent transcriptions (last 2 minutes)
      const transcriptData = await apiRequest("/api/transcriptions/recent");

      if (!transcriptData || transcriptData.length === 0) {
        console.error("No recent transcriptions available");
        appState.update("solution.isGenerating", false);
        this.showFollowupErrorWithGemini(
          "No recent transcriptions available for follow-up. Please ensure there is recent conversation."
        );
        return;
      }

      console.log(`Found ${transcriptData.length} recent transcriptions`);

      // Combine all recent transcriptions into a single text
      const transcriptText = transcriptData.map((item) => item.text).join("\n");
      console.log(
        `Combined transcript length: ${transcriptText.length} characters`
      );

      console.log("Sending Gemini follow-up solution request");
      // Send the follow-up request
      const data = await apiRequest("/api/solution/followup-with-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem: currentExtractedQuestion,
          code: currentSolution.code,
          transcript: transcriptText,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("Gemini follow-up solution request submitted successfully");

        // Start polling for the follow-up solution
        this.pollForFollowupSolutionWithGemini(currentScreenshotPath);
      } else {
        console.error(
          "Error requesting Gemini follow-up solution:",
          data.message
        );
        appState.update("solution.isGenerating", false);
        this.showFollowupErrorWithGemini(
          "Error requesting Gemini follow-up solution. Please try again."
        );
      }
    } catch (error) {
      console.error("Error requesting Gemini follow-up solution:", error);
      appState.update("solution.isGenerating", false);
      this.showFollowupErrorWithGemini(
        "An error occurred while processing the Gemini follow-up. Please try again."
      );
    }
  }

  /**
   * Poll for the Gemini follow-up solution
   * @param {string} screenshotPath - The screenshot path
   */
  pollForFollowupSolutionWithGemini(screenshotPath) {
    console.log("Starting to poll for Gemini follow-up solution");

    // Extract just the filename from the path
    const filename = screenshotPath.split("/").pop();

    // Clear any existing polling for this screenshot
    if (this.pollIntervals[`gemini-followup-${filename}`]) {
      clearInterval(this.pollIntervals[`gemini-followup-${filename}`]);
    }

    // Set up polling interval
    this.pollIntervals[`gemini-followup-${filename}`] = setInterval(
      async () => {
        try {
          // Get all solutions
          const data = await apiRequest("/api/solutions");

          // Look for Gemini follow-up solutions for this screenshot
          const followupKey = Object.keys(data).find((key) =>
            key.startsWith(`${screenshotPath}:gemini-followup:`)
          );

          if (followupKey && data[followupKey]) {
            console.log("Gemini follow-up solution found:", followupKey);

            // We have a follow-up solution
            const followupSolution = data[followupKey];

            // Display the follow-up solution
            this.displayFollowupSolutionWithGemini(followupSolution);

            // Update state
            appState.update("solution.isGenerating", false);

            // Stop polling
            clearInterval(this.pollIntervals[`gemini-followup-${filename}`]);
            delete this.pollIntervals[`gemini-followup-${filename}`];
          }
        } catch (error) {
          console.error("Error polling for Gemini follow-up solution:", error);
          // Stop polling on error
          clearInterval(this.pollIntervals[`gemini-followup-${filename}`]);
          delete this.pollIntervals[`gemini-followup-${filename}`];
          appState.update("solution.isGenerating", false);
          this.showFollowupErrorWithGemini(
            "Error retrieving Gemini follow-up solution. Please try again."
          );
        }
      },
      2000
    ); // Poll every 2 seconds

    // Stop polling after 60 seconds if no result
    setTimeout(() => {
      if (this.pollIntervals[`gemini-followup-${filename}`]) {
        clearInterval(this.pollIntervals[`gemini-followup-${filename}`]);
        delete this.pollIntervals[`gemini-followup-${filename}`];

        // Check if we still don't have a solution
        if (appState.get("solution.isGenerating")) {
          this.showFollowupErrorWithGemini(
            "Could not generate Gemini follow-up solution. Please try again."
          );
          appState.update("solution.isGenerating", false);
        }
      }
    }, 60000);
  }

  /**
   * Show loading state for Gemini follow-up solution
   */
  showFollowupLoadingStateWithGemini() {
    // Update button text
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Processing Gemini follow-up...";

    // Create or get the follow-up container
    let followupContainer = document.getElementById(
      "gemini-followup-solution-container"
    );

    if (!followupContainer) {
      // Create the follow-up container if it doesn't exist
      followupContainer = document.createElement("div");
      followupContainer.id = "gemini-followup-solution-container";
      followupContainer.className =
        "solution-container followup-solution gemini-followup";

      // Create header
      const header = document.createElement("h3");
      header.textContent = "Gemini Follow-up Solution";
      followupContainer.appendChild(header);

      // Create tabs
      const tabs = document.createElement("div");
      tabs.className = "tabs followup-tabs";
      tabs.innerHTML = `
        <button class="tab-button active" data-tab="gemini-followup-explanation">Explanation</button>
        <button class="tab-button" data-tab="gemini-followup-code">Code</button>
      `;
      followupContainer.appendChild(tabs);

      // Create content div
      const content = document.createElement("div");
      content.id = "gemini-followup-content";
      content.className = "solution-box";
      content.innerHTML = `
        <div id="gemini-followup-explanation-tab" class="tab-content active">
          <p><em>Generating Gemini follow-up solution, please wait...</em></p>
        </div>
        <div id="gemini-followup-code-tab" class="tab-content">
          <pre><code><em>Generating code solution...</em></code></pre>
        </div>
      `;
      followupContainer.appendChild(content);

      // Add to the page inside the followup container
      document
        .getElementById("followup-container")
        .appendChild(followupContainer);

      // Add event listeners for tabs
      const tabButtons = tabs.querySelectorAll(".tab-button");
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          // Remove active class from all buttons and contents
          tabButtons.forEach((btn) => btn.classList.remove("active"));
          const tabContents = content.querySelectorAll(".tab-content");
          tabContents.forEach((content) => content.classList.remove("active"));

          // Add active class to clicked button and corresponding content
          button.classList.add("active");
          const tabId = button.getAttribute("data-tab");
          document.getElementById(`${tabId}-tab`).classList.add("active");
        });
      });
    } else {
      // Update the content if container already exists
      const explanationTab = document.getElementById(
        "gemini-followup-explanation-tab"
      );
      const codeTab = document.getElementById("gemini-followup-code-tab");

      if (explanationTab) {
        explanationTab.innerHTML = `<p><em>Generating Gemini follow-up solution, please wait...</em></p>`;
      }

      if (codeTab) {
        codeTab.innerHTML = `<pre><code><em>Generating code solution...</em></code></pre>`;
      }
    }
  }

  /**
   * Show error message for Gemini follow-up solution
   * @param {string} message - The error message
   */
  showFollowupErrorWithGemini(message) {
    // Update button text
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Solve Follow-up with GEMini";

    // Get the explanation tab
    const explanationTab = document.getElementById(
      "gemini-followup-explanation-tab"
    );
    if (explanationTab) {
      explanationTab.innerHTML = `<p><em>${message}</em></p>`;
    }

    // Clear the code tab if it exists
    const codeTab = document.getElementById("gemini-followup-code-tab");
    if (codeTab) {
      codeTab.innerHTML =
        "<pre><code><em>No code solution available.</em></code></pre>";
    }
  }

  /**
   * Display the Gemini follow-up solution
   * @param {Object} solution - The follow-up solution object
   */
  displayFollowupSolutionWithGemini(solution) {
    console.log("Displaying Gemini follow-up solution");

    // Update button text
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Solve Follow-up with GEMini";

    // Get the follow-up explanation and code tabs
    const explanationTab = document.getElementById(
      "gemini-followup-explanation-tab"
    );
    const codeTab = document.getElementById("gemini-followup-code-tab");

    if (explanationTab && codeTab) {
      // Update explanation tab with technical explanation
      if (solution.explanation) {
        // If we have both explanation and solution fields, show a header for the technical explanation
        const explanationHeader = solution.solution
          ? "<h4>Technical Explanation:</h4>"
          : "";
        explanationTab.innerHTML = `${explanationHeader}<p>${solution.explanation.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        explanationTab.innerHTML = "<p><em>No explanation available.</em></p>";
      }

      // Add the interview-style solution if available
      if (solution.solution) {
        // Add the solution with a header to the explanation tab
        const solutionHtml = `
          <h4>Interview-Style Explanation:</h4>
          <p class="interview-solution">${solution.solution.replace(
            /\n/g,
            "<br>"
          )}</p>
        `;

        // Append to the explanation tab (after the technical explanation if it exists)
        if (solution.explanation) {
          explanationTab.innerHTML += solutionHtml;
        } else {
          explanationTab.innerHTML = solutionHtml;
        }
      }

      // Update code tab
      if (solution.code) {
        // Remove code block markers and detect language
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);

        codeTab.innerHTML = `<pre><code class="language-${language}">${cleanCode}</code></pre>`;

        // Highlight code if Prism is available
        if (window.Prism) {
          const codeElement = codeTab.querySelector("code");
          if (codeElement) {
            window.Prism.highlightElement(codeElement);
          }
        }
      } else {
        codeTab.innerHTML =
          "<pre><code><em>No code solution available.</em></code></pre>";
      }
    }
  }

  /**
   * Display the solution
   * @param {Object} solution - The structured solution object
   * @param {string} reactSolution - The raw React solution string (optional)
   */
  displaySolution(solution, reactSolution) {
    // Update the standard solution tabs if solution object exists
    if (solution) {
      if (solution.explanation) {
        this.elements.explanationTab.innerHTML = `<p>${solution.explanation.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        this.elements.explanationTab.innerHTML =
          "<p><em>No explanation available.</em></p>";
      }

      // Update the interview-style tab
      if (solution.solution) {
        document.getElementById("interview-style-tab").innerHTML = `
          <p class="interview-solution">${solution.solution.replace(
            /\n/g,
            "<br>"
          )}</p>
        `;
      } else {
        document.getElementById("interview-style-tab").innerHTML =
          "<p><em>No interview-style explanation available.</em></p>";
      }

      if (solution.code) {
        // Remove code block markers and detect language
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);

        // Update the code tab content
        const codeElement = document.getElementById("code-content");
        if (codeElement) {
          codeElement.className = `language-${language}`;
          codeElement.innerHTML = cleanCode;

          // Trigger Prism to highlight the code if available
          if (window.Prism) {
            window.Prism.highlightElement(codeElement);
          }
        }
      } else {
        const codeElement = document.getElementById("code-content");
        if (codeElement) {
          codeElement.innerHTML = "<em>No code solution available.</em>";
        }
      }

      if (solution.complexity) {
        this.elements.complexityTab.innerHTML = `<p>${solution.complexity.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        this.elements.complexityTab.innerHTML =
          "<p><em>No complexity analysis available.</em></p>";
      }

      if (solution.strategy) {
        this.elements.strategyTab.innerHTML = `<p>${solution.strategy.replace(
          /\n/g,
          "<br>"
        )}</p>`;
      } else {
        this.elements.strategyTab.innerHTML =
          "<p><em>No interview strategy available.</em></p>";
      }
    } else {
      // If no standard solution object, clear the tabs
      this.elements.explanationTab.innerHTML =
        "<p><em>No solution available.</em></p>";
      document.getElementById("interview-style-tab").innerHTML =
        "<p><em>No solution available.</em></p>";
      const codeElement = document.getElementById("code-content");
      if (codeElement) {
        codeElement.innerHTML = "<em>No solution available.</em>";
      }
      this.elements.complexityTab.innerHTML =
        "<p><em>No solution available.</em></p>";
      this.elements.strategyTab.innerHTML =
        "<p><em>No solution available.</em></p>";
    }

    // Update the dedicated React Solution section if reactSolution exists
    const reactSolutionContainer = document.getElementById(
      "react-solution-content"
    );
    if (reactSolutionContainer) {
      if (reactSolution) {
        // Display the raw React solution code, preserving formatting
        // Use textContent to prevent HTML injection and preserve whitespace/newlines
        // Clean the React solution code first
        const cleanReactCode = cleanCodeMarkdown(reactSolution);

        const preElement = document.createElement("pre");
        const codeElement = document.createElement("code");
        codeElement.className = "language-jsx"; // Assume JSX for highlighting
        codeElement.textContent = cleanReactCode; // Use cleaned code
        preElement.appendChild(codeElement);
        reactSolutionContainer.innerHTML = ""; // Clear previous content
        reactSolutionContainer.appendChild(preElement);

        // Trigger Prism highlighting if available
        if (window.Prism) {
          window.Prism.highlightElement(codeElement);
        }
      } else {
        reactSolutionContainer.innerHTML =
          "<p><em>No React solution available.</em></p>";
      }
    }
  }

  /**
   * Poll for updates
   */
  poll() {
    // No polling needed here as we use specific polling for solutions
  }

  /**
   * Get a React solution2 for the current question with Gemini (using Claude's prompt)
   */
  async getReactSolution2WithGemini() {
    const currentExtractedQuestion = appState.get(
      "question.currentExtractedQuestion"
    );
    const currentScreenshotPath = appState.get(
      "screenshots.currentScreenshotPath"
    );

    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Update state to show loading
    appState.update("solution.isGenerating", true);

    // Show loading state in UI
    this.showLoadingState("React Gemini2"); // Use a distinct identifier

    try {
      const data = await apiRequest("/api/react-solution2-with-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentExtractedQuestion,
          screenshot_path: currentScreenshotPath,
        }),
      });

      if (data.status === "success") {
        console.log("React Gemini solution2 request submitted");

        // Start polling for the solution (uses the same polling mechanism)
        this.pollForSolution(currentScreenshotPath);
      } else {
        console.error("Error requesting React Gemini solution2:", data.message);
        appState.update("solution.isGenerating", false);
      }
    } catch (error) {
      console.error("Error requesting React Gemini solution2:", error);
      appState.update("solution.isGenerating", false);
    }
  }
}
