from flask import Flask, jsonify, render_template, send_from_directory, request
import os
import threading
import time
import json
from datetime import datetime

# Import our web adapter and screenshot functionality
from web_adapter import WebTranscriber, transcriptions, transcription_lock, is_recording
from screenshot import take_screenshot
from claude_api import extract_coding_question, get_solution_for_question
from gemini_api import extract_coding_question_with_gemini, get_solution_for_question_with_gemini

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Global variables
transcriber = None
interview_data = {
    "questions": [],
    "screenshots": [],
    "current_question": None,
    "extracted_questions": {},  # Map screenshot paths to extracted questions
    "solutions": {}  # Map screenshot paths to solutions
}
interview_data_lock = threading.Lock()

# Route for the homepage
@app.route('/')
def home():
    return render_template('index.html')

# API endpoint to get all transcriptions
@app.route('/api/transcriptions', methods=['GET'])
def get_transcriptions():
    with transcription_lock:
        return jsonify(transcriptions)

# API endpoint to get only the latest transcription
@app.route('/api/transcriptions/latest', methods=['GET'])
def get_latest_transcription():
    with transcription_lock:
        if transcriptions:
            return jsonify(transcriptions[-1])
        else:
            return jsonify({"text": "", "timestamp": ""})

# API endpoint to start recording
@app.route('/api/recording/start', methods=['POST'])
def start_recording():
    global transcriber
    
    if is_recording:
        return jsonify({"status": "already_recording"})
    
    # Clear previous transcriptions
    with transcription_lock:
        transcriptions.clear()
    
    # Get parameters from request (with defaults)
    data = request.json or {}
    device_name = data.get('device_name', 'BlackHole')
    record_seconds = int(data.get('record_seconds', 5))
    duration = data.get('duration', None)  # None means record indefinitely
    
    # Initialize and start transcriber
    transcriber = WebTranscriber(device_name=device_name, record_seconds=record_seconds)
    transcriber.start(duration=duration, output_file="transcription.txt")
    
    return jsonify({"status": "recording_started"})

# API endpoint to stop recording
@app.route('/api/recording/stop', methods=['POST'])
def stop_recording():
    global transcriber
    
    if not is_recording or transcriber is None:
        return jsonify({"status": "not_recording"})
    
    transcriber.stop()
    transcriber.cleanup()
    transcriber = None
    
    return jsonify({"status": "recording_stopped"})

# API endpoint to get recording status
@app.route('/api/recording/status', methods=['GET'])
def recording_status():
    return jsonify({"is_recording": is_recording})

# API endpoint to take a screenshot and extract question with Claude
@app.route('/api/screenshot', methods=['POST'])
def capture_screenshot():
    try:
        # Take a screenshot
        screenshot_path = take_screenshot()
        
        # Get question context if available
        data = request.json or {}
        question_type = data.get('question_type', 'coding')
        notes = data.get('notes', '')
        
        # Add to interview data
        with interview_data_lock:
            screenshot_info = {
                "path": screenshot_path,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "question_type": question_type,
                "notes": notes,
                "question_id": interview_data["current_question"] if interview_data["current_question"] else None
            }
            interview_data["screenshots"].append(screenshot_info)
        
        # Start a thread to extract the coding question from the screenshot using Claude
        if question_type == 'coding':
            extraction_thread = threading.Thread(
                target=process_screenshot_with_claude,
                args=(screenshot_path,)
            )
            extraction_thread.daemon = True
            extraction_thread.start()
        
        # Return the screenshot info
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# API endpoint to extract question with Gemini
@app.route('/api/extract-with-gemini', methods=['POST'])
def extract_with_gemini():
    try:
        # Take a screenshot
        screenshot_path = take_screenshot()
        
        # Get question context if available
        data = request.json or {}
        question_type = data.get('question_type', 'coding')
        notes = data.get('notes', '')
        
        # Add to interview data
        with interview_data_lock:
            screenshot_info = {
                "path": screenshot_path,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "question_type": question_type,
                "notes": notes,
                "question_id": interview_data["current_question"] if interview_data["current_question"] else None
            }
            interview_data["screenshots"].append(screenshot_info)
        
        # Start a thread to extract the coding question from the screenshot using Gemini
        if question_type == 'coding':
            extraction_thread = threading.Thread(
                target=process_screenshot_with_gemini,
                args=(screenshot_path,)
            )
            extraction_thread.daemon = True
            extraction_thread.start()
        
        # Return the screenshot info
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Function to process screenshot with Claude API
def process_screenshot_with_claude(screenshot_path):
    try:
        # Extract coding question from the screenshot
        extracted_question = extract_coding_question(screenshot_path)
        
        if extracted_question:
            print(f"Extracted question with Claude: {extracted_question}")
            
            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question
        else:
            print("Failed to extract question from screenshot with Claude")
    except Exception as e:
        print(f"Error processing screenshot with Claude: {str(e)}")

