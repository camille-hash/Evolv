import fs from "node:fs";

const authPath = `${process.env.APPDATA}\\xdg.data\\com.vercel.cli\\auth.json`;
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.token;
const response = await fetch('https://api.vercel.com/v6/deployments?projectId=prj_l9y9tBjv1ediYhm6Ilymj4Vb7CT2&target=production&limit=5', {
  headers: { Authorization: `Bearer ${token}` }
});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
const out = (data.deployments ?? []).map((item) => ({
  id: item.uid,
  url: item.url,
  state: item.state,
  created: item.created,
  target: item.target,
  meta: item.meta,
  gitSource: item.gitSource,
  alias: item.alias,
}));
console.log(JSON.stringify(out, null, 2));
