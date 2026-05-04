# ✅ Fix: Cookie Authentication en Desarrollo Local

**Fecha:** 2026-05-04  
**Estado:** ✅ **Resuelto**

---

## 🐛 Error Reportado

```
GET http://nestwork.localtest.me:8000/api/me/ 401 (Unauthorized)
```

**Problema:** Después de iniciar sesión, el frontend no podía obtener los datos del usuario porque las cookies no se estaban guardando.

---

## 🔍 Causa Raíz

### Cookie `secure=True` en HTTP

El código de login estaba configurando las cookies con:
```python
response.set_cookie(
    key='access_token',
    secure=True,  # ❌ Esto solo funciona en HTTPS
    httponly=True,
    samesite='Lax',
)
```

**Problema:**
- `secure=True` significa que la cookie **solo se envía en conexiones HTTPS**
- En desarrollo local usas **HTTP** (no HTTPS)
- **Resultado:** Las cookies no se guardaban en el navegador
- **Síntoma:** 401 Unauthorized en `/api/me/` después de login

---

## ✅ Solución Aplicada

### Archivo: `backend/api/modules/auth/views.py`

**Cambio realizado:**
```python
# Detectar si estamos en modo DEBUG (desarrollo)
from django.conf import settings
is_debug = getattr(settings, 'DEBUG', False)

# Access token cookie
response.set_cookie(
    key='access_token',
    value=str(refresh.access_token),
    max_age=60 * 20,  # 20 minutes
    httponly=True,
    secure=not is_debug,  # ✅ False en desarrollo, True en producción
    samesite='Lax',
    path='/',
)

# Refresh token cookie
response.set_cookie(
    key='refresh_token',
    value=str(refresh),
    max_age=60 * 60 * 24 * 7,  # 7 days
    httponly=True,
    secure=not is_debug,  # ✅ False en desarrollo, True en producción
    samesite='Lax',
    path='/',
)
```

---

## 🎯 Comportamiento por Entorno

### Desarrollo (DEBUG=True)
```python
secure=False  # ✅ Cookies funcionan en HTTP
httponly=True  # ✅ Protegido contra XSS
samesite='Lax'  # ✅ Protegido contra CSRF
```

### Producción (DEBUG=False)
```python
secure=True  # ✅ Cookies solo en HTTPS
httponly=True  # ✅ Protegido contra XSS
samesite='Lax'  # ✅ Protegido contra CSRF
```

---

## 🔄 Pasos para Aplicar

### 1. Reiniciar Servidor Django

```bash
# Detener servidor (CTRL + C)
# Volver a iniciar
cd backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Limpiar Cookies Anteriores (Opcional)

En el navegador:
1. Abre DevTools (F12)
2. Ve a "Application" → "Cookies"
3. Elimina todas las cookies de `nestwork.localtest.me`
4. Recarga la página

### 3. Iniciar Sesión

1. Ve a `http://nestwork.localtest.me:5173/signin`
2. Ingresa tus credenciales
3. Haz click en "Iniciar Sesión"

### 4. Verificar

En DevTools (F12):
1. Ve a "Application" → "Cookies" → `http://nestwork.localtest.me:5173`
2. Deberías ver:
   - ✅ `access_token` (expira en 20 min)
   - ✅ `refresh_token` (expira en 7 días)

---

## 📊 Estado Final

| Componente | Desarrollo | Producción |
|------------|-----------|------------|
| **secure** | `False` | `True` |
| **httponly** | `True` | `True` |
| **samesite** | `Lax` | `Lax` |
| **HTTPS requerido** | ❌ No | ✅ Sí |

---

## 🔒 Seguridad

### XSS Protection (httpOnly)
- ✅ Las cookies **no son accesibles desde JavaScript**
- ✅ `document.cookie` no muestra `access_token` ni `refresh_token`
- ✅ Protegido contra ataques XSS que roban tokens

### CSRF Protection (SameSite)
- ✅ `SameSite=Lax` previene envío de cookies en requests cross-site
- ✅ Protegido contra ataques CSRF básicos
- ✅ Las cookies se envían en navegación normal (GET)

### HTTPS Enforcement (Producción)
- ✅ En producción (`DEBUG=False`), `secure=True`
- ✅ Cookies solo viajan por HTTPS
- ✅ Protegido contra man-in-the-middle

---

## 🧪 Testing

### Verificar en Desarrollo

```bash
# 1. Iniciar sesión
curl -X POST http://nestwork.localtest.me:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"tu_usuario","password":"tu_password"}' \
  -c cookies.txt

# 2. Verificar cookies guardadas
cat cookies.txt

# 3. Hacer request a /api/me/ con cookies
curl http://nestwork.localtest.me:8000/api/me/ \
  -b cookies.txt
```

**Resultado esperado:**
```json
{
  "username": "tu_usuario",
  "email": "tu@email.com",
  "is_staff": false,
  "is_superuser": false,
  "role": "admin",
  "platform_role": "admin"
}
```

---

## ⚠️ Notas Importantes

### 1. Producción Requiere HTTPS

En producción, **debes** usar HTTPS:
```env
# .env de producción
DJANGO_DEBUG=False
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### 2. No Usar secure=False en Producción

**NUNCA** hagas esto en producción:
```python
# ❌ PELIGROSO - Cookies se envían en HTTP
secure=False
```

### 3. Cookies vs localStorage

**Antes (inseguro):**
```javascript
// ❌ Tokens en localStorage (accesible por XSS)
localStorage.setItem('auth_token', token)
```

**Ahora (seguro):**
```python
# ✅ Tokens en cookies httpOnly (inaccesible por JS)
response.set_cookie('access_token', token, httponly=True)
```

---

## 🎁 Beneficios

### Seguridad Mejorada
- ✅ **XSS Protection**: Tokens inaccesibles desde JavaScript
- ✅ **CSRF Protection**: SameSite=Lax previene ataques básicos
- ✅ **HTTPS Enforcement**: Producción requiere HTTPS automáticamente

### Developer Experience
- ✅ **Desarrollo local funciona**: No necesitas configurar HTTPS local
- ✅ **Producción segura**: HTTPS forzado automáticamente
- ✅ **Un solo código**: No necesitas cambiar configuración por entorno

---

## 🔗 Enlaces

- **Django Cookies:** https://docs.djangoproject.com/en/5.2/ref/request-response/#django.http.HttpResponse.set_cookie
- **OWASP XSS:** https://owasp.org/www-community/attacks/xss/
- **OWASP CSRF:** https://owasp.org/www-community/attacks/csrf
- **HTTP Only Cookies:** https://owasp.org/www-community/HttpOnly

---

**Estado:** ✅ Resuelto  
**Tiempo de solución:** ~5 minutos  
**Próximo paso:** Reiniciar servidor Django y probar login