# Function to process screenshot with Gemini API
def process_screenshot_with_gemini(screenshot_path):
    try:
        # Extract coding question from the screenshot
        extracted_question = extract_coding_question_with_gemini(screenshot_path)
        
        if extracted_question:
            print(f"Extracted question with Gemini: {extracted_question}")
            
            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question
        else:
            print("Failed to extract question from screenshot with Gemini")
    except Exception as e:
        print(f"Error processing screenshot with Gemini: {str(e)}")

# API endpoint to get extracted questions
@app.route('/api/extracted_questions', methods=['GET'])
def get_extracted_questions():
    with interview_data_lock:
        return jsonify(interview_data["extracted_questions"])

# API endpoint to get extracted question for a specific screenshot
@app.route('/api/extracted_question/<path:screenshot_filename>', methods=['GET'])
def get_extracted_question(screenshot_filename):
    screenshot_path = os.path.join('screenshots', screenshot_filename)
    
    with interview_data_lock:
        question = interview_data["extracted_questions"].get(screenshot_path, "")
        
        return jsonify({
            "screenshot": screenshot_path,
            "question": question
        })

# API endpoint to get a solution for a coding question
@app.route('/api/solution', methods=['POST'])
def get_solution():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not question:
        return jsonify({
            "status": "error",
            "message": "No question provided"
        }), 400
    
    # Start a thread to get the solution
    solution_thread = threading.Thread(
        target=process_solution_with_claude,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Solution request submitted"
    })

# Function to process solution with Claude API
def process_solution_with_claude(question, screenshot_path):
    try:
        # Get solution for the question
        solution = get_solution_for_question(question)
        
        if solution:
            print(f"Solution generated for question")
            
            # Store the solution
            with interview_data_lock:
                interview_data["solutions"][screenshot_path] = solution
        else:
            print("Failed to generate solution for question")
    except Exception as e:
        print(f"Error processing solution with Claude: {str(e)}")

# API endpoint to get all solutions
@app.route('/api/solutions', methods=['GET'])
def get_solutions():
    with interview_data_lock:
        return jsonify(interview_data["solutions"])

# API endpoint to get solution for a specific screenshot
@app.route('/api/solution/<path:screenshot_filename>', methods=['GET'])
def get_solution_for_screenshot(screenshot_filename):
    screenshot_path = os.path.join('screenshots', screenshot_filename)
    
    with interview_data_lock:
        solution = interview_data["solutions"].get(screenshot_path, None)
        
        return jsonify({
            "screenshot": screenshot_path,
            "solution": solution
        })

# API endpoint to mark a new question
@app.route('/api/question/mark', methods=['POST'])
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

# API endpoint to mark a follow-up question
@app.route('/api/question/followup', methods=['POST'])
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
        for question in interview_data["questions"]:
            if question["id"] == interview_data["current_question"]:
                followup_id = len(question["followups"]) + 1
                followup_info = {
                    "id": followup_id,
                    "notes": notes,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                question["followups"].append(followup_info)
                
                return jsonify({
                    "status": "success",
                    "followup": followup_info
                })
    
    return jsonify({
        "status": "error",
        "message": "Question not found"
    }), 404

# API endpoint to get all interview data
@app.route('/api/interview/data', methods=['GET'])
def get_interview_data():
    with interview_data_lock:
        return jsonify(interview_data)

# API endpoint to get all screenshots
@app.route('/api/screenshots', methods=['GET'])
def get_screenshots():
    with interview_data_lock:
        return jsonify(interview_data["screenshots"])

# Serve screenshots
@app.route('/screenshots/<path:filename>')
def serve_screenshot(filename):
    return send_from_directory('screenshots', filename)

# Serve static files directly
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

def start_default_recording():
    """Start recording when the server starts"""
    global transcriber
    
    # Wait a bit for the server to fully start
    time.sleep(2)
    
    # Clear previous transcriptions
    with transcription_lock:
        transcriptions.clear()
    
    # Start the transcriber
    transcriber = WebTranscriber(device_name="BlackHole", record_seconds=5)
    transcriber.start(output_file="transcription.txt")
    
    print("Default recording started automatically")

if __name__ == '__main__':
    # Make sure the required folders exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    os.makedirs('screenshots', exist_ok=True)
    
    # Start default recording in a separate thread
    recording_thread = threading.Thread(target=start_default_recording)
    recording_thread.daemon = True
    recording_thread.start()
    
    # Run the app in debug mode
    app.run(debug=True, host='0.0.0.0', port=5050, use_reloader=False)
