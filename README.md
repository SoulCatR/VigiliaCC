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
### ==================================================
### Comandos para Correr IA + Backend + FrontEnd
### Terminal 1: Python IA 
### ==================================================

cd ia-detection
.\venv\Scripts\Activate.ps1
python api.py
```

**✅ Deberías ver:**
```
============================================================
🚀 VigiliaCC - API REST + YOLOv5
============================================================
✅ Modelo YOLOv5s preentrenado cargado
📡 API disponible en: http://0.0.0.0:5000
============================================================

============================================================
Terminal 2: Backend Node.js

cd backend-api
npm start
```

**✅ Deberías ver:**
```
🚀 Server running on port 3000
📊 Database connected

============================================================
::--Terminal 3: Frontend Next.js 

cd frontend-dashboard
npm run dev
```