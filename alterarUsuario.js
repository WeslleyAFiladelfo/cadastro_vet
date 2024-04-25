// alterarUsuario.js

$(document).ready(function() {
    // Carregar usuários no select
    $.get('/getUsers', function(users) {
        users.forEach(function(user) {
            $('#usuariosSelect').append(`<option value="${user.id}">${user.name}</option>`);
        });
    });
});

// Função para buscar detalhes do usuário selecionado
function getUserDetails() {
    const userId = $('#usuariosSelect').val();

    // Realizar uma requisição AJAX para buscar os detalhes do usuário pelo ID
    $.get(`/getUserDetails?id=${userId}`, function(data) {
        // Preencher os campos do formulário com os dados do usuário recebidos
        $('#nomeInput').val(data.name);
        $('#emailInput').val(data.email);
        $('#usernameInput').val(data.username);
        $('#setorInput').val(data.setor);
    });
}
