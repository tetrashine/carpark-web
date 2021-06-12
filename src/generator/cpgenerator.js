import * as turf from '@turf/turf';
import Borderize from 'generator/functions/borderize';
import Intrude from 'generator/functions/intrude';
import Simplify from 'generator/functions/simplify';
import Layer from 'generator/functions/layer';
import Clean from 'generator/functions/clean';
import Rectangle from 'generator/functions/rectangle';
import Rectilinear from 'generator/functions/rectilinear';

import { reverseLatLng } from 'generator/common/util';

const Funcs = {
  'borderize': Borderize,
  'intrude': Intrude,
  'simplify': Simplify,
  'layer': Layer,
  'clean': Clean,
  'rectangle': Rectangle,
  'rectilinear': Rectilinear,
}

class CarParkGenerator {
  constructor(params) {
    this._setup(params);
  }

  _setup(params={}) {
    this._features = undefined;

    //not exactly this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.956499,1.333037],[103.956503,1.332826],[103.956796,1.332844],[103.95651,1.332494],[103.957447,1.332172],[103.957265,1.333734],[103.956499,1.333037]]]}}
    //not exactly 
    /*this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[
      [[103.950092,1.324471],[103.950557,1.324221],[103.950672,1.324],[103.95075,1.323839],[103.950983,1.323864],[103.951312,1.324143],
        [103.950046,1.325758],[103.949516,1.325276],[103.950092,1.324471]
      ]
    ]}};*/

    //to check this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.957536,1.323547],[103.95774,1.323293],[103.958041,1.323089],[103.9575,1.322771],[103.957371,1.322971],[103.957189,1.3232],[103.957536,1.323547]]]}}
    //ok 
    this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.905412,1.316938],[103.905573,1.316413],[103.90577,1.316495],[103.905741,1.316667],[103.906385,1.316806],[103.906314,1.317106],[103.905412,1.316938]]]}};
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.926343,1.312363],[103.926408,1.311992],[103.925803,1.311877],[103.92591,1.311394],[103.927424,1.311731],[103.927334,1.312152],[103.927095,1.312099],[103.92703,1.312356],[103.926876,1.312306],[103.926826,1.312464],[103.926343,1.312363]]]}}
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.944916,1.315489],[103.944515,1.315335],[103.944651,1.314924],[103.944415,1.31481],[103.944261,1.31437],[103.944311,1.314034],[103.946893,1.314871],[103.946704,1.315343],[103.946532,1.315275],[103.946203,1.315897],[103.945069,1.3153],[103.944916,1.315489]]]}}
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.956495,1.333017],[103.956509,1.332792],[103.956763,1.33281],[103.956505,1.332592],[103.956516,1.33212],[103.957457,1.332177],[103.957343,1.333078],[103.956495,1.333017]]]}};
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.941679,1.323211],[103.941733,1.322871],[103.941371,1.322807],[103.941464,1.322296],[103.942609,1.322521],[103.942509,1.323043],[103.942677,1.323085],[103.942603,1.323416],[103.941679,1.323211]]]}}
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.956484,1.333028],[103.956502,1.332785],[103.956781,1.33281],[103.956506,1.33261],[103.957504,1.331502],[103.957332,1.333071],[103.956484,1.333028]]]}};
    //ok this._features = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[103.956499,1.333029],[103.956495,1.332678],[103.956882,1.332711],[103.956517,1.33241],[103.957476,1.332124],[103.957511,1.333111],[103.956499,1.333029]]]}}
    
    this._processes = [];
    this._params = {...params};
  }

  setParams(params) { this._setup(params); }

  getFuncs(name) { return new Funcs[name]; }

  appendProcessessByName(name) { 
    let func = this.getFuncs(name);
    if (func !== undefined) {
      this._processes.push(func);
    }
  }

  removeProcessByIndex(index) {
    this.processes.splice(index, 1);
  }

  getArea() { 
    if (this.features === undefined) return 0;
    let polygon = turf.polygon(this.features.geometry.coordinates);
    return turf.area(polygon).toFixed(2);
  }

  setProcessOptionValue(processIndex, optionIndex, value) {
    const opt = this.processes[processIndex].options[optionIndex];
    try {
      opt.value = opt.parse(value);
    } catch(err) { opt.value = value; }
  }

  exec() {
    if (this.features === undefined) return [];
    const results = this._exec(this.features, this.processes);
    return results;
  }

  _exec(features, processes) {
    let lots, fullLots = turf.featureCollection([]);
    let f = features;
    processes.forEach(process => {
      [f, lots] = process.run(f)
      fullLots = turf.featureCollection([
        ...fullLots.features,
        ...((lots !== undefined) ? lots.features : []),
      ]);
    });

    return [reverseLatLng(f), reverseLatLng(fullLots)];
  }

  //setter/getter
  set features(features) { this._features = reverseLatLng(features); }
  get features() { 
    let json = JSON.stringify(this._features);
    return json !== undefined ? JSON.parse(json) : undefined; 
  }

  get processes() { return this._processes; }
  set processes(p) { this._processes = p; }
}

export default CarParkGenerator;