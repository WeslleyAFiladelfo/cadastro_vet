const express = require('express');
const path = require('path');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const { sendNotificationEmail } = require('./emailSender');
const { name } = require('ejs');
const LocalStrategy = require('passport-local').Strategy;

const app = express();
const port = process.env.PORT || 3000;

// Configuração da sessão com variável de ambiente
const secretKey = process.env.SESSION_SECRET || 'sua_chave_secreta_aqui';
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false
}));

// Middleware para tratar JSON e URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Configuração do diretório de arquivos estáticos (CSS, imagens, HTML, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do banco de dados SQLite
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conexão com o banco de dados estabelecida.');
    }
});

// Middleware para verificar autenticação e autorização
function authenticateAndAuthorize(req, res, next) {
    // Verificar se o usuário está autenticado
    if (req.isAuthenticated()) {
        // Verificar se o usuário tem permissão adequada (por exemplo, admin)
        if (req.user && req.user.role === 'admin') {
            // Usuário autenticado e autorizado
            return next();
        } else {
            // Usuário não autorizado (não é admin)
            return res.status(403).send('Acesso proibido. Você não tem permissão para acessar esta rota.');
        }
    } else {
        // Usuário não autenticado
        return res.status(401).send('Acesso não autorizado. Faça login para acessar esta rota.');
    }
}

// Criação da tabela de produtos (se não existir)
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT,
            descricao TEXT NOT NULL,
            desc_resumida TEXT NOT NULL,
            kit TEXT,
            consignado TEXT,
            opme TEXT,
            especie TEXT,
            classe TEXT,
            sub_classe TEXT,
            curva_abc TEXT,
            lote TEXT,
            serie TEXT,
            registro_anvisa TEXT,
            etiqueta TEXT,
            medicamento TEXT,
            carater TEXT,
            atividade TEXT,
            procedimento_faturamento TEXT,
            token TEXT,
            auto_custo TEXT,
            aplicacao TEXT,
            valor REAL,
            repasse TEXT,
            tipo_atendimento TEXT,
            observacao TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Erro ao criar/verificar a tabela de produtos:', err);
        } else {
            console.log('Tabela de produtos verificada/atualizada com sucesso.');
        }
    });
});

// Rota para salvar um produto (sem autenticação)
app.post('/salvar_produto', (req, res) => {
    const {
        codigo,
        descricao,
        desc_resumida,
        kit,
        consignado,
        opme,
        especie,
        classe,
        sub_classe,
        curva_abc,
        lote,
        serie,
        registro_anvisa,
        etiqueta,
        medicamento,
        carater,
        atividade,
        procedimento_faturamento,
        auto_custo,
        aplicacao,
        valor,
        repasse,
        tipo_atendimento,
        observacao
    } = req.body;

    // Gerar um token único para o produto
    const token = uuidv4();

    // Preparar os dados do produto para inserção
    const produtoData = {
        codigo,
        descricao,
        desc_resumida,
        kit,
        consignado,
        opme,
        especie,
        classe,
        sub_classe,
        curva_abc,
        lote,
        serie,
        registro_anvisa,
        etiqueta,
        medicamento,
        carater,
        atividade,
        procedimento_faturamento,
        auto_custo,
        aplicacao,
        valor,
        repasse,
        tipo_atendimento: {  // Tratar os campos de tipo de atendimento como objeto booleano
            ps: tipo_atendimento === 'ps',  // Converter para booleano
            ambulatorio: tipo_atendimento === 'ambulatorio',
            externo: tipo_atendimento === 'externo',
            internacao: tipo_atendimento === 'internacao',
            todos: tipo_atendimento === 'todos'
        },
        observacao,
        token
    };

    // Montar a consulta SQL com placeholders para os valores
    const sql = `
        INSERT INTO produtos (
            codigo,
            descricao,
            desc_resumida,
            kit,
            consignado,
            opme,
            especie,
            classe,
            sub_classe,
            curva_abc,
            lote,
            serie,
            registro_anvisa,
            etiqueta,
            medicamento,
            carater,
            atividade,
            procedimento_faturamento,
            token,
            auto_custo,
            aplicacao,
            valor,
            repasse,
            tipo_atendimento,
            observacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Extrair os valores do objeto produtoData na ordem correta
    const params = [
        produtoData.codigo,
        produtoData.descricao,
        produtoData.desc_resumida,
        produtoData.kit,
        produtoData.consignado,
        produtoData.opme,
        produtoData.especie,
        produtoData.classe,
        produtoData.sub_classe,
        produtoData.curva_abc,
        produtoData.lote,
        produtoData.serie,
        produtoData.registro_anvisa,
        produtoData.etiqueta,
        produtoData.medicamento,
        produtoData.carater,
        produtoData.atividade,
        produtoData.procedimento_faturamento,
        produtoData.token,
        produtoData.auto_custo,
        produtoData.aplicacao,
        produtoData.valor,
        produtoData.repasse,
        JSON.stringify(produtoData.tipo_atendimento),  // Converter o objeto para JSON
        produtoData.observacao
    ];

    // Executar a consulta SQL com os parâmetros
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Erro ao cadastrar produto:', err);
            return res.redirect('/cadastro_produto.html?status=erro');
        }


        // Enviar e-mail de notificação com link para continuar o cadastro
        const continuationLink = `http://localhost:3000/continuar_cadastro?token=${token}&codigo=${codigo}&descricao=${descricao}&desc_resumida=${desc_resumida}&observacao=${observacao}`;
        const mailOptions = {
            from: 'cadastro_pet@outlook.com',
            to: 'cadastro_pet@outlook.com', // Altere para o e-mail do usuário
            subject: 'Continuar Cadastro de Produto Pendente',
            text: `Há um cadastro de produto pendente. Clique no link a seguir para continuar o cadastro:\n${continuationLink}`
        };

        // Enviar o e-mail de notificação
        sendNotificationEmail(mailOptions);

        // Redirecionar para a página de cadastro com mensagem de sucesso
        res.redirect('/cadastro_produto.html?status=sucesso');
    });
});

