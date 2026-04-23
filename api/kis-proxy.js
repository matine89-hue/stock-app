export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const { action, appkey, appsecret, token, stockCode } = body;

    const KIS = 'https://openapi.koreainvestment.com:9443';

    function kisHeader(trId) {
      return {
        'Content-Type': 'application/json; charset=utf-8',
        'authorization': 'Bearer ' + token,
        'appkey': appkey,
        'appsecret': appsecret,
        'tr_id': trId,
        'custtype': 'P',
      };
    }

    // ✅ 거래량 순위
    if (action === 'volumeRank') {

      async function fetchMarket(code) {
        const params = new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: code,
          FID_COND_SCR_DIV_CODE: '20171',
          FID_INPUT_ISCD: '0000',
        });

        const r = await fetch(
          KIS + '/uapi/domestic-stock/v1/quotations/volume-rank?' + params.toString(),
          { method: 'GET', headers: kisHeader('FHPST01710000') }
        );

        const json = await r.json();

        // 🔥 핵심: output2 fallback
        return json.output || json.output2 || [];
      }

      const kospi = await fetchMarket('J');
      const kosdaq = await fetchMarket('Q');

      // 🔥 완전히 다른 배열로 병합 (참조 분리)
      const merged = [...kospi.map(x => ({...x, market:'KOSPI'})),
                      ...kosdaq.map(x => ({...x, market:'KOSDAQ'}))];

      return res.status(200).json({ output: merged });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
