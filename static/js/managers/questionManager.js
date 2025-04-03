/**
 * Question Manager
 * Handles all question-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";

export class QuestionManager {
  /**
   * Create a new QuestionManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    // Ensure the new button element is available
    this.extractQuestionTranscriptBtn = elements.extractQuestionTranscriptBtn;
    this.setupEventListeners();
    this.setupStateSubscriptions();
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // this.elements.markQuestionBtn.addEventListener("click", () =>
    //   this.markQuestion()
    // );
    // this.elements.markFollowupBtn.addEventListener("click", () =>
    //   this.markFollowup()
    // );
    // // Listen for question type changes
    // this.elements.questionTypeSelect.addEventListener("change", (event) => {
    //   appState.update("question.type", event.target.value);
    // });
    // // Listen for question notes changes
    // this.elements.questionNotesInput.addEventListener("input", (event) => {
    //   appState.update("question.notes", event.target.value);
    // });

    // Add listener for the new transcript extraction button
    if (this.extractQuestionTranscriptBtn) {
      this.extractQuestionTranscriptBtn.addEventListener("click", () =>
        this.extractQuestionFromTranscript()
      );
    } else {
      console.error(
        "Extract Question (Transcript) button not found in DOM elements."
      );
    }
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("question.current:changed", (question) => {
      console.log("Current question updated:", question);
    });

    StateEvents.on("question.currentExtractedQuestion:changed", (question) => {
      if (question) {
        this.elements.extractedQuestionContainer.innerHTML = `<p>${question}</p>`;
      } else {
        this.elements.extractedQuestionContainer.innerHTML =
          "<p><em>No coding question extracted yet...</em></p>";
      }
    });
  }

  /**
   * Mark a new question
   */
  async markQuestion() {
    const questionType = appState.get("question.type");
    const notes = appState.get("question.notes");

    try {
      const data = await apiRequest("/api/question/mark", {
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
        console.log("Question marked:", data.question);
        appState.update("question.current", data.question);

        // Add a question marker to the transcription history
        const marker = document.createElement("div");
        marker.className = "question-marker";
        marker.textContent = `New ${questionType} Question`;

        if (notes) {
          const noteElem = document.createElement("div");
          noteElem.className = "question-note";
          noteElem.textContent = notes;
          marker.appendChild(noteElem);
        }

        this.elements.transcriptionHistory.appendChild(marker);
        this.elements.transcriptionHistory.scrollTop =
          this.elements.transcriptionHistory.scrollHeight;

        // Clear the notes field
        this.elements.questionNotesInput.value = "";
        appState.update("question.notes", "");
      } else {
        console.error("Error marking question:", data.message);
      }
    } catch (error) {
      console.error("Error marking question:", error);
    }
  }

  /**
   * Mark a follow-up question
   */
  async markFollowup() {
    const notes = appState.get("question.notes");

    try {
      const data = await apiRequest("/api/question/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: notes,
        }),
      });

      if (data.status === "success") {
        console.log("Follow-up marked:", data.followup);

        // Add a follow-up marker to the transcription history
        const marker = document.createElement("div");
        marker.className = "followup-marker";
        marker.textContent = "Follow-up";

        const container = document.createElement("div");
        container.className = "transcription-item";
        container.appendChild(marker);

        if (notes) {
          const noteElem = document.createElement("div");
          noteElem.className = "question-note";
          noteElem.textContent = notes;
          container.appendChild(noteElem);
        }

        this.elements.transcriptionHistory.appendChild(container);
        this.elements.transcriptionHistory.scrollTop =
          this.elements.transcriptionHistory.scrollHeight;

        // Clear the notes field
        this.elements.questionNotesInput.value = "";
        appState.update("question.notes", "");
      } else {
        console.error("Error marking follow-up:", data.message);
      }
    } catch (error) {
      console.error("Error marking follow-up:", error);
    }
  }

  /**
   * Poll for question-related updates
   */
  poll() {
    // No polling needed for questions
  }

  /**
   * Extract question from transcript using Gemini
   */
  async extractQuestionFromTranscript() {
    console.log("Attempting to extract question from transcript...");

    // Reset screenshot selection state
    appState.update("screenshots.manuallySelectedScreenshot", false);
    appState.update("screenshots.currentScreenshotPath", null);

    // Show loading message
    this.elements.extractedQuestionContainer.innerHTML =
      "<p><em>Extracting question from transcript... (using Gemini)</em></p>";

    // Disable solution buttons initially
    this.disableSolutionButtons();

    try {
      const data = await apiRequest("/api/extract-question-from-transcript", {
        method: "POST",
        // No body needed as the backend retrieves the transcript
      });

      if (data.status === "success" && data.extracted_question) {
        console.log(
          "Successfully extracted question from transcript:",
          data.extracted_question
        );
        // Display the extracted question
        this.elements.extractedQuestionContainer.innerHTML = `<p>${data.extracted_question}</p>`;

        // Enable the solution buttons
        this.enableSolutionButtons();

        // Store the current question (using the transcript key)
        appState.update(
          "question.currentExtractedQuestion",
          data.extracted_question
        );
        // We don't have a specific screenshot path here, maybe store the key?
        // appState.update("question.currentStorageKey", data.storage_key); // Optional: store the key if needed later
      } else {
        console.error(
          "Error extracting question from transcript:",
          data.message
        );
        this.elements.extractedQuestionContainer.innerHTML = `<p><em>Could not extract question from transcript: ${
          data.message || "Unknown error"
        }</em></p>`;
      }
    } catch (error) {
      console.error(
        "Error calling API to extract question from transcript:",
        error
      );
      this.elements.extractedQuestionContainer.innerHTML =
        "<p><em>Error extracting question from transcript. Please check logs.</em></p>";
    }
  }

  /** Helper function to disable solution buttons */
  disableSolutionButtons() {
    this.elements.getSolutionBtn.disabled = true;
    this.elements.getSolutionWithOpenaiBtn.disabled = true;
    this.elements.getSolutionWithGeminiBtn.disabled = true;
    this.elements.getReactSolutionWithGeminiBtn.disabled = true;
    this.elements.getReactSolutionWithClaudeBtn.disabled = true;
    this.elements.getReactSolution2WithGeminiBtn.disabled = true;
    this.elements.getSolutionFollowupBtn.disabled = true;
    this.elements.getSolutionFollowupWithGeminiBtn.disabled = true;
    this.elements.getFollowupSolutionClaudeReactBtn.disabled = true;
    this.elements.getReactFollowupGeminiBtn.disabled = true;
  }

  /** Helper function to enable relevant solution buttons */
  enableSolutionButtons() {
    // Enable standard solution buttons after extracting any question
    this.elements.getSolutionBtn.disabled = false;
    this.elements.getSolutionWithOpenaiBtn.disabled = false;
    this.elements.getSolutionWithGeminiBtn.disabled = false;
    // Enable React buttons too, as the question might be React-related
    this.elements.getReactSolutionWithGeminiBtn.disabled = false;
    this.elements.getReactSolutionWithClaudeBtn.disabled = false;
    // Keep follow-up buttons disabled until an initial solution is generated
    this.elements.getSolutionFollowupBtn.disabled = true;
    this.elements.getSolutionFollowupWithGeminiBtn.disabled = true;
    this.elements.getFollowupSolutionClaudeReactBtn.disabled = true;
    this.elements.getReactFollowupGeminiBtn.disabled = true;
  }
}