// Rota para continuar o cadastro com dados preenchidos
app.get('/continuar_cadastro', (req, res) => {
    // Lógica para buscar e renderizar os dados do produto pendente
    const { token } = req.query; // Usar req.query para obter o token da URL

    // Buscar o produto pendente associado ao token no banco de dados
    const selectProductSql = `
        SELECT *
        FROM produtos
        WHERE token = ?
    `;

    db.get(selectProductSql, [token], (err, row) => {
        if (err) {
            console.error('Erro ao buscar produto pendente:', err);
            return res.status(500).send('Erro ao buscar produto pendente');
        }

        if (!row) {
            console.error('Produto pendente não encontrado para o token fornecido:', token);
            return res.status(404).send('Produto pendente não encontrado');
        }

          // Reconstruir o objeto tipo_atendimento
        const tipoAtendimento = JSON.parse(row.tipo_atendimento);

        // Renderizar a página 'continuar_cadastro.ejs' com os dados preenchidos
        res.render('continuar_cadastro', {
            token: row.token,
            codigo: row.codigo,
            descricao: row.descricao,
            desc_resumida: row.desc_resumida,
            kit: row.kit,
            consignado: row.consignado,
            opme: row.opme,
            especie: row.especie,
            classe: row.classe,
            sub_classe: row.sub_classe,
            curva_abc: row.curva_abc,
            lote: row.lote,
            serie: row.serie,
            registro_anvisa: row.registro_anvisa,
            etiqueta: row.etiqueta,
            medicamento: row.medicamento,
            carater: row.carater,
            atividade: row.atividade,
            procedimento_faturamento: row.procedimento_faturamento,
            auto_custo: row.auto_custo,
            aplicacao: row.aplicacao,
            valor: row.valor,
            repasse: row.repasse,
            tipo_atendimento: tipoAtendimento, // Passar o objeto reconstruído
            observacao: row.observacao 
        });
    });
});

