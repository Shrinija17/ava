const { readHeartbeat, readMemory, appendDailyLog } = require('./memory-system');

class Heartbeat {
  constructor({ intervalMs = 15 * 60 * 1000, onTick }) {
    this.intervalMs = intervalMs;
    this.onTick = onTick; // callback: (context) => void
    this.timer = null;
    this.tickCount = 0;
  }

  start() {
    if (this.timer) return;
    console.log(`[Heartbeat] Starting with interval ${this.intervalMs / 1000}s`);

    // First tick after 60s (let the app settle)
    setTimeout(() => {
      this.tick();
      this.timer = setInterval(() => this.tick(), this.intervalMs);
    }, 60000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    this.tickCount++;
    const heartbeatConfig = readHeartbeat();
    const memory = readMemory();
    const now = new Date();
    const hour = now.getHours();

    // Only run during active hours (8am - 11pm)
    if (hour < 8 || hour > 23) {
      console.log('[Heartbeat] Outside active hours, skipping');
      return;
    }

    const context = {
      tickCount: this.tickCount,
      time: now.toLocaleTimeString(),
      date: now.toLocaleDateString(),
      heartbeatConfig,
      memory,
      isHourlyTick: this.tickCount % 4 === 0, // every 4th tick = ~hourly
    };

    appendDailyLog(`Heartbeat tick #${this.tickCount}`);

    try {
      await this.onTick?.(context);
    } catch (err) {
      console.error('[Heartbeat] Tick error:', err);
    }
  }
}

module.exports = { Heartbeat };
