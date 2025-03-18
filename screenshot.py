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
    
    # Generate a filename with current timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"screenshot_{timestamp}.png"
    filepath = os.path.join(output_directory, filename)
    
    # Take the screenshot of the entire screen
    with mss.mss() as sct:
        # Get the first monitor (entire screen)
        monitor = sct.monitors[0]
        
        # Capture the screen
        screenshot = sct.grab(monitor)
        
        # Save the screenshot
        mss.tools.to_png(screenshot.rgb, screenshot.size, output=filepath)
    
    print(f"Screenshot saved to: {filepath}")
    return filepath

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
    # Take a screenshot of the entire screen
    take_screenshot()
    
    # Take a screenshot of a specific region (e.g., top-left portion of the screen)
    # take_screenshot_of_region(left=0, top=0, width=800, height=600)