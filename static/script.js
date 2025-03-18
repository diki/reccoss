document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const startRecordingBtn = document.getElementById("start-recording");
  const stopRecordingBtn = document.getElementById("stop-recording");
  const takeScreenshotBtn = document.getElementById("take-screenshot");
  const extractWithGeminiBtn = document.getElementById("extract-with-gemini");
  const markQuestionBtn = document.getElementById("mark-question");
  const markFollowupBtn = document.getElementById("mark-followup");
  const questionTypeSelect = document.getElementById("question-type");
  const questionNotesInput = document.getElementById("question-notes");
  const recordingStatus = document.getElementById("recording-status");
  const latestTranscription = document.getElementById("latest-transcription");
  const interviewerTranscription = document.getElementById(
    "interviewer-transcription"
  );
  const transcriptionHistory = document.getElementById("transcription-history");
  const screenshotsContainer = document.getElementById("screenshots");
  const extractedQuestionContainer =
    document.getElementById("extracted-question");
  const getSolutionBtn = document.getElementById("get-solution");
  const solutionTabs = document.getElementById("solution-tabs");
  const explanationTab = document.getElementById("explanation-tab");
  const codeTab = document.getElementById("code-tab");
  const complexityTab = document.getElementById("complexity-tab");

  // Keep track of transcription count to avoid duplicates
  let transcriptionCount = 0;
  let currentSpeaker = "interviewer"; // Default to interviewer for demo
  let screenshots = [];
  let currentQuestion = null;
  let currentExtractedQuestion = "";
  let currentScreenshotPath = "";

  // Polling interval for transcriptions (in ms)
  const POLLING_INTERVAL = 1000;

  // Function to check recording status
  function checkRecordingStatus() {
    fetch("/api/recording/status")
      .then((response) => response.json())
      .then((data) => {
        if (data.is_recording) {
          recordingStatus.textContent = "Status: Recording";
          recordingStatus.classList.add("recording");
          startRecordingBtn.disabled = true;
          stopRecordingBtn.disabled = false;
        } else {
          recordingStatus.textContent = "Status: Not recording";
          recordingStatus.classList.remove("recording");
          startRecordingBtn.disabled = false;
          stopRecordingBtn.disabled = true;
        }
      })
      .catch((error) => {
        console.error("Error checking recording status:", error);
      });
  }

  // Function to start recording
  function startRecording() {
    fetch("/api/recording/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_name: "BlackHole",
        record_seconds: 5,
        duration: null, // Record indefinitely
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Recording started:", data);
        checkRecordingStatus();
      })
      .catch((error) => {
        console.error("Error starting recording:", error);
      });
  }

  // Function to stop recording
  function stopRecording() {
    fetch("/api/recording/stop", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Recording stopped:", data);
        checkRecordingStatus();
      })
      .catch((error) => {
        console.error("Error stopping recording:", error);
      });
  }

  // Function to take a screenshot and extract with Claude
  function takeScreenshot() {
    const questionType = questionTypeSelect.value;
    const notes = questionNotesInput.value;

    fetch("/api/screenshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_type: questionType,
        notes: notes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Screenshot taken:", data.screenshot);
          screenshots.push(data.screenshot);
          updateScreenshotsDisplay();

          // If it's a coding question, start polling for the extracted question
          if (questionType === "coding") {
            // Show loading message
            extractedQuestionContainer.innerHTML =
              "<p><em>Extracting coding question...</em></p>";

            // Start polling for the extracted question
            pollForExtractedQuestion(data.screenshot.path);
          }
        } else {
          console.error("Error taking screenshot:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error taking screenshot:", error);
      });
  }

  // Function to poll for the extracted question
  function pollForExtractedQuestion(screenshotPath) {
    // Extract just the filename from the path
    const filename = screenshotPath.split("/").pop();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      fetch(`/api/extracted_question/${filename}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.question) {
            // We have an extracted question, display it
            extractedQuestionContainer.innerHTML = `<p>${data.question}</p>`;

            // Enable the solution button
            getSolutionBtn.disabled = false;

            // Store the current question and screenshot path
            currentExtractedQuestion = data.question;
            currentScreenshotPath = screenshotPath;

            // Stop polling
            clearInterval(pollInterval);
          }
        })
        .catch((error) => {
          console.error("Error polling for extracted question:", error);
          // Stop polling on error
          clearInterval(pollInterval);
        });
    }, 2000); // Poll every 2 seconds

    // Stop polling after 30 seconds if no result
    setTimeout(() => {
      clearInterval(pollInterval);
      // Check if we still don't have a question
      if (
        extractedQuestionContainer.innerHTML.includes(
          "Extracting coding question"
        )
      ) {
        extractedQuestionContainer.innerHTML =
          "<p><em>Could not extract coding question. Please try again.</em></p>";
      }
    }, 30000);
  }

  // Function to mark a new question
  function markQuestion() {
    const questionType = questionTypeSelect.value;
    const notes = questionNotesInput.value;

    fetch("/api/question/mark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_type: questionType,
        notes: notes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Question marked:", data.question);
          currentQuestion = data.question;

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

          transcriptionHistory.appendChild(marker);
          transcriptionHistory.scrollTop = transcriptionHistory.scrollHeight;

          // Clear the notes field
          questionNotesInput.value = "";
        } else {
          console.error("Error marking question:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error marking question:", error);
      });
  }

  // Function to mark a follow-up question
  function markFollowup() {
    const notes = questionNotesInput.value;

    fetch("/api/question/followup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: notes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
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

          transcriptionHistory.appendChild(container);
          transcriptionHistory.scrollTop = transcriptionHistory.scrollHeight;

          // Clear the notes field
          questionNotesInput.value = "";
        } else {
          console.error("Error marking follow-up:", data.message);
        }
      })
      .catch((error) => {
        console.error("Error marking follow-up:", error);
      });
  }

  // Function to update the screenshots display
  function updateScreenshotsDisplay() {
    fetch("/api/screenshots")
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          // Update screenshots array
          screenshots = data;

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

          screenshotsContainer.innerHTML = screenshotsHTML;

          // Add click event listeners to screenshots
          document.querySelectorAll(".screenshot-item").forEach((item) => {
            item.addEventListener("click", function () {
              const path = this.getAttribute("data-path");
              if (path) {
                const filename = path.split("/").pop();
                // Fetch and display the extracted question for this screenshot
                fetch(`/api/extracted_question/${filename}`)
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.question) {
                      extractedQuestionContainer.innerHTML = `<p>${data.question}</p>`;

                      // Enable the solution button
                      getSolutionBtn.disabled = false;

                      // Store the current question and screenshot path
                      currentExtractedQuestion = data.question;
                      currentScreenshotPath = path;

                      // Check if we already have a solution for this screenshot
                      checkForExistingSolution(filename);
                    } else {
                      extractedQuestionContainer.innerHTML =
                        "<p><em>No coding question extracted for this screenshot.</em></p>";

                      // Disable the solution button
                      getSolutionBtn.disabled = true;

                      // Clear current question
                      currentExtractedQuestion = "";
                      currentScreenshotPath = "";
                    }
                  })
                  .catch((error) => {
                    console.error("Error fetching extracted question:", error);
                  });
              }
            });
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching screenshots:", error);
      });
  }

  // Function to update all extracted questions
  function updateExtractedQuestions() {
    fetch("/api/extracted_questions")
      .then((response) => response.json())
      .then((data) => {
        // If we have any extracted questions and the latest screenshot is a coding question,
        // update the extracted question display with the most recent one
        if (Object.keys(data).length > 0 && screenshots.length > 0) {
          const latestScreenshot = screenshots[screenshots.length - 1];
          if (latestScreenshot.question_type === "coding") {
            const question = data[latestScreenshot.path];
            if (question) {
              extractedQuestionContainer.innerHTML = `<p>${question}</p>`;

              // Enable the solution button
              getSolutionBtn.disabled = false;

              // Store the current question and screenshot path
              currentExtractedQuestion = question;
              currentScreenshotPath = latestScreenshot.path;
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching extracted questions:", error);
      });
  }

  // Function to update the latest transcription
  function updateLatestTranscription() {
    fetch("/api/transcriptions/latest")
      .then((response) => response.json())
      .then((data) => {
        if (data.text) {
          // Toggle between interviewer and interviewee for demo purposes
          // In a real implementation, you would use speaker diarization or manual selection
          currentSpeaker =
            currentSpeaker === "interviewer" ? "interviewee" : "interviewer";

          const transcriptionHTML = `
            <p class="transcription-text">${data.text}</p>
            <p class="transcription-timestamp">Time: ${data.timestamp}</p>
          `;

          if (currentSpeaker === "interviewer") {
            interviewerTranscription.innerHTML = transcriptionHTML;
          } else {
            latestTranscription.innerHTML = transcriptionHTML;
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching latest transcription:", error);
      });
  }

  // Function to update the transcription history
  function updateTranscriptionHistory() {
    fetch("/api/transcriptions")
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          // Check if we have new transcriptions
          if (data.length > transcriptionCount) {
            transcriptionCount = data.length;

            // Update the history display
            const historyHTML = data
              .map(
                (item, index) => `
                          <div class="transcription-item">
                              <p class="transcription-text">${item.text}</p>
                              <p class="transcription-timestamp">Time: ${item.timestamp}</p>
                          </div>
                      `
              )
              .join("");

            transcriptionHistory.innerHTML = historyHTML;

            // Scroll to the bottom of the history
            transcriptionHistory.scrollTop = transcriptionHistory.scrollHeight;
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching transcription history:", error);
      });
  }

  // Function to get a solution for the current question
  function getSolution() {
    if (!currentExtractedQuestion || !currentScreenshotPath) {
      console.error("No question or screenshot path available");
      return;
    }

    // Show loading state
    getSolutionBtn.disabled = true;
    getSolutionBtn.textContent = "Generating solution...";
    explanationTab.innerHTML =
      "<p><em>Generating solution, please wait...</em></p>";
    codeTab.innerHTML =
      "<pre><code><em>Generating code solution...</em></code></pre>";
    complexityTab.innerHTML = "<p><em>Analyzing complexity...</em></p>";

    // Request solution from the server
    fetch("/api/solution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: currentExtractedQuestion,
        screenshot_path: currentScreenshotPath,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log("Solution request submitted");

          // Start polling for the solution
          pollForSolution(currentScreenshotPath);
        } else {
          console.error("Error requesting solution:", data.message);
          getSolutionBtn.disabled = false;
          getSolutionBtn.textContent = "Get Solution";
        }
      })
      .catch((error) => {
        console.error("Error requesting solution:", error);
        getSolutionBtn.disabled = false;
        getSolutionBtn.textContent = "Get Solution";
      });
  }

  // Function to poll for the solution
  function pollForSolution(screenshotPath) {
    // Extract just the filename from the path
    const filename = screenshotPath.split("/").pop();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      fetch(`/api/solution/${filename}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.solution) {
            // We have a solution, display it
            displaySolution(data.solution);

            // Stop polling
            clearInterval(pollInterval);
          }
        })
        .catch((error) => {
          console.error("Error polling for solution:", error);
          // Stop polling on error
          clearInterval(pollInterval);
        });
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds if no result
    setTimeout(() => {
      clearInterval(pollInterval);
      // Check if we still don't have a solution
      if (explanationTab.innerHTML.includes("Generating solution")) {
        explanationTab.innerHTML =
          "<p><em>Could not generate solution. Please try again.</em></p>";
        getSolutionBtn.disabled = false;
        getSolutionBtn.textContent = "Get Solution";
      }
    }, 60000);
  }

  // Function to display the solution
  function displaySolution(solution) {
    // Update the solution tabs
    if (solution.explanation) {
      explanationTab.innerHTML = `<p>${solution.explanation.replace(
        /\n/g,
        "<br>"
      )}</p>`;
    } else {
      explanationTab.innerHTML = "<p><em>No explanation available.</em></p>";
    }

    if (solution.code) {
      codeTab.innerHTML = `<pre><code>${solution.code}</code></pre>`;
    } else {
      codeTab.innerHTML =
        "<pre><code><em>No code solution available.</em></code></pre>";
    }

    if (solution.complexity) {
      complexityTab.innerHTML = `<p>${solution.complexity.replace(
        /\n/g,
        "<br>"
      )}</p>`;
    } else {
      complexityTab.innerHTML =
        "<p><em>No complexity analysis available.</em></p>";
    }

    // Reset the button
    getSolutionBtn.disabled = false;
    getSolutionBtn.textContent = "Get Solution";
  }

  // Function to check if we already have a solution for a screenshot
  function checkForExistingSolution(screenshotFilename) {
    fetch(`/api/solution/${screenshotFilename}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.solution) {
          // We already have a solution, display it
          displaySolution(data.solution);
        }
      })
      .catch((error) => {
        console.error("Error checking for existing solution:", error);
      });
  }

  // Function to handle tab switching
  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Remove active class from all buttons and contents
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Add active class to current button
        this.classList.add("active");

        // Show the corresponding tab content
        const tabId = this.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  // Function to extract question with Gemini
  function extractWithGemini() {
    const questionType = questionTypeSelect.value;
    const notes = questionNotesInput.value;

    fetch("/api/extract-with-gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_type: questionType,
        notes: notes,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          console.log(
            "Screenshot taken for Gemini extraction:",
            data.screenshot
          );
          screenshots.push(data.screenshot);
          updateScreenshotsDisplay();

          // If it's a coding question, start polling for the extracted question
          if (questionType === "coding") {
            // Show loading message
            extractedQuestionContainer.innerHTML =
              "<p><em>Extracting coding question with Gemini...</em></p>";

            // Start polling for the extracted question
            pollForExtractedQuestion(data.screenshot.path);
          }
        } else {
          console.error(
            "Error taking screenshot for Gemini extraction:",
            data.message
          );
        }
      })
      .catch((error) => {
        console.error("Error taking screenshot for Gemini extraction:", error);
      });
  }

  // Set up event listeners for buttons
  startRecordingBtn.addEventListener("click", startRecording);
  stopRecordingBtn.addEventListener("click", stopRecording);
  takeScreenshotBtn.addEventListener("click", takeScreenshot);
  extractWithGeminiBtn.addEventListener("click", extractWithGemini);
  markQuestionBtn.addEventListener("click", markQuestion);
  markFollowupBtn.addEventListener("click", markFollowup);
  getSolutionBtn.addEventListener("click", getSolution);

  // Set up polling for updates
  function pollForUpdates() {
    checkRecordingStatus();
    updateLatestTranscription();
    updateTranscriptionHistory();
    updateScreenshotsDisplay();
    updateExtractedQuestions();
  }

  // Initial status check and polling setup
  checkRecordingStatus();
  updateScreenshotsDisplay();
  setupTabs();
  setInterval(pollForUpdates, POLLING_INTERVAL);
});
