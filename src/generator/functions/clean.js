import * as turf from '@turf/turf';
import {VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

export default class Clean extends Base {
  constructor() {
    super({
      name: 'Clean',
      options: [{
        name: 'Mutate',
        value: false,
        valueType: VALUE_TYPES.BOOLEAN,
        description: 'Allows GeoJSON input to be mutated',
      }],
    });
  }

  runByFeatures(features) {
    if (features.type !== "Feature") return undefined;
    let polygon = turf.polygon(features.geometry.coordinates);
    return [turf.cleanCoords(polygon, {mutate: this.options[0].value})];
  }
}