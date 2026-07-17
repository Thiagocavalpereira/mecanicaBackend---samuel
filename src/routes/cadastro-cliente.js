const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../config/db');

router.post('/cadastro', async (req, res) => {
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !telefone || !senha) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    try {
        const hashSenha = await bcrypt.hash(senha, 10);

        const queryCheck = 'SELECT id_cliente FROM cliente WHERE email = ?';
        database.query(queryCheck, [email], (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro interno no servidor.' });

            if (results.length > 0) {
                return res.status(400).json({ erro: 'E-mail já cadastrado.' });
            }

            const queryInsert = 'INSERT INTO cliente (nome, email, telefone, senha) VALUES (?, ?, ?, ?)';
            database.query(queryInsert, [nome, email, telefone, hashSenha], (err, result) => {
                if (err) return res.status(500).json({ erro: 'Erro ao salvar cliente no banco.' });

                res.status(201).json({ mensagem: 'Cliente cadastrado com sucesso!' });
            });
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao processar a senha.' });
    }
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const query = 'SELECT * FROM cliente WHERE email = ?';
    
    database.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro interno no servidor.' });

        if (results.length === 0) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }

        const cliente = results[0];

        try {
            const senhaConfere = await bcrypt.compare(senha, cliente.senha);

            if (!senhaConfere) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            delete cliente.senha;
            res.json({ mensagem: 'Login realizado com sucesso!', cliente });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao validar a senha.' });
        }
    });
});

module.exports = router;