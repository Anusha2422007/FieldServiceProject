FIELD SERVICE REPORT MANAGEMENT SYSTEM - FRONTEND + BACKEND

Technology:
- Frontend: HTML, CSS, JavaScript (includes sliding FSR wizard, clickable Activity IDs, summary tabs, file picker and signature pad)
- Backend: Python Flask REST API
- Database: SQLite (fsr_database.db is created automatically)

HOW TO RUN ON WINDOWS
1. Install Python 3.10 or newer from https://www.python.org/downloads/ (select Add Python to PATH).
2. Extract this ZIP into a folder.
3. Open the extracted FieldServiceProject folder.
4. Click the folder address bar, type cmd, and press Enter.
5. Run these commands:
   py -m venv .venv
   .venv\Scripts\activate
   py -m pip install -r requirements.txt
   py app.py
6. Open this address in Chrome: http://127.0.0.1:5000
7. Login with username John Smith and any non-empty password, for example demo123.
8. Create an FSR. It will be saved in fsr_database.db and remain after restarting the server.

API ENDPOINTS
GET    /api/health          Check backend status
POST   /api/login           Demo login
GET    /api/fsr              List all reports
GET    /api/fsr/<id>         Read one report
POST   /api/fsr              Create a report
PUT    /api/fsr/<id>         Update a report
DELETE /api/fsr/<id>         Delete a report

Example POST /api/fsr JSON:
{
  "type": "Repair",
  "wo": "WO200001",
  "customer": "City Care Hospital",
  "asset": "MRI Scanner",
  "engineer": "John Smith",
  "description": "Inspection and repair",
  "parts": "Cable x 1",
  "returned": "",
  "tools": "Standard toolkit",
  "regular": 2,
  "overtime": 0,
  "travel": 1,
  "travelCost": 120,
  "mealCost": 35,
  "otherCost": 0,
  "problem": "PRB001",
  "error": "ERR001",
  "resolution": "RES001",
  "resolutionText": "Replaced cable and tested equipment"
}

IMPORTANT
- Login is demo-only: any non-empty username/password is accepted. It is not secure authentication.
- Sample FSR rows are demonstration data.
- This project uses a local SQLite database. It is not connected to Oracle Cloud or a real Oracle Field Service tenant.
- Do not expose the development server to the public internet. For production, add secure authentication, authorization, validation, HTTPS, and deployment hardening.

ENHANCED UI NOTES
- Activity ID values in the dashboard are clickable and open activity details.
- The FSR wizard has separate Back/Next steps for Activity Details, Parts Used, Parts Returned, Labor Hours, Expenses, Problem/Error/Resolution, and Customer Signature & Attachments.
- Customer signatures are saved with the report.
- PDF, images, and document attachments are uploaded to the local uploads folder and linked in the FSR Summary.
- Expenses are displayed in Indian Rupees (₹), with Travel, Meals, Hotel Stay, and Other Expenses separated.
- Existing blue-and-white colors and styling are preserved.
- The backend remains a local demo and is not connected to Oracle Cloud.
