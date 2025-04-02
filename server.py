from flask import Flask, jsonify, render_template, send_from_directory, request
import os
import threading
import time
import json
from datetime import datetime

# Import our web adapter and screenshot functionality
from web_adapter import WebTranscriber, transcriptions, transcription_lock, is_recording
from screenshot import take_screenshot
from claude_api import extract_coding_question, get_solution_for_question, get_followup_solution, get_react_solution
from gemini_api.extract_coding_question_with_gemini import extract_coding_question_with_gemini
from gemini_api.get_design_solution_with_gemini import get_design_solution_with_gemini
from gemini_api.get_solution_with_gemini import get_solution_for_question_with_gemini
from gemini_api.get_followup_solution_with_gemini import get_followup_solution_with_gemini
from gemini_api.extract_design_question_with_gemini import extract_design_question_with_gemini
from gemini_api.extract_react_question_with_gemini import extract_react_question_with_gemini
from gemini_api.get_react_solution_with_gemini import get_react_solution_with_gemini, get_react_solution2_with_gemini
from openai_api import extract_coding_question_with_openai, get_solution_for_question_with_openai, extract_react_question_with_openai

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Disable Flask request logging
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Global variables
transcriber = None
interview_data = {
    "questions": [],
    "screenshots": [],
    "current_question": None,
    "extracted_questions": {},  # Map screenshot paths to extracted questions
    "solutions": {},  # Map screenshot paths to solutions
    "react_solutions": {} # Map screenshot paths to raw React solutions from Claude
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

# API endpoint to get transcriptions from the last 2 minutes
@app.route('/api/transcriptions/recent', methods=['GET'])
def get_recent_transcriptions():
    with transcription_lock:
        if not transcriptions:
            return jsonify([])
        
        # Get current time
        current_time = datetime.now()
        
        # Filter transcriptions from the last 2 minutes
        recent_transcriptions = []
        for transcript in transcriptions:
            try:
                # Parse the timestamp
                transcript_time = datetime.strptime(transcript["timestamp"], "%Y-%m-%d %H:%M:%S")
                
                # Calculate time difference in seconds
                time_diff = (current_time - transcript_time).total_seconds()
                
                # If within the last 2 minutes (120 seconds)
                if time_diff <= 120:
                    recent_transcriptions.append(transcript)
            except (ValueError, KeyError) as e:
                print(f"Error parsing timestamp: {e}")
                continue
        
        return jsonify(recent_transcriptions)

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
        
        # Extract the coding question directly if it's a coding question
        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question(screenshot_path)
            
            if extracted_question:
                print(f"Extracted question with Claude: {extracted_question}")
                
                # Store the extracted question
                with interview_data_lock:
                    interview_data["extracted_questions"][screenshot_path] = extracted_question
        
        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
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
        
        # Extract the coding question directly if it's a coding question
        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question_with_gemini(screenshot_path)
            
            if extracted_question:
                print(f"Extracted question with Gemini: {extracted_question}")
                
                # Store the extracted question
                with interview_data_lock:
                    interview_data["extracted_questions"][screenshot_path] = extracted_question
        
        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
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

# API endpoint to get design system question
@app.route('/api/get-design-question', methods=['POST'])
def get_design_question():
    try:
        # Take a screenshot
        screenshot_path = take_screenshot()
        
        # Get question context if available
        data = request.json or {}
        question_type = data.get('question_type', 'design')
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
        
        # Extract the design question
        extracted_question = extract_design_question_with_gemini(screenshot_path)
        
        if extracted_question:
            print(f"Extracted design question: {extracted_question}")
            
            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question
        
        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# API endpoint to extract React question with Gemini
@app.route('/api/extract-react-question', methods=['POST'])
def extract_react_question():
    try:
        # Take a screenshot
        screenshot_path = take_screenshot()
        
        # Get question context if available
        data = request.json or {}
        question_type = data.get('question_type', 'react')
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
        
        # Extract the React question
        extracted_question = extract_react_question_with_gemini(screenshot_path)
        
        if extracted_question:
            print(f"Extracted React question: {extracted_question}")
            
            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question
        
        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# API endpoint to extract question with OpenAI
@app.route('/api/extract-with-openai', methods=['POST'])
def extract_with_openai():
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
        
        # Extract the coding question directly if it's a coding question
        extracted_question = None
        if question_type == 'coding':
            extracted_question = extract_coding_question_with_openai(screenshot_path)
            
            if extracted_question:
                print(f"Extracted question with OpenAI: {extracted_question}")
                
                # Store the extracted question
                with interview_data_lock:
                    interview_data["extracted_questions"][screenshot_path] = extracted_question
        
        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Function to process screenshot with OpenAI API
def process_screenshot_with_openai(screenshot_path):
    try:
        # Extract coding question from the screenshot
        extracted_question = extract_coding_question_with_openai(screenshot_path)
        
        if extracted_question:
            print(f"Extracted question with OpenAI: {extracted_question}")
            
            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question
        else:
            print("Failed to extract question from screenshot with OpenAI")
    except Exception as e:
        print(f"Error processing screenshot with OpenAI: {str(e)}")

# API endpoint to extract React question with OpenAI
@app.route('/api/extract-react-question-openai', methods=['POST'])
def extract_react_question_openai():
    try:
        # Take a screenshot
        screenshot_path = take_screenshot()

        # Get question context if available
        data = request.json or {}
        question_type = data.get('question_type', 'react') # Should be 'react' from frontend
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

        # Extract the React question using OpenAI
        extracted_question = extract_react_question_with_openai(screenshot_path)

        if extracted_question:
            print(f"Extracted React question with OpenAI: {extracted_question}")

            # Store the extracted question
            with interview_data_lock:
                interview_data["extracted_questions"][screenshot_path] = extracted_question

        # Return the screenshot info and extracted question
        return jsonify({
            "status": "success",
            "screenshot": screenshot_info,
            "extracted_question": extracted_question
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

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

# API endpoint to get a follow-up solution with Claude
@app.route('/api/solution/followup', methods=['POST'])
def get_followup_solution_route():
    data = request.json or {}
    current_problem = data.get('problem', '')
    current_code = data.get('code', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not current_problem or not current_code or not transcript:
        return jsonify({
            "status": "error",
            "message": "Missing required parameters"
        }), 400
    
    # Start a thread to get the follow-up solution
    solution_thread = threading.Thread(
        target=process_followup_solution,
        args=(current_problem, current_code, transcript, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Follow-up solution request submitted"
    })

# API endpoint to get a follow-up solution with Gemini
@app.route('/api/solution/followup-with-gemini', methods=['POST'])
def get_followup_solution_with_gemini_route():
    data = request.json or {}
    current_problem = data.get('problem', '')
    current_code = data.get('code', '')
    transcript = data.get('transcript', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not current_problem or not current_code or not transcript:
        return jsonify({
            "status": "error",
            "message": "Missing required parameters"
        }), 400
    
    # Start a thread to get the follow-up solution with Gemini
    solution_thread = threading.Thread(
        target=process_followup_solution_with_gemini,
        args=(current_problem, current_code, transcript, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Gemini follow-up solution request submitted"
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

# Function to process follow-up solution with Claude
def process_followup_solution(current_problem, current_code, transcript, screenshot_path):
    try:
        print(f"Processing follow-up request with transcript length: {len(transcript)} characters")
        print(f"Follow-up request transcript excerpt: {transcript[:100]}...")
        
        # Get follow-up solution
        solution = get_followup_solution(current_problem, current_code, transcript)
        
        if solution:
            print(f"Follow-up solution generated successfully")
            print(f"Follow-up solution explanation length: {len(solution.get('explanation', ''))}")
            print(f"Follow-up solution code length: {len(solution.get('code', ''))}")
            
            # Store the solution as a follow-up solution
            with interview_data_lock:
                # Create a follow-up solution entry
                followup_solution = {
                    "explanation": solution.get("explanation", ""),
                    "solution": solution.get("solution", ""),
                    "code": solution.get("code", ""),
                    "is_followup": True,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Store the follow-up solution
                # Use a special key format to indicate it's a follow-up
                followup_key = f"{screenshot_path}:followup:{int(time.time())}"
                interview_data["solutions"][followup_key] = followup_solution
                
                print(f"Follow-up solution stored with key: {followup_key}")
        else:
            print("Failed to generate follow-up solution")
    except Exception as e:
        print(f"Error processing follow-up solution: {str(e)}")

# API endpoint to get a solution for a coding question with OpenAI
@app.route('/api/solution-with-openai', methods=['POST'])
def get_solution_with_openai():
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
        target=process_solution_with_openai,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "OpenAI solution request submitted"
    })

# API endpoint to get a solution for a coding question with Gemini
@app.route('/api/solution-with-gemini', methods=['POST'])
def get_solution_with_gemini():
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
        target=process_solution_with_gemini,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Gemini solution request submitted"
    })

# API endpoint to get a React solution for a coding question with Gemini
@app.route('/api/react-solution-with-gemini', methods=['POST'])
def get_react_solution_with_gemini_route():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not question:
        return jsonify({
            "status": "error",
            "message": "No question provided"
        }), 400
    
    # Start a thread to get the React solution
    solution_thread = threading.Thread(
        target=process_react_solution_with_gemini,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "React Gemini solution request submitted"
    })

# API endpoint to get a React solution for a coding question with Claude
@app.route('/api/react-solution-with-claude', methods=['POST'])
def get_react_solution_with_claude_route():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not question:
        return jsonify({
            "status": "error",
            "message": "No question provided"
        }), 400
    
    # Start a thread to get the React solution with Claude
    solution_thread = threading.Thread(
        target=process_react_solution_with_claude,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "React Claude solution request submitted"
    })

# API endpoint to get a React solution2 for a coding question with Gemini (using Claude's prompt)
@app.route('/api/react-solution2-with-gemini', methods=['POST'])
def get_react_solution2_with_gemini_route():
    data = request.json or {}
    question = data.get('question', '')
    screenshot_path = data.get('screenshot_path', '')
    
    if not question:
        return jsonify({
            "status": "error",
            "message": "No question provided"
        }), 400
    
    # Start a thread to get the React solution
    solution_thread = threading.Thread(
        target=process_react_solution2_with_gemini,
        args=(question, screenshot_path)
    )
    solution_thread.daemon = True
    solution_thread.start()
    
    return jsonify({
        "status": "success",
        "message": "React Gemini solution2 request submitted"
    })

# Function to process solution with OpenAI API
def process_solution_with_openai(question, screenshot_path):
    try:
        # Get solution for the question
        solution = get_solution_for_question_with_openai(question)
        
        if solution:
            print(f"Solution generated for question with OpenAI")
            
            # Store the solution
            with interview_data_lock:
                interview_data["solutions"][screenshot_path] = solution
        else:
            print("Failed to generate solution for question with OpenAI")
    except Exception as e:
        print(f"Error processing solution with OpenAI: {str(e)}")

# Function to process follow-up solution with Gemini
def process_followup_solution_with_gemini(current_problem, current_code, transcript, screenshot_path):
    try:
        print(f"Processing Gemini follow-up request with transcript length: {len(transcript)} characters")
        print(f"Gemini follow-up request transcript excerpt: {transcript[:100]}...")
        
        # Get follow-up solution with Gemini
        solution = get_followup_solution_with_gemini(current_problem, current_code, transcript)
        
        print('soltion is here')
        print(solution)
        if solution:
            print(f"Gemini follow-up solution generated successfully")
            print(f"Gemini follow-up solution explanation length: {len(solution.get('explanation', ''))}")
            print(f"Gemini follow-up solution code length: {len(solution.get('code', ''))}")
            
            # Store the solution as a follow-up solution
            with interview_data_lock:
                # Create a follow-up solution entry
                followup_solution = {
                    "explanation": solution.get("explanation", ""),
                    "solution": solution.get("solution", ""),
                    "code": solution.get("code", ""),
                    "is_followup": True,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Store the follow-up solution
                # Use a special key format to indicate it's a Gemini follow-up
                followup_key = f"{screenshot_path}:gemini-followup:{int(time.time())}"
                interview_data["solutions"][followup_key] = followup_solution
                
                print(f"Gemini follow-up solution stored with key: {followup_key}")
        else:
            print("Failed to generate Gemini follow-up solution")
    except Exception as e:
        print(f"Error processing Gemini follow-up solution: {str(e)}")

# Function to process solution with Gemini API
def process_solution_with_gemini(question, screenshot_path):
    try:
        # Get solution for the question
        solution = get_solution_for_question_with_gemini(question)
        
        if solution:
            print(f"Solution generated for question with Gemini")
            print(f"Solution explanation length: {len(solution.get('explanation', ''))}")
            print(f"Solution interview-style explanation length: {len(solution.get('solution', ''))}")
            print(f"Solution code length: {len(solution.get('code', ''))}")
            
            # Store the solution
            with interview_data_lock:
                interview_data["solutions"][screenshot_path] = solution
        else:
            print("Failed to generate solution for question with Gemini")
    except Exception as e:
        print(f"Error processing solution with Gemini: {str(e)}")

# Function to process React solution with Gemini API
def process_react_solution_with_gemini(question, screenshot_path):
    try:
        # Get React solution for the question
        solution = get_react_solution_with_gemini(question)
        
        if solution:
            print(f"React solution generated for question with Gemini")
            print(f"React solution explanation length: {len(solution.get('explanation', ''))}")
            print(f"React solution interview-style explanation length: {len(solution.get('solution', ''))}")
            print(f"React solution code length: {len(solution.get('code', ''))}")
            
            # Store the solution
            with interview_data_lock:
                interview_data["solutions"][screenshot_path] = solution
        else:
            print("Failed to generate React solution for question with Gemini")
    except Exception as e:
        print(f"Error processing React solution with Gemini: {str(e)}")

# Function to process React solution with Claude API
def process_react_solution_with_claude(question, screenshot_path):
    try:
        # Get React solution for the question using Claude
        solution = get_react_solution(question)
        
        if solution:
            print(f"React solution generated for question with Claude")
            print(f"React Claude solution explanation length: {len(solution.get('explanation', ''))}")
            print(f"React Claude solution interview-style explanation length: {len(solution.get('solution', ''))}")
            print(f"React Claude solution code length: {len(solution.get('code', ''))}")
            
            # Store the formatted solution in 'solutions'
            # Store the raw code response in 'react_solutions'
            with interview_data_lock:
                # The get_react_solution function currently returns a dict with only 'code' populated
                # We'll store this dict in 'solutions' for consistency with other solution types
                interview_data["solutions"][screenshot_path] = solution 
                # Store the raw code text directly in react_solutions
                interview_data["react_solutions"][screenshot_path] = solution.get("code", "") 
        else:
            print("Failed to generate React solution for question with Claude")
    except Exception as e:
        print(f"Error processing React solution with Claude: {str(e)}")

# Function to process React solution2 with Gemini API (using Claude's prompt)
def process_react_solution2_with_gemini(question, screenshot_path):
    try:
        # Get React solution for the question using Gemini with Claude's prompt
        solution = get_react_solution2_with_gemini(question)
        
        if solution:
            print(f"React solution2 generated for question with Gemini")
            print(f"React solution2 code length: {len(solution.get('code', ''))}")
            
            # Store the solution in both places like Claude's implementation
            with interview_data_lock:
                interview_data["solutions"][screenshot_path] = solution
                interview_data["react_solutions"][screenshot_path] = solution.get("code", "")
        else:
            print("Failed to generate React solution2 for question with Gemini")
    except Exception as e:
        print(f"Error processing React solution2 with Gemini: {str(e)}")

# API endpoint to get all solutions
@app.route('/api/solutions', methods=['GET'])
def get_solutions():
    with interview_data_lock:
        # Return both regular solutions and react solutions
        return jsonify({
            "solutions": interview_data["solutions"],
            "react_solutions": interview_data["react_solutions"]
        })

# API endpoint to get solution for a specific screenshot
@app.route('/api/solution/<path:screenshot_filename>', methods=['GET'])
def get_solution_for_screenshot(screenshot_filename):
    screenshot_path = os.path.join('screenshots', screenshot_filename)
    
    with interview_data_lock:
        solution = interview_data["solutions"].get(screenshot_path, None)
        react_solution = interview_data["react_solutions"].get(screenshot_path, None)
        
        return jsonify({
            "screenshot": screenshot_path,
            "solution": solution,
            "react_solution": react_solution # Include the raw react solution
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

# API endpoint to reset all data
@app.route('/api/reset', methods=['POST'])
def reset_all_data():
    global interview_data
    
    with interview_data_lock:
        # Reset interview data
        interview_data = {
            "questions": [],
            "screenshots": [],
            "current_question": None,
            "extracted_questions": {},
            "solutions": {},
            "react_solutions": {}
        }
    
    # Clear transcriptions
    with transcription_lock:
        transcriptions.clear()
    
    return jsonify({
        "status": "success",
        "message": "All data has been reset"
    })

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
