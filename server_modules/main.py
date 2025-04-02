import os
import threading
import time
from flask import render_template, send_from_directory

# Import the app instance from config
from .config import app

# Import Blueprints from other modules
from .transcription import transcription_bp
from .screenshot import screenshot_bp
from .solution import solution_bp
from .interview import interview_bp

# Import transcription components needed for default recording start
from web_adapter import WebTranscriber, transcriptions, transcription_lock

# Register Blueprints
app.register_blueprint(transcription_bp)
app.register_blueprint(screenshot_bp)
app.register_blueprint(solution_bp)
app.register_blueprint(interview_bp)

# --- Core Routes ---

@app.route('/')
def home():
    # Render the main index page from the templates folder
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    # Serve static files (CSS, JS) from the static folder
    # The static_folder path is already configured in config.py
    return send_from_directory(app.static_folder, path)

# --- Default Recording Start ---

# Global transcriber instance for the default start function
default_transcriber = None

def start_default_recording():
    """Start recording automatically when the server starts"""
    global default_transcriber

    # Wait a bit for the server to fully start
    print("Waiting 2 seconds before starting default recording...")
    time.sleep(2)

    # Clear previous transcriptions
    with transcription_lock:
        transcriptions.clear()
        print("Cleared previous transcriptions.")

    # Start the transcriber
    try:
        # Use default settings from the original server.py
        default_transcriber = WebTranscriber(device_name="BlackHole", record_seconds=5)
        # Start indefinitely, writing to transcription.txt
        default_transcriber.start(output_file="transcription.txt")
        print("Default recording started automatically.")
    except Exception as e:
        print(f"Error starting default recording: {e}")
        # Attempt cleanup if initialization failed partially
        if default_transcriber:
            try:
                default_transcriber.stop()
                default_transcriber.cleanup()
            except Exception as cleanup_e:
                print(f"Error during cleanup after failed start: {cleanup_e}")
        default_transcriber = None


# --- Main Execution Block ---

def run_app():
    """Configures and runs the Flask application."""
    # Make sure the required folders exist relative to the project root
    # Assuming this script might be run from server_modules or project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    os.makedirs(os.path.join(project_root, 'templates'), exist_ok=True)
    os.makedirs(os.path.join(project_root, 'static'), exist_ok=True)
    os.makedirs(os.path.join(project_root, 'screenshots'), exist_ok=True)
    print("Checked/created required directories.")

    # Start default recording in a separate thread
    print("Starting default recording thread...")
    recording_thread = threading.Thread(target=start_default_recording)
    recording_thread.daemon = True
    recording_thread.start()

    # Run the app
    # use_reloader=False is important to prevent the default recording thread
    # from starting twice in debug mode.
    print("Starting Flask server on 0.0.0.0:5050...")
    app.run(debug=True, host='0.0.0.0', port=5050, use_reloader=False)

if __name__ == '__main__':
    run_app()
