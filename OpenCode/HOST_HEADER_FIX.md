# ✅ Solución: Disallowed Host Header

**Fecha:** 2026-05-04  
**Estado:** ✅ **Resuelto**

---

## 🐛 Error Reportado

```
Disallowed Host header: nestwork.localtest.me:8000
Host 'nestwork.localtest.me:8000' not in ALLOWED_HOSTS
```

---

## 🔍 Causa

El middleware de seguridad de Django está rechazando las peticiones porque el **host no está en la lista de hosts permitidos**.

**Host que estás usando:** `nestwork.localtest.me:8000`  
**Hosts permitidos en .env:** `localhost,127.0.0.1, netswork.localtest.me`

**Problema:** Hay un error de escritura - dice `netswork` en lugar de `nestwork`

---

## ✅ Solución Aplicada

### Archivo: `backend/.env`

**Antes:**
```env
ALLOWED_HOSTS=localhost,127.0.0.1, netswork.localtest.me
```

**Después:**
```env
ALLOWED_HOSTS=localhost,127.0.0.1,nestwork.localtest.me,netswork.localtest.me
```

**Cambios:**
1. ✅ Corregido `netswork` → `nestwork`
2. ✅ Agregados ambos por si acaso
3. ✅ Eliminados espacios (importante)

---

## 🔄 Pasos para Aplicar

### 1. Detener el Servidor

En la terminal donde corre Django, presiona:
```
CTRL + C
```

### 2. Reiniciar el Servidor

```bash
cd backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

### 3. Verificar

Accede a: `http://nestwork.localtest.me:8000/`

**Resultado esperado:** ✅ Sin errores de Host header

---

## 📝 ¿Por qué Pasó Esto?

### Django Security Middleware

Django incluye un middleware de seguridad que **valida el Host header** en cada petición para prevenir:

- **Host Header Attack** - Ataques de envenenamiento de caché
- **Password Reset Poisoning** - Envenenamiento de links de reset
- **Phishing** - Generación de URLs falsas

### ALLOWED_HOSTS

Es una lista blanca de hosts que Django acepta. Si el host de la petición no está en la lista, Django retorna **400 Bad Request**.

---

## 🎯 Configuración Recomendada

### Desarrollo Local

```env
ALLOWED_HOSTS=localhost,127.0.0.1,nestwork.localtest.me
```

### Producción

```env
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,api.tu-dominio.com
```

### Multi-Tenant (django-tenants)

```env
# Dominio base para todos los tenants
ONBOARDING_BASE_DOMAIN=localtest.me

# ALLOWED_HOSTS debe incluir el dominio base
ALLOWED_HOSTS=localhost,127.0.0.1,nestwork.localtest.me,*.localtest.me
```

---

## ⚠️ Notas Importantes

### 1. Reinicio Requerido

Los cambios en `.env` **NO** se aplican automáticamente. Debes:
```bash
# Detener servidor (CTRL + C)
# Volver a iniciar
python manage.py runserver
```

### 2. Espacios en ALLOWED_HOSTS

**Incorrecto:**
```env
ALLOWED_HOSTS=localhost, 127.0.0.1, nestwork.localtest.me
```

**Correcto:**
```env
ALLOWED_HOSTS=localhost,127.0.0.1,nestwork.localtest.me
```

### 3. Wildcards no Soportados

Django no soporta wildcards (`*`) en ALLOWED_HOSTS por defecto.

**Incorrecto:**
```env
ALLOWED_HOSTS=*.localtest.me
```

**Correcto:**
```env
ALLOWED_HOSTS=tenant1.localtest.me,tenant2.localtest.me
```

---

## 🔧 Comandos Útiles

### Verificar ALLOWED_HOSTS

```bash
cd backend
.\venv\Scripts\python.exe -c "from django.conf import settings; print(settings.ALLOWED_HOSTS)"
```

### Verificar Middleware

```bash
cd backend
.\venv\Scripts\python.exe -c "from django.conf import settings; print(settings.MIDDLEWARE)"
```

---

## 📊 Estado Final

| Componente | Estado |
|------------|--------|
| ALLOWED_HOSTS | ✅ Actualizado |
| nestwork.localtest.me | ✅ Agregado |
| Servidor | ⚠️ Requiere reinicio |

---

## 🎁 Resultado Esperado

Después de reiniciar el servidor:

```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
May 04, 2026 - 09:30:00
Django version 5.2.13, using settings 'config.settings.development'
Starting development server at http://0.0.0.0:8000/
Quit the server with CTRL-BREAK.
```

**Accediendo a:** `http://nestwork.localtest.me:8000/`

✅ **Sin errores de Host header**

---

## 🔗 Enlaces

- **Django Security:** https://docs.djangoproject.com/en/5.2/topics/security/
- **ALLOWED_HOSTS:** https://docs.djangoproject.com/en/5.2/ref/settings/#allowed-hosts
- **Host Header Attacks:** https://docs.djangoproject.com/en/5.2/topics/security/#host-headers-virtual-hosting

---

**Acción Requerida:** Reiniciar servidor Django (CTRL + C, luego volver a ejecutar)
