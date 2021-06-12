import * as turf from '@turf/turf';
import {VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

export default class Simplify extends Base {
  constructor() {
    super({
      name: 'Simplify',
      options: [{
        name: 'Tolerance',
        value: 1,
        valueType: VALUE_TYPES.INTEGER,
        description: 'Internally uses simplify-js to perform simplification using the Ramer-Douglas-Peucker algorithm.',
      }],
    });
  }

  runByFeatures(features) {
    if (features.type !== "Feature") return undefined;
    let polygon = turf.polygon(features.geometry.coordinates);
    return [turf.simplify(polygon, {tolerance: this.options[0].value})];
  }
}