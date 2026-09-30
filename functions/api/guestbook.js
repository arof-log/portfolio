const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function sanitizeText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifyTurnstile(secret, token, remoteip) {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token || '');
  if (remoteip) formData.append('remoteip', remoteip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  return result.success === true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ message: '올바른 요청 형식이 아닙니다.' }, 400);
  }

  const name = String(payload?.name || '').trim();
  const message = String(payload?.message || '').trim();
  const website = String(payload?.website || '').trim();
  const turnstileToken = String(payload?.turnstileToken || '').trim();

  // Honeypot: 정상 사용자는 비어 있어야 합니다.
  if (website) return json({ ok: true });

  if (!name || !message) {
    return json({ message: '이름과 메시지는 필수입니다.' }, 400);
  }
  if (name.length > 40 || message.length > 500) {
    return json({ message: '이름은 40자, 메시지는 500자 이내로 작성해주세요.' }, 400);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    const remoteip = request.headers.get('CF-Connecting-IP') || '';
    const verified = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, remoteip);
    if (!verified) {
      return json({ message: '스팸 방지 확인에 실패했습니다.' }, 403);
    }
  }

  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    console.error('Missing GitHub environment variables');
    return json({ message: '서버 설정이 완료되지 않았습니다.' }, 500);
  }

  const createdAt = new Date().toISOString();
  const safeName = sanitizeText(name);
  const safeMessage = sanitizeText(message);
  const shortId = crypto.randomUUID().slice(0, 8);
  const timestamp = createdAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const path = `content/guestbook/${timestamp}-${shortId}.md`;

  const fileContent =
`---
name: ${JSON.stringify(safeName)}
createdAt: ${JSON.stringify(createdAt)}
approved: false
---

${safeMessage}
`;

  const githubResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'cloudflare-pages-guestbook',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add guestbook message from ${name.slice(0, 20)}`,
        content: utf8ToBase64(fileContent),
        branch,
      }),
    }
  );

  if (!githubResponse.ok) {
    console.error('GitHub write failed', githubResponse.status, await githubResponse.text());
    return json({ message: '메시지를 저장하지 못했습니다.' }, 502);
  }

  return json({ ok: true, message: '메시지가 저장되었습니다.' }, 201);
}

export function onRequestGet() {
  return json({ message: 'Method Not Allowed' }, 405);
}
