import sys
import os

# Add root folder to python path to ensure services and routes modules are found
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
