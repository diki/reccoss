/**
 * Transcription Manager
 * Handles all transcription-related functionality
 */
import { appState } from "../state/AppState.js";
import { StateEvents } from "../state/StateEvents.js";
import { apiRequest } from "../utils/utils.js";

export class TranscriptionManager {
  /**
   * Create a new TranscriptionManager
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.setupStateSubscriptions();
  }

  /**
   * Set up state change subscriptions
   */
  setupStateSubscriptions() {
    StateEvents.on("recording.transcriptionCount:changed", (count) => {
      // Handle transcription count changes
      console.log("Transcription count updated:", count);
    });

    StateEvents.on("recording.currentSpeaker:changed", (speaker) => {
      // Handle speaker changes
      console.log("Current speaker updated:", speaker);
    });
  }

  /**
   * Update the latest transcription
   */
  async updateLatestTranscription() {
    try {
      const data = await apiRequest("/api/transcriptions/latest");

      if (data.text) {
        // Toggle between interviewer and interviewee for demo purposes
        // In a real implementation, you would use speaker diarization or manual selection
        const currentSpeaker = appState.get("recording.currentSpeaker");
        const newSpeaker =
          currentSpeaker === "interviewer" ? "interviewee" : "interviewer";
        appState.update("recording.currentSpeaker", newSpeaker);

        const transcriptionHTML = `
          <p class="transcription-text">${data.text}</p>
          <p class="transcription-timestamp">Time: ${data.timestamp}</p>
        `;

        if (newSpeaker === "interviewer") {
          this.elements.interviewerTranscription.innerHTML = transcriptionHTML;
        } else {
          this.elements.latestTranscription.innerHTML = transcriptionHTML;
        }
      }
    } catch (error) {
      console.error("Error fetching latest transcription:", error);
    }
  }

  /**
   * Update the transcription history
   */
  async updateTranscriptionHistory() {
    try {
      const data = await apiRequest("/api/transcriptions");

      if (data.length > 0) {
        const currentCount = appState.get("recording.transcriptionCount");

        // Check if we have new transcriptions
        if (data.length > currentCount) {
          appState.update("recording.transcriptionCount", data.length);

          // Update the history display
          const historyHTML = data
            .map(
              (item) => `
                <div class="transcription-item">
                  <p class="transcription-text">${item.text}</p>
                  <p class="transcription-timestamp">Time: ${item.timestamp}</p>
                </div>
              `
            )
            .join("");

          this.elements.transcriptionHistory.innerHTML = historyHTML;

          // Scroll to the bottom of the history
          this.elements.transcriptionHistory.scrollTop =
            this.elements.transcriptionHistory.scrollHeight;
        }
      }
    } catch (error) {
      console.error("Error fetching transcription history:", error);
    }
  }

  /**
   * Add a marker to the transcription history
   * @param {string} type - The marker type ("question" or "followup")
   * @param {string} questionType - The question type (for questions)
   * @param {string} notes - Additional notes
   */
  addMarkerToHistory(type, questionType = "", notes = "") {
    const marker = document.createElement("div");

    if (type === "question") {
      marker.className = "question-marker";
      marker.textContent = `New ${questionType} Question`;
    } else if (type === "followup") {
      marker.className = "followup-marker";
      marker.textContent = "Follow-up";
    }

    if (notes) {
      const noteElem = document.createElement("div");
      noteElem.className = "question-note";
      noteElem.textContent = notes;
      marker.appendChild(noteElem);
    }

    this.elements.transcriptionHistory.appendChild(marker);
    this.elements.transcriptionHistory.scrollTop =
      this.elements.transcriptionHistory.scrollHeight;
  }

  /**
   * Poll for updates
   */
  poll() {
    this.updateLatestTranscription();
    this.updateTranscriptionHistory();
  }
}
