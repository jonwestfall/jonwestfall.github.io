export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return sum(values) / values.length
}

export function variance(values: number[], sample = true): number {
  if (values.length < (sample ? 2 : 1)) return Number.NaN
  const m = mean(values)
  const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0)
  return ss / (sample ? values.length - 1 : values.length)
}

export function sd(values: number[], sample = true): number {
  return Math.sqrt(variance(values, sample))
}

export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return Number.NaN
  const mx = mean(x)
  const my = mean(y)
  let acc = 0
  for (let i = 0; i < x.length; i += 1) acc += (x[i] - mx) * (y[i] - my)
  return acc / (x.length - 1)
}

export function pearsonR(x: number[], y: number[]): number {
  const cov = covariance(x, y)
  const sdx = sd(x)
  const sdy = sd(y)
  return cov / (sdx * sdy)
}

export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax))
  return sign * y
}

export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

// Lanczos approximation.
export function logGamma(z: number): number {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
  }

  let x = 0.9999999999998099
  const z1 = z - 1
  for (let i = 0; i < p.length; i += 1) x += p[i] / (z1 + i + 1)
  const t = z1 + p.length - 0.5
  return 0.9189385332046727 + (z1 + 0.5) * Math.log(t) - t + Math.log(x)
}

function betacf(a: number, b: number, x: number): number {
  const maxIter = 200
  const eps = 3e-14
  const fpMin = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < fpMin) d = fpMin
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIter; m += 1) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + aa / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    h *= d * c

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + aa / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < eps) break
  }
  return h
}

export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t)
  const ib = regularizedIncompleteBeta(x, df / 2, 0.5)
  if (t >= 0) return 1 - 0.5 * ib
  return 0.5 * ib
}

function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return Number.NaN
  if (x === 0) return 0
  if (x < a + 1) {
    let ap = a
    let del = 1 / a
    let sumVal = del
    for (let n = 1; n <= 200; n += 1) {
      ap += 1
      del *= x / ap
      sumVal += del
      if (Math.abs(del) < Math.abs(sumVal) * 1e-14) break
    }
    return sumVal * Math.exp(-x + a * Math.log(x) - logGamma(a))
  }

  let b = x + 1 - a
  let c = 1 / 1e-30
  let d = 1 / b
  let h = d
  for (let i = 1; i <= 200; i += 1) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-30) d = 1e-30
    c = b + an / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

export function chiSquareCdf(x: number, k: number): number {
  return regularizedGammaP(k / 2, x / 2)
}
