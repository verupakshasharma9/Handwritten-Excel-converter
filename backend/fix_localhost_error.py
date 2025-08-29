#!/usr/bin/env python3
"""
Fix for localhost handwritten table converter error
Run this script to test and fix the API key issue
"""

import os
import sys
from dotenv import load_dotenv
import json
import base64
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent / 'backend' / '.env'
load_dotenv(env_path)

def test_environment():
    """Test if environment is properly configured"""
    print("🔍 Testing Environment Configuration...")
    
    # Check API key
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        print("❌ EMERGENT_LLM_KEY not found in environment")
        return False
    else:
        print(f"✅ API Key found: {api_key[:20]}...")
    
    # Check MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not found in environment")
        return False
    else:
        print(f"✅ MongoDB URL: {mongo_url}")
    
    return True

def test_emergent_integration():
    """Test emergentintegrations library"""
    print("\
🧪 Testing EmergentIntegrations Library...")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        print("✅ EmergentIntegrations imported successfully")
        
        # Test API key format
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if api_key and api_key.startswith('sk-emergent-'):
            print("✅ API key format is correct")
        else:
            print("❌ API key format is incorrect")
            return False
            
        # Try to create a simple chat instance
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id="test-session",
                system_message="You are a helpful assistant."
            ).with_model("openai", "gpt-4o")
            print("✅ LlmChat instance created successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to create LlmChat instance: {e}")
            return False
            
    except ImportError as e:
        print(f"❌ Failed to import emergentintegrations: {e}")
        print("💡 Try reinstalling with:")
        print("pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
        return False

def create_fixed_backend():
    """Create a fixed version of the backend with better error handling"""
    print("\
🔧 Creating fixed backend version...")
    
    fixed_code = '''
async def extract_table_from_image(image_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Extract table data from image using AI with enhanced error handling"""
    try:
        # Detailed API key validation
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            logging.error("EMERGENT_LLM_KEY not found in environment variables")
            return {
                "success": False,
                "message": "API key not configured. Check backend/.env file has EMERGENT_LLM_KEY=sk-emergent-04a78B4D1485026CdF",
                "table_data": None
            }
        
        if not api_key.startswith('sk-emergent-'):
            logging.error(f"Invalid API key format: {api_key[:10]}...")
            return {
                "success": False,
                "message": "Invalid API key format. Should start with 'sk-emergent-'",
                "table_data": None
            }
        
        logging.info(f"Processing image with API key: {api_key[:20]}...")
        
        # Convert image to base64
        image_base64 = image_to_base64(image_bytes)
        logging.info(f"Image converted to base64, size: {len(image_base64)} characters")
        
        # Import and validate emergentintegrations
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        except ImportError as e:
            logging.error(f"EmergentIntegrations import failed: {e}")
            return {
                "success": False,
                "message": "EmergentIntegrations library not properly installed. Run: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/",
                "table_data": None
            }
        
        # Initialize LLM chat with detailed error handling
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"table_extraction_{uuid.uuid4()}",
                system_message="You are an expert at analyzing handwritten tables and extracting structured data."
            )
            
            # Configure model
            chat = chat.with_model("openai", "gpt-4o")
            logging.info("LlmChat initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize LlmChat: {e}")
            return {
                "success": False,
                "message": f"Failed to initialize AI chat: {str(e)}",
                "table_data": None
            }
        
        # Create image content
        try:
            image_content = ImageContent(image_base64=image_base64)
            logging.info("Image content created successfully")
        except Exception as e:
            logging.error(f"Failed to create image content: {e}")
            return {
                "success": False,
                "message": f"Failed to process image: {str(e)}",
                "table_data": None
            }
        
        # Create extraction prompt
        prompt = """Analyze this handwritten table image and extract all data into structured format.

Requirements:
1. First row = column headers/categories
2. Each subsequent row = data entries  
3. Return as JSON array where each element is a row (array of strings)
4. Preserve exact text, use best interpretation if unclear
5. Maintain table structure exactly as shown

Return ONLY valid JSON array:
[
  ["Header1", "Header2", "Header3"],
  ["Row1Col1", "Row1Col2", "Row1Col3"],
  ["Row2Col1", "Row2Col2", "Row2Col3"]
]

No explanations, just JSON array."""

        # Send message with comprehensive error handling
        try:
            user_message = UserMessage(text=prompt, file_contents=[image_content])
            logging.info("Sending message to AI...")
            
            response = await chat.send_message(user_message)
            logging.info(f"Received response: {response[:100]}...")
            
        except Exception as e:
            logging.error(f"Failed to send message to AI: {e}")
            return {
                "success": False,
                "message": f"AI processing failed: {str(e)}. Check your internet connection and API key.",
                "table_data": None
            }
        
        # Parse the JSON response
        try:
            # Clean the response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '')
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '')
            
            table_data = json.loads(response_text.strip())
            
            if not isinstance(table_data, list) or not table_data:
                raise ValueError("Invalid table data format")
            
            logging.info(f"Successfully extracted {len(table_data)} rows with {len(table_data[0]) if table_data else 0} columns")
                
            return {
                "success": True,
                "table_data": table_data,
                "message": f"Table extracted successfully: {len(table_data)} rows, {len(table_data[0]) if table_data else 0} columns"
            }
            
        except json.JSONDecodeError as e:
            logging.error(f"JSON parsing error: {e}, Response: {response}")
            return {
                "success": False,
                "message": f"Failed to parse AI response. Raw response: {response[:200]}...",
                "table_data": None
            }
            
    except Exception as e:
        logging.error(f"Unexpected error in extract_table_from_image: {e}")
        return {
            "success": False,
            "message": f"Unexpected error: {str(e)}",
            "table_data": None
        }
'''
    
    print("✅ Fixed backend code generated")
    print("📝 This code includes:")
    print("  - Enhanced API key validation")
    print("  - Better error messages")
    print("  - Detailed logging")
    print("  - Step-by-step error handling")
    
    return fixed_code

def main():
    """Main diagnostic and fix function"""
    print("🚀 Handwritten Table Converter - Error Diagnostic & Fix")
    print("=" * 60)
    
    # Test environment
    if not test_environment():
        print("\
❌ Environment configuration failed!")
        print("💡 Make sure your backend/.env file contains:")
        print("EMERGENT_LLM_KEY=sk-emergent-04a78B4D1485026CdF")
        print("MONGO_URL=mongodb://localhost:27017")
        print("DB_NAME=handwritten_tables")
        print("CORS_ORIGINS=http://localhost:3000")
        return 1
    
    # Test emergent integration
    if not test_emergent_integration():
        print("\
❌ EmergentIntegrations library issue detected!")
        print("💡 Fix this by running:")
        print("cd backend")
        print("source venv/bin/activate  # or venv\\\\Scripts\\\\activate on Windows")
        print("pip uninstall emergentintegrations")
        print("pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
        return 1
    
    print("\
✅ All tests passed!")
    print("🔧 Your environment is properly configured.")
    print("\
💡 If you're still getting errors, try:")
    print("1. Restart the backend server")
    print("2. Check backend console for detailed error messages")
    print("3. Try uploading a different image")
    print("4. Verify internet connection (AI processing needs internet)")
    
    # Create fixed code
    fixed_code = create_fixed_backend()
    
    print(f"\
📁 You can also replace the extract_table_from_image function in")
    print("backend/server.py with the enhanced version above for better error handling.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())