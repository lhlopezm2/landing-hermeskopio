// Puente entre el link del correo de recuperación y el endpoint de
// verificación de Supabase Auth. Reglas de seguridad de este archivo (ver
// README.md, "Página de recuperación"):
//  - El host de Supabase sale SIEMPRE de la lista cerrada ENVS, nunca de la
//    URL (evita que la página sirva de open redirect).
//  - redirect_to solo se reenvía si coincide exactamente con uno de los
//    deep links conocidos del ambiente.
//  - Ningún parámetro se escribe en el HTML (evita XSS).
//  - La redirección solo ocurre tras un clic del usuario, para que los
//    escáneres de correo no consuman el token de un solo uso.
(function () {
  'use strict';

  var ENVS = {
    prod: {
      host: 'https://vvcbnrfudvdradakxdtr.supabase.co',
      redirects: [
        'hermeskopioprod://login-callback',
        'hermeskopio://login-callback',
      ],
    },
    stg: {
      host: 'https://hqbbhsqyvvdgzfgfqfes.supabase.co',
      redirects: [
        'hermeskopiostg://login-callback',
        'hermeskopio://login-callback',
      ],
    },
  };

  var TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

  var params = new URLSearchParams(window.location.search);
  var token = params.get('token') || '';
  var envKey = params.get('env') || 'prod';
  var redirectTo = params.get('redirect_to') || '';

  // Saca el token de la barra de direcciones y del historial del navegador.
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch (e) {
    // Sin soporte de History API: el flujo sigue funcionando igual.
  }

  var env = Object.prototype.hasOwnProperty.call(ENVS, envKey)
    ? ENVS[envKey]
    : null;
  // Si la página está embebida en un iframe ajeno, no se habilita el botón.
  var enMarco = window.top !== window.self;
  var valido = env !== null && TOKEN_PATTERN.test(token) && !enMarco;

  var ok = document.getElementById('estado-ok');
  var error = document.getElementById('estado-error');

  if (!valido) {
    error.hidden = false;
    return;
  }

  ok.hidden = false;
  document.getElementById('continuar').addEventListener('click', function () {
    var destino = new URL('/auth/v1/verify', env.host);
    destino.searchParams.set('token', token);
    destino.searchParams.set('type', 'recovery');
    if (env.redirects.indexOf(redirectTo) !== -1) {
      destino.searchParams.set('redirect_to', redirectTo);
    }
    window.location.assign(destino.toString());
  });
})();
