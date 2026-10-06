# Landing de hermeskopio.com

Sitio estático (HTML/CSS plano, sin build ni dependencias) que se publica en
`https://hermeskopio.com` con GitHub Pages. Vive en esta carpeta, gitignoreada
en el repo de la app, con **repositorio y CI propios** — mismo esquema que
`.panel_admon/`.

## Estructura

```
site/                      # lo único que se publica
├── index.html             # página principal
├── privacidad/            # política de privacidad (borrador)
├── terminos/              # términos y condiciones (borrador)
├── eliminar-cuenta/       # instrucciones de borrado de cuenta (borrador)
├── recuperar/             # puente del link de recuperación de contraseña
├── 404.html
├── robots.txt
└── assets/                # styles.css, recuperar.js, icono.png, logo.png
.github/workflows/deploy.yml
```

`assets/icono.png` y `assets/logo.png` son copias de `assets/icons/app_icon.png`
y `assets/images/splash_logo.png` del repo de la app.

## Ver en local

```bash
python3 -m http.server 8080 -d site
# http://localhost:8080
```

Hace falta un servidor (no abrir los `.html` con `file://`): todas las rutas
son absolutas (`/assets/...`), porque el sitio se sirve desde la raíz del
dominio.

## Desplegar en GitHub Pages

1. Crear un repositorio en GitHub y subir el contenido de esta carpeta a `main`.
2. Settings → Pages → Build and deployment → Source: **"GitHub Actions"**.
3. Settings → Pages → Custom domain: `hermeskopio.com`, y marcar
   **"Enforce HTTPS"** cuando GitHub termine de emitir el certificado.
4. En el DNS del dominio, añadir (sin tocar los registros MX/TXT de correo):
   - 4 registros `A` en `@`: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - 1 registro `CNAME` en `www` → `<usuario>.github.io`
5. Cada push a `main` publica `site/` tal cual.

Las IPs son las que documenta GitHub para dominios apex — confirmarlas en la
documentación de GitHub Pages al configurarlo.

## Pendientes antes de publicar

- **Páginas legales**: `privacidad/`, `terminos/` y `eliminar-cuenta/` son
  borradores. Completar los marcadores `[NOMBRE DEL RESPONSABLE]`,
  `[NIT O CÉDULA]` y `[CIUDAD]`, y hacerlos revisar por un abogado.
- **Botones de descarga**: hoy dicen "Próximamente". Cuando la app esté
  publicada, convertir cada `<li class="store">` de `index.html` en un enlace
  a la tienda.

## Página de recuperación (`/recuperar/`)

Sirve para que el link del correo de "olvidé mi contraseña" apunte a
`hermeskopio.com` (el mismo dominio del remitente) en vez de a
`<project-ref>.supabase.co`. La página muestra un botón "Continuar" que lleva
al endpoint de verificación de Supabase Auth, y desde ahí el flujo sigue igual
que con el link directo.

### Activarla

En el dashboard de Supabase (Authentication → Emails → Templates → "Reset
Password"), reemplazar `{{ .ConfirmationURL }}` en el enlace por:

- **prod**: `https://hermeskopio.com/recuperar/?token={{ .TokenHash }}&redirect_to={{ .RedirectTo }}`
- **staging**: `https://hermeskopio.com/recuperar/?env=stg&token={{ .TokenHash }}&redirect_to={{ .RedirectTo }}`

Probar primero en staging el flujo completo (pedir recuperación → abrir el
correo → "Continuar" → la app abre la pantalla de nueva contraseña) antes de
cambiar la plantilla de prod. Si algo falla, volver a `{{ .ConfirmationURL }}`
restaura el comportamiento anterior sin tocar este sitio.

### Reglas de seguridad — no romperlas

El token de recuperación pasa por esta página, así que quien controle lo que
se ejecuta en ella puede tomar cuentas.

- **Nada de terceros en este sitio**: ni analítica, ni fuentes externas, ni
  widgets. Cada página lleva una Content-Security-Policy que solo permite
  recursos del propio dominio; no relajarla.
- **El host de Supabase es fijo** (lista `ENVS` en `assets/recuperar.js`).
  Nunca leerlo de la URL: convertiría la página en un open redirect.
- **`redirect_to` solo se reenvía si coincide con un deep link conocido** del
  ambiente. Si se añade un esquema nuevo (p. ej. al separar iOS por ambiente),
  agregarlo a `ENVS`.
- **No escribir parámetros de la URL en el HTML.**
- **La redirección requiere un clic**, para que los escáneres de correo no
  consuman el token de un solo uso.
- **2FA** en la cuenta de GitHub que publica el sitio y en el registrador del
  dominio.

GitHub Pages no permite cabeceras HTTP propias, por eso la CSP y la política
de referrer van como etiquetas `<meta>`. Lo único que eso no cubre es
`frame-ancestors`; `recuperar.js` lo compensa negándose a habilitar el botón
si la página está dentro de un iframe.
