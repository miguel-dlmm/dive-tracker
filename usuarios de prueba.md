# Usuarios de prueba

Generados con `scripts/create-demo-user.js` el 2026-08-26. Cada enlace es de
un solo uso (tipo `recovery`) y lleva a `CreatePasswordScreen` para fijar
contraseña + aceptar los documentos legales.

**Validez del enlace: 24 horas (86400 s) desde su generación** — ajustado el
26/08/2026 en Authentication → Email → "Email OTP Expiration" del dashboard
de Supabase (antes eran 3600 s / 1h, el valor por defecto). Como la
comprobación se hace contra el valor de configuración vigente en el momento
de abrir el enlace (no el que había al generarlo), el cambio se aplicó de
forma retroactiva a los 6 enlaces de abajo. Si algún enlace caduca, se
regenera desde "Olvidé mi contraseña" en el login, o volviendo a ejecutar el
script para ese usuario.

## hugo
- UUID: `64e0b2a3-c569-418d-8dfa-56cb77c05419`
- Email: hugo@hugo.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=3be353ef46886a343ebabda1c40f26e3c2df33b350bb4085b44694b2&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app

## alba
- UUID: `8c0aee6d-4469-4ad3-ac8e-1ef48cc3f773`
- Email: alba@alba.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=04d061dd792cfe1a5055a2ed49892588e02540b31453d6e4a151fcc8&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app

## miguel
- UUID: `7154407d-a816-4f61-b112-523f43ba2c03`
- Email: miguel@miguel.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=6aad50840ece1427079c92770c57f94c81c87e92eb6f78e66bf3347a&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app

## cristina
- UUID: `d9a12eb1-928c-4e02-9511-8a1f7c76aa10`
- Email: cristina@cristina.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=7f23a3eba9304ce664d520b8b25a178c204923deca1c336c1d144a7e&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app

## david
- UUID: `c9cc782a-2387-4e42-b97e-690ed60efbd7`
- Email: david@david.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=3f291678427a2d6f508d008b7d1610f9597464dcff4169c38727ff27&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app

## ander
- UUID: `bdb163a3-0799-4304-873b-0b9a57b9e549`
- Email: ander@ander.com
- Enlace: https://musvtbzcyxwqvndmclyu.supabase.co/auth/v1/verify?token=2bd9266a5d7c51c7787cdad1973a41db6b833e428a645a0551367878&type=recovery&redirect_to=https://dive-tracker-exgg.vercel.app
