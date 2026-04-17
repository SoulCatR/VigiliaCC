# =============================================
# ARCHIVO: ia-detection/train_model.py
# Entrenamiento del Modelo YOLOv5
# =============================================

import torch
import os
from pathlib import Path

def train():
    print('='*60)
    print('🎓 VIGILIACC - Entrenamiento de Modelo YOLOv5')
    print('='*60)
    
    # Verificar dataset
    data_yaml = Path('data/dataset.yaml')
    if not data_yaml.exists():
        print('❌ Error: No se encontró data/dataset.yaml')
        print('📝 Crea el archivo con la estructura del dataset')
        return
    
    print(f'✅ Dataset encontrado: {data_yaml}')
    
    # Parámetros de entrenamiento
    epochs = int(os.getenv('EPOCHS', '50'))
    batch_size = int(os.getenv('BATCH_SIZE', '16'))
    img_size = int(os.getenv('IMG_SIZE', '640'))
    
    print(f'\n⚙️ Configuración:')
    print(f'  - Épocas: {epochs}')
    print(f'  - Batch size: {batch_size}')
    print(f'  - Tamaño de imagen: {img_size}')
    print('='*60)
    
    # Comando de entrenamiento
    cmd = f"""
    python -m torch.distributed.launch --nproc_per_node 1 train.py \
        --img {img_size} \
        --batch {batch_size} \
        --epochs {epochs} \
        --data {data_yaml} \
        --weights yolov5s.pt \
        --project runs/train \
        --name vigiliacc_model \
        --cache
    """
    
    print('\n⏳ Iniciando entrenamiento...')
    print(f'📝 Comando: {cmd}')
    
    # Ejecutar entrenamiento
    os.system(cmd)
    
    print('\n✅ Entrenamiento completado')
    print('📁 Resultados en: runs/train/vigiliacc_model')
    print('🔧 Modelo guardado como: runs/train/vigiliacc_model/weights/best.pt')

if __name__ == '__main__':
    train()