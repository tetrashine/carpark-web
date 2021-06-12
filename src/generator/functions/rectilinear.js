import * as turf from '@turf/turf';
import {VALUE_TYPES} from 'generator/common/constants';
import Base from 'generator/common/base';

const UNITS_OPTION = {units: 'meters'};
const STATE_REMAIN_STATIONARY = 0;
const STATE_TO_MOVE = 1;
const STATE_OTHERS_MOVE = 2;
const STATE_EITHER_MOVE = 3;

const STATE_TO_MOVE_FOR_PREV = 4;
const STATE_TO_MOVE_FOR_POST = 5;
const STATE_OTHERS_MOVE_OK = 6;
const STATE_EITHER_MOVE_SELF = 7;
const STATE_EITHER_MOVE_OTHERS = 8;
const STATE_EITHER_MOVE_SELF_FOR_PREV = 9;
const STATE_EITHER_MOVE_SELF_FOR_POST = 10;

const STATE_PREFER_OTHERS_TO_MOVE = 11;
const STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF = 12;
const STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV = 13;
const STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST = 14;

const STATE_COMPLETED = 15;

const radianToDegree = (angleInRadian) => {
  return 180 / Math.PI * angleInRadian;
}

const stateToText = (state) => {
  let text = '';
  switch(state) {
    case 0:
      return 'STATE_REMAIN_STATIONARY';
    case 1:
      return 'STATE_TO_MOVE';
    case 2:
      return 'STATE_OTHERS_MOVE';
    case 3:
      return 'STATE_EITHER_MOVE';
    case 4:
      return 'STATE_TO_MOVE_FOR_PREV';
    case 5:
      return 'STATE_TO_MOVE_FOR_POST';
    case 6:
      return 'STATE_OTHERS_MOVE_OK';
    case 7:
      return 'STATE_EITHER_MOVE_SELF';
    case 8:
      return 'STATE_EITHER_MOVE_OTHERS';
    case 9:
      return 'STATE_EITHER_MOVE_SELF_FOR_PREV';
    case 10:
      return 'STATE_EITHER_MOVE_SELF_FOR_POST';
    case 11:
      return 'STATE_PREFER_OTHERS_TO_MOVE';
    case 12:
      return 'STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF';
    case 13:
      return 'STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV';
    case 14:
      return 'STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST';
  }

  return text;
}

const getPrevIndexFromPolygon = (currIndex, len, count=1) => {
  let prevIndex = (currIndex-count+len) % len;
  return (prevIndex == len - 1) ? prevIndex - 1 : prevIndex;
}

const getPostIndexFromPolygon = (currIndex, len, count=1) => {
  let postIndex = (currIndex+count) % len;
  return (postIndex == 0) ? 1 : postIndex;
}

export default class Squarize extends Base {
  constructor() {
    super({
      name: 'Rectilinear',
      options: [{
        name: 'Option on display',
        value: -1,
        valueType: VALUE_TYPES.INTEGER,
        description: 'The process id that is being returned',
      }, {
        name: 'Skip Sides',
        value: 0,
        valueType: VALUE_TYPES.INTEGER,
        description: 'Number of sides allowed to skip 90degs.',
      }, {
        name: 'Stop At',
        value: -1,
        valueType: VALUE_TYPES.INTEGER,
        description: 'Stop after processing this',
      }]
    });
  }

  calcAngleArray(coordinates, clockwise) {
    const angleArray = [];
    const len = coordinates.length;

    //get angle for all corners
    for (let index = 0; index < len; index++) {
      const prevIndex = getPrevIndexFromPolygon(index, len);
      const postIndex = getPostIndexFromPolygon(index, len);
      const pointA = turf.point(coordinates[prevIndex]);
      const pointB = turf.point(coordinates[index]);
      const pointC = turf.point(coordinates[postIndex]);
      angleArray[index] = this.calcAngleInRadian(pointA, pointB, pointC, clockwise, UNITS_OPTION);
    }

    return angleArray;
  }

  changeState(arr, index, state) {

    arr[index] = state;

    const len = arr.length - 1;
    if (index === 0 || index === len) {
      arr[0] = state;
      arr[len] = state;
    }
  }

