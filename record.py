import pyaudio
import wave
import time
import sys

def record_audio(output_filename="recorded_output.wav", 
                 device_name="BlackHole", 
                 duration=10,
                 sample_rate=44100,
                 channels=2,
                 format=pyaudio.paInt16):
    """
    Record audio from a specified input device (BlackHole) for a set duration.
    
    Parameters:
    - output_filename: Name of the output WAV file
    - device_name: Name of the BlackHole device to record from
    - duration: Recording duration in seconds
    - sample_rate: Audio sample rate
    - channels: Number of audio channels (1=mono, 2=stereo)
    - format: Audio format (default is 16-bit PCM)
    """
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
        return
    
    print(f"Recording from {device_name} (device index {device_index})")
    print(f"Recording duration: {duration} seconds")
    print(f"Sample rate: {sample_rate} Hz")
    print(f"Channels: {channels}")
    
    # Open stream for recording
    stream = p.open(format=format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=1024)
    
    print("* Recording started")
    
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
    
    print("\n* Recording complete")
    
    # Stop and close the stream
    stream.stop_stream()
    stream.close()
    p.terminate()
    
    # Save the recorded data as a WAV file
    with wave.open(output_filename, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(format))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
    
    print(f"* Audio saved to {output_filename}")

if __name__ == "__main__":
    record_audio(duration=30)  # Record for 30 seconds