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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const tableName = process.env.SUPABASE_TABLE_NAME || 'lotto_results';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(tableName)}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify([{ numbers: numbers.join(',') }])
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(response.status).json({ error: 'Supabase 저장 실패', detail });
  }

  return res.status(200).json({ success: true, numbers });
};