  isRightAngle(angleInRadian) {
    return this.within(angleInRadian, 0, 1)
      || this.within(angleInRadian, (Math.PI / 2), 1)
      || this.within(angleInRadian, Math.PI, 1)
      || this.within(angleInRadian, (3 * Math.PI / 2), 1); //within 1% difference
  }

  // purpose: to determine state for the corner based on angle
  // parameters:
  //    angleInRadian (float): the angle of the corner
  //    final (boolean) : ???
  getStateByAngle(angleInRadian, final=false) {
    let state;
    const rightAngleBool = this.isRightAngle(angleInRadian);

    if (rightAngleBool) {
      state = STATE_REMAIN_STATIONARY;
    } else if (0 < angleInRadian && angleInRadian < (Math.PI / 2)) {
      //0deg < x < 90deg
      state = STATE_TO_MOVE;

    } else if ((Math.PI / 2) < angleInRadian && angleInRadian < Math.PI) {
      //90deg < angle < 180deg
      state = final ? STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF : STATE_PREFER_OTHERS_TO_MOVE;

    } else if (Math.PI < angleInRadian && angleInRadian < (Math.PI * 3/2)) {
      //if 180deg < angle < 270deg, move pointB outwards 
      state = final ? STATE_EITHER_MOVE_SELF : STATE_EITHER_MOVE;

    } else {
      //270deg < angle < 360deg
      state = STATE_OTHERS_MOVE;
    }

    return state;
  }

