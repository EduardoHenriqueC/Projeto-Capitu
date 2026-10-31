import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ARQUIVO_SENHAS = 'senhas-temporarias.csv';

function senhaTemporaria() {
  return randomBytes(12).toString('base64url') + 'aA1!';
}

function normalizarRole(valor) {
  const r = String(valor || '').toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('supervis') || r.includes('lider') || r.includes('líder')) return 'supervisor';
  return 'operador';
}

function registrarSenha(email, senha) {
  if (!existsSync(ARQUIVO_SENHAS)) {
    writeFileSync(ARQUIVO_SENHAS, 'email,senha_temporaria\n', { mode: 0o600 });
  }
  appendFileSync(ARQUIVO_SENHAS, `${email},${senha}\n`);
}

async function criarUsuario({ email, nome, role }) {
  email = email.trim().toLowerCase();
  const senha = senhaTemporaria();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    return false;
  }

  const { error: erroPerfil } = await admin.from('perfis').insert({
    id: data.user.id,
    email,
    nome: (nome || email.split('@')[0]).trim(),
    role: normalizarRole(role),
    precisa_trocar_senha: true,
    ativo: true,
  });

  if (erroPerfil) {
    await admin.auth.admin.deleteUser(data.user.id);
    console.error(`✗ ${email}: falha ao criar perfil (${erroPerfil.message})`);
    return false;
  }

  registrarSenha(email, senha);
  console.log(`✓ ${email} (${normalizarRole(role)})`);
  return true;
}

async function migrar() {
  const { data: antigos, error } = await admin
    .from('usuarios')
    .select('email, nome, role, perfil');

  if (error) {
    console.error('Não consegui ler a tabela usuarios:', error.message);
    process.exit(1);
  }

  let ok = 0;
  for (const u of antigos) {
    if (!u.email) continue;
    const papel = u.role || u.perfil || 'operador';
    if (await criarUsuario({ email: u.email, nome: u.nome, role: papel })) ok++;
  }
  console.log(`\n${ok}/${antigos.length} usuários criados. Senhas salvas em ${ARQUIVO_SENHAS}.`);
}

async function resetar(email) {
  email = email.trim().toLowerCase();
  const { data: perfil, error } = await admin
    .from('perfis')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error || !perfil) {
    console.error('Usuário não encontrado em perfis.');
    process.exit(1);
  }

  const senha = senhaTemporaria();
  const { error: e1 } = await admin.auth.admin.updateUserById(perfil.id, { password: senha });
  if (e1) { console.error(e1.message); process.exit(1); }

  const { error: e2 } = await admin.from('perfis').update({ precisa_trocar_senha: true }).eq('id', perfil.id);
  if (e2) { console.error(e2.message); process.exit(1); }

  await admin.auth.admin.signOut(perfil.id, 'global').catch(() => {});
  registrarSenha(email, senha);
  console.log(`✓ Senha de ${email} redefinida. Veja ${ARQUIVO_SENHAS}.`);
}

const [modo, ...args] = process.argv.slice(2);

if (modo === '--migrar') {
  await migrar();
} else if (modo === '--novo' && args.length >= 2) {
  const [email, nome, role] = args;
  await criarUsuario({ email, nome, role: role || 'operador' });
} else if (modo === '--reset' && args.length >= 1) {
  await resetar(args[0]);
} else {
  console.log('Uso:\n  --migrar\n  --novo <email> "<nome>" [operador|supervisor|admin]\n  --reset <email>');
}