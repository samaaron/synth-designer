window.addEventListener('DOMContentLoaded', init);

function init() {
  console.log("init");
  const f1 = new PiecewiseLinear([800, 350, 270, 450, 325]);
  const a1 = new PiecewiseLinear([0, 0, 0, 0, 0]);
  const b1 = new PiecewiseLinear([80, 60, 60, 70, 50]);

  const f2 = new PiecewiseLinear([1150, 2000, 2140, 800, 700]);
  const a2 = new PiecewiseLinear([-6, -20, -12, -11, -16]);
  const b2 = new PiecewiseLinear([90, 100, 90, 80, 60]);

  const f3 = new PiecewiseLinear([2900, 2800, 2950, 2830, 2700]);
  const a3 = new PiecewiseLinear([-32, -15, -26, -22, -35]);
  const b3 = new PiecewiseLinear([120, 120, 100, 100, 170]);

  for (let i = 0; i < 21; i++) {
    let x = i * (1 / 20);
    console.log(`x=${x} y=${f1.interpolate(x)}`);
  }
}

class PiecewiseLinear {

  #delta
  #points

  constructor(points) {
    this.#points = points;
    this.#delta = 1 / this.#points.length;
  }

  interpolate(x) {
    // x must be between 0 and 1
    if (x < 0) x = 0;
    if (x > 1) x = 1;
    // find the nearest point
    for (let i = 0; i < this.#points.length - 1; i++) {
      const p1 = this.#points[i];
      const p2 = this.#points[i + 1];
      let x1 = i * this.#delta;
      let x2 = (i + 1) * this.#delta;
      if (x >= x1 && x <= x2) {
        const t = (x - x1) / this.#delta;
        return p1 * (1 - t) + p2 * t;
      }
    }
    // if x is exactly at the last point
    return this.#points[this.#points.length - 1];
  }
}
