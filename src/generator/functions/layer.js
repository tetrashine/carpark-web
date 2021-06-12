import {LOT_TYPES, VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

export default class Layer extends Base {
  constructor() {
    super({
      name: 'Layer',
      options: [{
        name: 'Starting Lot Number',
        value: 1,
        valueType: VALUE_TYPES.INTEGER,
        description: 'The initial lot number to assign. Assignment is incremental by 1.',
      },{
        name: 'Lot Vehicle Type',
        value: 'CAR',
        valueType: VALUE_TYPES.STRING,
        description: 'The vehicle type will determine size of lot generated.',
      },{
       name: 'Lot Group Buffer',
       value: 6,
       valueType: VALUE_TYPES.INTEGER,
       description: 'Number of lots before breaking the lots by buffer.',
      }, {
        name: 'Buffer Size (m)',
        value: 2,
        valueType: VALUE_TYPES.INTEGER,
        description: 'Size of buffer in metre.',
      }],
    });
  }

  runByFeatures(features) {
    return [features];
  }
}