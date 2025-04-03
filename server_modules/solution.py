import os
import threading
from flask import Blueprint, jsonify, request, make_response # Add make_response
from datetime import datetime

# Import shared app and data/locks/helpers
from .config import app, interview_data, interview_data_lock, store_solution, store_react_solution, store_followup_solution, store_claude_react_followup_solution, store_gemini_react_followup_solution # Added store_gemini_react_followup_solution

# Import solution generation functions
from claude_api import get_solution_for_question, get_followup_solution, get_react_solution, get_followup_solution_with_claude_react
from gemini_api.get_solution_with_gemini import get_solution_for_question_with_gemini
from gemini_api.get_followup_solution_with_gemini import get_followup_solution_with_gemini, get_react_followup_solution_with_gemini # Added get_react_followup_solution_with_gemini
from gemini_api.get_react_solution_with_gemini import get_react_solution_with_gemini, get_react_solution2_with_gemini
from openai_api import get_solution_for_question_with_openai

# Create a Blueprint for solution routes
solution_bp = Blueprint('solution', __name__, url_prefix='/api')

# --- Background Solution Processing Functions ---

def process_solution_with_claude(question, screenshot_path):
    try:
        solution = get_solution_for_question(question)
        if solution:
            print(f"Solution generated for question (Claude)")
            store_solution(screenshot_path, solution)
        else:
            print("Failed to generate solution for question (Claude)")
    except Exception as e:
        print(f"Error processing solution with Claude: {str(e)}")

def process_followup_solution_with_claude(current_problem, current_code, transcript, screenshot_path):
    try:
        print(f"Processing Claude follow-up request...")
        print(f"--- Problem sent to Claude (Standard Follow-up) ---")
        print(current_problem)
        print(f"--- End Problem ---")
        solution = get_followup_solution(current_problem, current_code, transcript)
        if solution:
            print(f"Claude follow-up solution generated successfully")
            store_followup_solution(screenshot_path, solution, provider="claude")
        else:
            print("Failed to generate Claude follow-up solution")
    except Exception as e:
        print(f"Error processing follow-up solution (Claude): {str(e)}")

def process_solution_with_openai(question, screenshot_path):
    try:
        solution = get_solution_for_question_with_openai(question)
        if solution:
            print(f"Solution generated for question (OpenAI)")
            store_solution(screenshot_path, solution)
        else:
            print("Failed to generate solution for question (OpenAI)")
    except Exception as e:
        print(f"Error processing solution with OpenAI: {str(e)}")

def process_solution_with_gemini(question, screenshot_path):
    try:
        solution = get_solution_for_question_with_gemini(question)
        if solution:
            print(f"Solution generated for question (Gemini)")
            store_solution(screenshot_path, solution)
        else:
            print("Failed to generate solution for question (Gemini)")
    except Exception as e:
        print(f"Error processing solution with Gemini: {str(e)}")

def process_react_solution_with_gemini(question, screenshot_path):
    try:
        solution = get_react_solution_with_gemini(question)
        if solution:
            print(f"React solution generated for question (Gemini)")
            store_react_solution(screenshot_path, solution) # Use specific react storage
        else:
            print("Failed to generate React solution for question (Gemini)")
    except Exception as e:
        print(f"Error processing React solution with Gemini: {str(e)}")

def process_react_solution_with_claude(question, screenshot_path):
    try:
        solution = get_react_solution(question)
        if solution:
            print(f"React solution generated for question (Claude)")
            store_react_solution(screenshot_path, solution) # Use specific react storage
        else:
            print("Failed to generate React solution for question (Claude)")
    except Exception as e:
        print(f"Error processing React solution with Claude: {str(e)}")

def process_react_solution2_with_gemini(question, screenshot_path):
    try:
        solution = get_react_solution2_with_gemini(question)
        if solution:
            print(f"React solution2 generated for question (Gemini)")
            store_react_solution(screenshot_path, solution) # Use specific react storage
        else:
            print("Failed to generate React solution2 for question (Gemini)")
    except Exception as e:
        print(f"Error processing React solution2 with Gemini: {str(e)}")

def process_followup_solution_with_gemini(current_problem, current_code, transcript, screenshot_path):
    try:
        print(f"Processing Gemini follow-up request...")
        solution = get_followup_solution_with_gemini(current_problem, current_code, transcript)
        if solution:
            print(f"Gemini follow-up solution generated successfully")
            store_followup_solution(screenshot_path, solution, provider="gemini")
        else:
            print("Failed to generate Gemini follow-up solution")
    except Exception as e:
        print(f"Error processing Gemini follow-up solution: {str(e)}")

def process_followup_solution_with_claude_react(transcript, react_question, current_solution, screenshot_path, followup_id): # Add followup_id
    """Background task to get and store raw Claude React follow-up."""
    try:
        print(f"Processing Claude React follow-up request for ID: {followup_id}...")
        print(f"--- React Question sent to Claude (React Follow-up) ---")
        print(react_question)
        print(f"--- End React Question ---")
        raw_solution = get_followup_solution_with_claude_react(transcript, react_question, current_solution)
        if raw_solution:
            print(f"Claude React follow-up solution generated successfully for ID: {followup_id} (raw)")
            # Pass followup_id to the storage function
            store_claude_react_followup_solution(followup_id, raw_solution)
        else:
            print(f"Failed to generate Claude React follow-up solution for ID: {followup_id} (raw)")
    except Exception as e:
        print(f"Error processing follow-up solution (Claude React raw): {str(e)}")


