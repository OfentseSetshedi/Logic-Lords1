const app = require('./app');
const { env, validateEnv } = require('./config/env');

validateEnv();

const PORT = env.port || process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("");
  console.log("✅ AI Natives backend is running");
  console.log(`🌐 Open this link: http://localhost:${PORT}`);
  console.log(`🌐 Or use:        http://127.0.0.1:${PORT}`);
  console.log("");
});
