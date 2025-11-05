# ⚠️ SEGURIDAD: Credenciales Comprometidas

## 🚨 ACCIÓN URGENTE REQUERIDA

Tus credenciales de AWS fueron subidas a GitHub (ahora públicas). Debes:

### 1. Revocar Access Keys de AWS INMEDIATAMENTE

```
1. Ve a: https://console.aws.amazon.com/iam/
2. Selecciona: Users → redsocial-app
3. Haz clic en: "Security credentials"
4. Encuentra: AKIATIXDNS6YDLYVRD74
5. Haz clic en: Delete
6. Confirma
```

### 2. Crear nuevas credenciales

```
1. En AWS Console → IAM → Users → redsocial-app
2. Haz clic en: "Create access key"
3. Copia el Access Key ID (nuevo)
4. Copia el Secret Access Key (nuevo)
5. Pega en tu .env local (NO en GitHub)
```

### 3. Limpiar historial de Git

Para eliminar .env del historio de git:

```bash
# Opción 1: Usar BFG (más fácil)
bfg --delete-files .env

# Opción 2: Usar git filter-branch (más seguro)
git filter-branch --tree-filter 'rm -f .env' --prune-empty HEAD

# Después:
git push origin --force
```

### 4. Verificar que .env no esté en seguimiento

```bash
git rm --cached .env
git status
# No debe mostrar .env
```

---

## 📋 Checklist de Seguridad

- [ ] Revocar Access Key viejo en AWS
- [ ] Crear nuevas credenciales en AWS
- [ ] Actualizar .env local con nuevas credenciales
- [ ] Limpiar historio de git
- [ ] Hacer git push --force
- [ ] Verificar que .env no aparece en GitHub

---

## 🔐 Mejores Prácticas

### NUNCA hacer esto:
```
❌ Subir .env a GitHub
❌ Subir AWS credentials en código
❌ Subir API keys en public repos
❌ Hacer commit de secrets
```

### SIEMPRE hacer esto:
```
✅ Agregar .env al .gitignore
✅ Usar .env.example como template
✅ Guardar secrets en Variables de Entorno
✅ Usar AWS Secrets Manager / Parameter Store
✅ Rotar credenciales regularmente
```

---

## 💡 Alternativas Seguras

### Opción 1: Usar AWS IAM Roles (MEJOR)
- Si usas EC2 o Lambda, usa IAM Roles en lugar de Access Keys
- Las credenciales se rotan automáticamente

### Opción 2: AWS Secrets Manager
```bash
aws secretsmanager create-secret --name dacem/aws-keys \
  --secret-string '{"accessKeyId":"...","secretAccessKey":"..."}'
```

### Opción 3: GitHub Secrets (para CI/CD)
```yaml
# .github/workflows/deploy.yml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 📞 Contacto GitHub

Si lo público contiene datos sensibles, también puedes:
1. Ir a: https://github.com/Dilan2582/RedSocial-DACEM/security
2. Usar "Report security vulnerability"
3. GitHub puede ayudarte a remover datos sensibles del historio público

---

## ✅ Una vez hecho esto, puedes hacer push normalmente:

```bash
git push origin r-Develop
```

Sin embargo, el commit bloqueado probablemente requiera bypass. Vé a:
https://github.com/Dilan2582/RedSocial-DACEM/security/secret-scanning/unblock-secret/352Wjz4xfxirL435uirNFDOEYb1
