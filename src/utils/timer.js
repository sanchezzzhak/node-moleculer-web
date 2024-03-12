class Timer {
  __strart = 0;

  start() {
    this.__strart = process.hrtime();
  }

  end() {
    return (process.hrtime(this.__strart)[1] / 1e6).toFixed(3);
  }
}

module.exports = Timer;
