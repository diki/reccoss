import pyaudio
import wave
import sys

def record_system_audio(output_filename="system_audio.wav", duration=20):
    """
    Record system audio output using BlackHole for a set duration.
    
    Parameters:
    - output_filename: Name of the output WAV file
    - duration: Recording duration in seconds (default is 20)
    
    Returns:
    - Path to the saved audio file
    """
    # Audio parameters
    device_name = "BlackHole"
    sample_rate = 44100
    channels = 2
    audio_format = pyaudio.paInt16
    
    # Initialize PyAudio
    p = pyaudio.PyAudio()
    
    # Find the BlackHole device index
    device_index = None
    for i in range(p.get_device_count()):
        device_info = p.get_device_info_by_index(i)
        if device_name in device_info["name"]:
            device_index = i
            break
    
    if device_index is None:
        print(f"Could not find device with name {device_name}")
        print("Available devices:")
        for i in range(p.get_device_count()):
            print(f"  {i}: {p.get_device_info_by_index(i)['name']}")
        p.terminate()
        return None
    
    print(f"Recording system audio via {device_name} for {duration} seconds...")
    
    # Open stream for recording
    stream = p.open(format=audio_format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=1024)
    
    frames = []
    
    # Record for the specified duration
    for i in range(0, int(sample_rate / 1024 * duration)):
        data = stream.read(1024)
        frames.append(data)
        
        # Print progress indicator
        if i % int(sample_rate / 1024) == 0:
            seconds_recorded = i / (sample_rate / 1024)
            sys.stdout.write(f"\rRecording: {seconds_recorded}/{duration} seconds")
            sys.stdout.flush()
    
    print("\nRecording complete!")
    
    # Stop and close the stream
    stream.stop_stream()
    stream.close()
    p.terminate()
    
    # Save the recorded data as a WAV file
    with wave.open(output_filename, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(audio_format))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
    
    print(f"System audio saved to: {output_filename}")
    return output_filename

if __name__ == "__main__":
    # When run directly, record for 20 seconds
    record_system_audio()
