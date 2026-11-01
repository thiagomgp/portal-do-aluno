// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://iivgusjzerzqrdgctcvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpdmd1c2p6ZXJ6cXJkZ2N0Y3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0Nzg5NzksImV4cCI6MjEwOTA1NDk3OX0.ewJXSEfaCRGOT9SKiggf6pbrieDNOPgdG39pEoRa5Qc';

if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var supabase = window.supabaseClient;

let alunoAtual = null;

const AVATARES_PREDEFINIDOS = [
  { nome: 'Anime Boy 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { nome: 'Anime Girl 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria' },
  { nome: 'Anime Boy 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zack' },
  { nome: 'Anime Girl 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna' },
  { nome: 'Estudante 1', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student1' },
  { nome: 'Estudante 2', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student2' },
  { nome: 'Gamer Pixel', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelGamer' },
  { nome: 'Cyber Jovem', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberStudent' }
];

// ==========================================
// 2. FUNÇÕES DE AUTENTICAÇÃO E SESSÃO
// ==========================================
async function realizarLogin(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert('Por favor, preencha o e-mail e a senha.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Erro ao entrar: ' + error.message);
      return;
    }
    if (data && data.user) {
      await verificarEstadoEEntrar(data.user);
    }
  } catch (err) {
    console.error('Erro inesperado no login:', err);
  }
}

async function realizarRegistro(e) {
  if (e) e.preventDefault();

  const nome = document.getElementById('reg-nome')?.value.trim();
  const turmaId = document.getElementById('reg-turma')?.value;
  const email = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;

  if (!nome || !turmaId || !email || !password) {
    alert('Preencha todos os campos do formulário de cadastro.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome_completo: nome, turma_id: turmaId }
      }
    });

    if (error) {
      alert('Erro no cadastro: ' + error.message);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').insert([{
        id: data.user.id,
        nome_completo: nome,
        turma_id: turmaId,
        status: 'pendente'
      }]);

      alert('Cadastro realizado! Sua conta aguarda aprovação pelo professor.');
      document.getElementById('register-form').reset();
      if (typeof toggleAuthMode === 'function') toggleAuthMode('login');
    }
  } catch (err) {
    console.error('Erro ao cadastrar:', err);
  }
}

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
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      alert('Perfil não encontrado.');
      await supabase.auth.signOut();
      return;
    }

    if (profile.status === 'pendente') {
      alert('Sua conta aguarda aprovação pelo professor.');
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
      if (turma) nomeTurma = turma.nome;
    }

    alunoAtual = profile;

    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('app-content')?.classList.remove('hidden');

    atualizarCabecalhoUsuario(nomeTurma);
    carregarAvisos();
  } catch (err) {
    console.error('Erro ao verificar estado:', err);
  }
}

function atualizarCabecalhoUsuario(nomeTurma = 'Sem Turma') {
  const nameEl = document.getElementById('student-display-name');
  const classEl = document.getElementById('student-display-class');
  
  if (nameEl && alunoAtual) {
    nameEl.innerText = alunoAtual.apelido || alunoAtual.nome_completo;
  }
  if (classEl) {
    classEl.innerText = nomeTurma;
  }
}

async function fazerLogout() {
  await supabase.auth.signOut();
  sessionStorage.removeItem('active_student');
  window.location.reload();
}

// ==========================================
// 3. NAVEGAÇÃO ENTRE ABAS
// ==========================================
function mudarAbaPortal(aba) {
  document.getElementById('secao-inicio')?.classList.toggle('hidden', aba !== 'inicio');
  document.getElementById('secao-disciplinas')?.classList.toggle('hidden', aba !== 'disciplinas');
  document.getElementById('secao-jogos')?.classList.toggle('hidden', aba !== 'jogos');
  document.getElementById('secao-perfil')?.classList.toggle('hidden', aba !== 'perfil');

  const abas = ['inicio', 'disciplinas', 'jogos', 'perfil'];
  abas.forEach(a => {
    const btn = document.getElementById(`btn-nav-${a}`);
    if (btn) {
      btn.className = a === aba
        ? 'px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 shadow transition flex items-center gap-2'
        : 'px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-2';
    }
  });

  if (aba === 'disciplinas') carregarDisciplinas();
  if (aba === 'jogos') carregarJogos();
  if (aba === 'perfil') renderizarPerfil();
}

