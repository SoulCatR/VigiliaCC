from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import cv2
import numpy as np
import base64
from datetime import datetime
import os
import requests

app = Flask(__name__)
CORS(app)

# Cargar modelo YOLOv5
print("🔄 Cargando modelo YOLOv5...")
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
model.conf = 0.5
print("✅ Modelo YOLOv5 cargado exitosamente")

# ✅ MAPEO CORRECTO - SIN "COMPORTAMIENTO SOSPECHOSO" - - alineado con alert_categories de la BD
CATEGORY_MAPPING = {
    'person': {
        'category_id': 2,   # loitering / merodeo
        'category_name': 'Merodeo',
        'severity': 'low'
    },
    'backpack': {
        'category_id': 4,   # abandoned_object
        'category_name': 'Objeto Abandonado',
        'severity': 'medium'
    },
    'handbag': {
        'category_id': 4,
        'category_name': 'Objeto Abandonado',
        'severity': 'medium'
    },
    'suitcase': {
        'category_id': 4,
        'category_name': 'Objeto Abandonado',
        'severity': 'high'
    },
    'bottle': {
        'category_id': 4,
        'category_name': 'Objeto Abandonado',
        'severity': 'low'
    },
    'umbrella': {
        'category_id': 4,
        'category_name': 'Objeto Abandonado',
        'severity': 'low'
    },
    'cell phone': {
        'category_id': 3,  # theft (posible robo)
        'category_name': 'Robo',
        'severity': 'high'
    },
    'knife': {
        'category_id': 3,
        'category_name': 'Robo',
        'severity': 'critical'
    }
}

SEVERITY_COLORS = {
    'critical': (0, 0, 255),    # Rojo
    'high': (0, 165, 255),      # Naranja
    'medium': (0, 255, 255),    # Amarillo
    'low': (0, 255, 0)          # Verde
}

def detect_crowd(detections):
    """Detectar aglomeración (3+ personas)
    Alineado con HU029: agrupación anómala >= 3 personas.
    """
    person_count = sum(1 for det in detections if det['class'] == 'person')
    if person_count >= 3:
        return {
            'category_id': 5,  # crowd / agrupación
            'category_name': 'Aglomeración',
            'severity': 'medium',
            'confidence': min(detections[0]['confidence'] + 0.05, 0.99) if detections else 0.8,
            'count': person_count
        }
    return None

# ── FIX 5: save_alert_to_backend DESACTIVADA ─────────────────────────────────
# Esta función intentaba hacer POST a /api/alerts sin Bearer token,
# lo que causaba un 401 Unauthorized en backend-api/src/routes/alert.routes.js.
# Además duplicaba alertas con las que ya crea detection.routes.js.
# La creación de alertas se centraliza en detection.routes.js (Node.js).
#
# def save_alert_to_backend(camera_id, category_id, confidence, image_base64):
#     """Guardar alerta automáticamente cuando confidence > 0.7"""
#     try:
#         if confidence < 0.7:
#             print(f"⏭️ Confianza {confidence:.2f} < 0.7, no se guarda alerta")
#             return
#         backend_url = 'http://localhost:3000/api/alerts'
#         payload = {
#             'camera_id': camera_id,
#             'category_id': category_id,
#             'confidence': confidence,
#             'image': image_base64,
#             'status': 'pending'
#         }
#         response = requests.post(backend_url, json=payload, timeout=5)
#         if response.status_code == 201:
#             print(f"✅ Alerta guardada - Confianza: {confidence:.2f}")
#         else:
#             print(f"⚠️ Error al guardar alerta: {response.status_code}")
#     except Exception as e:
#         print(f"❌ Error guardando alerta: {str(e)}")
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.json
        image_data = data.get('image')
        camera_id = data.get('camera_id', 0)
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Decodificar imagen
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image'}), 400

        # Detección YOLOv5
        results = model(img)
        detections_data = results.pandas().xyxy[0]
        
        detections = []
        max_confidence = 0
        primary_detection = None
        
        for _, row in detections_data.iterrows():
            class_name = row['name']
            confidence = float(row['confidence'])
            
            # ✅ Obtener categoría específica (SIN "Comportamiento Sospechoso")
            category_info = CATEGORY_MAPPING.get(class_name)
            
            # ✅ Si no está mapeado, IGNORAR (no poner categoría genérica)
            if not category_info:
                print(f"⏭️ Objeto '{class_name}' no mapeado, ignorando")
                continue
            
            detection = {
                'class': class_name,
                'confidence': confidence,
                'bbox': {
                    'x1': int(row['xmin']),
                    'y1': int(row['ymin']),
                    'x2': int(row['xmax']),
                    'y2': int(row['ymax'])
                },
                'category_id': category_info['category_id'],
                'category_name': category_info['category_name'],
                'severity': category_info['severity']
            }
            
            detections.append(detection)
            
            if confidence > max_confidence:
                max_confidence = confidence
                primary_detection = detection
        
        # Detectar aglomeración
        crowd_detection = detect_crowd(detections)
        if crowd_detection:
            primary_detection = crowd_detection
            max_confidence = crowd_detection['confidence']
        
        # Dibujar bounding boxes
        img_with_boxes = img.copy()
        for det in detections:
            color = SEVERITY_COLORS.get(det['severity'], (255, 255, 255))
            bbox = det['bbox']
            
            cv2.rectangle(
                img_with_boxes,
                (bbox['x1'], bbox['y1']),
                (bbox['x2'], bbox['y2']),
                color,
                2
            )
            
            label = f"{det['category_name']}: {int(det['confidence'] * 100)}%"
            (text_width, text_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            
            cv2.rectangle(
                img_with_boxes,
                (bbox['x1'], bbox['y1'] - text_height - 10),
                (bbox['x1'] + text_width, bbox['y1']),
                color,
                -1
            )
            
            cv2.putText(
                img_with_boxes,
                label,
                (bbox['x1'], bbox['y1'] - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )
        
        # Codificar imagen
        _, buffer = cv2.imencode('.jpg', img_with_boxes)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        response_data = {
            'detected': len(detections) > 0,
            'detections': detections,
            'count': len(detections),
            'image_with_boxes': f'data:image/jpeg;base64,{img_base64}'
        }
        
        if primary_detection:
            response_data['primary_detection'] = primary_detection
            
            """ # ✅ GUARDAR ALERTA AUTOMÁTICAMENTE si confidence > 0.7
            save_alert_to_backend(
                camera_id,
                primary_detection.get('category_id'),
                max_confidence,
                f'data:image/jpeg;base64,{img_base64}'
            ) """
        
        print(f"✅ Detectados: {len(detections)} | Principal: {primary_detection.get('category_name', 'N/A') if primary_detection else 'N/A'}")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error en detección: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'yolov5s'})

if __name__ == '__main__':
    print("🚀 Servidor IA iniciado en http://localhost:5000")
    print("📋 Categorías disponibles:")
    print("   1. Merodeo (persona sola)(loitering)")
    print("   2. Aglomeración (3+ personas)(crowd)")
    print("   3. Objeto Abandonado (mochila, maleta, etc)(abandoned_object)")
    print("   4. Robo (requiere arma blanca visible)(theft)")
    print("   5. Acceso No Autorizado (unauthorized_access)")
    app.run(host='0.0.0.0', port=5000, debug=True)