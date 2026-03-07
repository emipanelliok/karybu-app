const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const SHEET_ID = '1HNwZQONNZwgCMOIa9Y-TKEOyTRksd6U4eZ4CyMX-icU';

// Obtener credenciales de variables de entorno
const getCredentials = () => {
    try {
        // Si está en Vercel, las credenciales vienen como string JSON en una variable de entorno
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        }
        // Si no, intentar usar el archivo local (para desarrollo local)
        return require('./credentials.json');
    } catch (error) {
        console.error('No se encontraron credenciales de Google:', error.message);
        return null;
    }
};

// Función para obtener el doc de Google Sheets
async function getDoc() {
    const credentials = getCredentials();
    const doc = new GoogleSpreadsheet(SHEET_ID);
    
    if (credentials) {
        // Usar autenticación con Service Account
        const jwt = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });
        
        doc.useServiceAccountAuth(jwt);
    }
    
    await doc.loadInfo();
    return doc;
}

// ========== STOCK - Leer de la hoja Stock ==========
// Estructura: A=Código, B=Cantidad, C=Material, D=Detalle, E=Costo unitario, F=Precio de venta
app.get('/api/stock', async (req, res) => {
    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByTitle['Stock'];
        
        if (!sheet) {
            return res.status(404).json({ error: 'Hoja "Stock" no encontrada' });
        }
        
        const rows = await sheet.getRows();
        const stock = rows.map(row => ({
            codigo: row.get('Código') || '',
            cantidad: parseInt(row.get('Cantidad')) || 0,
            material: row.get('Material') || '',
            detalle: row.get('Detalle') || '',
            minimo: 5 // valor por defecto
        }));
        
        res.json(stock);
    } catch (error) {
        console.error('Error obteniendo stock:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== PRECIOS - Leer de la hoja Stock ==========
app.get('/api/precios', async (req, res) => {
    try {
        const doc = await getDoc();
        const sheet = doc.sheetsByTitle['Stock'];
        
        if (!sheet) {
            return res.status(404).json({ error: 'Hoja "Stock" no encontrada' });
        }
        
        const rows = await sheet.getRows();
        const precios = rows.map(row => {
            const costoUnitario = parseFloat(row.get('Costo unitario')) || 0;
            const precioVenta = parseFloat(row.get('Precio de venta')) || 0;
            const margen = costoUnitario > 0 ? ((precioVenta - costoUnitario) / costoUnitario * 100).toFixed(1) : 0;
            
            return {
                codigo: row.get('Código') || '',
                detalle: row.get('Detalle') || '',
                costoUnitario: costoUnitario,
                precioVenta: precioVenta,
                margen: margen
            };
        });
        
        res.json(precios);
    } catch (error) {
        console.error('Error obteniendo precios:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== VENTAS - Crear hoja aparte para registrar ventas ==========
app.get('/api/ventas', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Ventas'];
        
        if (!sheet) {
            // Si no existe, crearla con los headers correctos
            sheet = await doc.addSheet({ title: 'Ventas' });
            await sheet.setHeaderRow(['Código', 'Detalle', 'Cantidad', 'Precio Unitario', 'Total', 'Cliente', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const ventas = rows.map(row => ({
            codigo: row.get('Código') || '',
            detalle: row.get('Detalle') || '',
            cantidad: parseFloat(row.get('Cantidad')) || 0,
            precioUnitario: parseFloat(row.get('Precio Unitario')) || 0,
            total: parseFloat(row.get('Total')) || 0,
            cliente: row.get('Cliente') || '',
            fecha: row.get('Fecha') || ''
        }));
        
        res.json(ventas);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { codigo, detalle, cantidad, precioUnitario, cliente } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Ventas'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Ventas' });
            await sheet.setHeaderRow(['Código', 'Detalle', 'Cantidad', 'Precio Unitario', 'Total', 'Cliente', 'Fecha']);
        }
        
        const total = cantidad * precioUnitario;
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Código': codigo,
            'Detalle': detalle,
            'Cantidad': cantidad,
            'Precio Unitario': precioUnitario,
            'Total': total,
            'Cliente': cliente || '',
            'Fecha': fecha
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== COMPRAS - Crear hoja aparte para registrar compras ==========
app.get('/api/compras', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Compras'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Compras' });
            await sheet.setHeaderRow(['Código', 'Material', 'Cantidad', 'Costo Unitario', 'Total', 'Proveedor', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const compras = rows.map(row => ({
            codigo: row.get('Código') || '',
            material: row.get('Material') || '',
            cantidad: parseFloat(row.get('Cantidad')) || 0,
            costoUnitario: parseFloat(row.get('Costo Unitario')) || 0,
            total: parseFloat(row.get('Total')) || 0,
            proveedor: row.get('Proveedor') || '',
            fecha: row.get('Fecha') || ''
        }));
        
        res.json(compras);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compras', async (req, res) => {
    try {
        const { codigo, material, cantidad, costoUnitario, proveedor } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Compras'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Compras' });
            await sheet.setHeaderRow(['Código', 'Material', 'Cantidad', 'Costo Unitario', 'Total', 'Proveedor', 'Fecha']);
        }
        
        const total = cantidad * costoUnitario;
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Código': codigo,
            'Material': material,
            'Cantidad': cantidad,
            'Costo Unitario': costoUnitario,
            'Total': total,
            'Proveedor': proveedor || '',
            'Fecha': fecha
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
