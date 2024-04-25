document.addEventListener('DOMContentLoaded', function() {
    // Obter os usuários do localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Selecionar a lista de usuários
    const userList = document.getElementById('userList');

    // Limpar a lista existente
    userList.innerHTML = '';

    // Preencher a lista com os usuários
    users.forEach(user => {
        const listItem = document.createElement('li');
        listItem.textContent = `Nome: ${user.nome}, E-mail: ${user.email}, Setor: ${user.setor}`;
        userList.appendChild(listItem);
    });
});
