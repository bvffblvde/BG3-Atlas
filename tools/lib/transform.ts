export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface Placement {
  pos: Vec3;
  rot: Quat;
  scale: number;
}

export const identity: Placement = { pos: [0, 0, 0], rot: [0, 0, 0, 1], scale: 1 };

export function parseVec3(s: string): Vec3 {
  const [x, y, z] = s.trim().split(/\s+/).map(Number);
  return [x, y, z];
}

export function parseQuat(s: string): Quat {
  const [x, y, z, w] = s.trim().split(/\s+/).map(Number);
  return [x, y, z, w];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];
  const w = q[3];
  const t = cross(u, v);
  const t2: Vec3 = [2 * t[0], 2 * t[1], 2 * t[2]];
  const c = cross(u, t2);
  return [v[0] + w * t2[0] + c[0], v[1] + w * t2[1] + c[1], v[2] + w * t2[2] + c[2]];
}

export function toWorld(p: Placement, local: Vec3): Vec3 {
  const r = rotate(p.rot, [local[0] * p.scale, local[1] * p.scale, local[2] * p.scale]);
  return [p.pos[0] + r[0], p.pos[1] + r[1], p.pos[2] + r[2]];
}

function multiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function composePlacement(outer: Placement, inner: Placement): Placement {
  return { pos: toWorld(outer, inner.pos), rot: multiply(outer.rot, inner.rot), scale: outer.scale * inner.scale };
}
