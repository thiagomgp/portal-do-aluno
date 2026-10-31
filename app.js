// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE (URL CORRIGIDA)
// ==========================================
const SUPABASE_URL = 'https://iivgusjzerzqrdgctcvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpdmd1c2p6ZXJ6cXJkZ2N0Y3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0Nzg5NzksImV4cCI6MjEwOTA1NDk3OX0.ewJXSEfaCRGOT9SKiggf6pbrieDNOPgdG39pEoRa5Qc';

if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var supabase = window.supabaseClient;

// Variável global para armazenar os dados do aluno logado
let alunoAtual = null;

// ==========================================
// 2. NAVEGAÇÃO DE ABAS
// ==========================================
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

  if (tabName === 'disciplinas') carregarDisciplinas();
  if (tabName === 'jogos') carregarJogos();
  if (tabName === 'perfil') renderizarPerfil();
}

// ==========================================
// 3. INICIALIZAÇÃO E FORMULÁRIOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  carregarTurmasCadastro();
  verificarSessao();

  // Formulário de Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert('Erro ao entrar: ' + error.message);
        return;
      }

      await verificarEstadoEEntrar(data.user);
    });
  }

  // Formulário de Cadastro
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('reg-nome').value;
      const turmaId = document.getElementById('reg-turma').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      // 1. Cadastra o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        alert('Erro ao criar conta: ' + authError.message);
        return;
      }

      if (authData.user) {
        // 2. Insere na tabela profiles como 'pendente'
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            nome_completo: nome,
            turma_id: turmaId,
            role: 'aluno',
            status: 'pendente'
          }
        ]);

        if (profileError) {
          alert('Erro ao guardar perfil: ' + profileError.message);
        } else {
          alert('Registo efetuado com sucesso! Aguarda a aprovação do teu professor para acederes.');
          
          // Desconecta sessão temporária do cadastro
          await supabase.auth.signOut();

          if (typeof toggleAuthMode === 'function') {
            toggleAuthMode('login');
          }
          registerForm.reset();
        }
      }
    });
  }
});

async function carregarTurmasCadastro() {
  const selectTurma = document.getElementById('reg-turma');
  if (!selectTurma) return;

  const { data: turmas, error } = await supabase.from('turmas').select('*').order('nome');
  if (!error && turmas) {
    selectTurma.innerHTML = '<option value="">Selecione a sua turma...</option>' + 
      turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
  }
}

async function verificarSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    await verificarEstadoEEntrar(session.user);
  }
}

async function verificarEstadoEEntrar(user) {
  // 1. Busca os dados do perfil sem JOINs que causam falhas de RLS
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    alert('Erro ao carregar os teus dados de perfil. O registo de perfil não existe ou não foi aprovado.');
    await supabase.auth.signOut();
    return;
  }

  // 2. Verifica aprovação
  if (profile.status === 'pendente') {
    alert('A tua conta ainda está a aguardar aprovação pelo professor.');
    await supabase.auth.signOut();
    return;
  }

  // 3. Obtém o nome da turma separadamente
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

  // Exibe a área autenticada
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-content').classList.remove('hidden');

  const userInfo = document.getElementById('user-info');
  if (userInfo) {
    userInfo.innerHTML = `👋 Olá, <strong class="text-emerald-400">${profile.apelido || profile.nome_completo}</strong> (${nomeTurma})`;
  }

  carregarAvisos();
}

// ==========================================
// 4. LÓGICA DO MURAL DE AVISOS (INÍCIO)
// ==========================================
async function carregarAvisos() {
  if (!alunoAtual) return;

  const { data: avisos, error } = await supabase
    .from('avisos')
    .select('*')
    .or(`aluno_id.eq.${alunoAtual.id},turma_id.eq.${alunoAtual.turma_id}`)
    .order('created_at', { ascending: false });

  const listaAvisos = document.getElementById('lista-avisos');
  if (!listaAvisos) return;

  if (error || !avisos || avisos.length === 0) {
    listaAvisos.innerHTML = '<p class="text-slate-400 text-sm">Sem avisos no mural de momento.</p>';
    return;
  }

  listaAvisos.innerHTML = avisos.map(aviso => `
    <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-emerald-500 shadow-md">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-bold text-emerald-400 text-lg">${aviso.titulo}</h3>
        <span class="text-xs text-slate-500">${new Date(aviso.created_at).toLocaleDateString('pt-PT')}</span>
      </div>
      <p class="text-slate-300 text-sm leading-relaxed">${aviso.mensagem}</p>
    </div>
  `).join('');
}

