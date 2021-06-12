export default class Base {
  constructor({name='', options=[]}) {
    this.name = name;
    this.options = options;
  }

  run(collection) {
    return (collection.type === "FeatureCollection") ? 
      collection.features.map(features => this.runByFeatures(features)) : this.runByFeatures(collection);
  }

  runByFeatures(features) {}
}