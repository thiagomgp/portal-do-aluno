// Configuração do Supabase
// Substitua com as suas credenciais do projeto no Supabase (Settings -> API)
const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Alternância de Abas na Interface
function navigate(tabName) {
  const tabs = ['inicio', 'disciplinas', 'jogos', 'perfil'];
  
  tabs.forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) {
      if (tab === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
}

// Lógica de Autenticação / Login
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert('Erro ao entrar: ' + error.message);
      } else {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        carregarDadosAluno(data.user);
      }
    });
  }
});

// Carregar Dados do Aluno Logado
async function carregarDadosAluno(user) {
  // 1. Procurar perfil do aluno no Supabase
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, turmas(nome)')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Erro ao carregar perfil:', error);
    return;
  }

  // Exibir nome e turma no topo
  const userInfo = document.getElementById('user-info');
  if (userInfo) {
    const turmaNome = profile.turmas ? profile.turmas.nome : 'Sem Turma';
    userInfo.innerHTML = `👋 Olá, <strong>${profile.apelido || profile.nome_completo}</strong> (${turmaNome})`;
  }

  // Carregar avisos da turma / individuais
  carregarAvisos(profile);
}

// Carregar Mural de Avisos
async function carregarAvisos(profile) {
  const { data: avisos, error } = await supabase
    .from('avisos')
    .select('*')
    .or(`aluno_id.eq.${profile.id},turma_id.eq.${profile.turma_id}`)
    .order('created_at', { ascending: false });

  const listaAvisos = document.getElementById('lista-avisos');
  if (!listaAvisos) return;

  if (error || !avisos || avisos.length === 0) {
    listaAvisos.innerHTML = '<p class="text-slate-400">Nenhum aviso no mural de momento.</p>';
    return;
  }

  listaAvisos.innerHTML = avisos.map(aviso => `
    <div class="bg-slate-800 p-4 rounded-lg border-l-4 border-emerald-500">
      <h4 class="font-bold text-emerald-400">${aviso.titulo}</h4>
      <p class="text-slate-300 text-sm mt-1">${aviso.mensagem}</p>
      <span class="text-xs text-slate-500 mt-2 block">${new Date(aviso.created_at).toLocaleDateString('pt-PT')}</span>
    </div>
  `).join('');
}
