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

// Lista de Avatares CC (Animes, Estudo, Gamers, Jovens)
const AVATARES_PREDEFINIDOS = [
  // Anime / Mangá
  { nome: 'Anime Boy 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { nome: 'Anime Girl 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria' },
  { nome: 'Anime Boy 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zack' },
  { nome: 'Anime Girl 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna' },
  
  // Estudo / Estudantes
  { nome: 'Estudante 1', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student1' },
  { nome: 'Estudante 2', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student2' },
  { nome: 'Estudante 3', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student3' },
  { nome: 'Estudante 4', url: 'https://api.dicebear.com/7.x/open-peeps/svg?seed=Student4' },

  // Gamers & Estilo Jovem
  { nome: 'Gamer Pixel', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelGamer' },
  { nome: 'Cyber Jovem', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberStudent' },
  { nome: 'Jovem Cool', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CoolKid' },
  { nome: 'Jovem Creative', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Artist' }
];

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

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        alert('Erro ao criar conta: ' + authError.message);
        return;
      }

      if (authData.user) {
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
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    alert('Erro ao carregar os teus dados de perfil.');
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

  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-content').classList.remove('hidden');

  atualizarCabecalhoUsuario(nomeTurma);
  carregarAvisos();
}

function atualizarCabecalhoUsuario(nomeTurma = 'Sem Turma') {
  const userInfo = document.getElementById('user-info');
  if (userInfo && alunoAtual) {
    userInfo.innerHTML = `👋 Olá, <strong class="text-emerald-400">${alunoAtual.apelido || alunoAtual.nome_completo}</strong> (${nomeTurma})`;
  }
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
// 7. LÓGICA DO PERFIL COMPLETO (COM GALERIA DE AVATARES CC)
// ==========================================
async function renderizarPerfil() {
  if (!alunoAtual) return;

  const container = document.getElementById('dados-perfil');
  if (!container) return;

  const { data: meritos } = await supabase.from('meritos').select('*').eq('aluno_id', alunoAtual.id);

  // Avatar do Usuário
  const avatarHTML = alunoAtual.avatar_url 
    ? `<img src="${alunoAtual.avatar_url}" class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 bg-slate-800" alt="Avatar">`
    : `<div class="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-emerald-400">${(alunoAtual.nome_completo || 'A')[0]}</div>`;

  // Render da Galeria de Avatares CC
  const galeriaAvataresHTML = AVATARES_PREDEFINIDOS.map(a => `
    <button onclick="selecionarAvatarPredefinido('${a.url}')" class="group relative p-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 transition focus:outline-none">
      <img src="${a.url}" class="w-12 h-12 rounded-lg bg-slate-900 object-cover" title="${a.nome}" alt="${a.nome}">
    </button>
  `).join('');

  container.innerHTML = `
    <!-- Topo do Perfil -->
    <div class="flex items-center gap-4">
      ${avatarHTML}
      <div>
        <h3 class="text-lg font-bold text-slate-100">${alunoAtual.nome_completo}</h3>
        <p class="text-sm text-slate-400">Apelido: <span class="text-emerald-400">${alunoAtual.apelido || 'Não definido'}</span></p>
      </div>
    </div>

    <!-- 1. EDITAR NOME E APELIDO -->
    <div class="border-t border-slate-800 pt-4 space-y-3">
      <h4 class="font-semibold text-emerald-400 text-sm">👤 Alterar Dados Pessoais</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Nome Completo</label>
          <input type="text" id="novo-nome" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm w-full" value="${alunoAtual.nome_completo || ''}">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Apelido de Exibição</label>
          <input type="text" id="novo-apelido" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm w-full" value="${alunoAtual.apelido || ''}">
        </div>
      </div>
      <button onclick="atualizarDadosPessoais()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs transition">Guardar Dados</button>
    </div>

    <!-- 2. ESCOLHER FOTO DE PERFIL / GALERIA DE AVATARES CC -->
    <div class="border-t border-slate-800 pt-4 space-y-4">
      <h4 class="font-semibold text-emerald-400 text-sm">🎨 Escolher Avatar Temático (Animes, Estudo, Gamers)</h4>
      
      <!-- Galeria de ícones predefinidos -->
      <div class="flex flex-wrap gap-3 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
        ${galeriaAvataresHTML}
      </div>

      <!-- Ou inserir link customizado -->
      <div>
        <label class="block text-xs text-slate-400 mb-1">Ou cole o link (URL) da sua imagem:</label>
        <div class="flex gap-2">
          <input type="url" id="novo-avatar" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm flex-1" placeholder="https://..." value="${alunoAtual.avatar_url || ''}">
          <button onclick="atualizarAvatar()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs transition">Usar URL Customizada</button>
        </div>
      </div>
    </div>

    <!-- 3. ALTERAR SENHA -->
    <div class="border-t border-slate-800 pt-4 space-y-3">
      <h4 class="font-semibold text-emerald-400 text-sm">🔒 Alterar Senha de Acesso</h4>
      <div class="flex gap-2">
        <input type="password" id="nova-senha" class="p-2 bg-slate-950 rounded border border-slate-800 text-sm flex-1" placeholder="Nova senha (mínimo 6 caracteres)" minlength="6">
        <button onclick="alterarSenha()" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs transition">Alterar Senha</button>
      </div>
    </div>

    <!-- 4. MÉTITOS -->
    <div class="border-t border-slate-800 pt-4">
      <h4 class="font-semibold text-emerald-400 text-sm mb-2">🏅 Os Meus Méritos e Conquistas</h4>
      <div class="flex flex-wrap gap-2">
        ${meritos && meritos.length > 0 
          ? meritos.map(m => `<span class="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-medium">🏅 ${m.titulo}</span>`).join('')
          : '<p class="text-xs text-slate-500">Ainda não tens méritos atribuídos pelo teu professor.</p>'
        }
      </div>
    </div>
  `;
}

// Função: Selecionar Avatar da Galeria
async function selecionarAvatarPredefinido(url) {
  document.getElementById('novo-avatar').value = url;
  await atualizarAvatar();
}

// Função: Atualizar Dados Pessoais
async function atualizarDadosPessoais() {
  const novoNome = document.getElementById('novo-nome').value.trim();
  const novoApelido = document.getElementById('novo-apelido').value.trim();

  if (!novoNome || !alunoAtual) {
    alert('O nome completo não pode estar em branco.');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      nome_completo: novoNome,
      apelido: novoApelido 
    })
    .eq('id', alunoAtual.id);

  if (error) {
    alert('Erro ao atualizar dados: ' + error.message);
  } else {
    alert('Dados atualizados com sucesso!');
    alunoAtual.nome_completo = novoNome;
    alunoAtual.apelido = novoApelido;
    atualizarCabecalhoUsuario();
    renderizarPerfil();
  }
}

// Função: Atualizar Avatar (Foto)
async function atualizarAvatar() {
  const novoAvatar = document.getElementById('novo-avatar').value.trim();
  if (!alunoAtual) return;

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: novoAvatar })
    .eq('id', alunoAtual.id);

  if (error) {
    alert('Erro ao atualizar foto: ' + error.message);
  } else {
    alert('Foto de perfil atualizada com sucesso!');
    alunoAtual.avatar_url = novoAvatar;
    renderizarPerfil();
  }
}

// Função: Alterar Senha
async function alterarSenha() {
  const novaSenha = document.getElementById('nova-senha').value;

  if (!novaSenha || novaSenha.length < 6) {
    alert('A nova senha deve ter no mínimo 6 caracteres.');
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) {
    alert('Erro ao alterar senha: ' + error.message);
  } else {
    alert('Senha alterada com sucesso!');
    document.getElementById('nova-senha').value = '';
  }
}
