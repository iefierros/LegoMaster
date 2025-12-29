# 🚀 Guía Rápida de Inicio - Lego Master

## ⚡ Inicio Rápido (5 minutos)

### 1. Instalar Dependencias
```bash
cd lego-master
npm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase (opcional para empezar):
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-aqui
```

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🎨 Crear Tu Primer Robot

### Paso 1: Diseña en BrickLink Studio

1. Descarga [BrickLink Studio](https://www.bricklink.com/v3/studio/download.page)
2. Crea un robot simple:
   - Agrega un **SPIKE Large Motor** (parte #54696) o **EV3 Large Motor** (#99499)
   - Agrega **ruedas** (parte #56908 o similar)
   - Conecta las ruedas al motor con ejes
   - Opcional: Agrega sensores (#37308 para color, #37316 para ultrasónico)

### Paso 2: Exporta el Modelo

1. En Studio: **File → Export As...**
2. Selecciona **Studio File (.io)**
3. Guarda como `mi-robot.io`

### Paso 3: Carga en Lego Master

1. Click en **"Upload Robot"**
2. Selecciona `mi-robot.io`
3. Espera a que el sistema detecte motores y ruedas automáticamente
4. ✅ ¡Tu robot está listo para simular!

---

## 💻 Tu Primer Programa

Copia este código en el editor:

```python
# Crear motores en puertos A y B
motor_left = Motor('A')
motor_right = Motor('B')

# Crear base de conducción
drive = DriveBase('A', 'B')

# Programa
print_robot("¡Hola desde mi robot!")

# Avanzar 2 segundos
drive.drive_straight(50)
wait(2000)

# Girar en el lugar
motor_left.run(50)
motor_right.run(-50)
wait(1000)

# Detener
drive.stop()
print_robot("¡Programa completado!")
```

Click en **"Run"** y observa tu robot moverse en la simulación 3D.

---

## 🎯 Ejemplo con Sensores

```python
# Crear componentes
drive = DriveBase('A', 'B')
color = ColorSensor('1')
ultrasonic = UltrasonicSensor('2')

print_robot("Buscando línea negra...")

# Avanzar hasta detectar línea negra
drive.drive_straight(40)
while color.get_color() != 'black':
    wait(10)

drive.stop()
print_robot("¡Línea encontrada!")

# Avanzar hasta obstáculo
print_robot("Avanzando hasta obstáculo...")
drive.drive_straight(30)
while ultrasonic.get_distance() > 15:
    wait(10)

drive.stop()
print_robot("¡Obstáculo detectado a " + str(ultrasonic.get_distance()) + "cm!")
```

---

## 🛠️ Problemas Comunes

### El robot no aparece en la escena
- **Solución**: Verifica que el archivo .io contenga al menos un motor y ruedas
- Revisa la consola del navegador (F12) para errores

### "Motor not found on port X"
- **Solución**: El sistema asigna puertos automáticamente de izquierda a derecha
- Verifica qué puertos tiene tu robot en el panel de información (derecha)

### El código no se ejecuta
- **Solución**: Asegúrate de haber cargado un robot primero
- Verifica que Skulpt esté cargado (debería ser automático)

---

## 📖 Comandos Disponibles

### Motores
```python
motor = Motor('A')
motor.run(50)                    # Velocidad -100 a 100
motor.run_for_rotations(2, 50)   # Rotaciones y velocidad
motor.stop()
motor.reset()
motor.get_angle()                # Grados
motor.get_speed()                # RPM
```

### DriveBase (2 motores)
```python
drive = DriveBase('A', 'B')
drive.drive_straight(50)         # Avanzar
drive.turn(30)                   # Girar (+ derecha, - izquierda)
drive.stop()
```

### Sensores
```python
color = ColorSensor('1')
color.get_color()                # 'black', 'white', 'red', etc.
color.get_reflectance()          # 0-100

ultrasonic = UltrasonicSensor('2')
ultrasonic.get_distance()        # cm (0-255)
```

### Utilidades
```python
wait(1000)                       # Esperar ms
print_robot("mensaje")           # Imprimir
```

---

## 🎓 Siguiente Paso: FLL Missions

Prueba recrear misiones de FLL:

1. Sigue una línea negra
2. Empuja un objeto a una zona
3. Activa palancas/botones
4. Regresa a la base

---

## 🆘 Ayuda

- **Documentación completa**: Ver [README.md](README.md)
- **Ejemplos**: Carpeta `examples/` (próximamente)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/lego-master/issues)

---

**¡Diviértete construyendo y programando! 🎉**
