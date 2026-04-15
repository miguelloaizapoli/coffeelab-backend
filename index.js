const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// conexión a MySQL (MAMP)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'coffeelab',
    port: 3306
});

connection.connect((err) => {
    if (err) {
        console.error('Error de conexión:', err);
    } else {
        console.log('Conectado a MySQL ');
    }
});


// REGISTRO con rol
app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
    const userRole = role || 'empleado';

    connection.query(sql, [name, email, password, userRole], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario creado' });
    });
});

// LOGIN — ahora devuelve el rol
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';

    connection.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json(err);

        if (results.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const user = results[0];

        if (user.password !== password) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        res.json({
            message: 'Login exitoso ',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});




// INVETANRIO DE PRODUCTOS
app.post('/api/products', (req, res) => {
    const { name, price, stock } = req.body;

    const sql = 'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)';

    connection.query(sql, [name, price, stock], (err, result) => {
        if (err) return res.status(500).json(err);

        res.json({ message: 'Producto creado' });
    });
});

app.get('/api/products', (req, res) => {
    connection.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json(err);

        res.json(results);
    });
});

app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;

    connection.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json(err);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json(results[0]);
    });
});

app.put('/api/products/:id', (req, res) => {
    const { name, price, stock } = req.body;
    const { id } = req.params;

    const sql = 'UPDATE products SET name=?, price=?, stock=? WHERE id=?';

    connection.query(sql, [name, price, stock, id], (err) => {
        if (err) return res.status(500).json(err);

        res.json({ message: 'Producto actualizado' });
    });
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;

    connection.query('DELETE FROM products WHERE id=?', [id], (err) => {
        if (err) return res.status(500).json(err);

        res.json({ message: 'Producto eliminado ' });
    });
});



// CLIENTES
app.get('/api/clientes', (req, res) => {
    connection.query('SELECT * FROM clientes', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    connection.query('SELECT * FROM clientes WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });
        res.json(results[0]);
    });
});

app.post('/api/clientes', (req, res) => {
    const { nombre, telefono } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

    connection.query('INSERT INTO clientes (nombre, telefono, puntos) VALUES (?, ?, 0)',
        [nombre, telefono], (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Cliente creado' });
        });
});

app.put('/api/clientes/:id', (req, res) => {
    const { nombre, telefono } = req.body;
    const { id } = req.params;

    connection.query('UPDATE clientes SET nombre=?, telefono=? WHERE id=?',
        [nombre, telefono, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Cliente actualizado' });
        });
});

app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM clientes WHERE id=?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Cliente eliminado' });
    });
});



// VENTAS
app.get('/api/ventas', (req, res) => {
    const sql = `
    SELECT v.id, v.total, v.fecha, c.nombre as cliente_nombre
    FROM ventas v
    JOIN clientes c ON v.cliente_id = c.id
    ORDER BY v.fecha DESC
  `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/ventas/:id', (req, res) => {
    const { id } = req.params;
    const sql = `
    SELECT dv.id, p.name as producto, dv.cantidad, dv.precio_unitario
    FROM detalle_ventas dv
    JOIN products p ON dv.producto_id = p.id
    WHERE dv.venta_id = ?
  `;
    connection.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/ventas', (req, res) => {
    const { cliente_id, productos } = req.body;
    // productos = [{ producto_id, cantidad, precio_unitario }]

    if (!cliente_id || !productos || productos.length === 0) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    // calcular total
    const total = productos.reduce((sum, p) => sum + (p.cantidad * p.precio_unitario), 0);

    // calcular puntos (1 punto por cada 1000 pesos)
    const puntosGanados = Math.floor(total / 1000);

    // insertar venta
    connection.query('INSERT INTO ventas (cliente_id, total) VALUES (?, ?)',
        [cliente_id, total], (err, result) => {
            if (err) return res.status(500).json(err);

            const ventaId = result.insertId;

            // insertar detalle
            const detalles = productos.map(p => [ventaId, p.producto_id, p.cantidad, p.precio_unitario]);
            connection.query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES ?',
                [detalles], (err) => {
                    if (err) return res.status(500).json(err);

                    // restar stock
                    productos.forEach(p => {
                        connection.query('UPDATE products SET stock = stock - ? WHERE id = ?',
                            [p.cantidad, p.producto_id]);
                    });

                    // sumar puntos al cliente
                    connection.query('UPDATE clientes SET puntos = puntos + ? WHERE id = ?',
                        [puntosGanados, cliente_id], (err) => {
                            if (err) return res.status(500).json(err);
                            res.json({ message: 'Venta registrada ', puntosGanados });
                        });
                });
        });
});

app.delete('/api/ventas/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM ventas WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Venta eliminada' });
    });
});



// DASHBOARD
app.get('/api/dashboard', (req, res) => {
    const data = {};

    connection.query('SELECT COUNT(*) as total FROM products', (err, r) => {
        if (err) return res.status(500).json(err);
        data.productos = r[0].total;

        connection.query('SELECT COUNT(*) as total FROM clientes', (err, r) => {
            if (err) return res.status(500).json(err);
            data.clientes = r[0].total;

            connection.query('SELECT COUNT(*) as total FROM ventas', (err, r) => {
                if (err) return res.status(500).json(err);
                data.ventas = r[0].total;

                connection.query('SELECT SUM(total) as total FROM ventas', (err, r) => {
                    if (err) return res.status(500).json(err);
                    data.totalVentas = r[0].total || 0;

                    res.json(data);
                });
            });
        });
    });
});



// USUARIOS
app.get('/api/users', (req, res) => {
    connection.query('SELECT id, name, email, role FROM users', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    connection.query('SELECT id, name, email, role FROM users WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(results[0]);
    });
});

app.put('/api/users/:id', (req, res) => {
    const { name, email, role } = req.body;
    const { id } = req.params;

    connection.query('UPDATE users SET name=?, email=?, role=? WHERE id=?',
        [name, email, role, id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Usuario actualizado' });
        });
});

app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    connection.query('DELETE FROM users WHERE id=?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario eliminado' });
    });
});




app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});