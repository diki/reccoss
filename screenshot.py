import mss
import mss.tools
import time
import os
from datetime import datetime

def take_screenshot(output_directory='screenshots'):
    """
    Take a screenshot using MSS (faster than PyAutoGUI) and save it
    
    Parameters:
    - output_directory: Directory to save screenshots (will be created if it doesn't exist)
    
    Returns:
    - Path to the saved screenshot
    """
    # Create the output directory if it doesn't exist
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    
    print("taking screenshot")
    
    # Print available monitors
    with mss.mss() as sct:
        print(f"Available monitors: {len(sct.monitors) - 1}")  # Subtract 1 because monitors[0] is the combined view
        print("Monitor 0 (Virtual screen of all monitors combined):")
        print(f"  Width: {sct.monitors[0]['width']}px, Height: {sct.monitors[0]['height']}px")
        
        for i, monitor in enumerate(sct.monitors[1:], 1):
            print(f"Monitor {i}:")
            print(f"  Left: {monitor['left']}, Top: {monitor['top']}")
            print(f"  Width: {monitor['width']}px, Height: {monitor['height']}px")
    
    # Generate a filename with current timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"screenshot_{timestamp}.png"
    filepath = os.path.join(output_directory, filename)
    
    # Take the screenshot of the entire screen
    with mss.mss() as sct:
        # Get the first monitor (entire screen)
        monitor = sct.monitors[1]
        
        # Capture the screen
        screenshot = sct.grab(monitor)
        
        # Save the screenshot
        mss.tools.to_png(screenshot.rgb, screenshot.size, output=filepath)
    
    print(f"Screenshot saved to: {filepath}")
    return filepath

def take_screenshot_of_specific_monitor(monitor_number=1, output_directory='screenshots'):
    """
    Take a screenshot of a specific monitor
    
    Parameters:
    - monitor_number: The index of the monitor to capture (1 for primary, 2 for secondary, etc.)
    - output_directory: Directory to save screenshots
    
    Returns:
    - Path to the saved screenshot
    """
    # Create the output directory if it doesn't exist
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    
    # Generate a filename with current timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"monitor{monitor_number}_screenshot_{timestamp}.png"
    filepath = os.path.join(output_directory, filename)
    
    # Take the screenshot of the specific monitor
    with mss.mss() as sct:
        # List available monitors
        monitor_count = len(sct.monitors) - 1  # Subtract 1 because monitors[0] is the "all monitors combined" view
        
        if monitor_number < 1 or monitor_number > monitor_count:
            print(f"Error: Monitor number {monitor_number} is out of range. Available monitors: 1 to {monitor_count}")
            return None
        
        # Get the specified monitor
        # Note: monitors[0] is the entire screen, so we use the actual index specified by the user
        monitor = sct.monitors[monitor_number]
        
        # Capture the screen
        screenshot = sct.grab(monitor)
        
        # Save the screenshot
        mss.tools.to_png(screenshot.rgb, screenshot.size, output=filepath)
    
    print(f"Screenshot of monitor {monitor_number} saved to: {filepath}")
    return filepath

def list_available_monitors():
    """
    Print information about all available monitors
    """
    with mss.mss() as sct:
        print(f"Total number of monitors: {len(sct.monitors) - 1}")  # Subtract 1 because monitors[0] is the combined view
        print("Monitor 0 (Virtual screen of all monitors combined):")
        print(f"  Width: {sct.monitors[0]['width']}px, Height: {sct.monitors[0]['height']}px")
        
        for i, monitor in enumerate(sct.monitors[1:], 1):
            print(f"Monitor {i}:")
            print(f"  Left: {monitor['left']}, Top: {monitor['top']}")
            print(f"  Width: {monitor['width']}px, Height: {monitor['height']}px")

def take_screenshot_of_region(left=0, top=0, width=800, height=600, output_directory='screenshots'):
    """
    Take a screenshot of a specific region of the screen
    
    Parameters:
    - left, top: Coordinates of the top-left corner of the region
    - width, height: Dimensions of the region
    - output_directory: Directory to save screenshots
    
    Returns:
    - Path to the saved screenshot
    """
    # Create the output directory if it doesn't exist
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    
    # Generate a filename with current timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"region_screenshot_{timestamp}.png"
    filepath = os.path.join(output_directory, filename)
    
    # Define the region to capture
    region = {"left": left, "top": top, "width": width, "height": height}
    
    # Take the screenshot of the specific region
    with mss.mss() as sct:
        screenshot = sct.grab(region)
        mss.tools.to_png(screenshot.rgb, screenshot.size, output=filepath)
    
    print(f"Region screenshot saved to: {filepath}")
    return filepath

if __name__ == "__main__":
    # List all available monitors
    list_available_monitors()
    
    # Take a screenshot of the first physical monitor (primary display)
    take_screenshot_of_specific_monitor(monitor_number=1)
    
    # Uncomment to take screenshot of the second monitor
    # take_screenshot_of_specific_monitor(monitor_number=2)