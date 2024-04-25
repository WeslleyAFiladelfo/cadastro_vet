function salvarSetor() {
    console.log('Clicou no botão "Salvar"');

    const nome = document.getElementById('nome').value;
    const responsavel = document.getElementById('responsavel').value;

    console.log('Nome do setor:', nome);
    console.log('Responsável:', responsavel);

    // Verificar se os campos obrigatórios foram preenchidos
    if (!nome || !responsavel) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    const data = {
        nome: nome,
        responsavel: responsavel
    };

    console.log('Enviando dados para o servidor:', data);

    fetch('/salvar_setor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao cadastrar setor');
        }
        return response.text(); // Espera uma resposta de texto do servidor
    })
    .then(result => {
        console.log('Resposta do servidor:', result);
        alert('Setor cadastrado com sucesso!');
        // Redirecionar para outra página ou fazer outra ação após o cadastro bem-sucedido
    })
    .catch(error => {
        console.error('Erro ao cadastrar setor:', error);
        alert('Erro ao cadastrar setor. Por favor, tente novamente.');
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const setorSelect = document.getElementById('setor');

    if (setorSelect) {
        // Requisição AJAX para obter os setores do servidor
        fetch('/get_setores')
            .then(response => response.json())
            .then(data => {
                // Limpar opções existentes
                setorSelect.innerHTML = '';

                // Adicionar opções de setor ao menu suspenso
                data.forEach(setor => {
                    const option = document.createElement('option');
                    option.value = setor.id;
                    option.textContent = setor.nome;
                    setorSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar setores:', error);
            });
    } else {
        console.error('Elemento com ID "setor" não encontrado na página.');
    }
});

