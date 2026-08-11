module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (!body) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      return res.status(400).json({ error: '잘못된 요청 본문입니다.' });
    }
  }

  const numbers = Array.isArray(body?.numbers)
    ? body.numbers
    : typeof body?.numbers === 'string'
      ? body.numbers.split(',').map((value) => value.trim()).filter(Boolean)
      : [];

  if (numbers.length !== 6) {
    return res.status(400).json({ error: '6개의 번호가 필요합니다.' });
  }

  const rawSupabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const tableName = (process.env.SUPABASE_TABLE_NAME || 'lotto_results').trim();

  if (!rawSupabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
  const endpoint = `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}`;
  const payload = {
    numbers: numbers.join(','),
    created_at: new Date().toISOString()
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify([payload])
  });

  if (!response.ok) {
    const detailText = await response.text();
    let detail = detailText;

    try {
      const parsed = JSON.parse(detailText);
      detail = parsed?.message || parsed?.error || detailText;
    } catch (error) {
      // keep raw text if it is not JSON
    }

    if (response.status === 401 || response.status === 403) {
      return res.status(response.status).json({
        error: 'Supabase 인증이 거부되었습니다. RLS 정책을 허용하거나 서비스 역할 키를 설정해 주세요.',
        detail
      });
    }

    if (response.status === 404) {
      return res.status(404).json({
        error: 'Supabase 테이블을 찾을 수 없습니다. 테이블 이름을 확인해 주세요.',
        detail,
        endpoint,
        tableName
      });
    }

    return res.status(response.status).json({ error: 'Supabase 저장 실패', detail, endpoint, payload });
  }

  return res.status(200).json({ success: true, numbers });
};
