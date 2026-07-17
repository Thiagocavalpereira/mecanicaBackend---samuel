// Constantes e configurações
require("dotenv").config()
const express = require('express');
const cors = require('cors');
const app = express();
const database = require("./src/config/db");

app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.resolve(__dirname, '..', 'FrontEnd')));

app.get('/api/health', (req, res) => {

    database.query('SELECT 1', (err) => {
    if (err) {
        console.error('Erro ao conectar:', err);
    } else {
        console.log('MySQL conectado com sucesso!');
    }
});
});

app.get('/', (req, res) => {
    res.json({
        mensagem: 'API do Projeto Integrador de Mecânica rodando com sucesso!',
        status: 'Online',
        banco: 'Conectado com sucesso ao Aiven'
    });
});

const cadastroClienteRoutes = require('./src/routes/cadastro-cliente');
app.use('/api/clientes', cadastroClienteRoutes);

const funcionarioRoutes = require('./src/routes/login-funcionario');
app.use('/api/funcionarios', funcionarioRoutes);

const veiculosRoutes = require('./src/routes/veiculos');
app.use('/api/veiculos', veiculosRoutes);

const chamadosRoutes = require('./src/routes/chamados');
app.use('/api/chamados', chamadosRoutes);

const DB_PORT = process.env.DB_PORT;
const DB_HOST = process.env.DB_HOST;
const PORT = process.env.PORT;


app.listen(PORT, () => {
    // console.log(`Servidor do Node rodando com sucesso em ${DB_HOST}:${DB_PORT}`);
    console.log(`http://localhost:${PORT}`)
});