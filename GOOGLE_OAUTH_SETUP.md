# Guía: Resolver Error Google OAuth 403

## Problema
```
Error: "The given origin is not allowed for the given client ID"
```

## Solución: Autorizar Orígenes en Google Cloud Console

### Paso 1: Acceder a Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto de DACEM
3. Busca "OAuth 2.0 Client IDs" o "Credenciales"

### Paso 2: Editar el Cliente OAuth
1. Encuentra el cliente con ID: `661877365139-mhu54lv2ng3hngf6b5be3merjiuba4b7.apps.googleusercontent.com`
2. Haz clic en él para editar
3. Busca la sección "Orígenes autorizados" (Authorized JavaScript origins)

### Paso 3: Agregar los Orígenes
Agrega **AMBOS** orígenes:

```
http://localhost:3900
https://redsocial-dacem-production.up.railway.app
```

**Importante:** 
- Sin `/` al final
- Sin rutas ni paths
- Incluye `http://` o `https://` según corresponda

### Paso 4: Guardar Cambios
1. Haz clic en "Guardar"
2. Espera 1-2 minutos a que los cambios se propaguen
3. Limpia el cache del navegador (Ctrl+Shift+Del)
4. Recarga la página de login

## Verificación

### En localhost (desarrollo):
```bash
npm run dev
# Accede a http://localhost:3900
# El botón Google Sign-In debe funcionar sin error 403
```

### En Railway (producción):
```
https://redsocial-dacem-production.up.railway.app
# El botón Google Sign-In debe funcionar sin error 403
```

## Nota Adicional

Si necesitas agregar más orígenes en el futuro (ej: otro puerto de desarrollo):
- Abre nuevamente la configuración del cliente OAuth
- Agrega el nuevo origen a la lista
- Guarda

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Aún aparece 403 después de agregar origen | Limpia cache del navegador y cierra navegador completamente |
| Origen no aparece en la lista | Verifica que hayas clickeado el cliente correcto |
| No encuentro las credenciales | Asegúrate de estar en el proyecto correcto en Google Cloud Console |