// ==========================================
// 4. MURAL DE AVISOS
// ==========================================
async function carregarAvisos() {
  if (!alunoAtual) return;
  const { data: avisos } = await supabase
    .from('avisos')
    .select('*')
    .or(`aluno_id.eq.${alunoAtual.id},turma_id.eq.${alunoAtual.turma_id}`)
    .order('created_at', { ascending: false });

  const listaAvisos = document.getElementById('lista-avisos');
  if (!listaAvisos) return;

  if (!avisos || avisos.length === 0) {
    listaAvisos.innerHTML = '<p class="text-slate-400 text-sm">Sem avisos no mural no momento.</p>';
    return;
  }

  listaAvisos.innerHTML = avisos.map(aviso => `
    <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-emerald-500 shadow-md">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-bold text-emerald-400 text-lg">${aviso.titulo}</h3>
        <span class="text-xs text-slate-500">${new Date(aviso.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
      <p class="text-slate-300 text-sm leading-relaxed">${aviso.mensagem}</p>
    </div>
  `).join('');
}

// ==========================================
// 5. DISCIPLINAS & AULAS
// ==========================================
async function carregarDisciplinas() {
  if (!alunoAtual) return;

  const { data: disciplinasLiberadas } = await supabase
    .from('turma_disciplinas')
    .select('disciplinas(*)')
    .eq('turma_id', alunoAtual.turma_id);

  const container = document.getElementById('lista-disciplinas');
  if (!container) return;

  if (!disciplinasLiberadas || disciplinasLiberadas.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-full">Nenhuma disciplina atribuída à sua turma no momento.</p>';
    return;
  }

  container.innerHTML = disciplinasLiberadas.map(item => {
    const disc = item.disciplinas;
    if (!disc) return '';
    return `
      <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition shadow-lg flex flex-col justify-between">
        <div>
          <span class="text-xs font-semibold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">${disc.codigo_bncc || 'BNCC'}</span>
          <h3 class="text-lg font-bold text-slate-100 mt-2">${disc.nome}</h3>
          <p class="text-xs text-slate-400 mt-1">${disc.descricao || 'Conteúdos da disciplina.'}</p>
        </div>
        
        <div class="flex flex-wrap gap-2 mt-6">
          <button onclick="abrirConteudo('${disc.id}', 'aula')" class="w-32 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">🎬 Aulas</button>
          <button onclick="abrirConteudo('${disc.id}', 'material')" class="w-32 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📁 Materiais</button>
          <button onclick="abrirConteudo('${disc.id}', 'prova')" class="w-32 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📝 Provas</button>
        </div>
      </div>
    `;
  }).join('');
}

async function abrirConteudo(disciplinaId, tipo) {
  const modal = document.getElementById('modal-conteudos');
  const tituloModal = document.getElementById('modal-conteudos-titulo');
  const container = document.getElementById('lista-itens-conteudo');
  if (!modal || !container || !alunoAtual) return;

  const titulos = { aula: '🎬 Aulas Disponíveis', material: '📁 Materiais de Estudo', prova: '📝 Avaliações e Provas' };
  if (tituloModal) tituloModal.innerText = titulos[tipo] || 'Conteúdos';

  container.innerHTML = '<p class="text-slate-400 text-xs py-4 text-center">Carregando conteúdos...</p>';
  modal.classList.remove('hidden');

  const { data: conteudos, error } = await supabase
    .from('conteudos_disciplina')
    .select('*')
    .eq('disciplina_id', disciplinaId)
    .eq('tipo', tipo)
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar conteúdos:', error);
    container.innerHTML = `<p class="text-rose-400 text-xs py-4 text-center">Erro: ${error.message}</p>`;
    return;
  }

  if (!conteudos || conteudos.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-xs py-4 text-center">Nenhum recurso cadastrado para este tópico.</p>';
  } else {
    container.innerHTML = conteudos.map(item => `
      <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition">
        <div>
          <h4 class="font-bold text-slate-100 text-sm">${item.titulo}</h4>
          <p class="text-xs text-slate-400 mt-1">${item.descricao || ''}</p>
        </div>
        <button onclick="acessarRecurso('${item.url_recurso}')" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition whitespace-nowrap ml-3">
          Acessar
        </button>
      </div>
    `).join('');
  }
}

function fecharModalConteudos() {
  document.getElementById('modal-conteudos')?.classList.add('hidden');
}

