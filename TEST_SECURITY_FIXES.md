# Guía de Pruebas - Security Fixes Prioridad 1

## ✅ Checklist de Pruebas

### 1. Pruebas de SECRET_KEY (Fix 1.3)

#### Test 1.1: Backend sin SECRET_KEY debe fallar
```bash
# Temporalmente renombrar .env
mv backend/.env backend/.env.bak

# Intentar arrancar
cd backend
python manage.py runserver

# RESULTADO ESPERADO:
# django.core.exceptions.ImproperlyConfigured: 
# DJANGO_SECRET_KEY environment variable is required
```

#### Test 1.2: Backend con SECRET_KEY debe arrancar
```bash
# Restaurar .env
mv backend/.env.bak backend/.env

# Arrancar
python manage.py runserver

# RESULTADO ESPERADO:
# Sistema arrancado exitosamente
# Starting development server at http://127.0.0.1:8000/
```

---

### 2. Pruebas de Host Header Validation (Fix 1.4)

#### Test 2.1: Request con Host válido
```bash
curl -H "Host: localhost:8000" http://localhost:8000/api/health/

# RESULTADO ESPERADO: 200 OK
```

#### Test 2.2: Request con Host inválido
```bash
curl -H "Host: evil.com" http://localhost:8000/api/health/

# RESULTADO ESPERADO: 400 Bad Request o 403 Forbidden
```

#### Test 2.3: Logs de seguridad
```bash
# Revisar logs del backend después del test 2.2
# Debe aparecer:
# WARNING django.security: Disallowed Host header: evil.com
```

---

### 3. Pruebas de httpOnly Cookies (Fix 1.2)

#### Test 3.1: Login establece cookies
```
1. Abrir DevTools → Application → Cookies → http://localhost:8000
2. Navegar a /signin
3. Iniciar sesión con credenciales válidas
4. Verificar cookies:

RESULTADO ESPERADO:
✓ access_token: [valor, httponly, secure=false en dev]
✓ refresh_token: [valor, httponly, secure=false en dev, path=/api/token/refresh/]
```

#### Test 3.2: Cookies inaccesibles desde JavaScript
```javascript
// En consola del navegador:
document.cookie

// RESULTADO ESPERADO:
// "" (vacío) o cookies de sesión Django, PERO NO access_token/refresh_token
```

#### Test 3.3: Tokens NO en localStorage
```javascript
// En consola del navegador:
localStorage.getItem('auth_token')
localStorage.getItem('refresh_token')

// RESULTADO ESPERADO: null (ambos)
```

#### Test 3.4: Refresh token automático
```
1. Iniciar sesión
2. Esperar 20 minutos (o cambiar tiempo en JWT_ACCESS_MINUTES)
3. Hacer cualquier petición al backend
4. Verificar en DevTools → Network → /api/token/refresh/

RESULTADO ESPERADO:
✓ Status: 200 OK
✓ Nuevas cookies set-cookie en response headers
✓ Auth se mantiene sin redirigir a login
```

#### Test 3.5: Logout limpia cookies
```
1. Iniciar sesión
2. Verificar cookies existen (Test 3.1)
3. Hacer logout
4. Verificar cookies en DevTools

RESULTADO ESPERADO:
✓ access_token: eliminada o expirada
✓ refresh_token: eliminada o expirada
✓ Redirección a /signin
```

---

### 4. Pruebas de Autenticación (Frontend + Backend)

#### Test 4.1: Flujo completo de login
```
1. Navegar a http://localhost:5173/signin
2. Ingresar credenciales válidas
3. Submit

RESULTADO ESPERADO:
✓ Login exitoso
✓ Redirección a /dashboard (admin) o /ordenes-tecnico (técnico)
✓ UserDropdown muestra nombre de usuario
✓ Sidebar muestra menú completo
```

#### Test 4.2: Login con credenciales inválidas
```
1. Navegar a /signin
2. Ingresar credenciales incorrectas
3. Submit

RESULTADO ESPERADO:
✓ Error: "Credenciales inválidas"
✓ Permanece en /signin
✓ No se establecen cookies
```

#### Test 4.3: Navegación sin autenticación
```
1. Asegurar logout (limpiar cookies)
2. Navegar a /dashboard

RESULTADO ESPERADO:
✓ Redirección automática a /signin
✓ Mensaje: "Debe iniciar sesión para acceder"
```

#### Test 4.4: 401 handler automático
```
1. Iniciar sesión
2. En DevTools → Application → Cookies, eliminar access_token manualmente
3. Hacer cualquier petición al backend (ej. navegar a otra página)

RESULTADO ESPERADO:
✓ Detecta 401
✓ Limpia sesión
✓ Redirige a /signin automáticamente
```

---

### 5. Pruebas de Autorización (Permisos)

