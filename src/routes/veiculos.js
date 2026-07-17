const express = require('express');
const router = express.Router();
const database = require('../config/db');

router.get('/', (req, res) => {
    const { id_cliente } = req.query;

    if (!id_cliente) {
        return res.status(400).json({ erro: 'O ID do cliente é obrigatório para listar os veículos.' });
    }

    const query = 'SELECT * FROM veiculos WHERE id_cliente = ?';
    database.query(query, [id_cliente], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao buscar veículos no banco.' });
        }
        res.json(results);
    });
});

router.post('/cadastro', (req, res) => {
    const { marca, modelo, ano, placa, id_cliente } = req.body;

    if (!marca || !modelo || !ano || !placa || !id_cliente) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    const query = 'INSERT INTO veiculos (marca, modelo, ano, placa, id_cliente) VALUES (?, ?, ?, ?, ?)';
    database.query(query, [marca, modelo, ano, placa, id_cliente], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao salvar o veículo no banco.' });
        }
        res.status(201).json({ mensagem: 'Veículo cadastrado com sucesso!', id_veiculos: result.insertId });
    });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { marca, modelo, ano, placa } = req.body;

    if (!marca || !modelo || !ano || !placa) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    const query = 'UPDATE veiculos SET marca = ?, modelo = ?, ano = ?, placa = ? WHERE id_veiculos = ?';
    database.query(query, [marca, modelo, ano, placa, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao atualizar o veículo no banco.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }
        res.json({ mensagem: 'Veículo atualizado com sucesso!' });
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Se o veículo tiver chamados vinculados (FK ordem_servico.id_veiculos), o banco pode
    // recusar a exclusão por integridade referencial. Nesse caso, considere excluir em cascata
    // os chamados relacionados ou impedir a exclusão de veículos com chamados em aberto.
    const query = 'DELETE FROM veiculos WHERE id_veiculos = ?';
    database.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
                return res.status(409).json({ erro: 'Não é possível excluir: este veículo possui chamados vinculados.' });
            }
            return res.status(500).json({ erro: 'Erro ao excluir o veículo no banco.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Veículo não encontrado.' });
        }
        res.json({ mensagem: 'Veículo excluído com sucesso!' });
    });
});

module.exports = router;