// ==========================================
// 5. LÓGICA DAS DISCIPLINAS (BNCC)
// ==========================================
async function carregarDisciplinas() {
  if (!alunoAtual) return;

  const { data: disciplinasLiberadas, error } = await supabase
    .from('turma_disciplinas')
    .select('disciplinas(*)')
    .eq('turma_id', alunoAtual.turma_id);

  const container = document.getElementById('lista-disciplinas');
  if (!container) return;

  if (error || !disciplinasLiberadas || disciplinasLiberadas.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-full">Ainda não existem disciplinas atribuídas à tua turma.</p>';
    return;
  }

  container.innerHTML = disciplinasLiberadas.map(item => {
    const disc = item.disciplinas;
    return `
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition shadow-lg flex flex-col justify-between">
        <div>
          <span class="text-xs font-semibold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">${disc.codigo_bncc || 'BNCC'}</span>
          <h3 class="text-lg font-bold text-slate-100 mt-2">${disc.nome}</h3>
          <p class="text-xs text-slate-400 mt-1">${disc.descricao || 'Conteúdos da disciplina.'}</p>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-6">
          <button onclick="abrirConteudo('${disc.id}', 'aula')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">🎬 Aulas</button>
          <button onclick="abrirConteudo('${disc.id}', 'material')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📁 Materiais</button>
          <button onclick="abrirConteudo('${disc.id}', 'prova')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📝 Provas</button>
        </div>
      </div>
    `;
  }).join('');
}

function abrirConteudo(disciplinaId, tipo) {
  alert(`A abrir os conteúdos do tipo [${tipo.toUpperCase()}] para a disciplina.`);
}

// ==========================================
// 6. LÓGICA DOS JOGOS PEDAGÓGICOS
// ==========================================
async function carregarJogos() {
  const { data: jogos, error } = await supabase.from('jogos').select('*');
  const container = document.getElementById('lista-jogos');
  if (!container) return;

  if (error || !jogos || jogos.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-full">Nenhum jogo pedagógico disponível no momento.</p>';
    return;
  }

  container.innerHTML = jogos.map(jogo => `
    <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between">
      <div>
        <h3 class="font-bold text-slate-100">${jogo.titulo}</h3>
        <p class="text-xs text-slate-400 mt-1">${jogo.descricao || ''}</p>
      </div>
      <a href="${jogo.url_jogo}" target="_blank" class="mt-4 block text-center bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded text-xs transition">Jogar Agora</a>
    </div>
  `).join('');
}

// ==========================================
// 7. LÓGICA DO PERFIL DO ALUNO
// ==========================================
async function renderizarPerfil() {
  if (!alunoAtual) return;

  const container = document.getElementById('dados-perfil');
  if (!container) return;

  const { data: meritos } = await supabase.from('meritos').select('*').eq('aluno_id', alunoAtual.id);

  container.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-emerald-400">
        ${(alunoAtual.nome_completo || 'A')[0]}
      </div>
      <div>
        <h3 class="text-lg font-bold text-slate-100">${alunoAtual.nome_completo}</h3>
        <p class="text-sm text-slate-400">Apelido: <span class="text-emerald-400">${alunoAtual.apelido || 'Não definido'}</span></p>
      </div>
    </div>

    <div class="border-t border-slate-800 pt-4 space-y-3">
      <h4 class="font-semibold text-emerald-400 text-sm">Editar Apelido</h4>
      <div class="flex gap-2">
        <input type="text" id="novo-apelido" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm flex-1" placeholder="Novo apelido de exibição" value="${alunoAtual.apelido || ''}">
        <button onclick="atualizarApelido()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs transition">Guardar</button>
      </div>
    </div>

    <div class="border-t border-slate-800 pt-4">
      <h4 class="font-semibold text-emerald-400 text-sm mb-2">Os Meus Méritos e Conquistas</h4>
      <div class="flex flex-wrap gap-2">
        ${meritos && meritos.length > 0 
          ? meritos.map(m => `<span class="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-medium">🏅 ${m.titulo}</span>`).join('')
          : '<p class="text-xs text-slate-500">Ainda não tens méritos atribuídos pelo teu professor.</p>'
        }
      </div>
    </div>
  `;
}

async function atualizarApelido() {
  const novoApelido = document.getElementById('novo-apelido').value;
  if (!novoApelido || !alunoAtual) return;

  const { error } = await supabase
    .from('profiles')
    .update({ apelido: novoApelido })
    .eq('id', alunoAtual.id);

  if (error) {
    alert('Erro ao atualizar apelido: ' + error.message);
  } else {
    alert('Apelido atualizado com sucesso!');
    alunoAtual.apelido = novoApelido;
    renderizarPerfil();
  }
}