#### Test 5.1: Admin accede a todas las páginas
```
1. Login como admin (is_staff=True)
2. Navegar a:
   - /dashboard
   - /usuarios
   - /cotizacion
   - /clientes

RESULTADO ESPERADO:
✓ Acceso permitido a todas
✓ Sin errores 403
```

#### Test 5.2: Técnico con permisos limitados
```
1. Login como técnico (is_staff=False)
2. Navegar a:
   - /ordenes-tecnico
   - /dashboard (debe mostrar TechnicianDashboard)
   - /usuarios (debe redirigir o mostrar error)

RESULTADO ESPERADO:
✓ /ordenes-tecnico: Acceso permitido
✓ /dashboard: Muestra TechnicianDashboard (no Home admin)
✓ /usuarios: Redirige o muestra "Sin permiso"
```

---

### 6. Pruebas de Seguridad XSS

#### Test 6.1: XSS no puede robar tokens
```javascript
// Simular ataque XSS
// En consola del navegador:
const script = document.createElement('script');
script.textContent = `
  console.log('Cookies:', document.cookie);
  console.log('localStorage auth_token:', localStorage.getItem('auth_token'));
`;
document.body.appendChild(script);

// RESULTADO ESPERADO:
// Cookies: "" (vacío o sin tokens)
// localStorage auth_token: null
// ✓ Tokens NO expuestos a XSS
```

---

### 7. Pruebas de Multi-Tenant

#### Test 7.1: Usuario de tenant A no accede a tenant B
```
1. Configurar 2 tenants (empresa1, empresa2)
2. Crear usuario en empresa1
3. Login desde empresa1.localtest.me:8000
4. Intentar acceder a empresa2.localtest.me:8000

RESULTADO ESPERADO:
✓ Usuario NO puede acceder a empresa2
✓ Error 401 o "Usuario no pertenece a esta empresa"
```

#### Test 7.2: Superadmin accede a todos los tenants
```
1. Login como superadmin (platform_role=SUPERADMIN)
2. Acceder a tenant1.localtest.me:8000
3. Acceder a tenant2.localtest.me:8000

RESULTADO ESPERADO:
✓ Superadmin puede acceder a ambos tenants
✓ Sin restricciones de tenant membership
```

---

## 📊 Métricas de Éxito

| Prueba | Estado | Notas |
|--------|--------|-------|
| SECRET_KEY requerido | ⬜ Pendiente | |
| Host header validation | ⬜ Pendiente | |
| Cookies httpOnly | ⬜ Pendiente | |
| Tokens no en localStorage | ⬜ Pendiente | |
| Refresh automático | ⬜ Pendiente | |
| Logout limpia cookies | ⬜ Pendiente | |
| Login flujo completo | ⬜ Pendiente | |
| 401 handler automático | ⬜ Pendiente | |
| Permisos admin | ⬜ Pendiente | |
| Permisos técnico | ⬜ Pendiente | |
| XSS no roba tokens | ⬜ Pendiente | |
| Multi-tenant aislamiento | ⬜ Pendiente | |

---

## 🐛 Problemas Conocidos y Soluciones

### Problema: Cookies no se establecen en desarrollo
**Causa:** `secure=True` en development
**Solución:** Verificar `SESSION_COOKIE_SECURE=False` en development.py

### Problema: CORS error al hacer login
**Causa:** Frontend no envía `credentials: 'include'`
**Solución:** Verificar todos los fetch incluyen `credentials: 'include'`

### Problema: 401 después de refresh
**Causa:** Refresh token expiró (7 días)
**Solución:** Hacer login nuevamente

### Problema: Host header rejection en desarrollo
**Causa:** `ALLOWED_HOSTS` no incluye tu hostname
**Solución:** Agregar hostname a `ALLOWED_HOSTS` en .env

---

## 📝 Reporte de Pruebas

Después de completar las pruebas, documentar:

```markdown
## Fecha: [YYYY-MM-DD]
## Tester: [Nombre]

### Resultados:
- SECRET_KEY: ✅/❌
- Host Validation: ✅/❌
- httpOnly Cookies: ✅/❌
- Auth Flow: ✅/❌
- Permisos: ✅/❌
- XSS Protection: ✅/❌
- Multi-Tenant: ✅/❌

### Issues Encontrados:
1. [Descripción]
2. [Descripción]

### Observaciones:
- [Nota 1]
- [Nota 2]
```

---

## ✅ Criterios de Aceptación

Para considerar los fixes como **completados**, todas las pruebas deben pasar:

- [ ] 12/12 tests principales aprobados
- [ ] 0 vulnerabilidades críticas remaining
- [ ] 0 regressions en funcionalidad existente
- [ ] Documentación actualizada
- [ ] Equipo capacitado en nuevos flujos
