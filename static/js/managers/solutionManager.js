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

    if (!isGenerating) {
      this.elements.getSolutionBtn.textContent = "Get Solution";
      this.elements.getSolutionWithOpenaiBtn.textContent =
        "Get Solution with OpenAI";
      this.elements.getSolutionWithGeminiBtn.textContent =
        "Get Solution with Gemini";
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
