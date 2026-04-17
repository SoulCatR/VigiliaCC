# =============================================
# ARCHIVO: ia-detection/detect_realtime.py
# Detección en Tiempo Real con YOLOv5
# Compatible con: Windows 10/11
# =============================================

import cv2
import torch
import requests
import os
from datetime import datetime
from pathlib import Path
import json
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración
API_URL = os.getenv('API_URL', 'http://localhost:3000/api')
API_TOKEN = os.getenv('API_TOKEN', '')
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.75'))
CAMERA_ID = int(os.getenv('CAMERA_ID', '1'))
VIDEO_SOURCE = os.getenv('VIDEO_SOURCE', '0')  # 0 = webcam, o 'rtsp://...'

# Crear carpeta de capturas
CAPTURES_DIR = Path('captures')
CAPTURES_DIR.mkdir(exist_ok=True)

class AlertaSender:
    """Cliente para enviar alertas a la API"""
    
    def __init__(self, api_url, token):
        self.api_url = api_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def enviar_alerta(self, camera_id, confidence, image_path, categoria_id=1):
        """Envía una alerta a la API"""
        try:
            data = {
                'camera_id': camera_id,
                'category_id': categoria_id,
                'confidence': float(confidence),
                'image_path': image_path
            }
            
            response = requests.post(
                f'{self.api_url}/alerts',
                json=data,
                headers=self.headers,
                timeout=5
            )
            
            if response.status_code == 201:
                print(f'✅ Alerta enviada - Confidence: {confidence:.2f}')
                return response.json()
            else:
                print(f'❌ Error al enviar alerta: {response.status_code}')
                return None
                
        except Exception as e:
            print(f'❌ Error de conexión con API: {e}')
            return None

def main():
    print('='*60)
    print('🎯 VIGILIACC - Sistema de Detección en Tiempo Real')
    print('='*60)
    print(f'📹 Fuente de video: {VIDEO_SOURCE}')
    print(f'🔗 API URL: {API_URL}')
    print(f'📊 Umbral de confianza: {CONFIDENCE_THRESHOLD}')
    print('='*60)
    
    # Cargar modelo YOLOv5
    print('\n⏳ Cargando modelo YOLOv5...')
    try:
        # Intentar cargar modelo personalizado primero
        model_path = Path('models/best.pt')
        if model_path.exists():
            model = torch.hub.load('ultralytics/yolov5', 'custom', path=str(model_path))
            print(f'✅ Modelo personalizado cargado: {model_path}')
        else:
            # Cargar modelo preentrenado
            model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
            print('✅ Modelo YOLOv5s preentrenado cargado')
    except Exception as e:
        print(f'❌ Error al cargar modelo: {e}')
        return
    
    # Configurar modelo
    model.conf = CONFIDENCE_THRESHOLD  # Umbral de confianza
    model.iou = 0.45  # Umbral de IoU para NMS
    
    # Inicializar cliente de API
    alerta_sender = AlertaSender(API_URL, API_TOKEN)
    
    # Abrir fuente de video
    print(f'\n📹 Abriendo fuente de video: {VIDEO_SOURCE}')
    
    # Convertir "0" a int para webcam
    if VIDEO_SOURCE.isdigit():
        cap = cv2.VideoCapture(int(VIDEO_SOURCE))
    else:
        cap = cv2.VideoCapture(VIDEO_SOURCE)
    
    if not cap.isOpened():
        print('❌ Error: No se pudo abrir la fuente de video')
        return
    
    print('✅ Video iniciado correctamente')
    print('\n📝 Controles:')
    print('  - Presiona "Q" para salir')
    print('  - Presiona "S" para capturar manualmente')
    print('  - Presiona "C" para confirmar detección y enviar alerta')
    print('='*60)
    
    frame_count = 0
    ultima_alerta = None
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print('❌ Error al leer frame')
                break
            
            frame_count += 1
            
            # Realizar detección (cada 5 frames para optimizar)
            if frame_count % 5 == 0:
                results = model(frame)
                
                # Obtener detecciones
                detections = results.pandas().xyxy[0]
                
                # Renderizar detecciones en el frame
                frame_with_boxes = results.render()[0]
                
                # Procesar detecciones con alta confianza
                for _, det in detections.iterrows():
                    confidence = det['confidence']
                    class_name = det['name']
                    
                    if confidence >= CONFIDENCE_THRESHOLD:
                        # Guardar captura
                        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                        filename = f'alerta_{timestamp}_{confidence:.2f}.jpg'
                        filepath = CAPTURES_DIR / filename
                        cv2.imwrite(str(filepath), frame)
                        
                        # Guardar información de la detección
                        ultima_alerta = {
                            'confidence': confidence,
                            'class': class_name,
                            'filepath': str(filepath),
                            'timestamp': timestamp
                        }
                        
                        print(f'\n🚨 Detección: {class_name} ({confidence:.2f})')
                        print(f'📸 Captura guardada: {filename}')
            else:
                frame_with_boxes = frame
            
            # Mostrar FPS y contador
            fps_text = f'FPS: ~{30 // 5} | Frame: {frame_count}'
            cv2.putText(frame_with_boxes, fps_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Mostrar última alerta
            if ultima_alerta:
                alert_text = f"Ultima: {ultima_alerta['class']} ({ultima_alerta['confidence']:.2f})"
                cv2.putText(frame_with_boxes, alert_text, (10, 60),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Mostrar frame
            cv2.imshow('VigiliaCC - Deteccion en Tiempo Real', frame_with_boxes)
            
            # Controles de teclado
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q') or key == ord('Q'):
                print('\n👋 Cerrando aplicación...')
                break
            
            elif key == ord('s') or key == ord('S'):
                # Captura manual
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f'manual_{timestamp}.jpg'
                filepath = CAPTURES_DIR / filename
                cv2.imwrite(str(filepath), frame)
                print(f'📸 Captura manual guardada: {filename}')
            
            elif key == ord('c') or key == ord('C'):
                # Confirmar y enviar alerta
                if ultima_alerta:
                    print(f'\n📤 Enviando alerta a la API...')
                    alerta_sender.enviar_alerta(
                        CAMERA_ID,
                        ultima_alerta['confidence'],
                        ultima_alerta['filepath'],
                        categoria_id=1  # 1 = Robo (ajustar según necesidad)
                    )
                    ultima_alerta = None
                else:
                    print('⚠️ No hay alerta pendiente para enviar')
    
    except KeyboardInterrupt:
        print('\n⚠️ Interrupción por teclado (Ctrl+C)')
    
    finally:
        # Liberar recursos
        cap.release()
        cv2.destroyAllWindows()
        print('\n✅ Recursos liberados correctamente')
        print('='*60)

if __name__ == '__main__':
    main()