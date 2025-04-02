#!/usr/bin/env python3
# Main entry point for the Recco application.
# Imports and runs the Flask app defined in the server_modules package.

from server_modules.main import run_app

if __name__ == '__main__':
    print("Starting Recco application from server.py...")
    run_app()
