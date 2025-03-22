import pyaudio
import wave
import time
import sys
import threading
import queue
import numpy as np
import tempfile
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (for OPENAI_API_KEY)
load_dotenv()

# Initialize the OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# If you want to set the API key directly:
# client = OpenAI(api_key="your_openai_api_key_here")

class WhisperTranscriber:
    def __init__(self, device_name="BlackHole", 
                 sample_rate=16000,  # 16kHz works well with Whisper
                 channels=1,  # Mono for speech recognition
                 format=pyaudio.paInt16,
                 chunk_size=1024,
                 record_seconds=3):  # Processing chunks of 10 seconds for Whisper
        
        self.device_name = device_name
        self.sample_rate = sample_rate
        self.channels = channels
        self.format = format
        self.chunk_size = chunk_size
        self.record_seconds = record_seconds
        self.frames_per_buffer = int(self.sample_rate * self.record_seconds)
        
        self.p = pyaudio.PyAudio()
        self.audio_queue = queue.Queue()
        self.text_queue = queue.Queue()
        self.stop_recording = threading.Event()
        self.all_audio_data = []  # Store all audio data if needed
        
        # Find the BlackHole device index
        self.device_index = None
        for i in range(self.p.get_device_count()):
            device_info = self.p.get_device_info_by_index(i)
            if device_name in device_info["name"]:
                self.device_index = i
                break
        
        if self.device_index is None:
            print(f"Could not find device with name {device_name}")
            print("Available devices:")
            for i in range(self.p.get_device_count()):
                print(f"  {i}: {self.p.get_device_info_by_index(i)['name']}")
            self.p.terminate()
            return
        
        # Check if OpenAI API key is set
        if not os.getenv("OPENAI_API_KEY") and not client.api_key:
            print("Warning: OPENAI_API_KEY is not set. Please set it in your environment or in the code.")
            
    def record_audio_thread(self):
        """Thread function to continuously record audio and add to queue"""
        stream = self.p.open(format=self.format,
                          channels=self.channels,
                          rate=self.sample_rate,
                          input=True,
                          input_device_index=self.device_index,
                          frames_per_buffer=self.chunk_size)
        
        print(f"Recording from {self.device_name} (device index {self.device_index})")
        print(f"Sample rate: {self.sample_rate} Hz")
        print(f"Channels: {self.channels}")
        
        # Buffer to store audio chunks
        frames = []
        chunks_per_buffer = int(self.frames_per_buffer / self.chunk_size)
        
        while not self.stop_recording.is_set():
            data = stream.read(self.chunk_size, exception_on_overflow=False)
            frames.append(data)
            self.all_audio_data.append(data)  # Store all audio data
            
            # When we have enough chunks for our desired buffer size
            if len(frames) >= chunks_per_buffer:
                # Add the audio data to the queue
                audio_data = b''.join(frames)
                self.audio_queue.put(audio_data)
                frames = []
                
                # Print a status indicator
                sys.stdout.write(".")
                sys.stdout.flush()
        
        # Close and clean up the stream
        stream.stop_stream()
        stream.close()
        print("\nRecording stopped")
    
    def transcribe_thread(self):
        """Thread function to transcribe audio chunks from the queue using OpenAI Whisper API"""
        while not self.stop_recording.is_set() or not self.audio_queue.empty():
            try:
                # Get audio data with a timeout
                audio_data = self.audio_queue.get(timeout=1.0)
                
                # Create a temporary WAV file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                    temp_filename = temp_file.name
                
                # Save the audio chunk to the temporary file
                with wave.open(temp_filename, 'wb') as wf:
                    wf.setnchannels(self.channels)
                    wf.setsampwidth(self.p.get_sample_size(self.format))
                    wf.setframerate(self.sample_rate)
                    wf.writeframes(audio_data)
                
                try:
                    # Use OpenAI Whisper API to transcribe the audio with new API format
                    print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Sending transcript request to Whisper API...")
                    with open(temp_filename, "rb") as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file
                        )
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Received response from Whisper API")
                    
                    text = transcript.text.strip()
                    if text:
                        print(f"\nTranscription: {text}")
                        self.text_queue.put(text)
                except Exception as e:
                    print(f"\nError with Whisper API: {e}")
                
                # Clean up the temporary file
                os.unlink(temp_filename)
                self.audio_queue.task_done()
            except queue.Empty:
                continue
    
    def save_transcription_thread(self, output_file="transcription.txt"):
        """Thread function to save transcriptions to a file"""
        with open(output_file, 'w') as f:
            while not self.stop_recording.is_set() or not self.text_queue.empty():
                try:
                    # Get text with a timeout
                    text = self.text_queue.get(timeout=1.0)
                    f.write(text + '\n')
                    f.flush()  # Flush to ensure text is written immediately
                    self.text_queue.task_done()
                except queue.Empty:
                    continue
    
    def start(self, duration=None, output_file="transcription.txt", save_audio=False, audio_filename="recorded_output.wav"):
        """Start recording and transcribing audio"""
        # Start recording thread
        record_thread = threading.Thread(target=self.record_audio_thread)
        record_thread.daemon = True
        record_thread.start()
        
        # Start transcription thread
        transcribe_thread = threading.Thread(target=self.transcribe_thread)
        transcribe_thread.daemon = True
        transcribe_thread.start()
        
        # Start saving thread
        save_thread = threading.Thread(target=self.save_transcription_thread, args=(output_file,))
        save_thread.daemon = True
        save_thread.start()
        
        try:
            if duration:
                print(f"Recording for {duration} seconds...")
                time.sleep(duration)
                self.stop()
            else:
                print("Recording indefinitely. Press Ctrl+C to stop.")
                while True:
                    time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nStopping recording...")
            self.stop()
        
        # Wait for threads to finish
        record_thread.join()
        transcribe_thread.join()
        save_thread.join()
        
        # Save complete audio if requested
        if save_audio and self.all_audio_data:
            self.save_audio(audio_filename)
        
        print(f"Transcription saved to {output_file}")
    
    def stop(self):
        """Stop recording and transcribing"""
        self.stop_recording.set()
    
    def save_audio(self, filename):
        """Save all recorded audio to a WAV file"""
        with wave.open(filename, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.p.get_sample_size(self.format))
            wf.setframerate(self.sample_rate)
            wf.writeframes(b''.join(self.all_audio_data))
        
        print(f"Audio saved to {filename}")
    
    def cleanup(self):
        """Clean up resources"""
        self.p.terminate()


if __name__ == "__main__":
    # Example usage
    transcriber = WhisperTranscriber(device_name="BlackHole", record_seconds=10)
    transcriber.start(duration=160, output_file="transcription.txt", save_audio=True)
    transcriber.cleanup()