  runByFeatures(features) {
    if (features.type !== "Feature" || features.geometry.coordinates.length < 1 || features.geometry.coordinates[0].length <= 3) return undefined;
    const points = features.geometry.coordinates[0];

    if (this.isRectilinear(points)) {
      return features;
    }

    const clockwise = turf.booleanClockwise(turf.getCoords(points));
    const squarized = [...points];
    const len = points.length;
    const toMoveArray = new Array(len).fill(false);
    const angleArray = this.calcAngleArray(squarized, clockwise);

    for (let index = 0; index < len; index++) {
      const angleInRadian = angleArray[index];
      toMoveArray[index] = this.getStateByAngle(angleInRadian);
    }

    console.log('initial:', angleArray.map(x=>radianToDegree(x)), toMoveArray);

    const completedOptionArray = [];
    const optionsArray = [[...toMoveArray]];
    while (optionsArray.length > 0) {
      let endForLoop = false;
      let optionOk = true;
      const option = optionsArray.pop();

      for (let index = 0; index < len && !endForLoop; index++) {
        const status = option[index];
        let ok = false;

        if ([
          STATE_REMAIN_STATIONARY,
          STATE_TO_MOVE,
          STATE_TO_MOVE_FOR_PREV,
          STATE_TO_MOVE_FOR_POST,
          STATE_OTHERS_MOVE_OK,
          STATE_EITHER_MOVE_SELF,
          STATE_EITHER_MOVE_SELF_FOR_PREV,
          STATE_EITHER_MOVE_SELF_FOR_POST,
          STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF,
          STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV,
          STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST
        ].includes(status)) {

          ok = true;
        } else if (
          status === STATE_EITHER_MOVE 
          || status === STATE_PREFER_OTHERS_TO_MOVE
        ) {
          const prevIndex = getPrevIndexFromPolygon(index, len);
          const postIndex = getPostIndexFromPolygon(index, len);

          let hasNewOptions = false;
          [prevIndex, postIndex].forEach((loopIndex, ind) => {
            const sideStatus = option[loopIndex];
            if (sideStatus === STATE_TO_MOVE) {

              //option for side to move
              const newOption = [...option];
              this.changeState(newOption, index, STATE_OTHERS_MOVE_OK);
              this.changeState(newOption, loopIndex, ind === 0 ? STATE_TO_MOVE_FOR_POST : STATE_TO_MOVE_FOR_PREV);

              optionsArray.push(newOption);

              //option for self to move
              const newOptionSelf = [...option];
              this.changeState(newOptionSelf, index, status === STATE_EITHER_MOVE ? STATE_EITHER_MOVE_SELF : STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF);

              optionsArray.push(newOptionSelf);

              hasNewOptions = true;

            } else if (
              sideStatus === STATE_EITHER_MOVE 
              || sideStatus === STATE_EITHER_MOVE_SELF
              || sideStatus === STATE_PREFER_OTHERS_TO_MOVE
              || sideStatus === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF
            ) {
              //option for side to move
              const newOption = [...option];
              this.changeState(newOption, index, STATE_OTHERS_MOVE_OK);

              let loopState;
              if (sideStatus === STATE_EITHER_MOVE || sideStatus === STATE_EITHER_MOVE_SELF) {
                loopState = ind === 0 ? STATE_EITHER_MOVE_SELF_FOR_POST : STATE_EITHER_MOVE_SELF_FOR_PREV;
              } else if (sideStatus === STATE_TO_MOVE) {
                loopState = ind === 0 ? STATE_TO_MOVE_FOR_POST : STATE_TO_MOVE_FOR_PREV;
              } else if (sideStatus === STATE_PREFER_OTHERS_TO_MOVE || sideStatus === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF) {
                loopState = ind === 0 ? STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST : STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV;
              }

              this.changeState(newOption, loopIndex, loopState);

              optionsArray.push(newOption);

              //option for self to move
              const newOptionSelf = [...option];
              if (status === STATE_EITHER_MOVE) {
                this.changeState(newOptionSelf, index, ind === 0 ? STATE_EITHER_MOVE_SELF_FOR_PREV : STATE_EITHER_MOVE_SELF_FOR_POST);
              } else {
                this.changeState(newOptionSelf, index, ind === 0 ? STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV : STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST);
              }

              if (sideStatus === STATE_EITHER_MOVE || sideStatus === STATE_EITHER_MOVE_SELF) {
                this.changeState(newOptionSelf, loopIndex, STATE_EITHER_MOVE_SELF);
              } else if (sideStatus === STATE_TO_MOVE) {
                this.changeState(newOptionSelf, loopIndex, STATE_OTHERS_MOVE_OK);
              } else if (sideStatus === STATE_PREFER_OTHERS_TO_MOVE || sideStatus === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF) {
                this.changeState(newOptionSelf, loopIndex, STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF);
              }
              
              optionsArray.push(newOptionSelf);
              hasNewOptions = true;
            }
          });

          if (status === STATE_EITHER_MOVE && !hasNewOptions) {
            this.changeState(option, index, STATE_EITHER_MOVE_SELF);
            ok = true;
          } else if (status === STATE_PREFER_OTHERS_TO_MOVE && !hasNewOptions) {
            this.changeState(option, index, STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF);
            ok = true;
          }

          endForLoop = hasNewOptions;

        } else if (status === STATE_OTHERS_MOVE) {
          const prevIndex = getPrevIndexFromPolygon(index, len);
          const postIndex = getPostIndexFromPolygon(index, len);

          let hasNewOptions = false;
          [prevIndex, postIndex].forEach((loopIndex, ind) => {
            const sideStatus = option[loopIndex];
            if (sideStatus === STATE_TO_MOVE 
              || sideStatus === STATE_EITHER_MOVE 
              || sideStatus === STATE_EITHER_MOVE_SELF
              || sideStatus === STATE_PREFER_OTHERS_TO_MOVE
              || sideStatus === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF
            ) {
              const newOption = [...option];
              this.changeState(newOption, index, STATE_OTHERS_MOVE_OK);

              if (sideStatus === STATE_EITHER_MOVE || sideStatus === STATE_EITHER_MOVE_SELF) {
                this.changeState(newOption, loopIndex, ind === 0 ? STATE_EITHER_MOVE_SELF_FOR_POST : STATE_EITHER_MOVE_SELF_FOR_PREV);

              } else if (sideStatus === STATE_TO_MOVE) {
                this.changeState(newOption, loopIndex, ind === 0 ? STATE_TO_MOVE_FOR_POST : STATE_TO_MOVE_FOR_PREV);

              } else if (sideStatus === STATE_PREFER_OTHERS_TO_MOVE || sideStatus === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF) {
                this.changeState(newOption, loopIndex, ind === 0 ? STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST : STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV);
              }

              optionsArray.push(newOption);
              hasNewOptions = true;
            }
          });

          endForLoop = hasNewOptions;

        }

        optionOk = optionOk && ok;
      }

      if (!endForLoop && optionOk) {
        completedOptionArray.push(option);
      }
    }

    console.log("completion: ", JSON.stringify(completedOptionArray), angleArray)

    let finalIndex = 0;
    while (completedOptionArray.length > finalIndex) {
      const finalState = [...completedOptionArray[finalIndex]];
      const final = this.processedBy(features, angleArray, completedOptionArray[finalIndex], finalIndex === parseInt(this.options[0].value));

      if (final.length > 0) {
        console.log(`${finalIndex} final: `, final, finalState, angleArray.map(x => 180/Math.PI*x), finalIndex === parseInt(this.options[0].value));
        return final;
      } else {
        console.log(`${finalIndex} skipped`)
      }

      finalIndex++;
    }

    return [];
  }

