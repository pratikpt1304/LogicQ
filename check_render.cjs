async function checkRender() {
  const base = 'https://logicq-bitwiseclub.onrender.com/api';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@logicq.io',
      password: 'AdminPassword123!',
    }),
  });
  const login = await loginRes.json();
  console.log('Admin login keys:', Object.keys(login));
  const token = login.accessToken || login.token || login.data?.accessToken || login.data?.token;
  console.log('Token exists:', Boolean(token));

  if (token) {
    const authHeaders = { Authorization: `Bearer ${token}` };

    const secRes = await fetch(`${base}/sections`, { headers: authHeaders });
    const sec = await secRes.json();
    console.log('Remote Sections Count:', sec.sections?.length || sec.data?.length || 0);
    console.log('Sections:', sec.sections || sec.data);

    const testsRes = await fetch(`${base}/assessment-tests`, { headers: authHeaders });
    const tests = await testsRes.json();
    console.log('Remote Tests Count:', tests.data?.length || tests.tests?.length || 0);
    console.log('Tests:', tests.data || tests.tests);
  }
}

checkRender().catch(console.error);
