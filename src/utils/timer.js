class Timer {
  #strart = 0;

  start() {
    this.#strart = process.hrtime();
  }

  end() {
    return (process.hrtime(this.#strart)[1] / 1e6).toFixed(3);
  }
}

module.exports = Timer;