  processedBy(features, angleArray, order, skipCompare) {
    const bufferedFeatures = turf.buffer(JSON.parse(JSON.stringify(features)), 0.1, UNITS_OPTION);

    const clockwise = turf.booleanClockwise(features.geometry.coordinates[0]);
    const points = features.geometry.coordinates[0];
    const len = points.length;
    const lastIndex = len - 1;
    const squarized = [...points];

    const breakAtIndexFunc = (index) => {
      return (this.options[2].value >= 0 && index === parseInt(this.options[2].value));
    };
    
    for (let index = 0; !breakAtIndexFunc(index) && (index < len -1); index++) {
      let optArray = [];
      const prevIndex = getPrevIndexFromPolygon(index, len);
      const postIndex = getPostIndexFromPolygon(index, len);

      const pointA = turf.point(squarized[prevIndex]);
      const pointB = turf.point(squarized[index]);
      const pointC = turf.point(squarized[postIndex]);

      const prevState = order[prevIndex];
      const currState = order[index];
      const postState = order[postIndex];

      const prevAngleInRadian = angleArray[prevIndex];
      const angleInRadian = angleArray[index];
      const postAngleInRadian = angleArray[postIndex];

      console.log(`=============${index}, ${stateToText(currState)}==============`, angleArray)
      
      if ([
        STATE_REMAIN_STATIONARY,
        STATE_EITHER_MOVE_OTHERS,
        STATE_OTHERS_MOVE_OK,
        STATE_COMPLETED
      ].includes(currState)) {
        this.changeState(order, index, STATE_COMPLETED);
        continue;

      } else if ([
        STATE_EITHER_MOVE_SELF,
        STATE_TO_MOVE,
        STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF
      ].includes(currState)) {

        if (
          (0 < angleInRadian && angleInRadian < (Math.PI / 2))
          || ((Math.PI * 3/2) < angleInRadian && angleInRadian < (2 * Math.PI))
        ) {
          //if 0 < angle < 90deg, move pointB inwards 
          if (!this.isRightAngle(prevAngleInRadian) || prevState !== STATE_COMPLETED) {
            optArray.push({
              point1: pointB,
              point2: pointA,
              bearing: turf.bearing(pointB, pointC),
              angle: angleInRadian
            });
          }

          //if right angle and complete, dun do
          //if !right angle || !complete
          if (!this.isRightAngle(postAngleInRadian) || postState !== STATE_COMPLETED) {
            optArray.push({
              point1: pointB,
              point2: pointC,
              bearing: turf.bearing(pointB, pointA),
              angle: angleInRadian
            });
          }
        } else if (Math.PI / 2  < angleInRadian && angleInRadian < Math.PI) {

          //if previous angle is complete and postState will move, optional to move
          const [able, newOrder] = this.checkIfAbleToDelegate(order, postIndex);
          if (this.isRightAngle(prevAngleInRadian) && able) {
            this.changeState(order, index, STATE_COMPLETED);
            order = newOrder;

            continue;
          }

          //if 90deg < angle < 180deg, move pointB inwards 
          if (!this.isRightAngle(postAngleInRadian) || postState !== STATE_COMPLETED) {
            const triangleInRadian = this.calcAngleInRadian(
              pointB, 
              pointA, 
              pointC, 
              turf.booleanClockwise([
                squarized[index], 
                squarized[prevIndex], 
                squarized[postIndex], 
                squarized[index]
              ]), 
              UNITS_OPTION
            );
            const calculatedBearing = turf.bearing(pointB, pointC) + radianToDegree(triangleInRadian);
            optArray.push({
              point1: pointA,
              point2: pointC,
              bearing: calculatedBearing,
              angle: Math.PI/2 - this.calcAngleInRadian(
                pointB, 
                pointA, 
                pointC, 
                triangleInRadian, 
                UNITS_OPTION
              )
            });
          }
        } else if (Math.PI < angleInRadian && angleInRadian < (Math.PI * 3/2)) {
          //if 180deg < angle < 270deg, move pointB outwards 
          if (!this.isRightAngle(postAngleInRadian) || postState !== STATE_COMPLETED) {
            angleInRadian = angleInRadian - Math.PI;
            optArray.push({
              point1: pointB,
              point2: pointC,
              bearing: turf.bearing(pointA, pointB),
              angle: angleInRadian
            });
          }
        }

        let largestPoint, largestCoord, largestArea;
        optArray.forEach(row => {
          const { point1, point2, bearing, angle } = row;
          const pointAlong = this.getShiftedPointByCos(point1, point2, angle, bearing, UNITS_OPTION);
          const coordAlong = turf.getCoord(pointAlong);

          if (!turf.booleanWithin(turf.lineString([turf.getCoord(pointAlong), squarized[prevIndex]]), bufferedFeatures)
            || !turf.booleanWithin(turf.lineString([turf.getCoord(pointAlong), squarized[postIndex]]), bufferedFeatures)
          ) {
            return;
          }

          if (largestCoord === undefined) {
            largestPoint = pointAlong;
            largestCoord = coordAlong;
            const coordsAlong = [...squarized];
            coordsAlong[index] = coordAlong;
            if (index === 0 || index === lastIndex) {
              coordsAlong[0] = coordAlong;
              coordsAlong[lastIndex] = coordAlong;
            }

            const polyAlong = turf.polygon([coordsAlong]);
            largestArea = turf.area(polyAlong);
          } else {
            const coordsCompair = [...squarized];
            coordsCompair[index] = coordAlong;         
            if (index === 0 || index === lastIndex) {
              coordsCompair[0] = coordAlong;
              coordsCompair[lastIndex] = coordAlong;
            }

            const polyCompair = turf.polygon([coordsCompair]);
            if (turf.area(polyCompair) > largestArea) {
              largestPoint = pointAlong;
              largestCoord = coordAlong;
              largestArea = turf.area(polyCompair);
            }
          }
        });

        if (largestCoord !== undefined) {
          const alpha = this.calcAngleInRadian(pointA, largestPoint, pointC, clockwise, UNITS_OPTION);
          this.changeState(squarized, index, largestCoord);
          this.changeState(order, index, STATE_COMPLETED);

          //recalculate
          angleArray = this.calcAngleArray(squarized, clockwise);
          order = this.determineStateArray(order, angleArray, postIndex);
          
        } else {
          continue;
        }
      } else if ([
        STATE_TO_MOVE_FOR_PREV,
        STATE_TO_MOVE_FOR_POST,
        STATE_EITHER_MOVE_SELF_FOR_PREV,
        STATE_EITHER_MOVE_SELF_FOR_POST,
        STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV,
        STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_POST
      ].includes(currState)) {

        const isForPrev = [STATE_TO_MOVE_FOR_PREV, STATE_EITHER_MOVE_SELF_FOR_PREV, STATE_PREFER_OTHERS_TO_MOVE_MOVE_FOR_PREV].includes(currState);
        const indexFor = isForPrev ? prevIndex : postIndex;
        const indexAnother = isForPrev ? postIndex : prevIndex;
        const movementFor = isForPrev ? pointA : pointC;
        const angleOfMovementFor = isForPrev
          ? angleArray[prevIndex] 
          : angleArray[postIndex];

        //90deg < angle < 180deg
        //180deg < angle < 270deg
        //270deg < angle < 360deg
        if (
          ((Math.PI / 2) < angleOfMovementFor && angleOfMovementFor < (2 * Math.PI))
        ) {
          //270deg < angle < 360deg - angleOfMovementFor
          const alpha = ((Math.PI * 3/2) < angleOfMovementFor && angleOfMovementFor < (2 * Math.PI)) 
            ? angleOfMovementFor - (Math.PI * 3/2)
            : (
              //90deg < angle < 180deg - angleOfMovementFor
              ((Math.PI / 2) < angleOfMovementFor && angleOfMovementFor < (Math.PI))
              ? angleOfMovementFor - (Math.PI / 2)

              //180deg < angle < 270deg - angleOfMovementFor
              : angleOfMovementFor - Math.PI
            );

          const currAngle = angleArray[index];
          const isAngleType1 = (0 < currAngle && currAngle < Math.PI);
          const isAngleType2 = (Math.PI < currAngle && currAngle < (2 * Math.PI));
          const movementForClockwise = turf.booleanClockwise([squarized[indexAnother], squarized[index], squarized[indexFor], squarized[indexAnother]]);

          const newLine = turf.transformRotate( 
            turf.lineString([squarized[index], squarized[indexFor]]), 
            (180 / Math.PI) * (
              (isAngleType1 && !movementForClockwise)
              || (isAngleType2 && movementForClockwise)
              ? alpha 
              : -alpha), {
              pivot: squarized[indexFor]
          });

          //console.log("newline: ", newLine, angleOfMovementFor, alpha, clockwise)

          const bearing = turf.bearing(squarized[indexFor], this.getTheOtherPoint(turf.getCoords(newLine), squarized[indexFor]));
          const pointAlong = this.getShiftedPointByCos(movementFor, pointB, alpha, bearing, UNITS_OPTION);

          const perpendicularLine = turf.transformScale(turf.lineString([squarized[indexFor], turf.getCoord(pointAlong)]), 10);
          const nextLine = turf.transformScale(turf.lineString([squarized[index], squarized[indexAnother]]), 10);
          const intersects = turf.lineIntersect(perpendicularLine, nextLine);         

          //point outside original polygon
          if (intersects.features.length === 0
            || turf.lineIntersect(turf.lineString([turf.getCoord(intersects.features[0]), squarized[prevIndex]]), bufferedFeatures).features.length > 0
            || turf.lineIntersect(turf.lineString([turf.getCoord(intersects.features[0]), squarized[postIndex]]), bufferedFeatures).features.length > 0
          ) {

            const pointAlongCoord = turf.getCoord(pointAlong);

            if (!turf.lineIntersect(turf.lineString([pointAlongCoord, squarized[prevIndex]]), bufferedFeatures).features.length > 0
              && !turf.lineIntersect(turf.lineString([pointAlongCoord, squarized[postIndex]]), bufferedFeatures).features.length > 0
            ) {
              this.changeState(squarized, index, pointAlongCoord);

              //recalculate
              angleArray = this.calcAngleArray(squarized, clockwise);
              order = this.determineStateArray(order, angleArray, postIndex);

              this.changeState(order, index, STATE_COMPLETED);
              
            }

            const [able, newOrder] = this.checkIfAbleToDelegate(order, postIndex);
            if (able) {
              order = newOrder;
            }
            
            continue;
          }

          const pointShifted = intersects.features[0];
          const shiftedAlpha = this.calcAngleInRadian(pointA, pointShifted, pointC, clockwise, UNITS_OPTION);
          const bearingAlongLine = turf.bearing(pointShifted, pointA);
          const pointShiftedTwice = this.getShiftedPointByCos(pointShifted, pointC, shiftedAlpha, bearingAlongLine, UNITS_OPTION);

          if (turf.lineIntersect(turf.lineString([turf.getCoord(pointShiftedTwice), squarized[prevIndex]]), bufferedFeatures).features.length > 0
            || turf.lineIntersect(turf.lineString([turf.getCoord(pointShiftedTwice), squarized[postIndex]]), bufferedFeatures).features.length > 0
          ) {

            const shiftedCoord = turf.getCoord(pointShifted);
            this.changeState(squarized, index, shiftedCoord);

            //recalculate
            angleArray = this.calcAngleArray(squarized, clockwise);
            order = this.determineStateArray(order, angleArray, postIndex);

            const [able, newOrder] = this.checkIfAbleToDelegate(order, postIndex);
            if (able) {
              order = newOrder;
            }

          } else {
            const shiftedTwiceCoord = turf.getCoord(pointShiftedTwice);
            this.changeState(squarized, index, shiftedTwiceCoord);

            //recalculate
            angleArray = this.calcAngleArray(squarized, clockwise);
            order = this.determineStateArray(order, angleArray, postIndex);
          }

          this.changeState(order, index, STATE_COMPLETED);
        
        } else {
          continue;
        }

        //console.log(`=============/${index}==============`)
      }

    }

    const skippedCount = angleArray.slice(0, -1).filter(angle => !this.isRightAngle(angle)).length;
    return (skipCompare || skippedCount <= this.options[1].value) ? [turf.polygon([squarized])] : [];
  }

