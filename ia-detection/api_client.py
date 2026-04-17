# =============================================
# ARCHIVO: ia-detection/api_client.py
# Cliente HTTP para API de VigiliaCC
# =============================================

import requests
import json
from typing import Optional, Dict

class VigiliaAPI:
    """Cliente para interactuar con la API de VigiliaCC"""
    
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.username = username
        self.password = password
    
    def login(self) -> bool:
        """Autenticarse en la API"""
        try:
            response = requests.post(
                f'{self.base_url}/auth/login',
                json={'username': self.username, 'password': self.password}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                print(f'✅ Login exitoso: {self.username}')
                return True
            else:
                print(f'❌ Error de login: {response.status_code}')
                return False
        except Exception as e:
            print(f'❌ Error de conexión: {e}')
            return False
    
    def _get_headers(self) -> Dict:
        """Obtener headers con token"""
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def crear_alerta(self, camera_id: int, confidence: float, 
                     image_path: str, category_id: int = 1) -> Optional[Dict]:
        """Crear una nueva alerta"""
        try:
            data = {
                'camera_id': camera_id,
                'category_id': category_id,
                'confidence': confidence,
                'image_path': image_path
            }
            
            response = requests.post(
                f'{self.base_url}/alerts',
                json=data,
                headers=self._get_headers()
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                print(f'❌ Error al crear alerta: {response.status_code}')
                return None
        except Exception as e:
            print(f'❌ Error: {e}')
            return None
    
    def obtener_camaras(self) -> Optional[list]:
        """Obtener lista de cámaras"""
        try:
            response = requests.get(
                f'{self.base_url}/cameras',
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f'❌ Error: {e}')
            return None

# Ejemplo de uso
if __name__ == '__main__':
    api = VigiliaAPI(
        base_url='http://localhost:3000/api',
        username='vigilante1',
        password='vigil123'
    )
    
    if api.login():
        # Crear alerta de prueba
        alerta = api.crear_alerta(
            camera_id=1,
            confidence=0.85,
            image_path='captures/test.jpg',
            category_id=1
        )
        
        if alerta:
            print(f'✅ Alerta creada: ID {alerta["id"]}')
        
        # Obtener cámaras
        camaras = api.obtener_camaras()
        if camaras:
            print(f'📹 Cámaras disponibles: {len(camaras)}')