from flask import Flask, jsonify, request, send_from_directory
import sqlite3
from pathlib import Path
from datetime import datetime, date
import json
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'fsr_database.db'
UPLOAD_DIR = BASE_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'}
app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path='')

SEED = [
    (1001,'Installation','Completed','2026-06-02','WO100245','SR300001','MRI Scanner - Model X1','City Care Hospital','John Smith','N','Y','2026-06-02 14:32:11',1),
    (1002,'Preventive Maintenance','Completed','2026-06-04','WO100314','SR300002','CT Scanner - Model T5','Metro Diagnostics','Emma Brown','N','Y','2026-06-04 16:10:45',1),
    (1003,'Repair','Completed','2026-06-06','WO100378','SR300003','Ultrasound Machine - U9','Global Medical Center','David Wilson','N','Y','2026-06-06 11:05:22',1),
    (1004,'Calibration','Completed','2026-06-08','WO100412','SR300004','X-Ray Machine - XR500','Sunrise Health Clinic','Michael Lee','N','Y','2026-06-08 15:48:30',1),
    (1005,'Repair','Completed','2026-06-10','WO100456','SR300005','Patient Monitor - PM9000','Life Line Hospital','Sarah Johnson','N','Y','2026-06-10 13:21:09',1),
    (1006,'Replacement','Completed','2026-06-12','WO100502','SR300006','Ventilator - V80','Care Plus Medical','James Anderson','N','Y','2026-06-12 17:26:50',1),
    (1007,'Safety Inspection','Completed','2026-06-15','WO100569','SR300007','Defibrillator - D30','Health First Center','Olivia Martinez','N','Y','2026-06-15 10:18:35',1),
    (1008,'Training & Handover','Completed','2026-06-18','WO100622','SR300008','Infusion Pump - IP200','Wellness Hospital','Daniel Taylor','N','Y','2026-06-18 12:44:19',1),
    (1009,'Repair','In Progress','2026-06-20','WO100701','SR300009','Patient Monitor - PM9000','City Care Hospital','John Smith','N','N','Not submitted',0),
]