  checkIfAbleToDelegate(states, postIndex) {
    let able = false;
    const newStates = [...states];
    const postState = states[postIndex];

    if (postState === STATE_TO_MOVE
      || postState === STATE_TO_MOVE_FOR_PREV
      || postState === STATE_EITHER_MOVE_SELF
      || postState === STATE_PREFER_OTHERS_TO_MOVE
      || postState === STATE_PREFER_OTHERS_TO_MOVE_MOVE_SELF
    ) {
      able = true;
      newStates[postIndex] = STATE_TO_MOVE_FOR_PREV;
    }

    return [able, newStates];
  }

  determineStateArray(states, angleArray, index) {
    const newStates = [...states];
    const oldState = states[index];
    const newState = this.getStateByAngle(angleArray[index], true);

    if (oldState !== newState) {
      this.changeState(newStates, index, newState);
    }

    return newStates;
  }

  getTheOtherPoint(pointsArr, point) {
    return pointsArr.find(pt => pt[0] !== point[0] && pt[1] !== point[1]);
  }

  getShiftedPointByCos(point, stationary, angleInRadian, bearing, unitsOption) {
    const hypotenuse = turf.distance(point, stationary, unitsOption);
    const adjacent = hypotenuse * Math.cos(angleInRadian);
    const newPoint = turf.destination(point, adjacent, bearing, unitsOption);
    return newPoint;
  }

