import * as turf from '@turf/turf';
import {VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

export default class Intrude extends Base {
  constructor() {
    super({
      name: 'Intrude',
      options: [{
        name: 'Distance',
        value: 1,
        valueType: VALUE_TYPES.INTEGER,
        description: 'Distance in metres to intrude by.',
      }],
    });
  }

  runByFeatures(features) {
    if (features.type !== "Feature") return undefined;
    let polygon = turf.polygon(features.geometry.coordinates);
    return [turf.buffer(polygon, -this.options[0].value, {units: 'metres'})];
  }
}