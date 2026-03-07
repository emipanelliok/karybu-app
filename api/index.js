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

// ========== VENTAS ==========
app.get('/api/ventas', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Ventas'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Ventas' });
            await sheet.setHeaderRow(['Producto', 'Cantidad', 'Precio', 'Total', 'Cliente', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const ventas = rows.map(row => ({
            producto: row.get('Producto'),
            cantidad: parseFloat(row.get('Cantidad')),
            precio: parseFloat(row.get('Precio')),
            total: parseFloat(row.get('Total')),
            cliente: row.get('Cliente'),
            fecha: row.get('Fecha')
        }));
        
        res.json(ventas);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { producto, cantidad, precio, cliente } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Ventas'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Ventas' });
            await sheet.setHeaderRow(['Producto', 'Cantidad', 'Precio', 'Total', 'Cliente', 'Fecha']);
        }
        
        const total = cantidad * precio;
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Producto': producto,
            'Cantidad': cantidad,
            'Precio': precio,
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

// ========== COMPRAS ==========
app.get('/api/compras', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Compras'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Compras' });
            await sheet.setHeaderRow(['Producto', 'Cantidad', 'Costo', 'Total', 'Proveedor', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const compras = rows.map(row => ({
            producto: row.get('Producto'),
            cantidad: parseFloat(row.get('Cantidad')),
            costo: parseFloat(row.get('Costo')),
            total: parseFloat(row.get('Total')),
            proveedor: row.get('Proveedor'),
            fecha: row.get('Fecha')
        }));
        
        res.json(compras);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/compras', async (req, res) => {
    try {
        const { producto, cantidad, costo, proveedor } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Compras'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Compras' });
            await sheet.setHeaderRow(['Producto', 'Cantidad', 'Costo', 'Total', 'Proveedor', 'Fecha']);
        }
        
        const total = cantidad * costo;
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Producto': producto,
            'Cantidad': cantidad,
            'Costo': costo,
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

// ========== STOCK ==========
app.get('/api/stock', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Stock'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Stock' });
            await sheet.setHeaderRow(['Nombre', 'Cantidad', 'Mínimo', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const stock = rows.map(row => ({
            nombre: row.get('Nombre'),
            cantidad: parseFloat(row.get('Cantidad')),
            minimo: parseFloat(row.get('Mínimo')),
            fecha: row.get('Fecha')
        }));
        
        res.json(stock);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stock', async (req, res) => {
    try {
        const { nombre, cantidad, minimo } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Stock'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Stock' });
            await sheet.setHeaderRow(['Nombre', 'Cantidad', 'Mínimo', 'Fecha']);
        }
        
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Nombre': nombre,
            'Cantidad': cantidad,
            'Mínimo': minimo,
            'Fecha': fecha
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== PRECIOS ==========
app.get('/api/precios', async (req, res) => {
    try {
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Precios'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Precios' });
            await sheet.setHeaderRow(['Producto', 'Costo', 'Venta', 'Margen', 'Fecha']);
        }
        
        const rows = await sheet.getRows();
        const precios = rows.map(row => ({
            producto: row.get('Producto'),
            costo: parseFloat(row.get('Costo')),
            venta: parseFloat(row.get('Venta')),
            margen: row.get('Margen'),
            fecha: row.get('Fecha')
        }));
        
        res.json(precios);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/precios', async (req, res) => {
    try {
        const { producto, costo, venta } = req.body;
        const doc = await getDoc();
        let sheet = doc.sheetsByTitle['Precios'];
        
        if (!sheet) {
            sheet = await doc.addSheet({ title: 'Precios' });
            await sheet.setHeaderRow(['Producto', 'Costo', 'Venta', 'Margen', 'Fecha']);
        }
        
        const margen = ((venta - costo) / costo * 100).toFixed(1);
        const fecha = new Date().toLocaleDateString('es-AR');
        
        await sheet.addRow({
            'Producto': producto,
            'Costo': costo,
            'Venta': venta,
            'Margen': margen + '%',
            'Fecha': fecha
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
