import fs from "node:fs";

const authPath = `${process.env.APPDATA}\\xdg.data\\com.vercel.cli\\auth.json`;
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const token = auth.token;
const deploymentId = 'dpl_6uqzPqAUGZSqquogcq1M1UbFm7sf';
const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}` , {
  headers: { Authorization: `Bearer ${token}` }
});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
const out = {
  id: data.id,
  name: data.name,
  url: data.url,
  createdAt: data.createdAt,
  readyState: data.readyState,
  target: data.target,
  alias: data.alias,
  meta: data.meta,
  gitSource: data.gitSource,
};
console.log(JSON.stringify(out, null, 2));
