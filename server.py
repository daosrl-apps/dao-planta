import os
import json
import uuid
from flask import Flask, request, jsonify, send_from_directory, session, redirect

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR)
app.secret_key = 'dao_planta_secret_key_prod_2026'

PORT = 8080
DATA_FILE = os.path.join(BASE_DIR, "Datos.json")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# Ensure uploads folder exists and has write permissions
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
try:
    os.chmod(UPLOAD_FOLDER, 0o777)
except Exception as e:
    print(f"Advertencia al configurar permisos de uploads: {e}")

DEFAULT_AUDIT_TASKS = [
    {"id": 1, "name": "Limpieza Planta General"},
    {"id": 2, "name": "Comedor"},
    {"id": 3, "name": "Puesto lavado y Mesa de trabajo"},
    {"id": 4, "name": "Puesto colgado y descolgado y Mesa de trabajo"},
    {"id": 5, "name": "Puestos Pintura"},
    {"id": 6, "name": "Almacén Pintura"},
    {"id": 7, "name": "Pañol"},
    {"id": 8, "name": "Vestuarios y Baños"},
    {"id": 9, "name": "Tachos de Basura"}
]

DEFAULT_PERMISSIONS = {
    "mantenimiento": True,
    "calidad": True,
    "produccion": True,
    "auditoria": True
}

def get_data_filepath():
    is_demo = session.get('is_demo', False)
    return os.path.join(BASE_DIR, "Datos_demo.json") if is_demo else os.path.join(BASE_DIR, "Datos.json")

def get_default_demo_data():
    return {
        "usuarios": [
            {"username": "demo", "password": "demo", "role": "admin", "permissions": DEFAULT_PERMISSIONS},
            {"username": "admin", "password": "admin", "role": "admin", "permissions": DEFAULT_PERMISSIONS}
        ],
        "maquinas": [
            {
                "id": 1,
                "name": "Compresor Tornillo Kaeser",
                "code": "COMP-01",
                "brand": "Kaeser",
                "model": "ASD 40",
                "serial": "K-98421",
                "area": "Servicios",
                "frequency": 7,
                "tasks": [
                    {"name": "Verificar nivel de aceite de compresor", "type": "boolean"},
                    {"name": "Inspeccionar temperatura de descarga (°C)", "type": "numeric"},
                    {"name": "Limpieza de filtro de aire exterior", "type": "boolean"}
                ],
                "history": []
            },
            {
                "id": 2,
                "name": "Prensa Hidráulica 100T",
                "code": "PREN-02",
                "brand": "Brunner",
                "model": "PH-100",
                "serial": "B-44210",
                "area": "Producción",
                "frequency": 15,
                "tasks": [
                    {"name": "Control de presión manométrica (bar)", "type": "numeric"},
                    {"name": "Engrase de guías y columnas", "type": "boolean"},
                    {"name": "Chequeo de fugas en mangueras hidráulicas", "type": "boolean"}
                ],
                "history": []
            }
        ],
        "historial": [
            {
                "id": 1,
                "machineId": 1,
                "machineName": "Compresor Tornillo Kaeser",
                "type": "preventivo",
                "taskName": "Verificar nivel de aceite de compresor",
                "result": "OK",
                "date": "2026-08-01",
                "user": "demo",
                "photo": ""
            }
        ],
        "tareas_auditoria": DEFAULT_AUDIT_TASKS.copy(),
        "productos_calidad": [
            {
                "id": 1,
                "name": "Eje Motor Principal 25mm",
                "specification": "Medir longitud total (120mm +/- 0.5mm) y verificar ausencia de rebabas.",
                "image": ""
            },
            {
                "id": 2,
                "name": "Soporte Chasis Lateral",
                "specification": "Controlar espesor de chapa y cordón de soldadura continuo.",
                "image": ""
            }
        ]
    }

def init_demo_database():
    demo_file = os.path.join(BASE_DIR, "Datos_demo.json")
    demo_data = get_default_demo_data()
    with open(demo_file, "w", encoding="utf-8") as f:
        json.dump(demo_data, f, indent=4, ensure_ascii=False)
    return demo_data

