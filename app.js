// ==========================================
// 5. LÓGICA DAS DISCIPLINAS E CONTEÚDOS DAS AULAS
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
          <button onclick="abrirAulasDisciplina('${disc.id}')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">🎬 Aulas</button>
          <button onclick="abrirConteudo('${disc.id}', 'material')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📁 Materiais</button>
          <button onclick="abrirConteudo('${disc.id}', 'prova')" class="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-semibold py-2 px-1 rounded text-xs transition text-center">📝 Provas</button>
        </div>
      </div>
    `;
  }).join('');
}

// Lógica para abrir a aula com credenciais do aluno logado
function abrirAulasDisciplina(disciplinaId) {
  if (!alunoAtual) return;

  // Prepara os dados na sessão
  const alunoDados = {
    id: alunoAtual.id,
    nome: alunoAtual.nome_completo,
    turma: alunoAtual.turma_id || 'Geral'
  };
  sessionStorage.setItem('active_student', JSON.stringify(alunoDados));

  // Monta a URL com parâmetros seguros
  const params = new URLSearchParams({
    id: alunoAtual.id,
    nome: alunoAtual.nome_completo,
    turma: alunoDados.turma
  });

  // Abre a aula interativa
  window.open(`aulainterativa/intro_hw_sw.html?${params.toString()}`, '_blank');
}
