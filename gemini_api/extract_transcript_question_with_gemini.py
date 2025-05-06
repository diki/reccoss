from typing import Optional, Dict
from .prompts import get_frontend_system_design_extraction_prompt_with_details # Changed import
from .common import genai, configure_gemini, json # Ensure json is imported

def extract_question_from_transcript_with_gemini(transcript_text: str) -> Optional[str]: # Return type is str for now
    """
    Uses Gemini to extract the latest frontend system design question, entities, and API details
    from the provided transcript text, returning as a JSON string.

    Args:
        transcript_text: The full text of the interview transcript.

    Returns:
        A JSON string containing the extracted question, entities, and API details,
        or None if extraction fails.
    """
    # 1. Configure Gemini API Key
    if not configure_gemini():
        return None

    try:
        # 2. Initialize the model
        # Using 1.5 flash as it's generally good for structured output and speed
        model = genai.GenerativeModel('gemini-2.5-pro-exp-03-25')

        # 3. Get the prompt
        prompt = get_frontend_system_design_extraction_prompt_with_details()

        # 4. Construct the full prompt including the transcript
        full_prompt = f"{prompt}\n\nTranscript:\n```\n{transcript_text}\n```"

        # 5. Define the response schema for structured output
        response_schema = {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "The complete extracted frontend system design question, including all requirements and details."
                },
                "entities": {
                    "type": "string",
                    "description": "A string containing TypeScript interface/type definitions for relevant data entities."
                },
                "api": {
                    "type": "string",
                    "description": "A string describing the REST API endpoints, including method, path, purpose, and example payloads."
                }
            },
            "required": ["question", "entities", "api"]
        }

        # 6. Call the Gemini API
        print("Sending request to Gemini to extract structured frontend system design details...")
        response = model.generate_content(
            full_prompt,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": response_schema
            }
        )

        # 7. Process the response
        if response and response.text:
            # For now, return the raw JSON string as per user request for testing
            extracted_json_string = response.text.strip()
            print(f"Successfully received JSON string from Gemini: {extracted_json_string}")
            return extracted_json_string
        else:
            print("Gemini did not return a response or response.text was empty.")
            # Check for potential safety blocks or other issues
            if response and hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                print(f"Gemini prompt feedback: {response.prompt_feedback}")
            if response and hasattr(response, 'candidates') and response.candidates and hasattr(response.candidates[0], 'finish_reason'):
                 print(f"Finish Reason: {response.candidates[0].finish_reason}")
            return None

    except Exception as e:
        print(f"Error extracting structured data with Gemini: {e}")
        # import traceback
        # traceback.print_exc() # Uncomment for detailed debugging if needed
        return None

if __name__ == '__main__':
    # Example usage (replace with actual transcript)
    sample_transcript = """
Interviewer: Okay, thanks for walking me through that. So, let's switch gears a bit. Can you tell me about a time you had to handle conflicting requirements?
Interviewee: Sure, there was this one project...
Interviewer: Interesting. Now, for the next task, I'd like you to design a frontend system for a simple photo gallery application.
It should allow users to upload images, view them in a grid, and click on an image to see a larger view with its title and description.
We'll need to think about how the image metadata (title, description, upload date, URL) is stored and retrieved.
What data entities would you define? And what API endpoints would the frontend need to interact with for uploading and fetching images and their details?
Interviewee: Okay, so for a photo gallery frontend...
"""
    extracted_data_string = extract_question_from_transcript_with_gemini(sample_transcript)
    if extracted_data_string:
        print("\n--- Extracted JSON String ---")
        print(extracted_data_string)
        # Try to parse it to see if it's valid JSON (for testing the __main__ block)
        try:
            parsed_json = json.loads(extracted_data_string)
            print("\n--- Parsed JSON (for testing) ---")
            print(json.dumps(parsed_json, indent=2))
        except json.JSONDecodeError as e:
            print(f"\n--- Failed to parse JSON string (in test block): {e} ---")
    else:
        print("\n--- Failed to extract data string ---")
