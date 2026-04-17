# =============================================
# ARCHIVO: ia-detection/api.py
# API REST para Frontend + YOLOv5
# =============================================
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import torch
import time
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)  # Permitir CORS para que Node.js pueda llamar

# Configuración
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.5'))
CAPTURES_DIR = Path('captures')
CAPTURES_DIR.mkdir(exist_ok=True)

# Cargar modelo YOLOv5
print("=" * 60)
print("🚀 VigiliaCC - API REST + YOLOv5")
print("=" * 60)
print("⏳ Cargando modelo YOLOv5...")

try:
    # Intentar cargar modelo personalizado primero
    model_path = Path('models/best.pt')
    if model_path.exists():
        model = torch.hub.load('ultralytics/yolov5', 'custom', path=str(model_path), force_reload=False)
        print(f"✅ Modelo personalizado cargado: {model_path}")
    else:
        # Cargar modelo preentrenado YOLOv5s
        model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
        print("✅ Modelo YOLOv5s preentrenado cargado")
    
    model.conf = CONFIDENCE_THRESHOLD  # Umbral de confianza
    model.iou = 0.45  # Umbral de IoU para NMS
    
    print(f"🔧 Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print(f"🔧 Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    
except Exception as e:
    print(f"❌ Error cargando modelo: {e}")
    model = None

@app.route('/health', methods=['GET'])
def health():
    """
    Verificar estado del servicio
    GET /health
    """
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'model_path': str(model_path) if model_path.exists() else 'yolov5s pretrained',
        'device': str(next(model.parameters()).device) if model else 'N/A',
        'confidence_threshold': CONFIDENCE_THRESHOLD
    })

@app.route('/detect', methods=['POST'])
def detect():
    """
    Endpoint principal para detección de objetos
    POST /detect
    Body: {
        "image": "data:image/jpeg;base64,...",
        "camera_id": 1
    }
    Response: {
        "success": true,
        "detections": [
            {
                "label": "person",
                "confidence": 0.87,
                "bbox": [x, y, width, height]
            }
        ]
    }
    """
    try:
        start_time = time.time()
        
        # Obtener datos del request
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400

        camera_id = data.get('camera_id', 0)

        # Decodificar imagen base64
        image_data = data['image']
        
        # Remover prefijo data:image/jpeg;base64, si existe
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decodificar de base64 a bytes
        image_bytes = base64.b64decode(image_data)
        
        # Convertir bytes a numpy array usando PIL
        pil_image = Image.open(BytesIO(image_bytes))
        img_array = np.array(pil_image)
        
        # Convertir RGB a BGR si es necesario (OpenCV usa BGR)
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_array

        print(f"📸 Imagen recibida de cámara {camera_id}: {img_bgr.shape}")

        # Verificar que el modelo esté cargado
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 500

        # Realizar detección con YOLOv5
        results = model(img_bgr)
        
        # Parsear resultados
        detections = []
        critical_detections = []
        
        for *box, conf, cls in results.xyxy[0]:
            x1, y1, x2, y2 = map(int, box)
            label = model.names[int(cls)]
            confidence = float(conf)
            
            detection = {
                'label': label,
                'confidence': confidence,
                'bbox': [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]  # [x, y, width, height]
            }
            detections.append(detection)
            
            # Guardar detecciones críticas (personas con alta confianza)
            if label == 'person' and confidence >= 0.70:
                critical_detections.append(detection)
            
            print(f"  ✓ {label}: {confidence:.2f} at [{x1}, {y1}, {x2-x1}, {y2-y1}]")

        # Guardar captura si hay detecciones críticas
        if critical_detections:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'alert_cam{camera_id}_{timestamp}.jpg'
            filepath = CAPTURES_DIR / filename
            cv2.imwrite(str(filepath), img_bgr)
            print(f"💾 Captura guardada: {filename}")

        processing_time = (time.time() - start_time) * 1000  # En milisegundos
        
        print(f"⚡ Detección completada en {processing_time:.0f}ms - {len(detections)} objetos")

        return jsonify({
            'success': True,
            'detections': detections,
            'critical_detections': len(critical_detections),
            'processing_time_ms': round(processing_time, 2),
            'image_size': img_bgr.shape,
            'camera_id': camera_id
        })

    except Exception as e:
        print(f"❌ Error en detección: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """
    Información del modelo cargado
    GET /model/info
    """
    if model is None:
        return jsonify({
            'loaded': False,
            'error': 'Model not loaded'
        }), 500
    
    return jsonify({
        'loaded': True,
        'model_name': 'YOLOv5',
        'model_path': str(model_path) if model_path.exists() else 'yolov5s pretrained',
        'classes': len(model.names),
        'class_names': model.names,
        'confidence_threshold': float(model.conf),
        'iou_threshold': float(model.iou),
        'device': str(next(model.parameters()).device)
    })

@app.route('/classes', methods=['GET'])
def get_classes():
    """
    Obtener lista de clases que el modelo puede detectar
    GET /classes
    """
    if model is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded'
        }), 500
    
    return jsonify({
        'success': True,
        'classes': model.names
    })

@app.route('/test', methods=['GET'])
def test():
    """
    Endpoint de prueba simple
    GET /test
    """
    return jsonify({
        'message': 'VigiliaCC API funcionando correctamente',
        'timestamp': datetime.now().isoformat(),
        'model_status': 'loaded' if model else 'not loaded'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("📡 API disponible en: http://0.0.0.0:5000")
    print("📝 Endpoints:")
    print("   GET  /health       - Estado del servicio")
    print("   POST /detect       - Detección de objetos")
    print("   GET  /model/info   - Info del modelo")
    print("   GET  /classes      - Clases disponibles")
    print("   GET  /test         - Prueba simple")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )