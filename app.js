// ==========================================
// FORMULÁRIO DE LOGIN CORRIGIDO (PREVINE RECARREGAMENTO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  carregarTurmasCadastro();
  verificarSessao();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Impede a recarga da página
      e.stopPropagation();

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');

      if (!emailInput || !passwordInput) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          alert('Erro ao entrar: ' + error.message);
          return;
        }

        if (data && data.user) {
          await verificarEstadoEEntrar(data.user);
        }
      } catch (err) {
        console.error('Erro inesperado no login:', err);
        alert('Ocorreu um erro ao tentar realizar o login.');
      }
    });
  }
});

// ==========================================
// VERIFICAÇÃO DE PERFIL E LIBERAÇÃO DE TELA
// ==========================================
async function verificarEstadoEEntrar(user) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      alert('Erro na consulta do perfil: ' + error.message);
      await supabase.auth.signOut();
      return;
    }

    if (!profile) {
      alert('Perfil de aluno não encontrado na base de dados.');
      await supabase.auth.signOut();
      return;
    }

    if (profile.status === 'pendente') {
      alert('A tua conta ainda está a aguardar aprovação pelo professor.');
      await supabase.auth.signOut();
      return;
    }

    let nomeTurma = 'Sem Turma';
    if (profile.turma_id) {
      const { data: turma } = await supabase
        .from('turmas')
        .select('nome')
        .eq('id', profile.turma_id)
        .maybeSingle();

      if (turma) {
        nomeTurma = turma.nome;
      }
    }

    alunoAtual = profile;

    // Oculta tela de login e exibe o portal
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');

    if (authSection) authSection.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');

    atualizarCabecalhoUsuario(nomeTurma);
    carregarAvisos();
  } catch (err) {
    console.error('Erro ao verificar estado:', err);
  }
}