function acessarRecurso(urlRecurso) {
  if (!alunoAtual || !urlRecurso) return;

  const studentData = {
    id: alunoAtual.id,
    nome: alunoAtual.nome_completo,
    turma: alunoAtual.turma_id || 'Geral'
  };

  sessionStorage.setItem('active_student', JSON.stringify(studentData));

  const params = new URLSearchParams({
    id: alunoAtual.id,
    nome: alunoAtual.nome_completo,
    turma: studentData.turma
  });

  fecharModalConteudos();
  
  if (urlRecurso.startsWith('http://') || urlRecurso.startsWith('https://')) {
    window.open(urlRecurso, '_blank');
  } else {
    window.location.href = `${urlRecurso}?${params.toString()}`;
  }
}

// ==========================================
// 6. JOGOS PEDAGÓGICOS
// ==========================================
async function carregarJogos() {
  const { data: jogos } = await supabase.from('jogos').select('*');
  const container = document.getElementById('lista-jogos');
  if (!container) return;

  if (!jogos || jogos.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-full">Nenhum jogo disponível no momento.</p>';
    return;
  }

  container.innerHTML = jogos.map(j => `
    <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between">
      <div>
        <h3 class="font-bold text-slate-100">${j.titulo}</h3>
        <p class="text-xs text-slate-400 mt-1">${j.descricao || ''}</p>
      </div>
      <a href="${j.url_jogo}" target="_blank" class="mt-4 block text-center bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded text-xs transition">Jogar Agora</a>
    </div>
  `).join('');
}

// ==========================================
// 7. PERFIL DO ALUNO
// ==========================================
async function renderizarPerfil() {
  if (!alunoAtual) return;
  const container = document.getElementById('dados-perfil');
  if (!container) return;

  const avatarHTML = alunoAtual.avatar_url 
    ? `<img src="${alunoAtual.avatar_url}" class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 bg-slate-800" alt="Avatar">`
    : `<div class="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-emerald-400">${(alunoAtual.nome_completo || 'A')[0]}</div>`;

  const galeriaAvataresHTML = AVATARES_PREDEFINIDOS.map(a => `
    <button type="button" onclick="selecionarAvatarPredefinido('${a.url}')" class="p-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 transition">
      <img src="${a.url}" class="w-12 h-12 rounded-lg bg-slate-900 object-cover" title="${a.nome}">
    </button>
  `).join('');

  container.innerHTML = `
    <div class="flex items-center gap-4">
      ${avatarHTML}
      <div>
        <h3 class="text-lg font-bold text-slate-100">${alunoAtual.nome_completo}</h3>
        <p class="text-sm text-slate-400">Apelido: <span class="text-emerald-400">${alunoAtual.apelido || 'Não definido'}</span></p>
      </div>
    </div>

    <div class="border-t border-slate-800 pt-4 space-y-3">
      <h4 class="font-semibold text-emerald-400 text-sm">👤 Alterar Dados Pessoais</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="text" id="novo-nome" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm text-white" value="${alunoAtual.nome_completo || ''}">
        <input type="text" id="novo-apelido" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm text-white" value="${alunoAtual.apelido || ''}">
      </div>
      <button type="button" onclick="atualizarDadosPessoais()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs">Guardar Dados</button>
    </div>

    <div class="border-t border-slate-800 pt-4 space-y-4">
      <h4 class="font-semibold text-emerald-400 text-sm">🎨 Escolher Avatar</h4>
      <div class="flex flex-wrap gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">${galeriaAvataresHTML}</div>
    </div>
  `;
}

async function selecionarAvatarPredefinido(url) {
  if (!alunoAtual) return;
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', alunoAtual.id);
  alunoAtual.avatar_url = url;
  renderizarPerfil();
}

async function atualizarDadosPessoais() {
  const novoNome = document.getElementById('novo-nome')?.value.trim();
  const novoApelido = document.getElementById('novo-apelido')?.value.trim();
  if (!novoNome || !alunoAtual) return;

  await supabase.from('profiles').update({ nome_completo: novoNome, apelido: novoApelido }).eq('id', alunoAtual.id);
  alunoAtual.nome_completo = novoNome;
  alunoAtual.apelido = novoApelido;
  atualizarCabecalhoUsuario();
  renderizarPerfil();
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  carregarTurmasCadastro();
  verificarSessao();

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', realizarRegistro);
  }
});
