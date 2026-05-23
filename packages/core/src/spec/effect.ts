export type WeatherEffectKind = 'rain' | 'snow' | 'fog' | 'cloud' | 'lightning' | string;

export interface WeatherEffectSpec {
  id: string;
  kind: WeatherEffectKind;
  enabled?: boolean;
  opacity?: number;
  uniforms?: Record<string, unknown>;
  config?: Record<string, unknown>;
}