def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with connect() as con:
        con.execute('''CREATE TABLE IF NOT EXISTS fsr (
            id INTEGER PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, date TEXT NOT NULL,
            wo TEXT NOT NULL UNIQUE, sr TEXT NOT NULL, asset TEXT, customer TEXT NOT NULL,
            engineer TEXT NOT NULL, disable TEXT DEFAULT 'N', saved TEXT DEFAULT 'Y',
            submit TEXT DEFAULT 'Not submitted', submitted INTEGER DEFAULT 0,
            description TEXT DEFAULT '', parts TEXT DEFAULT '', returned TEXT DEFAULT '', tools TEXT DEFAULT '',
            regular REAL DEFAULT 0, overtime REAL DEFAULT 0, travel REAL DEFAULT 0,
            travelCost REAL DEFAULT 0, mealCost REAL DEFAULT 0, hotelCost REAL DEFAULT 0, otherCost REAL DEFAULT 0,
            problem TEXT DEFAULT '', error TEXT DEFAULT '', resolution TEXT DEFAULT '', resolutionText TEXT DEFAULT '', signer TEXT DEFAULT '', signature TEXT DEFAULT 'No', notes TEXT DEFAULT '', attachmentNames TEXT DEFAULT '', signatureData TEXT DEFAULT '', partsDetails TEXT DEFAULT '', returnedDetails TEXT DEFAULT '', attachmentsJson TEXT DEFAULT '[]'
        )''')
        existing = {row[1] for row in con.execute('PRAGMA table_info(fsr)').fetchall()}
        for col, definition in [('signer', "TEXT DEFAULT ''"), ('signature', "TEXT DEFAULT 'No'"), ('notes', "TEXT DEFAULT ''"), ('attachmentNames', "TEXT DEFAULT ''"), ('signatureData', "TEXT DEFAULT ''"), ('partsDetails', "TEXT DEFAULT ''"), ('returnedDetails', "TEXT DEFAULT ''"), ('attachmentsJson', "TEXT DEFAULT '[]'"), ('hotelCost', "REAL DEFAULT 0")]:
            if col not in existing:
                con.execute(f'ALTER TABLE fsr ADD COLUMN {col} {definition}')
        count = con.execute('SELECT COUNT(*) FROM fsr').fetchone()[0]
        if count == 0:
            con.executemany('''INSERT INTO fsr (id,type,status,date,wo,sr,asset,customer,engineer,disable,saved,submit,submitted)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''', SEED)
        # Populate realistic demo details for seeded activities so every Activity ID opens a useful report.
        demo_details = {
            1001: ('Cable Assembly x 2; Power Module x 1; Cooling Fan x 1', 'CABLE-ASSY-01 / LOT12345; PWR-MOD-02 / LOT67890; COOL-FAN-01 / LOT33321', 'Unused connector x 1', 'Qty 1, unopened', 'Tool Kit - Standard', 6, 1.5, 1, 120, 35, 180, 25, 'PRB001', 'ERR015', 'RES002', 'Adjusted cable alignment and verified system operation.', 'Alice Roberts', 'Installation completed and all tests passed.'),
            1002: ('Air filter x 2', 'FILTER-02 / LOT2401', 'Old filter x 2', 'Used, returned for disposal', 'Maintenance toolkit', 2, 0, 0.5, 40, 20, 0, 10, 'PRB002', 'ERR006', 'RES001', 'Filters replaced and preventive checks completed.', 'Emma Brown', 'Preventive maintenance completed.'),
            1003: ('Sensor cable x 1', 'SENS-CBL / LOT3003', 'Damaged cable x 1', 'Damaged, tagged for return', 'Electrical toolkit', 3, 1, 1, 80, 25, 0, 15, 'PRB003', 'ERR015', 'RES002', 'Cable replaced and equipment tested successfully.', 'David Wilson', 'Repair completed and tested.'),
            1004: ('Calibration kit x 1', 'CAL-KIT / LOT4004', '—', '—', 'Calibration toolkit', 2, 0, 0.5, 60, 15, 0, 0, 'PRB004', 'ERR004', 'RES003', 'Calibration verified against reference values.', 'Michael Lee', 'Calibration certificate prepared.'),
            1005: ('Monitor cable x 1', 'MON-CBL / LOT5005', 'Old cable x 1', 'Returned for inspection', 'Standard toolkit', 2.5, 0.5, 0.5, 75, 20, 0, 10, 'PRB003', 'ERR015', 'RES002', 'Patient monitor connection restored.', 'Sarah Johnson', 'Monitor operating normally.'),
            1006: ('Ventilator battery x 1', 'BAT-V80 / LOT6006', 'Old battery x 1', 'Returned, used', 'Replacement toolkit', 3, 0, 1, 100, 30, 0, 20, 'PRB005', 'ERR008', 'RES004', 'Battery replaced and power test passed.', 'James Anderson', 'Replacement completed.'),
            1007: ('Test leads x 1 set', 'TEST-LEAD / LOT7007', '—', '—', 'Safety inspection kit', 1.5, 0, 0.5, 50, 15, 0, 0, 'PRB006', 'ERR002', 'RES001', 'Safety inspection completed with no critical issues.', 'Olivia Martinez', 'Safety inspection passed.'),
            1008: ('Infusion tubing x 2', 'TUBE-IP / LOT8008', 'Unused tubing x 1', 'Unopened', 'Training toolkit', 2, 0, 0.5, 40, 15, 0, 5, 'PRB007', 'ERR001', 'RES001', 'Training and handover completed successfully.', 'Daniel Taylor', 'Customer training completed.')
        }
        for demo_id, values in demo_details.items():
            con.execute('''UPDATE fsr SET parts=?, partsDetails=?, returned=?, returnedDetails=?, tools=?,
                regular=?, overtime=?, travel=?, travelCost=?, mealCost=?, hotelCost=?, otherCost=?,
                problem=?, error=?, resolution=?, resolutionText=?, signer=?, signature='Yes', notes=?
                WHERE id=? AND COALESCE(parts,'')='' ''', (*values, demo_id))

def row_to_dict(row):
    item = dict(row)
    item['submitted'] = bool(item['submitted'])
    return item

@app.get('/')
def home():
    return send_from_directory(BASE_DIR, 'index.html')

@app.get('/api/health')
def health():
    return jsonify({'status':'ok','message':'FSR backend is running'})

@app.post('/api/login')
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username','')).strip()
    password = str(data.get('password',''))
    if not username or not password:
        return jsonify({'error':'Username and password are required'}), 400
    display = 'Admin' if username.lower() == 'admin' else ('John Smith' if username.lower() in ('john','john smith') else username)
    # Demo authentication only. Replace with hashed passwords and real user accounts for production.
    return jsonify({'ok':True,'username':username,'displayName':display,'demo':True})

@app.get('/api/fsr')
def get_fsrs():
    with connect() as con:
        rows = con.execute('SELECT * FROM fsr ORDER BY id DESC').fetchall()
    return jsonify([row_to_dict(r) for r in rows])

@app.get('/api/fsr/<int:fsr_id>')
def get_fsr(fsr_id):
    with connect() as con:
        row = con.execute('SELECT * FROM fsr WHERE id=?',(fsr_id,)).fetchone()
    if not row: return jsonify({'error':'FSR not found'}), 404
    return jsonify(row_to_dict(row))

