# 🎨 Karybu Accesorios - Gestor de Ventas

App web para gestionar ventas, compras, stock y precios de bijouterie. Los datos se guardan en Google Sheets en tiempo real.

## 📋 Características

✅ **Ventas** - Registra cada venta con producto, cantidad, precio y cliente  
✅ **Compras** - Anota materiales y accesorios que comprás  
✅ **Stock** - Controla cantidad de artículos con alertas  
✅ **Precios** - Administra costos y precios de venta  
✅ **Sincronización** - Los datos se guardan en Google Sheets automáticamente  
✅ **Mobile-friendly** - Funciona perfecto en iPhone y Android  

## 🚀 Cómo desplegar en Vercel

### 1. **Preparar el repositorio en GitHub**

```bash
# Clonar o descargar este proyecto
git clone <tu-repo>
cd karybu-vercel

# Agregar los cambios
git add .
git commit -m "Inicial commit - Karybu app"
git push origin main
```

### 2. **Crear proyecto en Vercel**

- Entra a [vercel.com](https://vercel.com)
- Haz login con GitHub
- Click en "New Project"
- Selecciona tu repositorio `karybu-vercel`
- Click en "Deploy"

### 3. **¡Listo!**

Vercel te va a dar una URL como:
```
https://karybu-app.vercel.app
```

Esa es tu app. La podes abrir desde cualquier navegador en el celular.

## 📊 Cómo funciona

La app se conecta a tu Google Sheet automáticamente:
- Cuando registras una venta, se guarda en la hoja "Ventas"
- Las compras van a la hoja "Compras"
- El stock en la hoja "Stock"
- Los precios en la hoja "Precios"

**Google Sheet ID:** `1HNwZQONNZwgCMOIa9Y-TKEOyTRksd6U4eZ4CyMX-icU`

## 🔧 Requisitos

- Node.js 14+
- Cuenta en Vercel (gratis)
- Cuenta en GitHub (gratis)

## 💡 Tips

- Los datos se sincronizan automáticamente con Google Sheets
- Podes compartir el sheet con tu novio para que vea las ventas
- La app funciona en iPhone, Android, tablets, etc.

---

**¿Problemas?** Contacta al desarrollador para soporte.
