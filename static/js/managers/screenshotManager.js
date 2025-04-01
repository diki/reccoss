/**
 * Screenshot Manager
 * Handles all screenshot-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";

export class ScreenshotManager {
  /**
   * Create a new ScreenshotManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.setupEventListeners();
    this.setupStateSubscriptions();
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    this.elements.takeScreenshotBtn.addEventListener("click", () =>
      this.takeScreenshot()
    );
    this.elements.extractWithGeminiBtn.addEventListener("click", () =>
      this.extractWithGemini()
    );
    this.elements.getDesignQuestionBtn.addEventListener("click", () =>
      this.getDesignQuestion()
    );
    this.elements.extractWithOpenaiBtn.addEventListener("click", () =>
      this.extractWithOpenai()
    );
    this.elements.extractReactQuestionBtn.addEventListener("click", () =>
      this.extractReactQuestion()
    );

    // Add click event delegation for screenshot items
    this.elements.screenshotsContainer.addEventListener("click", (event) => {
      const screenshotItem = event.target.closest(".screenshot-item");
      if (screenshotItem) {
        const path = screenshotItem.getAttribute("data-path");
        if (path) {
          this.selectScreenshot(path);
        }
      }
    });
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("screenshots.items:changed", (screenshots) => {
      this.renderScreenshots(screenshots);
    });

    StateEvents.on("screenshots.currentScreenshotPath:changed", (path) => {
      this.highlightSelectedScreenshot(path);
    });
  }

  /**
   * Take a screenshot and extract with Claude
   */
  async takeScreenshot() {
    // Reset the manually selected screenshot flag
    appState.update("screenshots.manuallySelectedScreenshot", false);

    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    // Show loading message
    if (questionType === "coding") {
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Extracting coding question...</em></p>";
    }

    try {
      const data = await apiRequest("/api/screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Screenshot taken:", data.screenshot);

        // Update screenshots in state
        const screenshots = [
          ...appState.get("screenshots.items"),
          data.screenshot,
        ];
        appState.update("screenshots.items", screenshots);

        // If it's a coding question and we have an extracted question
        if (questionType === "coding") {
          if (data.extracted_question) {
            // Display the extracted question
            this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

            // Enable the solution buttons
            this.elements.getSolutionBtn.disabled = false;
            this.elements.getSolutionWithOpenaiBtn.disabled = false;
            this.elements.getSolutionWithGeminiBtn.disabled = false;

            // Store the current question and screenshot path
            appState.update(
              "question.currentExtractedQuestion",
              data.extracted_question
            );
            appState.update(
              "screenshots.currentScreenshotPath",
              data.screenshot.path
            );
          } else {
            this.elements.extractedQuestionContainer.innerHTML =
              "<p><em>Could not extract coding question. Please try again.</em></p>";
          }
        }
      } else {
        console.error("Error taking screenshot:", data.message);
      }
    } catch (error) {
      console.error("Error taking screenshot:", error);
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting question. Please try again.</em></p>";
    }
  }

  /**
   * Extract question with Gemini
   */
  async extractWithGemini() {
    // Reset the manually selected screenshot flag
    appState.update("screenshots.manuallySelectedScreenshot", false);

    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    // Show loading message
    if (questionType === "coding") {
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Extracting coding question with Gemini...</em></p>";
    }

    try {
      const data = await apiRequest("/api/extract-with-gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Screenshot taken for Gemini extraction:", data.screenshot);

        // Update screenshots in state
        const screenshots = [
          ...appState.get("screenshots.items"),
          data.screenshot,
        ];
        appState.update("screenshots.items", screenshots);

        // If it's a coding question and we have an extracted question
        if (questionType === "coding") {
          if (data.extracted_question) {
            // Display the extracted question
            this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

            // Enable the solution buttons
            this.elements.getSolutionBtn.disabled = false;
            this.elements.getSolutionWithOpenaiBtn.disabled = false;
            this.elements.getSolutionWithGeminiBtn.disabled = false;

            // Store the current question and screenshot path
            appState.update(
              "question.currentExtractedQuestion",
              data.extracted_question
            );
            appState.update(
              "screenshots.currentScreenshotPath",
              data.screenshot.path
            );
          } else {
            this.elements.extractedQuestionContainer.innerHTML =
              "<p><em>Could not extract coding question with Gemini. Please try again.</em></p>";
          }
        }
      } else {
        console.error(
          "Error taking screenshot for Gemini extraction:",
          data.message
        );
      }
    } catch (error) {
      console.error("Error taking screenshot for Gemini extraction:", error);
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting question with Gemini. Please try again.</em></p>";
    }
  }

  /**
   * Get design system question
   */
  async getDesignQuestion() {
    // Reset the manually selected screenshot flag
    appState.update("screenshots.manuallySelectedScreenshot", false);

    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    // Show loading message
    this.elements.extractedQuestionContainer.innerHTML =
      "<p><em>Extracting design system question...</em></p>";

    try {
      const data = await apiRequest("/api/get-design-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Screenshot taken for design question:", data.screenshot);

        // Update screenshots in state
        const screenshots = [
          ...appState.get("screenshots.items"),
          data.screenshot,
        ];
        appState.update("screenshots.items", screenshots);

        if (data.extracted_question) {
          // Display the extracted question
          this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

          // Enable the solution buttons
          this.elements.getSolutionBtn.disabled = false;
          this.elements.getSolutionWithOpenaiBtn.disabled = false;
          this.elements.getSolutionWithGeminiBtn.disabled = false;
          this.elements.getReactSolutionWithGeminiBtn.disabled = false;

          // Store the current question and screenshot path
          appState.update(
            "question.currentExtractedQuestion",
            data.extracted_question
          );
          appState.update(
            "screenshots.currentScreenshotPath",
            data.screenshot.path
          );
        } else {
          this.elements.extractedQuestionContainer.innerHTML =
            "<p><em>Could not extract design question. Please try again.</em></p>";
        }
      } else {
        console.error(
          "Error taking screenshot for design question:",
          data.message
        );
      }
    } catch (error) {
      console.error("Error taking screenshot for design question:", error);
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting design question. Please try again.</em></p>";
    }
  }

  /**
   * Extract React question with Gemini
   */
  async extractReactQuestion() {
    // Reset the manually selected screenshot flag
    appState.update("screenshots.manuallySelectedScreenshot", false);

    const questionType = "react";
    const notes = appState.get("question.notes");

    // Show loading message
    this.elements.extractedQuestionContainer.innerHTML =
      "<p><em>Extracting React question with Gemini...</em></p>";

    try {
      const data = await apiRequest("/api/extract-react-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log(
          "Screenshot taken for React question extraction:",
          data.screenshot
        );

        // Update screenshots in state
        const screenshots = [
          ...appState.get("screenshots.items"),
          data.screenshot,
        ];
        appState.update("screenshots.items", screenshots);

        if (data.extracted_question) {
          // Display the extracted question
          this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

          // Enable the solution buttons
          this.elements.getSolutionBtn.disabled = false;
          this.elements.getSolutionWithOpenaiBtn.disabled = false;
          this.elements.getSolutionWithGeminiBtn.disabled = false;
          this.elements.getReactSolutionWithGeminiBtn.disabled = false;

          // Store the current question and screenshot path
          appState.update(
            "question.currentExtractedQuestion",
            data.extracted_question
          );
          appState.update(
            "screenshots.currentScreenshotPath",
            data.screenshot.path
          );
        } else {
          this.elements.extractedQuestionContainer.innerHTML =
            "<p><em>Could not extract React question. Please try again.</em></p>";
        }
      } else {
        console.error(
          "Error taking screenshot for React question extraction:",
          data.message
        );
      }
    } catch (error) {
      console.error(
        "Error taking screenshot for React question extraction:",
        error
      );
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting React question. Please try again.</em></p>";
    }
  }

  /**
   * Extract question with OpenAI
   */
  async extractWithOpenai() {
    // Reset the manually selected screenshot flag
    appState.update("screenshots.manuallySelectedScreenshot", false);

    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    // Show loading message
    if (questionType === "coding") {
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Extracting coding question with OpenAI...</em></p>";
    }

    try {
      const data = await apiRequest("/api/extract-with-openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_type: questionType,
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Screenshot taken for OpenAI extraction:", data.screenshot);

        // Update screenshots in state
        const screenshots = [
          ...appState.get("screenshots.items"),
          data.screenshot,
        ];
        appState.update("screenshots.items", screenshots);

        // If it's a coding question and we have an extracted question
        if (questionType === "coding") {
          if (data.extracted_question) {
            // Display the extracted question
            this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

            // Enable the solution buttons
            this.elements.getSolutionBtn.disabled = false;
            this.elements.getSolutionWithOpenaiBtn.disabled = false;
            this.elements.getSolutionWithGeminiBtn.disabled = false;

            // Store the current question and screenshot path
            appState.update(
              "question.currentExtractedQuestion",
              data.extracted_question
            );
            appState.update(
              "screenshots.currentScreenshotPath",
              data.screenshot.path
            );
          } else {
            this.elements.extractedQuestionContainer.innerHTML =
              "<p><em>Could not extract coding question with OpenAI. Please try again.</em></p>";
          }
        }
      } else {
        console.error(
          "Error taking screenshot for OpenAI extraction:",
          data.message
        );
      }
    } catch (error) {
      console.error("Error taking screenshot for OpenAI extraction:", error);
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting question with OpenAI. Please try again.</em></p>";
    }
  }

  /**
   * Select a screenshot
   * @param {string} path - The screenshot path
   */
  async selectScreenshot(path) {
    // Set the flag to indicate a screenshot has been manually selected
    appState.update("screenshots.manuallySelectedScreenshot", true);
    appState.update("screenshots.currentScreenshotPath", path);

    const filename = path.split("/").pop();

    try {
      // Fetch and display the extracted question for this screenshot
      const data = await apiRequest(`/api/extracted_question/${filename}`);

      if (data.question) {
        this.elements.extractedQuestionContainer.innerHTML = `<p>${data.question}</p>`;

        // Enable the solution buttons
        this.elements.getSolutionBtn.disabled = false;
        this.elements.getSolutionWithOpenaiBtn.disabled = false;
        this.elements.getSolutionWithGeminiBtn.disabled = false;
        this.elements.getReactSolutionWithGeminiBtn.disabled = false;

        // Store the current question
        appState.update("question.currentExtractedQuestion", data.question);

        // Check if we already have a solution for this screenshot
        this.checkForExistingSolution(filename);
      } else {
        this.elements.extractedQuestionContainer.innerHTML =
          "<p><em>No coding question extracted for this screenshot.</em></p>";

        // Disable the solution buttons
        this.elements.getSolutionBtn.disabled = true;
        this.elements.getSolutionWithOpenaiBtn.disabled = true;
        this.elements.getSolutionWithGeminiBtn.disabled = true;
        this.elements.getReactSolutionWithGeminiBtn.disabled = true;

        // Clear current question
        appState.update("question.currentExtractedQuestion", "");
      }
    } catch (error) {
      console.error("Error fetching extracted question:", error);
    }
  }

  /**
   * Check if we already have a solution for a screenshot
   * @param {string} screenshotFilename - The screenshot filename
   */
  async checkForExistingSolution(screenshotFilename) {
    try {
      const data = await apiRequest(`/api/solution/${screenshotFilename}`);

      if (data.solution) {
        // We already have a solution, emit an event to display it
        StateEvents.emit("solution:available", data.solution);
      }
    } catch (error) {
      console.error("Error checking for existing solution:", error);
    }
  }

  /**
   * Render screenshots
   * @param {Array} screenshots - The screenshots to render
   */
  renderScreenshots(screenshots) {
    if (screenshots.length > 0) {
      // Create HTML for screenshots
      const screenshotsHTML = screenshots
        .map(
          (screenshot) => `
            <div class="screenshot-item" data-path="${screenshot.path}">
              <img src="/screenshots/${screenshot.path
                .split("/")
                .pop()}" alt="Screenshot">
              <div class="screenshot-info">
                <div>${screenshot.timestamp}</div>
                <div>${screenshot.question_type}</div>
              </div>
            </div>
          `
        )
        .join("");

      this.elements.screenshotsContainer.innerHTML = screenshotsHTML;

      // Highlight the currently selected screenshot
      this.highlightSelectedScreenshot(
        appState.get("screenshots.currentScreenshotPath")
      );
    }
  }

  /**
   * Highlight the selected screenshot
   * @param {string} path - The path of the selected screenshot
   */
  highlightSelectedScreenshot(path) {
    // Remove highlight from all screenshots
    const items =
      this.elements.screenshotsContainer.querySelectorAll(".screenshot-item");
    items.forEach((item) => item.classList.remove("selected"));

    // Add highlight to the selected screenshot
    if (path) {
      const selectedItem = this.elements.screenshotsContainer.querySelector(
        `[data-path="${path}"]`
      );
      if (selectedItem) {
        selectedItem.classList.add("selected");
      }
    }
  }

  /**
   * Update all extracted questions
   */
  async updateExtractedQuestions() {
    try {
      const data = await apiRequest("/api/extracted_questions");

      // Only update if no screenshot has been manually selected
      if (
        !appState.get("screenshots.manuallySelectedScreenshot") &&
        Object.keys(data).length > 0
      ) {
        const screenshots = appState.get("screenshots.items");

        if (screenshots.length > 0) {
          const latestScreenshot = screenshots[screenshots.length - 1];

          if (latestScreenshot.question_type === "coding") {
            const question = data[latestScreenshot.path];

            if (question) {
              this.elements.extractedQuestionContainer.innerHTML = `<p>${question}</p>`;

              // Enable the solution buttons
              this.elements.getSolutionBtn.disabled = false;
              this.elements.getSolutionWithOpenaiBtn.disabled = false;
              this.elements.getSolutionWithGeminiBtn.disabled = false;
              this.elements.getReactSolutionWithGeminiBtn.disabled = false;

              // Store the current question and screenshot path
              appState.update("question.currentExtractedQuestion", question);
              appState.update(
                "screenshots.currentScreenshotPath",
                latestScreenshot.path
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching extracted questions:", error);
    }
  }

  /**
   * Update screenshots display
   */
  async updateScreenshotsDisplay() {
    try {
      const data = await apiRequest("/api/screenshots");
      appState.update("screenshots.items", data);
    } catch (error) {
      console.error("Error fetching screenshots:", error);
    }
  }

  /**
   * Poll for updates
   */
  poll() {
    this.updateScreenshotsDisplay();
    this.updateExtractedQuestions();
  }
}
