# =============================================
# ARCHIVO: ia-detection/utils/helpers.py
# Funciones auxiliares
# =============================================
import cv2
from pathlib import Path

def redimensionar_imagen(imagen, ancho=640):
    '''Redimensiona imagen manteniendo aspect ratio'''
    alto = int(imagen.shape[0] * (ancho / imagen.shape[1]))
    return cv2.resize(imagen, (ancho, alto))

def crear_carpetas():
    '''Crea estructura de carpetas necesaria'''
    carpetas = [
        'captures',
        'models',
        'data/train/images',
        'data/train/labels',
        'data/val/images',
        'data/val/labels'
    ]
    for carpeta in carpetas:
        Path(carpeta).mkdir(parents=True, exist_ok=True)
    print('✅ Estructura de carpetas creada')

if __name__ == '__main__':
    crear_carpetas()