import os
import base64
import mimetypes
import google.generativeai as genai


def save_binary_file(file_name, data):
    with open(file_name, "wb") as f:
        f.write(data)
    print(f"File saved to: {file_name}")


def generate():
    # Get API key from environment variable
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    try:
        # Load the image
        with open("test.jpeg", "rb") as image_file:
            image_data = image_file.read()
        
        # Initialize the model for image generation
        model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
        
        # Create a prompt with text first, then the image (like in gemini_api.py)
        response = model.generate_content([
            "remove coffee table",
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
        # Save the result
        if response and response.text:
            # If there's text output, print it
            print(response.text.strip())
            
            # Check if there's an image in the response
            if hasattr(response, 'parts'):
                for part in response.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        file_name = "result"
                        mime_type = part.inline_data.mime_type
                        file_extension = mimetypes.guess_extension(mime_type)
                        save_binary_file(
                            f"{file_name}{file_extension}", 
                            part.inline_data.data
                        )
                        print(f"File of mime type {mime_type} saved to: {file_name}{file_extension}")
        else:
            print("Empty response from Gemini API")
    
    except Exception as e:
        print(f"Exception when calling Gemini API: {str(e)}")

if __name__ == "__main__":
    generate()
