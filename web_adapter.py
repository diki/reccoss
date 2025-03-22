# web_adapter.py
from datetime import datetime
import threading

# Import the WhisperTranscriber class from your existing file
from record_and_transcript import WhisperTranscriber

# Global variables to store transcriptions
transcriptions = []
transcription_lock = threading.Lock()
is_recording = False

class WebTranscriber:
    """
    A wrapper class around WhisperTranscriber that adds web functionality
    """
    def __init__(self, device_name="BlackHole", record_seconds=5):
        """Initialize the transcriber with the given parameters"""
        self.transcriber = WhisperTranscriber(device_name=device_name, record_seconds=record_seconds)
        self.original_transcribe_callback = None
        
        # Override the text queue handling to capture transcriptions for the web
        self._patch_transcribe_method()
    
    def _patch_transcribe_method(self):
        """
        Patch the transcribe_thread method to capture transcriptions for web display
        """
        original_method = self.transcriber.transcribe_thread
        
        def patched_transcribe_thread(*args, **kwargs):
            # Store reference to the original method to restore later
            self.original_transcribe_callback = original_method
            
            # Run the original transcribe thread method
            while not self.transcriber.stop_recording.is_set() or not self.transcriber.audio_queue.empty():
                try:
                    # Get audio data with a timeout
                    audio_data = self.transcriber.audio_queue.get(timeout=1.0)
                    
                    # Process using the transcriber's internal methods
                    result = self._process_audio_chunk(audio_data)
                    
                    # Mark the task as done
                    self.transcriber.audio_queue.task_done()
                except Exception as e:
                    pass
            
        # Replace the original method with our patched version
        self.transcriber.transcribe_thread = patched_transcribe_thread
    
    def _process_audio_chunk(self, audio_data):
        """Process an audio chunk and add result to web transcriptions"""
        import tempfile
        import wave
        import os
        
        # Create a temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_filename = temp_file.name
        
        # Save the audio chunk to the temporary file
        with wave.open(temp_filename, 'wb') as wf:
            wf.setnchannels(self.transcriber.channels)
            wf.setsampwidth(self.transcriber.p.get_sample_size(self.transcriber.format))
            wf.setframerate(self.transcriber.sample_rate)
            wf.writeframes(audio_data)
        
        try:
            # Import what we need from record_and_transcript
            from record_and_transcript import client
            
            # Use OpenAI Whisper API to transcribe the audio
            from datetime import datetime
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] WebAdapter: Sending transcript request to Whisper API...")
            with open(temp_filename, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] WebAdapter: Received response from Whisper API")
            
            text = transcript.text.strip()
            if text:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"\nTranscription: {text}")
                
                # Add to global transcriptions list with timestamp
                with transcription_lock:
                    transcriptions.append({
                        "text": text,
                        "timestamp": timestamp
                    })
                
                # Also add to the original text queue for file saving
                self.transcriber.text_queue.put(text)
                
                return text
        except Exception as e:
            print(f"\nError with Whisper API: {e}")
        
        # Clean up the temporary file
        os.unlink(temp_filename)
        return None
    
    def start(self, duration=None, output_file="transcription.txt", save_audio=False):
        """Start recording and transcribing audio"""
        global is_recording
        is_recording = True
        
        # Start recording in a background thread
        def background_recording():
            try:
                self.transcriber.start(duration=duration, output_file=output_file, save_audio=save_audio)
            except KeyboardInterrupt:
                pass
            finally:
                global is_recording
                is_recording = False
        
        recording_thread = threading.Thread(target=background_recording)
        recording_thread.daemon = True
        recording_thread.start()
    
    def stop(self):
        """Stop recording and transcribing"""
        self.transcriber.stop()
        global is_recording
        is_recording = False
    
    def cleanup(self):
        """Clean up resources"""
        self.transcriber.cleanup()
