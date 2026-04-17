# =============================================
# ARCHIVO: ia-detection/README.md
# Documentación del Módulo IA
# =============================================
"""
# 🧠 Módulo IA - VigiliaCC

Sistema de detección en tiempo real con YOLOv5 para Windows.

## 📋 Requisitos

- Windows 10/11
- Python 3.10 o superior
- GPU NVIDIA con CUDA (recomendado) o CPU

## 🚀 Instalación

### 1. Crear entorno virtual (CMD de Windows)
```cmd
python -m venv venv
venv\Scripts\activate
```

### 2. Instalar dependencias
```cmd
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
```cmd
copy .env.example .env
```
Editar `.env` con tus credenciales.

## 🎯 Uso

### Detección en Tiempo Real
```cmd
python detect_realtime.py
```

**Controles:**
- `Q` - Salir
- `S` - Captura manual
- `C` - Confirmar y enviar alerta a la API

### Entrenamiento del Modelo
```cmd
python train_model.py
```