import pyaudio
import wave
import time
import os
import sys
import threading
import queue
import tempfile
import numpy as np
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (for OPENAI_API_KEY)
load_dotenv()

# Initialize the OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class MicrophoneTranscriber:
    def __init__(self, 
                 sample_rate=16000,    # 16kHz works well with Whisper
                 channels=1,           # Mono for voice recognition
                 format=pyaudio.paInt16,
                 chunk_size=1024,
                 record_seconds=5):    # Process in 5-second chunks
        
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
        
        # Find default microphone
        self.mic_index = self.find_microphone()
        
        # Check if OpenAI API key is set
        if not os.getenv("OPENAI_API_KEY") and not client.api_key:
            print("Warning: OPENAI_API_KEY is not set. Please set it in your environment or in the code.")
    
    def find_microphone(self):
        """Find the default microphone or ask user to select one"""
        try:
            # Try to find default input device
            default_index = self.p.get_default_input_device_info()['index']
            
            # List all available input devices
            print("Available microphones:")
            input_devices = []
            
            for i in range(self.p.get_device_count()):
                device_info = self.p.get_device_info_by_index(i)
                
                # Show only input devices
                if device_info['maxInputChannels'] > 0:
                    input_devices.append(i)
                    print(f"  {i}: {device_info['name']}")
                    
                    # Mark default
                    if i == default_index:
                        print("    (Default)")
            
            # If running in interactive mode, ask for device selection
            if sys.stdin.isatty():
                use_default = input(f"Use default microphone (y/n)? ").lower() == 'y'
                
                if use_default:
                    return default_index
                else:
                    while True:
                        try:
                            index = int(input("Enter the device index to use: "))
                            if index in input_devices:
                                return index
                            else:
                                print("Invalid index. Please choose from the list.")
                        except ValueError:
                            print("Please enter a number.")
            
            # Non-interactive mode: use default
            return default_index
            
        except Exception as e:
            print(f"Error finding microphone: {e}")
            print("Falling back to default input device")
            return None  # Will use default
    
    def record_audio_thread(self):
        """Thread function to continuously record audio and add to queue"""
        stream = self.p.open(format=self.format,
                          channels=self.channels,
                          rate=self.sample_rate,
                          input=True,
                          input_device_index=self.mic_index,
                          frames_per_buffer=self.chunk_size)
        
        # Get microphone info if available
        if self.mic_index is not None:
            mic_info = self.p.get_device_info_by_index(self.mic_index)
            print(f"Recording from: {mic_info['name']}")
        else:
            print("Recording from default microphone")
            
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
                    # Use OpenAI Whisper API to transcribe the audio
                    with open(temp_filename, "rb") as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file
                        )
                    
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
    
    def save_transcription_thread(self, output_file="mic_transcription.txt"):
        """Thread function to save transcriptions to a file"""
        with open(output_file, 'w') as f:
            while not self.stop_recording.is_set() or not self.text_queue.empty():
                try:
                    # Get text with a timeout
                    text = self.text_queue.get(timeout=1.0)
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    f.write(f"[{timestamp}] {text}\n")
                    f.flush()  # Flush to ensure text is written immediately
                    self.text_queue.task_done()
                except queue.Empty:
                    continue
    
    def start(self, duration=None, output_file="mic_transcription.txt", save_audio=False, audio_filename="mic_recording.wav"):
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
    transcriber = MicrophoneTranscriber(record_seconds=5)
    transcriber.start(duration=60, output_file="mic_transcription.txt", save_audio=True)
    transcriber.cleanup()