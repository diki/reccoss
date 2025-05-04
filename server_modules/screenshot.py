import os
from flask import Blueprint, jsonify, request, send_from_directory
from datetime import datetime

# Import shared app and data/locks/helpers
from .config import app, interview_data, interview_data_lock, add_screenshot_to_interview, store_extracted_question

# Import screenshot taking function
from screenshot import take_screenshot

# Import question extraction functions
from claude_api import extract_coding_question
from gemini_api.extract_coding_question_with_gemini import extract_coding_question_with_gemini
from gemini_api.extract_design_question_with_gemini import extract_design_question_with_gemini
from gemini_api.extract_react_question_with_gemini import extract_react_question_with_gemini
from openai_api import extract_coding_question_with_openai, extract_react_question_with_openai

# Create a Blueprint for screenshot and extraction routes
screenshot_bp = Blueprint('screenshot', __name__)

# --- Screenshot Capture and Extraction Routes ---

@screenshot_bp.route('/api/screenshot', methods=['POST']) # Claude Coding Question
def capture_screenshot_claude():
    try:
        screenshot_path = take_screenshot()
        data = request.json or {}
        question_type = data.get('question_type', 'coding') # Default to coding
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question(screenshot_path)
            if extracted_question:
                print(f"Extracted question with Claude: {extracted_question}")
                store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/screenshot (Claude): {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@screenshot_bp.route('/api/extract-with-gemini', methods=['POST']) # Gemini Coding Question
def extract_with_gemini():
    try:
        print("call it")
        screenshot_path = take_screenshot()
        print(screenshot_path)
        data = request.json or {}
        question_type = data.get('question_type', 'coding') # Default to coding
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question_with_gemini(screenshot_path)
            if extracted_question:
                print(f"Extracted question with Gemini: {extracted_question}")
                store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/extract-with-gemini: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@screenshot_bp.route('/api/get-design-question', methods=['POST']) # Gemini Design Question
def get_design_question():
    try:
        screenshot_path = take_screenshot()
        data = request.json or {}
        question_type = data.get('question_type', 'design') # Should be design
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = extract_design_question_with_gemini(screenshot_path)
        if extracted_question:
            print(f"Extracted design question: {extracted_question}")
            store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/get-design-question: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@screenshot_bp.route('/api/extract-react-question', methods=['POST']) # Gemini React Question
def extract_react_question_gemini():
    try:
        screenshot_path = take_screenshot()
        data = request.json or {}
        question_type = data.get('question_type', 'react') # Should be react
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = extract_react_question_with_gemini(screenshot_path)
        if extracted_question:
            print(f"Extracted React question with Gemini: {extracted_question}")
            store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/extract-react-question (Gemini): {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@screenshot_bp.route('/api/extract-with-openai', methods=['POST']) # OpenAI Coding Question
def extract_with_openai():
    try:
        screenshot_path = take_screenshot()
        data = request.json or {}
        question_type = data.get('question_type', 'coding') # Default to coding
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question_with_openai(screenshot_path)
            if extracted_question:
                print(f"Extracted question with OpenAI: {extracted_question}")
                store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/extract-with-openai: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@screenshot_bp.route('/api/extract-react-question-openai', methods=['POST']) # OpenAI React Question
def extract_react_question_openai_route():
    try:
        screenshot_path = take_screenshot()
        data = request.json or {}
        question_type = data.get('question_type', 'react') # Should be react
        notes = data.get('notes', '')

        screenshot_info = add_screenshot_to_interview(screenshot_path, question_type, notes)

        extracted_question = extract_react_question_with_openai(screenshot_path)
        if extracted_question:
            print(f"Extracted React question with OpenAI: {extracted_question}")
            store_extracted_question(screenshot_path, extracted_question)

        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        print(f"Error in /api/extract-react-question-openai: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Routes to Get Extracted Questions ---

@screenshot_bp.route('/api/extracted_questions', methods=['GET'])
def get_extracted_questions():
    with interview_data_lock:
        # Return a copy to avoid potential modification issues if needed elsewhere
        return jsonify(dict(interview_data["extracted_questions"]))

@screenshot_bp.route('/api/extracted_question/<path:screenshot_filename>', methods=['GET'])
def get_extracted_question(screenshot_filename):
    # Construct the path as stored in interview_data
    screenshot_path = os.path.join('screenshots', screenshot_filename)
    with interview_data_lock:
        question = interview_data["extracted_questions"].get(screenshot_path, "")
        return jsonify({
            "screenshot": screenshot_path, # Return the path used as key
            "question": question
        })

# --- Route to Serve Screenshots ---

@screenshot_bp.route('/screenshots/<path:filename>')
def serve_screenshot_file(filename):
    # Serve directly from the 'screenshots' directory relative to the project root
    return send_from_directory('../screenshots', filename)
