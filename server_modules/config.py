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
    "solutions": {},  # Map screenshot paths to solutions
    "react_solutions": {} # Map screenshot paths to raw React solutions
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