@app.post('/api/fsr')
def create_fsr():
    data = request.get_json(silent=True) or {}
    required = ['wo','customer','engineer','type']
    missing = [key for key in required if not str(data.get(key,'')).strip()]
    if missing: return jsonify({'error':'Required fields: ' + ', '.join(missing)}), 400
    now = datetime.now()
    with connect() as con:
        if con.execute('SELECT 1 FROM fsr WHERE lower(wo)=lower(?)',(str(data['wo']).strip(),)).fetchone():
            return jsonify({'error':'This Work Order Number already exists.'}), 409
        next_id = con.execute('SELECT COALESCE(MAX(id),1000)+1 FROM fsr').fetchone()[0]
        next_sr_num = con.execute("SELECT COALESCE(MAX(CAST(SUBSTR(sr,3) AS INTEGER)),300000)+1 FROM fsr").fetchone()[0]
        fields = ['type','wo','customer','asset','engineer','description','parts','returned','tools','partsDetails','returnedDetails','regular','overtime','travel','travelCost','mealCost','hotelCost','otherCost','problem','error','resolution','resolutionText','signer','signature','notes','attachmentNames','signatureData']
        vals = {k:data.get(k, '') for k in fields}
        vals['attachmentsJson'] = '[]'; vals['id'] = next_id; vals['status'] = 'Completed'; vals['date'] = now.strftime('%Y-%m-%d')
        vals['sr'] = f'SR{next_sr_num}'; vals['disable']='N'; vals['saved']='Y'; vals['submit']=now.strftime('%Y-%m-%d %H:%M:%S'); vals['submitted']=1
        cols = list(vals.keys())
        try:
            con.execute(f"INSERT INTO fsr ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})", [vals[c] for c in cols])
        except sqlite3.IntegrityError:
            return jsonify({'error':'Could not save this report. Check the work order number.'}), 409
        row = con.execute('SELECT * FROM fsr WHERE id=?',(next_id,)).fetchone()
    return jsonify(row_to_dict(row)), 201

@app.post('/api/fsr/<int:fsr_id>/attachments')
def upload_attachments(fsr_id):
    with connect() as con:
        row = con.execute('SELECT attachmentsJson, attachmentNames FROM fsr WHERE id=?', (fsr_id,)).fetchone()
        if not row:
            return jsonify({'error':'FSR not found'}), 404
        try:
            current = json.loads(row['attachmentsJson'] or '[]')
        except (TypeError, json.JSONDecodeError):
            current = []
        saved_names = []
        for file in request.files.getlist('files'):
            if not file or not file.filename:
                continue
            original = Path(file.filename).name
            ext = Path(original).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({'error': f'Unsupported file type: {ext or "unknown"}'}), 400
            safe_name = secure_filename(Path(original).stem)[:70] or 'attachment'
            unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{safe_name}{ext}"
            destination = UPLOAD_DIR / str(fsr_id)
            destination.mkdir(parents=True, exist_ok=True)
            file.save(destination / unique_name)
            item = {'name': original, 'url': f'/uploads/{fsr_id}/{unique_name}', 'size': (destination / unique_name).stat().st_size}
            current.append(item)
            saved_names.append(original)
        names = [x.get('name','') for x in current if x.get('name')]
        con.execute('UPDATE fsr SET attachmentsJson=?, attachmentNames=? WHERE id=?',
                    (json.dumps(current, ensure_ascii=False), '; '.join(names), fsr_id))
    return jsonify({'ok': True, 'attachments': current, 'uploaded': saved_names})

@app.get('/uploads/<int:fsr_id>/<path:filename>')
def uploaded_file(fsr_id, filename):
    folder = UPLOAD_DIR / str(fsr_id)
    return send_from_directory(folder, filename, as_attachment=False)

@app.put('/api/fsr/<int:fsr_id>')
def update_fsr(fsr_id):
    data = request.get_json(silent=True) or {}
    allowed = ['type','status','date','wo','asset','customer','engineer','description','parts','returned','tools','partsDetails','returnedDetails','regular','overtime','travel','travelCost','mealCost','hotelCost','otherCost','problem','error','resolution','resolutionText','submitted','saved','signer','signature','notes','attachmentNames','signatureData','partsDetails','returnedDetails','hotelCost','attachmentsJson']
    updates = {k:data[k] for k in allowed if k in data}
    if not updates: return jsonify({'error':'No update fields supplied'}), 400
    if 'submitted' in updates: updates['submitted'] = int(bool(updates['submitted']))
    if 'wo' in updates and not str(updates['wo']).strip(): return jsonify({'error':'Work order number cannot be empty'}), 400
    sql = ', '.join(f'{k}=?' for k in updates)
    with connect() as con:
        try:
            cur = con.execute(f'UPDATE fsr SET {sql} WHERE id=?', [*updates.values(),fsr_id])
        except sqlite3.IntegrityError:
            return jsonify({'error':'Work order number already exists'}), 409
        if cur.rowcount == 0: return jsonify({'error':'FSR not found'}), 404
        row = con.execute('SELECT * FROM fsr WHERE id=?',(fsr_id,)).fetchone()
    return jsonify(row_to_dict(row))

@app.delete('/api/fsr/<int:fsr_id>')
def delete_fsr(fsr_id):
    with connect() as con:
        cur = con.execute('DELETE FROM fsr WHERE id=?',(fsr_id,))
    if cur.rowcount == 0: return jsonify({'error':'FSR not found'}), 404
    return jsonify({'ok':True,'deletedId':fsr_id})

if __name__ == '__main__':
    init_db()
    print('FSR backend starting at http://127.0.0.1:5000')
    app.run(host='127.0.0.1', port=5000, debug=False)
