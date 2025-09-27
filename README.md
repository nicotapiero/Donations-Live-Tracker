I'm using python 3.12.4 if it matters, 

python3 -m pip install -r requirements.txt



python3 script.py   


It's gonna print some google cloud setup required stuff, gonna look like:

⚠️  SETUP REQUIRED:
Before running this app, you need to:
1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Create OAuth2 credentials (Desktop application)
5. Update CLIENT_ID and CLIENT_SECRET in this script

For detailed setup instructions, visit:
https://developers.google.com/gmail/api/quickstart/python




Probably should have written step 3.5 - configure oath consent screen


Under "audience" add yourself as a test user



Might need threading and http stuff but I think it's pre installed


mostly copying https://github.com/naziml/essentials-first-donations for frontend and hacking my backend into it