// Rota para finalizar o cadastro do produto
app.post('/finalizar_cadastro_produto', (req, res) => {
    const {
        token,
        codigo,
        descricao,
        desc_resumida,
        kit,
        consignado,
        opme,
        especie,
        classe,
        sub_classe,
        curva_abc,
        lote,
        serie,
        registro_anvisa,
        etiqueta,
        medicamento,
        carater,
        atividade,
        procedimento_faturamento,
        auto_custo,
        aplicacao,
        valor,
        repasse,
        tipo_atendimento,
        observacao
    } = req.body;

    // Verificar se o token foi fornecido
    if (!token) {
        console.error('Erro: Token não fornecido');
        return res.status(400).send('Token não fornecido');
    }

    // Verificar se todos os dados necessários estão presentes e válidos
    if (!codigo || !descricao || !desc_resumida) {
        console.error('Erro: Dados obrigatórios ausentes ou inválidos');
        return res.status(400).send('Dados obrigatórios ausentes ou inválidos');
    }

    // Converter o objeto tipo_atendimento para JSON antes de atualizar o banco
    const tipoAtendimentoJSON = JSON.stringify(tipo_atendimento);

    // Atualizar o produto no banco de dados com os novos dados
    const updateProductSql = `
        UPDATE produtos
        SET
            codigo = ?,
            descricao = ?,
            desc_resumida = ?,
            kit = ?,
            consignado = ?,
            opme = ?,
            especie = ?,
            classe = ?,
            sub_classe = ?,
            curva_abc = ?,
            lote = ?,
            serie = ?,
            registro_anvisa = ?,
            etiqueta = ?,
            medicamento = ?,
            carater = ?,
            atividade = ?,
            procedimento_faturamento = ?,
            auto_custo = ?,
            aplicacao = ?,
            valor = ?,
            repasse = ?,
            tipo_atendimento = ?,
            observacao = ?
        WHERE token = ?
    `;

    const params = [
        codigo,
        descricao,
        desc_resumida,
        kit,
        consignado,
        opme,
        especie,
        classe,
        sub_classe,
        curva_abc,
        lote,
        serie,
        registro_anvisa,
        etiqueta,
        medicamento,
        carater,
        atividade,
        procedimento_faturamento,
        auto_custo,
        aplicacao,
        valor,
        repasse,
        tipoAtendimentoJSON,  // Passar o JSON do tipo_atendimento
        observacao,
        token
    ];

    // Executar a consulta SQL de atualização
    db.run(updateProductSql, params, function(err) {
        if (err) {
            console.error('Erro ao atualizar produto:', err);
            return res.status(500).send('Erro ao atualizar produto');
        }

        // Enviar e-mail de notificação para quem iniciou o cadastro
        const userEmail = 'cadastro_pet@outlook.com'; // E-mail do destinatário
        const mailOptions = {
            from: 'cadastro_pet@outlook.com',
            to: userEmail,
            subject: 'Produto cadastrado no sistema MV',
            text: `O produto com código ${codigo} e descrição ${descricao} foi cadastrado no sistema MV com sucesso. Observação: ${observacao}.`
        };

        // Enviar o e-mail de notificação utilizando a função atualizada
        sendNotificationEmail(mailOptions);

        // Redirecionar para a página de sucesso após finalizar o cadastro
        res.redirect('/cadastro_produto.html?status=finalizado');
    });
});

// Rota para obter todos os setores cadastrados
app.get('/get_setores', (req, res) => {
    db.all('SELECT * FROM setores', (err, rows) => {
        if (err) {
            console.error('Erro ao obter setores:', err);
            return res.status(500).send('Erro ao obter setores');
        }
        res.status(200).json(rows);
    });
});

// Rota para processar o formulário de login
app.post('/index', (req, res) => {
    const { username, email } = req.body;

    // Consultar o banco de dados para encontrar o usuário
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
        if (err) {
            console.error('Erro ao autenticar usuário:', err);
            return res.status(500).send('Erro ao autenticar usuário');
        }
        if (!row) {
            console.log('Usuário não encontrado');
            return res.status(401).send('Usuário não encontrado');
        }

        // Armazenar as informações de autenticação na sessão
        req.session.authenticated = true;
        req.session.username = username;
        req.session.email = row.email;

        // Redirecionar com base no usuário autenticado
        if (username === 'farmacia.veros' && row.email === 'farmacia.pet@outlook.com') {
            // Redirecionar para tela de usuário padrão
            res.redirect('/menu');
        } else if (username === 'weslley.filadelfo' && row.email === 'weslleyafiladelfo@gmail.com') {
            // Redirecionar para o menu geral
            res.redirect('/menu');
        } else {
            // Credenciais inválidas
            res.status(401).send('Credenciais inválidas');
        }
    });
});

// Rota para tela de usuário padrão
app.get('/tela_usuario_padrao', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'tela_usuario_padrao.html'));
});

// Rota para a página de menu
app.get('/menu', isAuthenticated, (req, res) => {
    const username = req.session.username;

    if (username === 'weslley.filadelfo') {
        // Renderiza menu completo para o usuário weslley.filadelfo
        res.render('menu', { showAllButtons: true });
    } else if (username === 'farmacia.veros') {
        // Renderiza menu restrito para o usuário farmacia.veros
        res.render('menu', { showAllButtons: false });
    } else {
        // Usuário não autorizado
        res.status(401).send('Acesso não autorizado');
    }
});

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
    if (req.session.authenticated) {
        // Se o usuário estiver autenticado, prossiga
        next();
    } else {
        // Se não estiver autenticado, redirecione para o login
        res.redirect('/');
    }
}

