#!/usr/bin/env python3
"""
Gmail Email Notifier Web App
A lightweight web app that authenticates with Gmail and provides real-time email notifications.
"""

import os
import json
import time
import threading
from datetime import datetime
from typing import Optional, Dict, List
import webbrowser
from urllib.parse import urlencode

import flask
from flask import Flask, render_template_string, jsonify
from flask_socketio import SocketIO, emit
import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from constants import SCOPES, REDIRECT_URI, POLL_INTERVAL
from credentials import CLIENT_ID, CLIENT_SECRET


import re


class GmailNotifier:
    def __init__(self):
        self.app = Flask(__name__, static_url_path='/static')
        self.app.config['SECRET_KEY'] = 'gmail-notifier-secret'
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        self.credentials: Optional[Credentials] = None
        self.service = None
        self.last_history_id: Optional[str] = None
        self.polling = False
        # Display mode for frontend behavior/layout. One of: 'standard', 'compact', 'minimal'
        self.mode = 'standard'
        self.setup_routes()

    def setup_routes(self):
        @self.app.route('/')
        def index():
        	f = open("index.html")
        	return render_template_string(f.read())

        @self.app.route('/admin')
        def admin():
        	f = open("admin.html")
        	return render_template_string(f.read())

        @self.app.route('/status')
        def status():
            return jsonify({
                'authenticated': self.credentials is not None,
                'polling': self.polling,
                'last_check': getattr(self, '_last_check_time', None),
                'email_count': len(getattr(self, '_last_email_ids', set())),
                'mode': self.mode
            })

        # Public endpoint to get current display mode
        @self.app.route('/mode', methods=['GET'])
        def get_mode():
            return jsonify({'mode': self.mode})

        # Admin endpoint to view or set display mode
        @self.app.route('/admin/mode', methods=['GET', 'POST'])
        def admin_mode():
            if flask.request.method == 'GET':
                return jsonify({'mode': self.mode})

            # For changes, require authentication similar to other admin actions
            if not self.credentials:
                return jsonify({'error': 'Not authenticated'}), 401

            data = flask.request.get_json(silent=True) or {}
            new_mode = (data.get('mode') or '').strip().lower()
            # if new_mode not in {'standard', 'compact', 'minimal'}:
            #     return jsonify({'error': 'Invalid mode'}), 400

            self.mode = new_mode
            # Broadcast to all clients
            print(self.mode, new_mode)
            self.socketio.emit('modeChanged', {'mode': self.mode, 'timestamp': datetime.now().strftime('%H:%M:%S')})
            return jsonify({'success': True, 'mode': self.mode})

        @self.app.route('/admin/poll', methods=['POST'])
        def manual_poll():
            if not self.credentials:
                return jsonify({'error': 'Not authenticated'}), 401
            
            try:
                print("🔄 Manual poll triggered")
                self.check_new_emails()
                self._last_check_time = datetime.now().strftime('%H:%M:%S')
                return jsonify({
                    'success': True,
                    'message': 'Manual poll completed',
                    'timestamp': self._last_check_time
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/admin/donation_test', methods=['POST'])
        def admin_toast_post():
            """Accept a number in the JSON body and broadcast it to clients as an admin_toast."""
            if not self.credentials:
                return jsonify({'error': 'Not authenticated'}), 401

            try:
                data = flask.request.get_json(silent=True) or {}
                value = data.get('value')

                # Optionally coerce to a number if possible
                try:
                    if value is not None and not isinstance(value, (int, float)):
                        value = float(value)
                except Exception:
                    # Leave value as-is if it cannot be converted
                    pass

                payload = {
                   
                    "value" : value,
            # currentInput.value = data.current || 0;
            # titleInput.value = data.title || '';
            # sloganInput.value = data.slogan || '';
            # imageInput.value = data.image || '';
                }
                self.socketio.emit('donation_test', payload)
                return jsonify({'success': True, 'message': 'Admin toast sent', 'payload': payload})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/admin/set_progress', methods=['POST'])
        def admin_set_progress():
            """Accept a value and broadcast a set_progress event to all clients."""
            if not self.credentials:
                return jsonify({'error': 'Not authenticated'}), 401

            try:
                data = flask.request.get_json(silent=True) or {}
                value = data.get('value')
                # Coerce to number if possible
                try:
                    if value is not None and not isinstance(value, (int, float)):
                        value = float(value)
                except Exception:
                    pass

                payload = {
                    'currentInputChange': value,
                    'timestamp': datetime.now().strftime('%H:%M:%S')
                }
                self.socketio.emit('donation_test', payload)
                return jsonify({'success': True, 'message': 'Progress event broadcasted', 'payload': payload})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.socketio.on('connect')
        def handle_connect():
            print(f"Client connected: {flask.request.sid}")
            emit('status', {
                'authenticated': self.credentials is not None,
                'polling': self.polling,
                'last_check': getattr(self, '_last_check_time', None),
                'mode': self.mode
            })

        @self.socketio.on('disconnect')
        def handle_disconnect():
            print(f"Client disconnected: {flask.request.sid}")

    def authenticate(self):
        """Authenticate with Gmail using OAuth2 flow"""
        print("\n🔐 Starting Gmail authentication...")
        print("This will open your browser for Google OAuth2 login.")
        
        # Create OAuth2 flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [REDIRECT_URI]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = REDIRECT_URI

        # Get authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='select_account'
        )

        print(f"\n📋 Please visit this URL to authorize the application:")
        print(f"{auth_url}")
        print(f"\nOpening browser automatically...")
        
        # Try to open browser automatically
        try:
            webbrowser.open(auth_url)
        except:
            print("Could not open browser automatically. Please copy the URL above.")

        # Get authorization code from user
        print(f"\n📝 After authorization, you'll be redirected to:")
        print(f"{REDIRECT_URI}?code=AUTHORIZATION_CODE")
        print(f"\nPlease copy the 'code' parameter from the URL and paste it here:")
        
        auth_code = input("Authorization code: ").strip()

        if not auth_code:
            print("❌ No authorization code provided. Exiting.")
            return False

        try:
            # Exchange code for token
            flow.fetch_token(code=auth_code)
            self.credentials = flow.credentials
            
            # Build Gmail service
            self.service = build('gmail', 'v1', credentials=self.credentials)
            
            # Test the connection
            profile = self.service.users().getProfile(userId='me').execute()
            print(f"✅ Successfully authenticated as: {profile['emailAddress']}")
            return True
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False

    def get_latest_emails(self, max_results: int = 10) -> List[Dict]:
        """Get latest unread emails"""
        if not self.service:
            return []

        try:
            # Get unread messages
            results = self.service.users().messages().list(
                userId='me',
                q='is:unread',
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            emails = []
            
            for message in messages:
                # Get message details
                msg = self.service.users().messages().get(
                    userId='me',
                    id=message['id'],
                    format='metadata',
                    metadataHeaders=['From', 'Subject', 'Date']
                ).execute()
                
                headers = {h['name']: h['value'] for h in msg['payload']['headers']}
                
                emails.append({
                    'id': message['id'],
                    'from': headers.get('From', 'Unknown'),
                    'subject': headers.get('Subject', 'No Subject'),
                    'date': headers.get('Date', ''),
                    'snippet': msg.get('snippet', ''),
                    'timestamp': int(msg['internalDate']) // 1000
                })
            
            return sorted(emails, key=lambda x: x['timestamp'], reverse=True)
            
        except Exception as e:
            print(f"❌ Error fetching emails: {e}")
            return []

    def check_new_emails(self):
        """Check for new emails and notify clients"""
        if not self.service:
            return

        try:
            self._last_check_time = datetime.now().strftime('%H:%M:%S')
            current_emails = self.get_latest_emails(5)
            
            if not hasattr(self, '_last_email_ids'):
                self._last_email_ids = set()
                # Don't notify on first run, just store current state
                self._last_email_ids = {email['id'] for email in current_emails}
                return

            # Find new emails
            current_ids = {email['id'] for email in current_emails}
            new_ids = current_ids - self._last_email_ids
            
            if new_ids:
                new_emails = [email for email in current_emails if email['id'] in new_ids]
                print(f"📧 Found {len(new_emails)} new email(s)")
                
                # Notify all connected clients
                for email in new_emails:
                    # self.socketio.emit('new_email', {
                    #     'from': email['from'],
                    #     'subject': email['subject'],
                    #     'snippet': email['snippet'][:100] + '...' if len(email['snippet']) > 100 else email['snippet'],
                    #     'timestamp': datetime.fromtimestamp(email['timestamp']).strftime('%H:%M:%S')
                    # })
                    if email['from'] == 'venmo@venmo.com':
                        pattern = re.compile("(.*) paid you \$([0-9\.\-\/]+)$")
                        match = pattern.search(email['subject'])
                        if match:
                            value = match.group(2)
                            payload = {
                                'value': value,
                                'timestamp': datetime.now().strftime('%H:%M:%S')
                            }
                            self.socketio.emit('donation_test', payload)
                
                self._last_email_ids = current_ids
            else:
                print(f"📭 No new emails found (checked {len(current_emails)} unread)")
                
        except Exception as e:
            print(f"❌ Error checking emails: {e}")

    def start_polling(self):
        """Start email polling in background thread"""
        if self.polling:
            return
        
        self.polling = True
        print(f"🔄 Starting email polling (every {POLL_INTERVAL} seconds)")
        
        def poll_loop():
            while self.polling:
                self.check_new_emails()
                time.sleep(POLL_INTERVAL)
        
        poll_thread = threading.Thread(target=poll_loop, daemon=True)
        poll_thread.start()

    def run(self):
        """Main application entry point"""
        print("🚀 Gmail Email Notifier Web App")
        print("=" * 40)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Exiting.")
            return
        
        # Start polling
        self.start_polling()
        
        # Start web server
        print(f"\n🌐 Starting web server at http://localhost:8000")
        print("📱 Main UI: http://localhost:8000")
        print("⚙️  Admin Panel: http://localhost:8000/admin")
        print("⏹️  Press Ctrl+C to stop\n")
        
        try:
            self.socketio.run(self.app, host='0.0.0.0', port=8000, debug=False)
        except KeyboardInterrupt:
            print("\n👋 Shutting down...")
            self.polling = False

if __name__ == "__main__":
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import threading
    class Serv(BaseHTTPRequestHandler):

       def do_GET(self):
           try:
               file_to_open = open('test.html').read()
               self.send_response(200)
               self.end_headers()
               self.wfile.write(bytes(file_to_open, 'utf-8'))
           except:
               file_to_open = "File not found"
               self.send_response(404)
               self.end_headers()
               
               
    def my_http_thread():
        httpd = HTTPServer(('localhost',6900),Serv)
        httpd.serve_forever()

    thread_obj = threading.Thread(target=my_http_thread)
    thread_obj.start()


    # Check for required environment variables or provide instructions
    if CLIENT_ID == "your-client-id.googleusercontent.com":
        print("⚠️  SETUP REQUIRED:")
        print("Before running this app, you need to:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create a new project or select an existing one")
        print("3. Enable the Gmail API")
        print("4. Create OAuth2 credentials (Desktop application)")
        print("5. Update CLIENT_ID and CLIENT_SECRET in this script")
        print("\nFor detailed setup instructions, visit:")
        print("https://developers.google.com/gmail/api/quickstart/python")
        exit(1)
    
    # Install required packages check
    try:
        import flask
        import flask_socketio
        import google.auth
        import google_auth_oauthlib
        import googleapiclient
    except ImportError as e:
        print("❌ Missing required packages. Please install:")
        print("pip install flask flask-socketio google-auth google-auth-oauthlib google-api-python-client")
        exit(1)
    
    # Run the app
    notifier = GmailNotifier()
    notifier.run()