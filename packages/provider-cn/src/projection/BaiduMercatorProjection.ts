export interface Point2D {
  x: number;
  y: number;
}

export interface LngLatCoord {
  lng: number;
  lat: number;
}

const MERCATOR_THRESHOLDS = [12890594.86, 8362377.87, 559061.0, 3481989.83, 1678043.12, 0.0];
const DEGREE_THRESHOLDS = [75.0, 60.0, 45.0, 30.0, 15.0, 0.0];

const INVERSE_COEFFS = [
  [1.410526172116255e-8, 0.00000898305509648872, -1.9939833816331, 200.9824383106796, -187.2403703815547, 91.6087516669843, -23.38765649603339, 2.57121317296198, -0.03801003308653, 17337981.2],
  [-7.435856389565537e-9, 0.000008983055097726239, -0.78625201886289, 96.32687599759846, -1.85204757529826, -59.36935905485877, 47.40033549296737, -16.50741931063887, 2.28786674699375, 10260144.86],
  [-3.030883460898826e-8, 0.00000898305509983578, 0.30071316287616, 59.74293618442277, 7.357984074871, -25.38371002664745, 13.45380521110908, -3.29883767235584, 0.32710905363475, 6856817.37],
  [-1.981981304930552e-8, 0.000008983055099779535, 0.03278182852591, 40.31678527705744, 0.65659298677277, -4.44255534477492, 0.85341911805263, 0.12923347998204, -0.04625736007561, 4482777.06],
  [3.09191371068437e-9, 0.000008983055096812155, 0.00006995724062, 23.10934304144901, -0.00023663490511, -0.6321817810242, -0.00663494467273, 0.03430082397953, -0.00466043876332, 2555164.4],
  [2.890871144776878e-9, 0.000008983055095805407, -3.068298e-8, 7.47137025468032, -0.00000353937994, -0.02145144861037, -0.00001234426596, 0.00010322952773, -0.00000323890364, 826088.5]
];

const FORWARD_COEFFS = [
  [-0.0015702102444, 111320.7020616939, 17044805.0, -25.2817346492, 63.9404527459, -136.1048548701, 98.9039440308, -38.8794439605, 7.0475935838, 82.5],
  [0.0008277824516172526, 111320.7020463578, 647795574.6671607, -4082003173.641316, 10774905663.51142, -15171875531.51559, 12053065338.62167, -5124939663.577472, 913311935.9512032, 67.5],
  [0.00337398766765, 111320.7020202162, 4481351.045890365, -23393751.19931662, 79682215.47186455, -115964993.2797253, 97236711.15602145, -43661946.33752821, 8477230.501135234, 52.5],
  [0.00220636496208, 111320.7020209128, 51751.86112841131, 3796837.749470245, 992013.7397791013, -1221952.21711287, 1340652.697009075, -620943.6990984312, 144416.9293806241, 37.5],
  [-0.0003441963504368392, 111320.7020576856, 278.2353980772752, 2485758.690035394, 6070.750963243378, 54821.18345352118, 9540.606633304236, -2710.55326746645, 1405.483844121726, 22.5],
  [-0.0003218135878613132, 111320.7020701615, 0.00369383431289, 823725.6402795718, 0.46104986909093, 2351.343141331292, 1.58060784298199, 8.77738589078284, 0.37238884252424, 7.45]
];

function applyPolynomial(coord: LngLatCoord, coeffs: number[]): LngLatCoord {
  let pX = coeffs[0]! + coeffs[1]! * Math.abs(coord.lng);
  const relY = Math.abs(coord.lat) / coeffs[9]!;
  let pY = coeffs[2]! + coeffs[3]! * relY + coeffs[4]! * relY * relY +
           coeffs[5]! * Math.pow(relY, 3) + coeffs[6]! * Math.pow(relY, 4) +
           coeffs[7]! * Math.pow(relY, 5) + coeffs[8]! * Math.pow(relY, 6);

  pX *= coord.lng < 0 ? -1 : 1;
  pY *= coord.lat < 0 ? -1 : 1;

  return { lng: pX, lat: pY };
}

function wrapLongitude(val: number): number {
  let res = val;
  while (res > 180) res -= 360;
  while (res < -180) res += 360;
  return res;
}

function clampLatitude(val: number): number {
  return Math.max(-74, Math.min(74, val));
}

export function projectToBaiduPlane(coord: LngLatCoord): Point2D {
  if (coord.lng > 180 || coord.lng < -180 || coord.lat > 90 || coord.lat < -90) {
    return { x: coord.lng, y: coord.lat };
  }

  const safeLng = wrapLongitude(coord.lng);
  const safeLat = clampLatitude(coord.lat);
  const input = { lng: safeLng, lat: safeLat };

  let activeCoeffs: number[] | undefined;
  for (let i = 0; i < DEGREE_THRESHOLDS.length; i++) {
    if (input.lat >= DEGREE_THRESHOLDS[i]!) {
      activeCoeffs = FORWARD_COEFFS[i]!;
      break;
    }
  }

  if (!activeCoeffs) {
    for (let i = 0; i < DEGREE_THRESHOLDS.length; i++) {
      if (input.lat <= -DEGREE_THRESHOLDS[i]!) {
        activeCoeffs = FORWARD_COEFFS[i]!;
        break;
      }
    }
  }

  const res = applyPolynomial(input, activeCoeffs ?? FORWARD_COEFFS[0]!);
  return { x: res.lng, y: res.lat };
}

export function unprojectFromBaiduPlane(pt: Point2D): LngLatCoord {
  const absY = Math.abs(pt.y);
  let activeCoeffs = INVERSE_COEFFS[0]!;

  for (let i = 0; i < MERCATOR_THRESHOLDS.length; i++) {
    if (absY >= MERCATOR_THRESHOLDS[i]!) {
      activeCoeffs = INVERSE_COEFFS[i]!;
      break;
    }
  }

  const res = applyPolynomial({ lng: pt.x, lat: pt.y }, activeCoeffs);
  return { lng: res.lng, lat: res.lat };
}