  getShiftedPointsByLawOfSines(alpha2) {
    return (point, stationary, angleInRadian, bearing, unitsOption) => {
      const d = turf.distance(point, stationary, unitsOption);
      const dist = d * Math.sin(angleInRadian) / Math.sin(Math.PI - alpha2 - angleInRadian);
      const newPoint = turf.destination(point, dist, bearing, unitsOption);
      return newPoint;
    };
  }

  calcAngleInRadian(a, b, c, clockwise, unitsOption) {
    let d1 = turf.distance(a, b, unitsOption);
    let d2 = turf.distance(b, c, unitsOption);
    let d3 = turf.distance(a, c, unitsOption);
    let coordClockwise = turf.booleanClockwise([turf.getCoord(a), turf.getCoord(b), turf.getCoord(c), turf.getCoord(a)]);
    let angleInRadian = Math.acos((d1*d1 + d2*d2 - d3*d3) / (2*d1*d2));

    if (clockwise !== coordClockwise) {
      angleInRadian = (2*Math.PI) - angleInRadian;
    }

    return angleInRadian;
  }

  isRectilinear(features) {
    if (features.type !== "Feature" || features.geometry.coordinates.length < 1 || features.geometry.coordinates[0].length <= 3) return undefined;

    const points = features.geometry.coordinates[0];
    const len = points.length;
    let rectilinear = true;

    for (let index = 0; index < len; index ++) {
      const a = points[index-1];
      const b = points[(index+1 % (len-1))];
      const c = points[(index+2 % (len-1))];
      const pointA = turf.point(a);
      const pointB = turf.point(b);
      const pointC = turf.point(c);

      const angleInRadian = this.calcAngleInRadian(pointA, pointB, pointC, clockwise);

      if (!this.isRightAngle(angleInRadian)) {
        rectilinear = false;
      }
    }

    return rectilinear;
  }

  within(val, limit, percent) {
    return Math.abs(val - limit) / limit * 100 <= percent;
  }
}