# Preseed data if not exists
def load_data():
    file_path = get_data_filepath()
    is_demo = session.get('is_demo', False)
    
    if not os.path.exists(file_path):
        if is_demo:
            default_data = init_demo_database()
        else:
            default_data = {
                "usuarios": [
                    {"username": "admin", "password": "admin", "role": "admin", "permissions": DEFAULT_PERMISSIONS},
                    {"username": "supervisor", "password": "supervisor", "role": "supervisor", "permissions": DEFAULT_PERMISSIONS}
                ],
                "maquinas": [],
                "historial": [],
                "tareas_auditoria": DEFAULT_AUDIT_TASKS.copy(),
                "productos_calidad": []
            }
            save_data(default_data)
        return default_data
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            updated = False
            if "tareas_auditoria" not in data:
                data["tareas_auditoria"] = DEFAULT_AUDIT_TASKS.copy()
                updated = True
            if "productos_calidad" not in data:
                data["productos_calidad"] = []
                updated = True
            if updated:
                save_data(data)
            return data
    except Exception:
        return {
            "usuarios": [
                {"username": "admin", "password": "admin", "role": "admin", "permissions": DEFAULT_PERMISSIONS},
                {"username": "supervisor", "password": "supervisor", "role": "supervisor", "permissions": DEFAULT_PERMISSIONS}
            ],
            "maquinas": [],
            "historial": [],
            "tareas_auditoria": DEFAULT_AUDIT_TASKS.copy(),
            "productos_calidad": []
        }

def save_data(data):
    file_path = get_data_filepath()
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Root static routing
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

# Serve uploaded pictures
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Catch-all route to serve other frontend static files (app.js, style.css, manifest.json, sw.js, logo.svg)
@app.route('/<path:path>')
def send_static(path):
    return send_from_directory(BASE_DIR, path)

# --- API ENDPOINTS ---

# 1. AUTHENTICATION
DEFAULT_PERMISSIONS = {
    "mantenimiento": True,
    "calidad": True,
    "produccion": True,
    "auditoria": True
}

def get_user_permissions(user):
    return user.get("permissions", DEFAULT_PERMISSIONS)

@app.route('/api/login', methods=['POST'])
def login():
    try:
        credentials = request.json
        if not credentials:
            return jsonify({"error": "No se recibieron credenciales"}), 400
        
        username = credentials.get('username', '').strip().lower()
        password = credentials.get('password', '')
        
        data = load_data()
        for user in data["usuarios"]:
            if user["username"].strip().lower() == username and user["password"] == password:
                return jsonify({
                    "username": user["username"],
                    "role": user["role"],
                    "permissions": get_user_permissions(user)
                })
                
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401
    except Exception as e:
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

# 2. USER MANAGEMENT
@app.route('/api/users', methods=['GET', 'POST'])
def manage_users():
    data = load_data()
    if request.method == 'GET':
        # Return users without passwords, but with roles and permissions
        clean_users = [{
            "username": u["username"], 
            "role": u["role"],
            "permissions": get_user_permissions(u)
        } for u in data["usuarios"]]
        return jsonify(clean_users)
        
    elif request.method == 'POST':
        try:
            new_user = request.json
            if not new_user:
                return jsonify({"error": "No se recibieron datos de usuario"}), 400
                
            username = new_user.get('username', '').strip().lower()
            password = new_user.get('password', '')
            role = new_user.get('role', 'supervisor')
            permissions = new_user.get('permissions', DEFAULT_PERMISSIONS)
            
            if not username or not password:
                return jsonify({"error": "Nombre de usuario y contraseña requeridos"}), 400
                
            # Check if user already exists
            for u in data["usuarios"]:
                if u["username"] == username:
                    return jsonify({"error": "El usuario ya existe"}), 409
                    
            data["usuarios"].append({
                "username": username,
                "password": password,
                "role": role,
                "permissions": permissions
            })
            save_data(data)
            return jsonify({"success": True, "username": username})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/users/<username>', methods=['PUT', 'DELETE'])
