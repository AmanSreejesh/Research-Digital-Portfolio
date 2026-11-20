// Fullscreen zoom blur. Strength follows camera speed, so it only really shows in the warp.

import { Uniform, Vector2 } from 'three';
import { Effect, EffectAttribute } from 'postprocessing';

const fragment = /* glsl */ `
  uniform float strength;
  uniform vec2 center;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (strength < 0.0015) {
      outputColor = inputColor;
      return;
    }
    vec2 dir = uv - center;
    vec4 acc = vec4(0.0);
    float total = 0.0;
    for (int i = 0; i < SAMPLES; i++) {
      float t = float(i) / float(SAMPLES - 1);
      float w = 1.0 - 0.6 * t;
      acc += texture2D(inputBuffer, uv - dir * t * strength) * w;
      total += w;
    }
    outputColor = acc / total;
  }
`;

export class ZoomBlurEffect extends Effect {
  constructor({ samples = 16 } = {}) {
    super('ZoomBlurEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map([['SAMPLES', String(samples)]]),
      uniforms: new Map([
        ['strength', new Uniform(0)],
        ['center', new Uniform(new Vector2(0.5, 0.48))],
      ]),
    });
  }

  set strength(v) {
    this.uniforms.get('strength').value = v;
  }
}
