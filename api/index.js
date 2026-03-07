const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const SHEET_ID = '1HNwZQONNZwgCMOIa9Y-TKEOyTRksd6U4eZ4CyMX-icU';

// Obtener credenciales de variables de entorno
const getCredentials = () => {
    try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        }
        return null;
    } catch (error) {
        console.error('Error parsing credentials:', error.message);
        return null;
    }
};

// Función para obtener el doc de Google Sheets
async function getDoc() {
    const credentials = getCredentials();
    const doc = new GoogleSpreadsheet(SHEET_ID);
    
    if (credentials) {
        try {
            await doc.useServiceAccountAuth({
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            });
        } catch (authError) {
            console.error('Auth error:', authError.message);
            throw new Error('Google Sheets authentication failed: ' + authError.message);
        }
    } else {
        throw new Error('No credentials found');
    }
    
    try {
        await doc.loadInfo();
    } catch (loadError) {
        console.error('LoadInfo error:', loadError.message);
        throw new Error('Could not load sheet info: ' + loadError.message);
    }
    
    return doc;
}

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// STOCK ENDPOINT
app.get('/api/stock', asyncHandler(async (req, res) => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Stock'];
    
    if (!sheet) {
        return res.status(404).json({ error: 'Stock sheet not found' });
    }
    
    const rows = await sheet.getRows();
    const stock = rows.map(row => ({
        codigo: row.get('Código') || '',
        cantidad: parseInt(row.get('Cantidad')) || 0,
        material: row.get('Material') || '',
        detalle: row.get('Detalle') || '',
        minimo: 5
    }));
    
    res.json(stock);
}));

// PRECIOS ENDPOINT
app.get('/api/precios', asyncHandler(async (req, res) => {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Stock'];
    
    if (!sheet) {
        return res.status(404).json({ error: 'Stock sheet not found' });
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
}));

// VENTAS GET ENDPOINT
app.get('/api/ventas', asyncHandler(async (req, res) => {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Ventas'];
    
    if (!sheet) {
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
}));

// VENTAS POST ENDPOINT
app.post('/api/ventas', asyncHandler(async (req, res) => {
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
}));

// COMPRAS GET ENDPOINT
app.get('/api/compras', asyncHandler(async (req, res) => {
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
}));

// COMPRAS POST ENDPOINT
app.post('/api/compras', asyncHandler(async (req, res) => {
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
}));

// Error handler
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ 
        error: err.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
// Force redeploy
