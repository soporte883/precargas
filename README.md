# Comparador inteligente · Precargas (Fundación Luker)

Aplicación web para comparar registros de archivos Excel/CSV con coincidencia
difusa (fuzzy matching), protegida por un sistema de **login con usuario y
contraseña** y base de datos **Vercel Postgres (Neon)**.

## Estructura del proyecto

```
├── public/
│   ├── index.html          # Página de login
│   ├── app.html            # Comparador (protegido por sesión)
│   └── xlsx.full.min.js    # Librería para leer Excel en el navegador
├── api/
│   ├── login.js            # Inicia sesión (verifica contraseña, crea cookie)
│   ├── logout.js           # Cierra sesión
│   └── me.js               # Devuelve el usuario de la sesión actual
├── lib/
│   └── auth.js             # Utilidades JWT y cookies
├── scripts/
│   └── seed.js             # Crea la tabla y los usuarios
├── middleware.js           # Protege /app.html si no hay sesión
├── vercel.json
├── .env.example
└── package.json
```

## Cómo funciona el login

1. El usuario entra en `/` (página de login) e ingresa usuario y contraseña.
2. `POST /api/login` verifica la contraseña contra la base de datos (cifrada con
   bcrypt) y, si es correcta, guarda un **token JWT en una cookie httpOnly**.
3. `middleware.js` protege `/app.html`: si no hay una cookie válida, redirige al
   login.
4. El botón **Salir** llama a `/api/logout`, que borra la cookie.

> Las contraseñas nunca se guardan en texto plano: se almacenan cifradas con
> bcrypt. No hay registro público; los usuarios se crean con `npm run seed`.

---

## Puesta en marcha

### 1. Subir el proyecto a GitHub

```powershell
git init
git add .
git commit -m "Comparador con login y base de datos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/precargas.git
git push -u origin main
```

> El archivo `.gitignore` ya evita subir `node_modules/` y los `.env` (secretos).

### 2. Crear el proyecto en Vercel

1. Entra a [vercel.com](https://vercel.com) e **importa** tu repositorio de GitHub.
2. Framework Preset: **Other** (no necesita build). Deja las opciones por defecto.
3. No hagas deploy todavía (o hazlo; luego lo redespliegas con la base de datos).

### 3. Crear la base de datos Postgres (Neon)

1. En tu proyecto de Vercel ve a **Storage → Create Database → Neon (Postgres)**.
2. Crea la base de datos y **conéctala** al proyecto. Vercel agregará
   automáticamente la variable `DATABASE_URL`.

### 4. Configurar el secreto de sesión

Genera una clave aleatoria:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

En Vercel: **Settings → Environment Variables** y agrega:

| Nombre       | Valor                          |
| ------------ | ------------------------------ |
| `JWT_SECRET` | (la cadena aleatoria generada) |

`DATABASE_URL` ya la agregó Vercel al conectar la base de datos Neon.

### 5. Crear los usuarios (seed)

En tu máquina local:

```powershell
npm install
vercel env pull .env      # descarga DATABASE_URL y JWT_SECRET a .env
```

> Si no usas la CLI de Vercel, crea un `.env` a partir de `.env.example` y pega
> la cadena `DATABASE_URL` desde el panel de Vercel (Storage → tu base Neon).

Edita la lista `USERS` en [`scripts/seed.js`](scripts/seed.js) con tus usuarios y
contraseñas, y ejecuta:

```powershell
npm run seed
```

Esto crea la tabla `users` y agrega los usuarios (cifrando las contraseñas).

### 6. Desplegar

Haz **Redeploy** en Vercel (o `git push`, que redespliega solo). Entra a la URL
de tu proyecto y usa el login con los usuarios que creaste.

---

## Desarrollo local

```powershell
npm install
npm i -g vercel        # una sola vez
vercel dev             # levanta la app + funciones en http://localhost:3000
```

`vercel dev` sirve tanto los archivos estáticos como las funciones de `/api` y el
middleware.

## Agregar o cambiar usuarios más adelante

Edita `scripts/seed.js` y vuelve a ejecutar `npm run seed`. Si el usuario ya
existe, se actualiza su contraseña (`ON CONFLICT DO UPDATE`).
