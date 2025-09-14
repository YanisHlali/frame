if (process.env.SKIP_TWEET === '1') {
  console.log('Tweet skipped (maintenance/restart)');
  process.exit(0);
}

require('dotenv').config({ path: '/home/ubuntu/twin-peaks-frame-bot/.env' });

function shouldTweet() {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  return minutes % 10 === 0 && seconds < 30;
}

async function runScheduler() {
  try {
    console.log(`Scheduler started at ${new Date().toISOString()}`);
    console.log(`Display: ${process.env.DISPLAY}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    if (!shouldTweet()) {
      const now = new Date();
      const nextTweetMinute = Math.ceil(now.getMinutes() / 10) * 10;
      console.log(`Not time to tweet yet. Next tweet at minute ${nextTweetMinute}`);
      process.exit(0);
    }

    const requiredEnvVars = ['CONTENT_ID', 'FIREBASE_SERVICE_ACCOUNT_BASE64'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('Executing scheduled tweet...');
    const { startScheduledTweeting } = require('../../dist/scheduler/index');
    await startScheduledTweeting();
    console.log('Tweet sent successfully');
  } catch (error) {
    console.error("Scheduler failed:", error.message);
    const fs = require('fs');
    const logDir = './logs';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const errorLog = `${new Date().toISOString()} - ERROR: ${error.message}\n${error.stack}\n\n`;
    fs.appendFileSync('./logs/error.log', errorLog);
    throw error;
  }
}

module.exports = runScheduler;

if (require.main === module) {
  runScheduler();
}
