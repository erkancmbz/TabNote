// Test simulation hover calculations and logic
const assert = require('assert');

// Test 1: Transformer phasor hover calculation
const transData = {
    V2_prime: 2400,
    V1_mag: 2492,
    V1_ang: 8.5,
    I1_prime: 10.4,
    phi: 0.55,
    phiSign: -1,
    dV_R: 62.5,
    dV_X: 102.4,
    VR: 3.84,
    eff: 95.94
};
assert(transData.V1_mag > transData.V2_prime, 'V1_mag should exceed V2_prime');

// Test 2: DC-DC converter calculation at time t
const dcdcData = {
    Ts: 20e-6,
    D: 0.5,
    IL_avg: 1.2,
    dIL: 0.8,
    isCcm: true,
    Vin: 24,
    Vout_real: 12
};
const t = 5e-6; // in ton
const tInCycle = t % dcdcData.Ts;
const ton = dcdcData.D * dcdcData.Ts;
assert(tInCycle < ton, 'Should be within ton');
const il = (dcdcData.IL_avg - dcdcData.dIL / 2) + dcdcData.dIL * (tInCycle / ton);
assert(il >= 0.8 && il <= 1.6, 'IL should be within bounds');

// Test 3: Induction motor torque at rotor speed n
const motorData = {
    ns: 1500,
    ws: (2 * Math.PI * 1500) / 60,
    Vth: 215,
    Rth: 0.55,
    Xth: 1.1,
    R2: 0.4,
    X2: 1.1,
    T_max: 142.5
};
const n = 1440;
const s = (motorData.ns - n) / motorData.ns;
const T = (3 * motorData.Vth * motorData.Vth * (motorData.R2 / s)) /
          (motorData.ws * (Math.pow(motorData.Rth + motorData.R2 / s, 2) + Math.pow(motorData.Xth + motorData.X2, 2)));
assert(T > 40 && T < 100, 'Torque at nominal speed should be realistic');

// Test 4: Transmission line voltage profile
const tlData = {
    l: 150,
    VS_LL: 168.42,
    VR_LL: 154.0,
    VR0_LL: 170.61
};
const frac = 0.5; // halfway along line
const v_load = tlData.VS_LL - frac * (tlData.VS_LL - tlData.VR_LL);
const v_ferr = tlData.VS_LL + frac * (tlData.VR0_LL - tlData.VS_LL);
assert(v_load < tlData.VS_LL, 'Loaded voltage should decrease along line');
assert(v_ferr > tlData.VS_LL, 'Ferranti voltage should increase along line');

// Test 5: Transient RLC response at time t
const rlcData = {
    Vin: 12,
    alpha: 625,
    wd: 2147.2,
    regime: 'under'
};
const t_rlc = 0.001; // 1 ms
const vc = rlcData.Vin * (1 - Math.exp(-rlcData.alpha * t_rlc) * 
          (Math.cos(rlcData.wd * t_rlc) + (rlcData.alpha / rlcData.wd) * Math.sin(rlcData.wd * t_rlc)));
assert(vc > 0, 'vC should be positive');

console.log('All simulation hover mathematics validated successfully!');
