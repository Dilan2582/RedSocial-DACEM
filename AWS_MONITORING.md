# 📊 Cómo Ver el Uso de AWS Rekognition

## 🎯 Límites de Capa Gratuita

AWS Rekognition ofrece **Capa Gratuita** durante los **primeros 12 meses**:

- ✅ **5,000 imágenes/mes** - Análisis gratuito
- ✅ **1,000 minutos/mes** - Video gratuito (no lo usamos)

### Después de la capa gratuita:
- 💰 **$1.00 por 1,000 imágenes** analizadas

---

## 📈 Ver Uso en AWS Console

### Opción 1: AWS Cost Explorer (Recomendado)

1. **Ir a**: https://console.aws.amazon.com/cost-management/home
2. **Click en**: "Cost Explorer" en el menú lateral
3. **Seleccionar**: 
   - Time range: "Last 6 months" o "Month to date"
   - Granularity: "Monthly" o "Daily"
4. **Filtrar por servicio**:
   - Click "Add filter"
   - Service → **"Amazon Rekognition"**
5. **Ver gráfico**: Muestra costos por día/mes

### Opción 2: Billing Dashboard

1. **Ir a**: https://console.aws.amazon.com/billing/home
2. **Click en**: "Bills" en el menú lateral
3. **Buscar**: "Amazon Rekognition" en la lista
4. **Expandir**: Ver detalles de uso:
   - `DetectLabels` - Cuántas veces se llamó
   - `DetectModerationLabels` - Moderación de contenido
   - `DetectFaces` - Análisis facial
   - `DetectText` - Si se usa OCR (no lo usamos)

### Opción 3: CloudWatch Metrics

1. **Ir a**: https://console.aws.amazon.com/cloudwatch/
2. **Click en**: "Metrics" → "All metrics"
3. **Buscar**: "Rekognition"
4. **Ver métricas**:
   - `UserErrorCount` - Errores en tus requests
   - `SuccessfulRequestCount` - Requests exitosos
   - `ThrottledCount` - Si te limitaron por rate limit

---

## 🔧 Configuración Optimizada (`.env`)

### Modo COMPLETO (Inteligente - Recomendado para capa gratuita)
```env
REKOGNITION_ENABLED=true
REKOGNITION_MODE=full
```

**Comportamiento:**
1. ✅ Siempre: DetectLabels (tags) - **1 llamada**
2. ✅ Siempre: DetectModerationLabels (NSFW) - **1 llamada**
3. ✅ **Solo si detecta "Person"**: DetectFaces - **1 llamada** (condicional)

**Costo por imagen:**
- Sin personas: **2 llamadas** ($0.002)
- Con personas: **3 llamadas** ($0.003)

---

### Modo LITE (Súper económico)
```env
REKOGNITION_ENABLED=true
REKOGNITION_MODE=lite
```

**Comportamiento:**
- ✅ Solo: DetectLabels básico - **1 llamada**
- ❌ Sin moderación NSFW
- ❌ Sin análisis facial

**Costo por imagen:** **1 llamada** ($0.001)

---

### Desactivado (Sin costos)
```env
REKOGNITION_ENABLED=false
```

**Comportamiento:**
- ❌ No se analiza nada
- Posts se crean sin tags/nsfw/faceCount

**Costo:** **$0.00**

---

## 📊 Estimaciones de Uso

### Ejemplo: 1,000 posts al mes

| Modo | Llamadas | Costo Mensual | Notas |
|------|----------|---------------|-------|
| **Full (inteligente)** | ~2,500 | **GRATIS** | 50% sin personas = 2 llamadas<br>50% con personas = 3 llamadas |
| **Lite** | 1,000 | **GRATIS** | Solo tags básicos |
| **Off** | 0 | **$0.00** | Sin análisis |

### Si excedes 5,000 imágenes/mes:

| Imágenes | Modo Full | Modo Lite |
|----------|-----------|-----------|
| 5,000 | **GRATIS** | **GRATIS** |
| 10,000 | $12.50 | $5.00 |
| 20,000 | $37.50 | $15.00 |
| 50,000 | $112.50 | $45.00 |

---

## 🚨 Alertas de Costos (Configurar ahora)

### 1. Crear Alerta de Billing

1. **Ir a**: https://console.aws.amazon.com/billing/home#/preferences
2. **Activar**: "Receive Billing Alerts"
3. **Guardar**

### 2. Crear Alarma en CloudWatch

1. **Ir a**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
2. **Click**: "Create alarm"
3. **Select metric**: "Billing" → "Total Estimated Charge"
4. **Threshold**: 
   - `Static` > `$5` (o lo que quieras)
5. **Notification**:
   - Create new topic
   - Email: tu-email@ejemplo.com
6. **Name**: "Billing Alert - $5"
7. **Create alarm**
8. **Confirmar email** que llegará a tu correo

### 3. Alerta específica para Rekognition

1. **Ir a**: https://console.aws.amazon.com/billing/home#/budgets
2. **Click**: "Create budget"
3. **Budget type**: "Cost budget"
4. **Set budget amount**: $10/mes
5. **Filter by service**: Amazon Rekognition
6. **Add alert**: 
   - 80% del presupuesto ($8)
   - 100% del presupuesto ($10)
7. **Email recipients**: tu-email@ejemplo.com

---

## 📱 Monitoreo en Tiempo Real (Logs)

Cada vez que se analiza una imagen, verás en el servidor:

```bash
🔍 [Rekognition] Iniciando análisis...
   ✅ Labels: 8 tags detectados
   ✅ Moderación: Seguro
   🔍 Detectadas personas, analizando rostros...
   ✅ Caras: 2 rostro(s) encontrado(s)
```

O si no hay personas:

```bash
🔍 [Rekognition] Iniciando análisis...
   ✅ Labels: 5 tags detectados
   ✅ Moderación: Seguro
   ⏭️  Sin personas detectadas, saltando análisis facial (ahorro 1 llamada)
```

---

## 🎯 Recomendación para tu Proyecto

### Para desarrollo/pruebas:
```env
REKOGNITION_ENABLED=true
REKOGNITION_MODE=full
```
✅ Funcionalidad completa
✅ Optimizado (solo analiza caras si detecta personas)
✅ 5,000 imágenes/mes GRATIS

### Para producción (muchos usuarios):
```env
REKOGNITION_ENABLED=true
REKOGNITION_MODE=lite
```
✅ Más económico
✅ Tags suficientes para búsquedas
✅ 5,000 imágenes/mes GRATIS

### Si excedes límites:
```env
REKOGNITION_ENABLED=false
```
❌ Desactiva temporalmente
💰 Cero costos

---

## 📧 Links Útiles

- **Billing Dashboard**: https://console.aws.amazon.com/billing/home
- **Cost Explorer**: https://console.aws.amazon.com/cost-management/home
- **Rekognition Pricing**: https://aws.amazon.com/rekognition/pricing/
- **Free Tier**: https://aws.amazon.com/free/

---

## 💡 Tip: Ver último mes de uso

```bash
# Instalar AWS CLI
aws rekognition get-service-metrics --region us-east-1

# O ver billing desde CLI
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --group-by Type=SERVICE \
  --filter file://filter.json
```

Donde `filter.json`:
```json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Rekognition"]
  }
}
```

---

✨ **Con la optimización actual, cada imagen SIN personas = 2 llamadas, CON personas = 3 llamadas**