// Rota para processar o formulário de cadastro de usuário
app.post('/salvar_usuario', (req, res) => {
    const { name, email, username, setor_id } = req.body;

    // Verificar se todos os campos obrigatórios foram enviados
    if (!name || !email || !username || !setor_id) {
        return res.status(400).send('Todos os campos devem ser preenchidos.');
    }

    // Inserir novo usuário no banco de dados
    const sql = 'INSERT INTO users (name, email, username, setor_id) VALUES (?, ?, ?, ?)';
    db.run(sql, [name, email, username, setor_id], function(err) {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).send('Erro ao cadastrar usuário');
        }
        res.status(200).json({ message: 'Usuário cadastrado com sucesso!' });
    });
});

// Criar a tabela de solicitações (caso não exista)
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS solicitacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            descricao TEXT,
            data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'Pendente'
        )
    `, (err) => {
        if (err) {
            console.error('Erro ao criar tabela de solicitações:', err.message);
        } else {
            console.log('Tabela de solicitações criada com sucesso.');
        }
    });
});

// Rota para processar solicitação de cadastro de produto
app.post('/solicitar_cadastro_produto', (req, res) => {
    const { usuario, descricao } = req.body;

    // Salvar a solicitação no banco de dados
    const sql = `
        INSERT INTO solicitacoes (usuario, descricao)
        VALUES (?, ?)
    `;

    db.run(sql, [usuario, descricao], (err) => {
        if (err) {
            console.error('Erro ao salvar solicitação no banco de dados:', err.message);
            res.status(500).send('Erro ao salvar solicitação no banco de dados.');
        } else {
            console.log('Solicitação de cadastro de produto salva com sucesso.');
            res.status(200).send('Solicitação de cadastro de produto salva com sucesso.');
        }
    });
});

// Rota para listar todas as solicitações do banco de dados
app.get('/listar_solicitacoes', (req, res) => {
    const sql = `
        SELECT * FROM solicitacoes
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao listar solicitações:', err.message);
            res.status(500).send('Erro ao listar solicitações.');
        } else {
            res.status(200).json(rows);
        }
    });
});

// Rota para salvar um novo setor
app.post('/salvar_setor', (req, res) => {
    const { nome, responsavel } = req.body;

    // Verificar se o nome do setor foi enviado
    if (!nome) {
        return res.status(400).send('O nome do setor é obrigatório.');
    }

    // Inserir o novo setor no banco de dados
    const sql = 'INSERT INTO setores (nome, responsavel) VALUES (?, ?)';
    db.run(sql, [nome, responsavel], function(err) {
        if (err) {
            console.error('Erro ao cadastrar setor:', err);
            return res.status(500).send('Erro ao cadastrar setor');
        }
        res.status(200).send('Setor cadastrado com sucesso!');
    });
});

 // Rota para servir o arquivo JavaScript (cadastroSetor.js)
app.get('/cadastroSetor.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'cadastroSetor.js'));
});

// Rota para servir a página de login (login.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para servir a página de menu (menu.html)
app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});


// Rota para servir o arquivo usuario.html
app.get('/usuario.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'usuario.html'));
});

// Rota para servir o arquivo setor.html
app.get('/setor.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'setor.html'));
});

app.get('/alterar_usuario', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários:', err);
            res.status(500).send('Erro ao buscar usuários');
        } else {
            res.render('alterar_usuario', { usuarios: rows });
        }
    });
});


app.get('/cadastro_produto', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro_produto.html'));
});

// Rota para servir o arquivo procedimento.html
app.get('/procedimento.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'procedimento.html'));
});

// Rota para servir o arquivo /historico_solicitacoes.html
app.get('/historico_solicitacoes.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'historico_solicitacoes.html'));
});

// Rota para lidar com outros erros não tratados
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).send('Erro interno no servidor');
});

// Função para gerar um código aleatório único
function generateRandomCode() {
    return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
}

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// Fechar o banco de dados ao finalizar o servidor
process.on('exit', () => {
    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar conexão com o banco de dados:', err.message);
        } else {
            console.log('Conexão com o banco de dados fechada.');
        }
    });
});
