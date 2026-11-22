// Hudshader för Quest-webbläsaren. Riktig subsurface scattering är för dyr, så den fejkas:
//  - wrap-belysning (ljuset "går runt" terminatorn) och en röd ton i övergången ljus/skugga,
//    starkare där masken säger att huden är tunn (öron, näsa, fingrar, läppar)
//  - svag genomlysning bakifrån (öron och fingrar mot ljuset)
//  - porer och fina hudlinjer som en kakelbar detaljnormal ovanpå den bakade normalkartan
//  - blekhet (pallor) och svett (sweat) som uniforms, 0..1, styrda av fysiologin
//
// Maskkartan: R = tunn hud (SSS), G = blekhetsprioritet (läppar, ansikte, nagelbäddar först),
// B = svettområde (panna, överläpp, näsa, handflator).
import * as THREE from 'three';

export function makeSkinMaterial(src, { masks, detail, detailRepeat }) {
  const mat = src.clone();
  mat.name = src.name;
  const uniforms = {
    uMasks: { value: masks },
    uDetail: { value: detail },
    uDetailRepeat: { value: detailRepeat },
    uDetailStrength: { value: 0.35 },
    uWrap: { value: 0.45 },
    uPallor: { value: 0 },
    uSweat: { value: 0 },
  };
  mat.userData.skinUniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uMasks;
        uniform sampler2D uDetail;
        uniform float uDetailRepeat, uDetailStrength, uWrap, uPallor, uSweat;
        float sssAmount = 0.0;
        float skinHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec4 skinMasks = texture2D(uMasks, vMapUv);
        sssAmount = skinMasks.r;
        {
          // Blekhet: läppar och ansikte först (maskens G), mot en grå, kall ton.
          float pw = clamp(uPallor * (0.45 + 0.85 * skinMasks.g), 0.0, 1.0);
          float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          // Blek hud är inte vit: rodnaden försvinner och huden blir gulgrå, ljusheten ändras lite.
          vec3 pale = vec3(l * 1.0, l * 0.96, l * 0.9) * 1.02;
          diffuseColor.rgb = mix(diffuseColor.rgb, pale, pw * 0.7);
        }
        float sweatAmt = clamp(uSweat * (0.25 + 0.75 * skinMasks.b), 0.0, 1.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.22, sweatAmt * 0.8);`)
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', `mapN.xy *= normalScale;
        {
          vec2 duv = vNormalMapUv * uDetailRepeat;
          vec3 dN = texture2D(uDetail, duv).xyz * 2.0 - 1.0;
          mapN.xy += dN.xy * uDetailStrength;
          // Svettdroppar: små kupoler i ett slumpat rutnät, fler ju mer svett.
          vec2 g = duv * 2.2;
          vec2 cell = floor(g);
          vec2 f = fract(g) - 0.5;
          float h = skinHash(cell);
          vec2 o = (vec2(skinHash(cell + 1.3), skinHash(cell + 7.1)) - 0.5) * 0.5;
          vec2 dv = f - o;
          float r = 0.12 + 0.12 * h;
          float d = length(dv) / r;
          if (d < 1.0 && h > 1.0 - sweatAmt * 0.9) mapN.xy += dv / r * 0.9 * (1.0 - d * d);
        }`))
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
        `{
          float ndl = dot( geometryNormal, directLight.direction );
          float w = uWrap * ( 0.35 + 0.65 * sssAmount );
          float wrapNL = saturate( ( ndl + w ) / ( 1.0 + w ) );
          float term = saturate( ( wrapNL - saturate( ndl ) ) * 2.5 ) * ( 0.4 + 0.6 * sssAmount );
          vec3 tint = mix( vec3( 1.0 ), vec3( 1.0, 0.45, 0.32 ), term );
          reflectedLight.directDiffuse += directLight.color * wrapNL * tint * BRDF_Lambert( material.diffuseColor );
          // genomlysning bakifrån (öron, fingrar)
          float back = pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 4.0 ) * smoothstep( 0.55, 0.95, sssAmount );
          reflectedLight.directDiffuse += directLight.color * back * 0.35 * vec3( 1.0, 0.3, 0.15 ) * material.diffuseColor;
        }`));
  };
  mat.customProgramCacheKey = () => 'skin-v1';
  return mat;
}
