import * as turf from '@turf/turf';
import {LOT_TYPES, LOT_DIMENSIONS, VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

const unitsOption = {units: 'meters'};

export default class Borderize extends Base {
  constructor() {
    super({
      name: 'Borderize',
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

  toLatLng(a) {
    return L.latLng(a[0], a[1]);
  }

  runByFeatures(features) {
    if (features.type !== "Feature" || features.geometry.coordinates.length < 1 || features.geometry.coordinates[0].length <= 2) return undefined;

    const points = features.geometry.coordinates[0];
    const len = points.length;
    let startExceedAngle = false, endExceedAngle = false;
    let first, second, third, startDistance = 0;
    let lots = [];
    let clockwise = turf.booleanClockwise(turf.getCoords(points));

    //1. for each line
    //points.forEach((point, index) => {
    for (let index = 0; index < len; index ++) {
      const point = points[index];

      if (index === 0) { 
        first = point;
        continue; 
      }

      second = point;
      third = (index + 1 < len) ? points[((index + 1) % len)] : points[1];

      const firstPoint = turf.point(first);
      const secondPoint = turf.point(second);
      const thirdPoint = turf.point(third);
      const bearing = turf.bearing(firstPoint, secondPoint);
      const reverseBearing = turf.bearing(secondPoint, firstPoint);

      //1.1 find the relational start point of placing lot so that next line can continue to place lots
      if (index === 1) {
        [startDistance, startExceedAngle] = this.calcBufferDistance(turf.point(points[len - 2]), firstPoint, secondPoint, LOT_DIMENSIONS.CAR.VERTICAL.LENGTH, clockwise);
      }

      const startPoint = turf.destination(firstPoint, startDistance, bearing, unitsOption);

      //1.2 find the relational end point of placing lot so that next line can continue to place lots
      let subDistance;
      [subDistance, endExceedAngle] = this.calcBufferDistance(firstPoint, secondPoint, thirdPoint, LOT_DIMENSIONS.CAR.VERTICAL.LENGTH, clockwise);
      const endPoint = turf.destination(secondPoint, subDistance, reverseBearing, unitsOption);

      //1.3 calculate distance of line and find the largest number of lots to place
      const distance = turf.distance(startPoint, endPoint, unitsOption);
      const maxLots = Math.floor((distance) / LOT_DIMENSIONS.CAR.VERTICAL.WIDTH);
      const remainingHalfDist = ((distance) - (maxLots * LOT_DIMENSIONS.CAR.VERTICAL.WIDTH)) / 2;

      //1.4 generate lots such that it is center of the line
      let cpStart = turf.destination(startPoint, remainingHalfDist, bearing, unitsOption);
      let cpEnd;

      //draw all the parking lots out
      for (let i = 0; i < maxLots; i++) {
        cpEnd = turf.destination(cpStart, LOT_DIMENSIONS.CAR.VERTICAL.WIDTH, bearing, unitsOption);
        let lot = this.generateAngledLot(cpStart, cpEnd, clockwise);
      
        lots.push(turf.polygon([lot]));

        cpStart = cpEnd;
      }

      startDistance = subDistance;
      startExceedAngle = endExceedAngle;
      first = second;
    }

    return [undefined, turf.featureCollection(lots)];
  }

  calcBufferDistance(a, b, c, length, clockwise) {
    let d1 = turf.distance(a, b, unitsOption);
    let d2 = turf.distance(b, c, unitsOption);
    let d3 = turf.distance(a, c, unitsOption);
    let coordClockwise = turf.booleanClockwise([turf.getCoord(a), turf.getCoord(b), turf.getCoord(c), turf.getCoord(a)]);
    let angleInRadian = Math.acos((d1*d1 + d2*d2 - d3*d3) / (2*d1*d2));

    if (clockwise !== coordClockwise) {
      angleInRadian = (2*Math.PI) - angleInRadian;
    }
    
    let subDistance = Math.abs(length / Math.tan(angleInRadian / 2));

    return angleInRadian > Math.PI ? [0, true] : [subDistance, false];
  }

  generateAngledLot(coord1, coord2, clockwise=true) {
    //1. find point within line 1 that is perpendicular to line(start, end) by rotating 90 deg from start
    //   find coord3 by getting bearing and calculating destination from start
    let coord3 = this.getPerpendicularDestination(coord2, coord1, LOT_DIMENSIONS.CAR.VERTICAL.LENGTH, clockwise);

    //2. find point within line 2 that is perpendicular to line(start, end) by rotating 90 deg from start
    //   find coord3 by getting bearing and calculating destination from start
    let coord4 = this.getPerpendicularDestination(coord1, coord2, LOT_DIMENSIONS.CAR.VERTICAL.LENGTH, !clockwise);

    //4. return 4 coordinates
    return [turf.getCoord(coord1), turf.getCoord(coord2), turf.getCoord(coord3), turf.getCoord(coord4), turf.getCoord(coord1)];
  }

  getPerpendicularDestination(point, pivot, distance, clockwise) {
    const pointOnLine = turf.transformRotate(point, clockwise ? 90 : -90, { pivot: pivot });
    const bearing = turf.bearing(pivot, pointOnLine);
    const destination = turf.destination(point, distance, bearing, unitsOption);
    return destination;
  }
}