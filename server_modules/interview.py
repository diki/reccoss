from flask import Blueprint, jsonify, request
from datetime import datetime

# Import shared app and data/locks
from .config import app, interview_data, interview_data_lock

# Import transcription data/lock for reset
from web_adapter import transcriptions, transcription_lock

# Create a Blueprint for interview management routes
interview_bp = Blueprint('interview', __name__, url_prefix='/api')

# --- Interview State Management Routes ---

@interview_bp.route('/question/mark', methods=['POST'])
def mark_question():
    data = request.json or {}
    question_type = data.get('question_type', 'coding')
    notes = data.get('notes', '')

    with interview_data_lock:
        question_id = len(interview_data["questions"]) + 1
        question_info = {
            "id": question_id,
            "type": question_type,
            "notes": notes,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "followups": []
        }
        interview_data["questions"].append(question_info)
        interview_data["current_question"] = question_id

    return jsonify({
        "status": "success",
        "question": question_info
    })

@interview_bp.route('/question/followup', methods=['POST'])
def mark_followup():
    data = request.json or {}
    notes = data.get('notes', '')

    with interview_data_lock:
        if interview_data["current_question"] is None:
            return jsonify({
                "status": "error",
                "message": "No active question to add follow-up to"
            }), 400

        # Find the current question
        current_question_found = False
        for question in interview_data["questions"]:
            if question["id"] == interview_data["current_question"]:
                followup_id = len(question["followups"]) + 1
                followup_info = {
                    "id": followup_id,
                    "notes": notes,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                question["followups"].append(followup_info)
                current_question_found = True
                return jsonify({
                    "status": "success",
                    "followup": followup_info
                })

        if not current_question_found:
             # This case should ideally not happen if current_question is set,
             # but added for robustness.
            return jsonify({
                "status": "error",
                "message": f"Current question ID {interview_data['current_question']} not found in questions list."
            }), 404

    # Fallback if lock couldn't be acquired or other unexpected issue
    return jsonify({
        "status": "error",
        "message": "Failed to mark follow-up due to an unexpected error."
    }), 500


@interview_bp.route('/interview/data', methods=['GET'])
def get_interview_data():
    with interview_data_lock:
        # Return a deep copy to prevent external modification
        # Note: This might be slow for very large data, consider alternatives if needed
        import copy
        return jsonify(copy.deepcopy(interview_data))

@interview_bp.route('/reset', methods=['POST'])
def reset_all_data():
    global interview_data # Ensure we modify the global dict from config

    with interview_data_lock:
        # Reset interview data
        interview_data["questions"] = []
        interview_data["screenshots"] = []
        interview_data["current_question"] = None
        interview_data["extracted_questions"] = {}
        interview_data["solutions"] = {}
        interview_data["react_solutions"] = {}
        print("Interview data reset.")

    # Clear transcriptions separately
    with transcription_lock:
        transcriptions.clear()
        print("Transcriptions cleared.")

    return jsonify({
        "status": "success",
        "message": "All interview data and transcriptions have been reset"
    })

@interview_bp.route('/screenshots', methods=['GET'])
def get_screenshots_list():
    with interview_data_lock:
        # Return a copy of the list
        return jsonify(list(interview_data["screenshots"]))
