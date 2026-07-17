const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../config/db');

router.post('/cadastro', (req, res) => {
    const { nome, email, senha, cargo, cargoQuemCadastrou } = req.body;

    if (!cargoQuemCadastrou || cargoQuemCadastrou.toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem cadastrar novos funcionários.' });
    }

    if (!nome || !email || !senha || !cargo) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    bcrypt.hash(senha, 10, (err, hash) => {
        if (err) return res.status(500).json({ erro: 'Erro ao processar senha.' });

        const query = 'INSERT INTO funcionario (nome, email, senha, cargo) VALUES (?, ?, ?, ?)';
        database.query(query, [nome, email, hash, cargo], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ erro: 'Erro ao salvar funcionário no banco.' });
            }
            res.status(201).json({ mensagem: 'Funcionário cadastrado com sucesso!' });
        });
    });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const query = 'SELECT * FROM funcionario WHERE email = ?';
    database.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ erro: 'Erro interno no servidor.' });

        if (results.length === 0) {
            return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
        }

        const funcionario = results[0];

        try {
            const senhaConfere = await bcrypt.compare(senha, funcionario.senha);

            if (!senhaConfere) {
                return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
            }

            delete funcionario.senha;
            res.json({ mensagem: 'Login realizado com sucesso!', funcionario });
        } catch (erro) {
            res.status(500).json({ erro: 'Erro ao validar a senha.' });
        }
    });


});

router.get('/', (req, res) => {
    const query = 'SELECT id_funcionario, nome, email, cargo FROM funcionario';
    database.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao buscar funcionários.' });
        }
        res.json(results);
    });
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email, cargo, cargoQuemAlterou } = req.body;

    // Mesmo padrão de proteção usado no /cadastro: só administrador pode editar um funcionário.
    if (!cargoQuemAlterou || cargoQuemAlterou.toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem editar funcionários.' });
    }

    if (!nome || !email || !cargo) {
        return res.status(400).json({ erro: 'Nome, e-mail e cargo são obrigatórios.' });
    }

    const query = 'UPDATE funcionario SET nome = ?, email = ?, cargo = ? WHERE id_funcionario = ?';
    database.query(query, [nome, email, cargo, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao atualizar funcionário no banco.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: 'Funcionário não encontrado.' });
        }
        res.json({ mensagem: 'Funcionário atualizado com sucesso!' });
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const { cargoQuemAlterou } = req.body;

    if (!cargoQuemAlterou || cargoQuemAlterou.toLowerCase() !== 'administrador') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem excluir funcionários.' });
    }

    // Se o funcionário tiver chamados atribuídos (FK ordem_servico.id_funcionario), o ideal é
    // primeiro desatribuir esses chamados (SET id_funcionario = NULL) antes de excluir,
    // já que a coluna é LEFT JOIN/opcional na listagem de chamados.
    const queryDesatribuir = 'UPDATE ordem_servico SET id_funcionario = NULL WHERE id_funcionario = ?';
    database.query(queryDesatribuir, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao desatribuir chamados do funcionário.' });
        }

        const queryDelete = 'DELETE FROM funcionario WHERE id_funcionario = ?';
        database.query(queryDelete, [id], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ erro: 'Erro ao excluir funcionário no banco.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: 'Funcionário não encontrado.' });
            }
            res.json({ mensagem: 'Funcionário excluído com sucesso!' });
        });
    });
});


module.exports = router;