def handle_single_user(username):
    username = username.strip().lower()
    data = load_data()
    
    if request.method == 'DELETE':
        try:
            if not username:
                return jsonify({"error": "Usuario inválido"}), 400
                
            initial_count = len(data["usuarios"])
            data["usuarios"] = [u for u in data["usuarios"] if u["username"] != username]
            
            if len(data["usuarios"]) == initial_count:
                return jsonify({"error": "Usuario no encontrado"}), 404
                
            save_data(data)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    elif request.method == 'PUT':
        try:
            update_data = request.json
            if not update_data:
                return jsonify({"error": "No se recibieron datos de actualización"}), 400
                
            user_found = False
            for u in data["usuarios"]:
                if u["username"] == username:
                    if "password" in update_data and update_data["password"]:
                        u["password"] = update_data["password"]
                    if "role" in update_data:
                        u["role"] = update_data["role"]
                    if "permissions" in update_data:
                        u["permissions"] = update_data["permissions"]
                    user_found = True
                    break
                    
            if not user_found:
                return jsonify({"error": "Usuario no encontrado"}), 404
                
            save_data(data)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# 3. MACHINES
@app.route('/api/machines', methods=['GET', 'POST'])
def manage_machines():
    data = load_data()
    if request.method == 'GET':
        return jsonify(data["maquinas"])
        
    elif request.method == 'POST':
        try:
            machine = request.json
            if not machine:
                return jsonify({"error": "No se recibieron datos de la máquina"}), 400
                
            # If machine has an ID, update it, otherwise create a new one
            m_id = machine.get('id')
            if m_id is not None:
                # Update
                m_id = int(m_id)
                for index, m in enumerate(data["maquinas"]):
                    if m["id"] == m_id:
                        machine["id"] = m_id
                        data["maquinas"][index] = machine
                        save_data(data)
                        return jsonify({"success": True, "id": m_id})
                return jsonify({"error": "Máquina no encontrada"}), 404
            else:
                # Create: auto-increment ID
                next_id = 1
                if data["maquinas"]:
                    next_id = max(m["id"] for m in data["maquinas"]) + 1
                    
                machine["id"] = next_id
                data["maquinas"].append(machine)
                save_data(data)
                return jsonify({"success": True, "id": next_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/machines/<int:machine_id>', methods=['DELETE'])
def delete_machine(machine_id):
    try:
        data = load_data()
        initial_count = len(data["maquinas"])
        data["maquinas"] = [m for m in data["maquinas"] if m["id"] != machine_id]
        
        if len(data["maquinas"]) == initial_count:
            return jsonify({"error": "Máquina no encontrada"}), 404
            
        # Clean up history logs associated with this machine
        data["historial"] = [h for h in data["historial"] if h["machineId"] != machine_id]
        
        save_data(data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. HISTORY LOGS
@app.route('/api/history', methods=['GET', 'POST'])
def manage_history():
    data = load_data()
    if request.method == 'GET':
        return jsonify(data["historial"])
        
    elif request.method == 'POST':
        try:
            log = request.json
            if not log:
                return jsonify({"error": "No se recibieron datos de registro"}), 400
                
            next_id = 1
            if data["historial"]:
                next_id = max(h["id"] for h in data["historial"]) + 1
                
            log["id"] = next_id
            data["historial"].append(log)
            save_data(data)
            return jsonify({"success": True, "id": next_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/history/<int:log_id>', methods=['DELETE'])
def delete_history_log(log_id):
    try:
        data = load_data()
        initial_len = len(data["historial"])
        data["historial"] = [h for h in data["historial"] if h.get("id") != log_id]
        if len(data["historial"]) == initial_len:
            return jsonify({"error": "Registro de historial no encontrado"}), 404
        save_data(data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. UPLOAD FILE
@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No se encontró ningún archivo en la petición"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Nombre de archivo vacío"}), 400
            
        ext = os.path.splitext(file.filename)[1]
        if ext.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            return jsonify({"error": "Formato de archivo no soportado (solo imágenes)"}), 400
            
        # Save file with unique name to prevent collisions
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Return path relative to server root
        return jsonify({"url": f"/uploads/{filename}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 6. BACKUP DATABASE
@app.route('/api/backup', methods=['GET', 'POST'])
def database_backup():
    if request.method == 'GET':
        try:
            data = load_data()
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    elif request.method == 'POST':
        try:
            backup_data = request.json
            if not backup_data or "usuarios" not in backup_data or "maquinas" not in backup_data or "historial" not in backup_data:
                return jsonify({"error": "Formato de copia de seguridad no válido (debe contener usuarios, maquinas e historial)"}), 400
                
            save_data(backup_data)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# 7. DEMO AND APP INFO
@app.route('/demo')
def enter_demo():
    session['is_demo'] = True
    return redirect('/')

@app.route('/real')
@app.route('/logout-demo')
def exit_demo():
    session['is_demo'] = False
    return redirect('/')

@app.route('/api/reset-demo', methods=['POST'])
def reset_demo():
    if session.get('is_demo', False):
        init_demo_database()
        return jsonify({"success": True})
    return jsonify({"error": "No estás en modo demo"}), 400

@app.route('/api/app-info')
def app_info():
    return jsonify({
        "name": "DAO PLANTA",
        "version": "2.0",
        "is_demo": session.get('is_demo', False)
    })

# 8. AUDIT TASKS MANAGEMENT (CRUD)
@app.route('/api/audit-tasks', methods=['GET', 'POST'])
def manage_audit_tasks():
    data = load_data()
    if request.method == 'GET':
        return jsonify(data.get("tareas_auditoria", []))
    elif request.method == 'POST':
        try:
            task = request.json
            if not task or not task.get('name'):
                return jsonify({"error": "Nombre de tarea requerido"}), 400
            
            t_id = task.get('id')
            tareas = data.get("tareas_auditoria", [])
            
            if t_id is not None:
                # Update
                t_id = int(t_id)
                for index, t in enumerate(tareas):
                    if t.get("id") == t_id:
                        task["id"] = t_id
                        tareas[index] = task
                        data["tareas_auditoria"] = tareas
                        save_data(data)
                        return jsonify({"success": True, "id": t_id})
                return jsonify({"error": "Tarea no encontrada"}), 404
            else:
                # Create: auto-increment ID
                next_id = 1
                if tareas:
                    next_id = max((t.get("id", 0) for t in tareas), default=0) + 1
                task["id"] = next_id
                tareas.append(task)
                data["tareas_auditoria"] = tareas
                save_data(data)
                return jsonify({"success": True, "id": next_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/audit-tasks/<int:task_id>', methods=['DELETE'])
def delete_audit_task(task_id):
    try:
        data = load_data()
        tareas = data.get("tareas_auditoria", [])
        initial_count = len(tareas)
        data["tareas_auditoria"] = [t for t in tareas if t.get("id") != task_id]
        
        if len(data["tareas_auditoria"]) == initial_count:
            return jsonify({"error": "Tarea no encontrada"}), 404
            
        save_data(data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 9. QUALITY PRODUCTS MANAGEMENT (CRUD WITH BLUEPRINTS/IMAGES)
@app.route('/api/calidad-productos', methods=['GET', 'POST'])
def manage_calidad_productos():
    data = load_data()
    if request.method == 'GET':
        return jsonify(data.get("productos_calidad", []))
    elif request.method == 'POST':
        try:
            prod = request.json
            if not prod or not prod.get('name'):
                return jsonify({"error": "Nombre del producto requerido"}), 400
                
            p_id = prod.get('id')
            prods = data.get("productos_calidad", [])
            
            if p_id is not None:
                # Update
                p_id = int(p_id)
                for index, p in enumerate(prods):
                    if p.get("id") == p_id:
                        prod["id"] = p_id
                        prods[index] = prod
                        data["productos_calidad"] = prods
                        save_data(data)
                        return jsonify({"success": True, "id": p_id})
                return jsonify({"error": "Producto no encontrado"}), 404
            else:
                # Create: auto-increment ID
                next_id = 1
                if prods:
                    next_id = max((p.get("id", 0) for p in prods), default=0) + 1
                prod["id"] = next_id
                prods.append(prod)
                data["productos_calidad"] = prods
                save_data(data)
                return jsonify({"success": True, "id": next_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/calidad-productos/<int:prod_id>', methods=['DELETE'])
def delete_calidad_producto(prod_id):
    try:
        data = load_data()
        prods = data.get("productos_calidad", [])
        initial_count = len(prods)
        data["productos_calidad"] = [p for p in prods if p.get("id") != prod_id]
        
        if len(data["productos_calidad"]) == initial_count:
            return jsonify({"error": "Producto no encontrado"}), 404
            
        save_data(data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Servidor Flask MANTENIMIENTO iniciado en http://localhost:{PORT}/")
    app.run(port=PORT, host='0.0.0.0', debug=True)
