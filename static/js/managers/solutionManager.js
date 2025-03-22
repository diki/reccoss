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

    StateEvents.on("solution.currentSolution:changed", (solution) => {
      if (solution) {
        this.displaySolution(solution);
      }
    });

    // Listen for solution availability from other managers
    StateEvents.on("solution:available", (solution) => {
      appState.update("solution.currentSolution", solution);
    });
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

      // Create content div
      const content = document.createElement("div");
      content.id = "followup-content";
      content.className = "solution-box";
      followupContainer.appendChild(content);

      // Add to the page inside the solution container
      const solutionContainer = document.querySelector(".solution-container");
      solutionContainer.appendChild(followupContainer);
    }

    // Update the content
    const followupContent = document.getElementById("followup-content");
    followupContent.innerHTML = `
      <div class="followup-explanation">
        <p><em>Generating follow-up solution, please wait...</em></p>
      </div>
      <div class="followup-code">
        <pre><code><em>Generating code solution...</em></code></pre>
      </div>
    `;
  }

  /**
   * Show error message for follow-up solution
   * @param {string} message - The error message
   */
  showFollowupError(message) {
    // Update button text
    this.elements.getSolutionFollowupBtn.textContent = "Solve Follow-up";

    // Get the follow-up content
    const followupContent = document.getElementById("followup-content");
    if (followupContent) {
      followupContent.innerHTML = `
        <div class="followup-explanation">
          <p><em>${message}</em></p>
        </div>
      `;
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

    // Get the follow-up content
    const followupContent = document.getElementById("followup-content");

    if (followupContent) {
      // Create the content HTML
      let html = "";

      // Add explanation
      if (solution.explanation) {
        html += `
          <div class="followup-explanation">
            <h4>Explanation</h4>
            <p>${solution.explanation.replace(/\n/g, "<br>")}</p>
          </div>
        `;
      }

      // Add code
      if (solution.code) {
        // Remove code block markers and detect language
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);

        html += `
          <div class="followup-code">
            <h4>Updated Code</h4>
            <pre><code class="language-${language}">${cleanCode}</code></pre>
          </div>
        `;
      }

      // Update the content
      followupContent.innerHTML = html;

      // Highlight code if Prism is available
      if (window.Prism) {
        const codeElement = followupContent.querySelector("code");
        if (codeElement) {
          window.Prism.highlightElement(codeElement);
        }
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

        if (data.solution) {
          // We have a solution, update state
          appState.update("solution.currentSolution", data.solution);
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
    this.elements.codeContent.innerHTML =
      "<em>Generating code solution...</em>";
    this.elements.complexityTab.innerHTML =
      "<p><em>Analyzing complexity...</em></p>";
    this.elements.strategyTab.innerHTML =
      "<p><em>Developing interview strategy...</em></p>";
  }

  /**
   * Update solution buttons state based on generation status
   * @param {boolean} isGenerating - Whether a solution is being generated
   */
  updateSolutionButtonsState(isGenerating) {
    this.elements.getSolutionBtn.disabled = isGenerating;
    this.elements.getSolutionWithOpenaiBtn.disabled = isGenerating;
    this.elements.getSolutionWithGeminiBtn.disabled = isGenerating;
    this.elements.getSolutionFollowupBtn.disabled = isGenerating;
    this.elements.getSolutionFollowupWithGeminiBtn.disabled = isGenerating;

    if (!isGenerating) {
      this.elements.getSolutionBtn.textContent = "Get Solution";
      this.elements.getSolutionWithOpenaiBtn.textContent =
        "Get Solution with OpenAI";
      this.elements.getSolutionWithGeminiBtn.textContent =
        "Get Solution with Gemini";
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

      // Create content div
      const content = document.createElement("div");
      content.id = "gemini-followup-content";
      content.className = "solution-box";
      followupContainer.appendChild(content);

      // Add to the page inside the solution container
      const solutionContainer = document.querySelector(".solution-container");
      solutionContainer.appendChild(followupContainer);
    }

    // Update the content
    const followupContent = document.getElementById("gemini-followup-content");
    followupContent.innerHTML = `
      <div class="followup-explanation">
        <p><em>Generating Gemini follow-up solution, please wait...</em></p>
      </div>
      <div class="followup-code">
        <pre><code><em>Generating code solution...</em></code></pre>
      </div>
    `;
  }

  /**
   * Show error message for Gemini follow-up solution
   * @param {string} message - The error message
   */
  showFollowupErrorWithGemini(message) {
    // Update button text
    this.elements.getSolutionFollowupWithGeminiBtn.textContent =
      "Solve Follow-up with GEMini";

    // Get the follow-up content
    const followupContent = document.getElementById("gemini-followup-content");
    if (followupContent) {
      followupContent.innerHTML = `
        <div class="followup-explanation">
          <p><em>${message}</em></p>
        </div>
      `;
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

    // Get the follow-up content
    const followupContent = document.getElementById("gemini-followup-content");

    if (followupContent) {
      // Create the content HTML
      let html = "";

      // Add explanation
      if (solution.explanation) {
        html += `
          <div class="followup-explanation">
            <h4>Explanation</h4>
            <p>${solution.explanation.replace(/\n/g, "<br>")}</p>
          </div>
        `;
      }

      // Add code
      if (solution.code) {
        // Remove code block markers and detect language
        const cleanCode = cleanCodeMarkdown(solution.code);
        const language = detectLanguage(cleanCode);

        html += `
          <div class="followup-code">
            <h4>Updated Code</h4>
            <pre><code class="language-${language}">${cleanCode}</code></pre>
          </div>
        `;
      }

      // Update the content
      followupContent.innerHTML = html;

      // Highlight code if Prism is available
      if (window.Prism) {
        const codeElement = followupContent.querySelector("code");
        if (codeElement) {
          window.Prism.highlightElement(codeElement);
        }
      }
    }
  }

  /**
   * Display the solution
   * @param {Object} solution - The solution object
   */
  displaySolution(solution) {
    // Update the solution tabs
    if (solution.explanation) {
      this.elements.explanationTab.innerHTML = `<p>${solution.explanation.replace(
        /\n/g,
        "<br>"
      )}</p>`;
    } else {
      this.elements.explanationTab.innerHTML =
        "<p><em>No explanation available.</em></p>";
    }

    if (solution.code) {
      // Remove code block markers and detect language
      const cleanCode = cleanCodeMarkdown(solution.code);
      const language = detectLanguage(cleanCode);

      // Set the code content with the appropriate language class
      this.elements.codeContent.className = `language-${language}`;
      this.elements.codeContent.innerHTML = cleanCode;

      // Trigger Prism to highlight the code if available
      if (window.Prism) {
        window.Prism.highlightElement(this.elements.codeContent);
      }
    } else {
      this.elements.codeContent.innerHTML =
        "<em>No code solution available.</em>";
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
  }

  /**
   * Poll for updates
   */
  poll() {
    // No polling needed here as we use specific polling for solutions
  }
}
