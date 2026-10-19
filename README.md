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
├── post/, post-stg/       # destino de los enlaces "Compartir" de un post (prod / staging)
├── negocio/, negocio-stg/ # destino de los enlaces "Compartir" de un negocio (prod / staging)
├── .well-known/assetlinks.json  # Android App Links: deja que la app abra /post/, /negocio/ y sus versiones -stg
├── 404.html
├── robots.txt             # excluye /recuperar/, /post/, /negocio/ (y sus -stg) y apunta al sitemap
├── sitemap.xml            # las 4 páginas indexables — añadir aquí cualquier página nueva
└── assets/                # styles.css, recuperar.js, icono.png, logo.png, og.png (imagen al compartir)
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

## Pendientes

- **Páginas legales**: `privacidad/`, `terminos/` y `eliminar-cuenta/` son
  borradores; hacerlos revisar por un abogado. El NIT que figura en
  `privacidad/` (`0000000000`) es provisional: reemplazarlo por el NIT real
  de Poliskopia S.A.S.
- **Botones de descarga**: hoy dicen "Próximamente". Cuando la app esté
  publicada, convertir cada `<li class="store">` de `index.html` en un enlace
  a la tienda.
- **Google Search Console**: el sitio ya tiene los metadatos SEO, el
  `sitemap.xml` y el `robots.txt`, pero Google no lo indexará pronto si no se
  registra:
  1. En [Search Console](https://search.google.com/search-console), añadir
     `hermeskopio.com` como propiedad de tipo **"Dominio"**.
  2. Verificarla con el registro `TXT` que entrega Google, en el DNS del
     registrador. Es un registro adicional: no reemplaza los TXT de correo
     (SPF/DMARC) que ya existen.
  3. En "Sitemaps", enviar `https://hermeskopio.com/sitemap.xml`.
  4. En "Inspección de URLs", pegar `https://hermeskopio.com/` y pulsar
     "Solicitar indexación".

  La indexación suele tardar de unos días a un par de semanas. Conviene
  validar además la página principal en la "Prueba de resultados
  enriquecidos" de Google, porque los datos estructurados (JSON-LD) no se han
  pasado por ninguna herramienta de validación de Google.

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

## Enlaces de posts y negocios (`/post/`, `/negocio/` y sus `-stg`) y App Links

La app comparte un post como `https://hermeskopio.com/post/?id=<postId>`
(staging: `/post-stg/`). En Android, cada flavor declara un `intent-filter`
con `autoVerify` para su propia ruta, y Android lo verifica contra
`.well-known/assetlinks.json`: si el paquete y la huella SHA-256 de su firma
coinciden, el enlace abre la app directamente y estas páginas no se ven. La
app decide adónde llevarlo: al post si sigue vigente, al perfil del negocio si
ya caducó.

Un negocio se comparte igual, como `https://hermeskopio.com/negocio/?id=<negocioId>`
(staging: `/negocio-stg/`), y abre su perfil; si fue eliminado o bloqueado, la
app lleva al inicio con un aviso. `assetlinks.json` verifica el dominio, no la
ruta, así que no cambió al añadir estas páginas.

Las páginas solo se ven cuando la app no está instalada (o la verificación
falló). No tienen JavaScript ni leen el `id`: la API de Supabase no responde
sin sesión, así que no pueden mostrar el post ni el negocio.

Huellas en `assetlinks.json`:

- `com.hermeskopio.hermeskopio.stg`: el `debug.keystore` versionado en el repo
  de la app (`android/app/debug.keystore`), con el que se firma staging.
- `com.hermeskopio.hermeskopio.prod`: la clave de subida (`android/key.properties`).
  **Cuando la app se publique en Play con "Firma de apps de Google Play"**,
  hay que añadir también la huella de la clave de firma de la app (Play
  Console → Configuración → Integridad de la app); sin ella, las instalaciones
  desde Play no abren los enlaces.

Para comprobarlo en un teléfono:
`adb shell pm get-app-links com.hermeskopio.hermeskopio.prod`.

