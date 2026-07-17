const express = require('express');
const router = express.Router();
const database = require('../config/db');

router.post('/', (req, res) => {
    const { id_cliente, id_veiculos, titulo, descricao } = req.body;

    if (!id_cliente || !id_veiculos || !titulo) {
        return res.status(400).json({ erro: 'Cliente, veículo e título do chamado são obrigatórios.' });
    }

    const query = `
        INSERT INTO ordem_servico (id_cliente, id_veiculos, titulo, descricao, status)
        VALUES (?, ?, ?, ?, 'Em Análise')
    `;
    database.query(query, [id_cliente, id_veiculos, titulo, descricao || null], (err, result) => {
        if (err) {
            console.error('Erro ao abrir chamado:', err);
            return res.status(500).json({ erro: 'Erro ao abrir o chamado no banco.' });
        }
        res.status(201).json({ mensagem: 'Chamado aberto com sucesso!', id_os: result.insertId });
    });
});

router.get('/', (req, res) => {
    const query = `
        SELECT
            os.id_os,
            os.titulo,
            os.descricao,
            os.status,
            os.data_de_abertura,
            os.data_de_finalizacao,
            c.nome AS nome_cliente,
            veiculos.marca,
            veiculos.modelo,
            veiculos.placa,
            f.nome AS nome_funcionario
        FROM ordem_servico os
        INNER JOIN cliente c ON os.id_cliente = c.id_cliente
        INNER JOIN veiculos ON os.id_veiculos =  veiculos.id_veiculos
        LEFT JOIN funcionario f ON os.id_funcionario = f.id_funcionario
        ORDER BY os.id_os DESC
    `;

    database.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar chamados:', err);
            return res.status(500).json({ erro: 'Erro interno ao buscar chamados.' });
        }
        res.json(results);
    });
});

router.get('/cliente/:id_cliente', (req, res) => {
    const { id_cliente } = req.params;

    const query = `
        SELECT
            os.id_os,
            os.titulo,
            os.descricao,
            os.status,
            os.data_de_abertura,
            os.data_de_finalizacao,
            veiculos.marca,
            veiculos.modelo,
             veiculos.placa
        FROM ordem_servico os
        INNER JOIN veiculos ON os.id_veiculos =  veiculos.id_veiculos
        WHERE os.id_cliente = ?
        ORDER BY os.id_os DESC
    `;

    database.query(query, [id_cliente], (err, results) => {
        if (err) {
            console.error('Erro ao buscar chamados do cliente:', err);
            return res.status(500).json({ erro: 'Erro interno ao buscar chamados.' });
        }
        res.json(results);
    });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { status, titulo, descricao } = req.body;

    // Caso 1: atualização de status (usado pelo painel do funcionário/admin)
    if (status !== undefined) {
        const statusValidos = ['Em Análise', 'Em Reparo', 'Finalizado'];
        if (!statusValidos.includes(status)) {
            return res.status(400).json({ erro: `Status inválido. Use um de: ${statusValidos.join(', ')}.` });
        }

        const query = status === 'Finalizado'
            ? 'UPDATE ordem_servico SET status = ?, data_de_finalizacao = NOW() WHERE id_os = ?'
            : 'UPDATE ordem_servico SET status = ? WHERE id_os = ?';

        return database.query(query, [status, id], (err, result) => {
            if (err) {
                console.error('Erro ao atualizar chamado:', err);
                return res.status(500).json({ erro: 'Erro interno ao atualizar o status.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: 'Chamado não encontrado.' });
            }
            res.json({ mensagem: 'Status atualizado com sucesso!' });
        });
    }

    // Caso 2: edição de título/descrição (usado pelo cliente, enquanto o chamado está em análise)
    if (titulo !== undefined) {
        if (!titulo.trim()) {
            return res.status(400).json({ erro: 'O título do chamado é obrigatório.' });
        }

        const query = `
            UPDATE ordem_servico
            SET titulo = ?, descricao = ?
            WHERE id_os = ?
        `;
        
        const descricaoTratada = (descricao && descricao.trim() !== '') ? descricao : '';

        return database.query(query, [titulo, descricaoTratada, id], (err, result) => {
            if (err) {
                console.error('Erro ao editar chamado no MySQL:', err);
                return res.status(500).json({ erro: 'Erro interno do banco ao editar o chamado.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: 'Chamado não encontrado.' });
            }
            return res.json({ mensagem: 'Chamado atualizado com sucesso!' });
        });
    }

    // Exclusão sem trava de status no banco: a regra de "só o cliente pode excluir enquanto
    // está em análise" é controlada no frontend do cliente. O admin (dashboard) pode excluir
    // qualquer ordem de serviço, independente do status.
    const query = `DELETE FROM ordem_servico WHERE id_os = ?`;
    database.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro ao excluir chamado:', err);
            return res.status(500).json({ erro: 'Erro interno ao excluir o chamado.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Chamado não encontrado.' });
        }
        res.json({ mensagem: 'Chamado excluído com sucesso!' });
    });
});

router.put('/:id/funcionario', (req, res) => {

    const { id } = req.params;
    const { idFuncionario } = req.body;

    const sql = `
        UPDATE ordem_servico
        SET id_funcionario = ?
        WHERE id_os = ?
    `;

    database.query(sql, [idFuncionario, id], (erro, resultado) => {

        if (erro) {
            console.error(erro);
            return res.status(500).json({
                erro: 'Erro ao atribuir funcionário.'
            });
        }

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Ordem de Serviço não encontrada.'
            });
        }

        res.json({
            mensagem: 'Funcionário atribuído com sucesso!'
        });

    });

});

module.exports = router;