def process_react_followup_solution_with_gemini(transcript, react_question, current_solution, screenshot_path):
    """Background task to get and store raw Gemini React follow-up."""
    try:
        print(f"Processing Gemini React follow-up request...")
        # Assuming the Gemini function takes similar arguments
        raw_solution = get_react_followup_solution_with_gemini(transcript, react_question, current_solution)
        if raw_solution:
            print(f"Gemini React follow-up solution generated successfully (raw)")
            # Use the new specific storage function
            store_gemini_react_followup_solution(screenshot_path, raw_solution)
        else:
            print("Failed to generate Gemini React follow-up solution (raw)")
    except Exception as e:
        print(f"Error processing follow-up solution (Gemini React raw): {str(e)}")


# --- Solution Request Routes (Start Background Threads) ---

@solution_bp.route('/solution', methods=['POST']) # Claude Coding Solution
def get_solution_claude():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_solution_with_claude, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Claude solution request submitted"})

@solution_bp.route('/solution/followup', methods=['POST']) # Claude Follow-up
def get_followup_solution_claude():
    data = request.json or {}
    problem = data.get('problem', '')
    code = data.get('code', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    if not problem or not code or not transcript or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing required parameters for follow-up"}), 400

    thread = threading.Thread(target=process_followup_solution_with_claude, args=(problem, code, transcript, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Claude follow-up solution request submitted"})

@solution_bp.route('/solution-with-openai', methods=['POST']) # OpenAI Coding Solution
def get_solution_openai():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_solution_with_openai, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "OpenAI solution request submitted"})

@solution_bp.route('/solution-with-gemini', methods=['POST']) # Gemini Coding Solution
def get_solution_gemini():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_solution_with_gemini, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Gemini solution request submitted"})

@solution_bp.route('/react-solution-with-gemini', methods=['POST']) # Gemini React Solution
def get_react_solution_gemini():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_react_solution_with_gemini, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "React Gemini solution request submitted"})

@solution_bp.route('/react-solution-with-claude', methods=['POST']) # Claude React Solution
def get_react_solution_claude():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_react_solution_with_claude, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "React Claude solution request submitted"})

@solution_bp.route('/react-solution2-with-gemini', methods=['POST']) # Gemini React Solution (Claude Prompt)
def get_react_solution2_gemini():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    if not question or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing question or screenshot_path"}), 400

    thread = threading.Thread(target=process_react_solution2_with_gemini, args=(question, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "React Gemini solution2 request submitted"})

@solution_bp.route('/solution/followup-with-gemini', methods=['POST']) # Gemini Follow-up
def get_followup_solution_gemini():
    data = request.json or {}
    problem = data.get('problem', '')
    code = data.get('code', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    if not problem or not code or not transcript or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing required parameters for follow-up"}), 400

    thread = threading.Thread(target=process_followup_solution_with_gemini, args=(problem, code, transcript, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Gemini follow-up solution request submitted"})

@solution_bp.route('/solution/followup-with-claude-react', methods=['POST']) # Claude React Follow-up (Raw)
def get_followup_solution_claude_react_route():
    data = request.json or {}
    # Match the keys sent from the frontend
    react_question = data.get('react_question', '')
    current_solution = data.get('current_solution', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    followup_id = data.get('followup_id', None) # Extract the followup_id
    if not react_question or not current_solution or not transcript or not screenshot_path or not followup_id:
        return jsonify({"status": "error", "message": "Missing required parameters (incl. followup_id) for Claude React follow-up"}), 400

    # Pass followup_id to the background processing function
    thread = threading.Thread(target=process_followup_solution_with_claude_react, args=(transcript, react_question, current_solution, screenshot_path, followup_id))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Claude React follow-up solution request submitted"})


@solution_bp.route('/solution/react-followup-with-gemini', methods=['POST']) # Gemini React Follow-up (Raw)
def get_react_followup_solution_gemini_route():
    data = request.json or {}
    # Match the keys sent from the frontend
    react_question = data.get('react_question', '')
    current_solution = data.get('current_solution', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    if not react_question or not current_solution or not transcript or not screenshot_path:
        return jsonify({"status": "error", "message": "Missing required parameters for Gemini React follow-up"}), 400

    # Start background thread using a new processing function
    thread = threading.Thread(target=process_react_followup_solution_with_gemini, args=(transcript, react_question, current_solution, screenshot_path))
    thread.daemon = True
    thread.start()
    return jsonify({"status": "success", "message": "Gemini React follow-up solution request submitted"})


# --- Solution Retrieval Routes ---

@solution_bp.route('/solutions', methods=['GET'])
def get_all_solutions():
    with interview_data_lock:
        # Create the response data
        response_data = {
            "solutions": dict(interview_data["solutions"]),
            "react_solutions": dict(interview_data["react_solutions"]),
            "followup_solutions": dict(interview_data["followup_solutions"]) # Add the new followup data
        }
    # Create a response object from the JSON data
    response = make_response(jsonify(response_data))
    # Add cache-control headers to prevent browser caching
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@solution_bp.route('/solution/<path:screenshot_filename>', methods=['GET'])
def get_solution_for_screenshot_route(screenshot_filename):
    # Construct the path as stored in interview_data keys
    screenshot_path = os.path.join('screenshots', screenshot_filename)
    with interview_data_lock:
        solution = interview_data["solutions"].get(screenshot_path, None)
        react_solution = interview_data["react_solutions"].get(screenshot_path, None)

        # Also check for follow-up solutions related to this screenshot
        followup_solutions = {}
        for key, sol in interview_data["solutions"].items():
             # Check if the key starts with the screenshot path and contains ':followup:'
             if key.startswith(screenshot_path + ":") and ":followup:" in key:
                 followup_solutions[key] = sol # Store follow-ups separately

        return jsonify({
            "screenshot": screenshot_path,
            "solution": solution, # The primary solution
            "react_solution": react_solution, # Raw react code if applicable
            "followup_solutions": followup_solutions # Any follow-ups associated
        })
