import logging
import threading
from flask import Flask
from datetime import datetime

# Initialize Flask app
app = Flask(__name__,
            static_folder='../static',  # Relative to app root
            template_folder='../templates') # Relative to app root

# Disable Flask request logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Global interview data structure and lock
interview_data = {
    "questions": [],
    "screenshots": [],
    "current_question": None,
    "extracted_questions": {},  # Map screenshot paths to extracted questions
    "solutions": {},  # Map screenshot paths to structured solutions (coding, standard followup)
    "react_solutions": {}, # Map screenshot paths to raw React initial solutions
    "followup_solutions": {} # Map screenshot paths to LISTS of raw followup solutions (React Claude/Gemini)
}
interview_data_lock = threading.Lock()

# --- Helper Functions (Potentially shared or moved later) ---

def add_screenshot_to_interview(screenshot_path, question_type, notes):
    """Adds screenshot information to the global interview data."""
    with interview_data_lock:
        screenshot_info = {
            "path": screenshot_path,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "question_type": question_type,
            "notes": notes,
            "question_id": interview_data["current_question"] if interview_data["current_question"] else None
        }
        interview_data["screenshots"].append(screenshot_info)
        return screenshot_info

def store_extracted_question(screenshot_path, question):
    """Stores an extracted question associated with a screenshot."""
    if question:
        with interview_data_lock:
            interview_data["extracted_questions"][screenshot_path] = question

def store_solution(screenshot_path, solution):
    """Stores a generated solution associated with a screenshot."""
    if solution:
        with interview_data_lock:
            interview_data["solutions"][screenshot_path] = solution

def store_react_solution(screenshot_path, solution):
    """Stores a generated React solution, including raw code."""
    if solution:
        with interview_data_lock:
            # Store the formatted solution dict in 'solutions'
            interview_data["solutions"][screenshot_path] = solution
            # Store the raw code text directly in 'react_solutions'
            interview_data["react_solutions"][screenshot_path] = solution.get("code", "")

def store_followup_solution(screenshot_path, solution, provider="claude"):
    """Stores a follow-up solution with a unique key."""
    if solution:
        with interview_data_lock:
            followup_solution = {
                "explanation": solution.get("explanation", ""),
                "solution": solution.get("solution", ""),
                "code": solution.get("code", ""),
                "is_followup": True,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            # Use a special key format to indicate it's a follow-up
            timestamp = int(datetime.now().timestamp())
            followup_key = f"{screenshot_path}:{provider}-followup:{timestamp}"
            interview_data["solutions"][followup_key] = followup_solution
            print(f"{provider.capitalize()} follow-up solution stored with key: {followup_key}")

def store_claude_react_followup_solution(followup_id, raw_solution_text): # Use followup_id as key
    """Stores the raw text response for a Claude React follow-up solution using its unique ID."""
    if raw_solution_text and followup_id:
        with interview_data_lock:
            # Store the raw text directly, keyed by the unique followup_id
            interview_data["followup_solutions"][followup_id] = raw_solution_text
            print(f"Stored Claude React raw follow-up solution for ID: {followup_id}")

def store_gemini_react_followup_solution(screenshot_path, raw_solution_text):
    """Stores the raw text response for a Gemini React follow-up solution."""
    if raw_solution_text:
        with interview_data_lock:
            # Use a specific key format for this type of raw response
            timestamp = int(datetime.now().timestamp())
            followup_key = f"{screenshot_path}:gemini-react-followup:{timestamp}"
            # Store the raw text directly
            interview_data["solutions"][followup_key] = raw_solution_text
            print(f"Gemini React raw follow-up solution stored with key: {followup_key}")
