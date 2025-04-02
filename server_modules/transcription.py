from flask import Blueprint, jsonify, request
from datetime import datetime

# Import shared app and data/locks
from .config import app, interview_data, interview_data_lock

# Import transcription-specific functionality
from web_adapter import WebTranscriber, transcriptions, transcription_lock, is_recording

# Global variable for the transcriber instance within this module
transcriber = None

# Create a Blueprint for transcription routes
transcription_bp = Blueprint('transcription', __name__, url_prefix='/api')

# --- Transcription Routes ---

@transcription_bp.route('/transcriptions', methods=['GET'])
def get_transcriptions():
    with transcription_lock:
        return jsonify(transcriptions)

@transcription_bp.route('/transcriptions/latest', methods=['GET'])
def get_latest_transcription():
    with transcription_lock:
        if transcriptions:
            return jsonify(transcriptions[-1])
        else:
            return jsonify({"text": "", "timestamp": ""})

@transcription_bp.route('/transcriptions/recent', methods=['GET'])
def get_recent_transcriptions():
    with transcription_lock:
        if not transcriptions:
            return jsonify([])

        current_time = datetime.now()
        recent_transcriptions = []
        for transcript in transcriptions:
            try:
                transcript_time = datetime.strptime(transcript["timestamp"], "%Y-%m-%d %H:%M:%S")
                time_diff = (current_time - transcript_time).total_seconds()
                if time_diff <= 120:
                    recent_transcriptions.append(transcript)
            except (ValueError, KeyError) as e:
                print(f"Error parsing timestamp: {e}")
                continue
        return jsonify(recent_transcriptions)

# --- Recording Routes ---

@transcription_bp.route('/recording/start', methods=['POST'])
def start_recording():
    global transcriber

    if is_recording:
        return jsonify({"status": "already_recording"})

    with transcription_lock:
        transcriptions.clear()

    data = request.json or {}
    device_name = data.get('device_name', 'BlackHole')
    record_seconds = int(data.get('record_seconds', 5))
    duration = data.get('duration', None)

    transcriber = WebTranscriber(device_name=device_name, record_seconds=record_seconds)
    transcriber.start(duration=duration, output_file="transcription.txt")

    return jsonify({"status": "recording_started"})

@transcription_bp.route('/recording/stop', methods=['POST'])
def stop_recording():
    global transcriber

    if not is_recording or transcriber is None:
        return jsonify({"status": "not_recording"})

    transcriber.stop()
    transcriber.cleanup()
    transcriber = None

    return jsonify({"status": "recording_stopped"})

@transcription_bp.route('/recording/status', methods=['GET'])
def recording_status():
    return jsonify({"is_recording": is_recording})
