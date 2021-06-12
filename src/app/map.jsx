import React from "react";

import { makeStyles } from '@material-ui/core/styles';
import { MapContainer, TileLayer, FeatureGroup, Marker, Popup, Circle, Polyline, Polygon } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import * as turf from '@turf/turf';

const useStyles = makeStyles((theme) => ({
  mapOnly: {
    height: '100%',
  }
}));

const switchFunc = (arr) => arr.map(x => [x[1], x[0]])

export default (props) => {
  const { draw, onDrawCreated, original, featureCollection, lots } = props;
  const classes = useStyles();

  return <MapContainer className={classes.mapOnly} center={[1.355, 103.84]} zoom={12} maxZoom={20}>
    <FeatureGroup>
      <EditControl
        position='topright'
        draw={{
          draw: false,
          polygon: draw,
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
        }}
        edit={{
          edit: false,
          remove: false
        }}
        onCreated={onDrawCreated}
      />
    </FeatureGroup>

    <TileLayer
      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    {
      original && original.type === "Feature" && 
      <Polygon pathOptions={{ color: 'green' }} positions={original.geometry.coordinates} />
    }

    {
      featureCollection && featureCollection.type === "FeatureCollection" && 
      featureCollection.features.map((feature, index) => {
        let ret;
        switch (feature.geometry.type.toLowerCase()) {
          case 'polygon':
            ret = <Polygon key={index} pathOptions={{ color: 'red' }} positions={feature.geometry.coordinates} />;
            break;
          case 'linestring':
            ret = <Polyline key={index} pathOptions={{ color: 'green' }} positions={feature.geometry.coordinates} />;
            break;
          case 'point':
            ret = <Marker key={index} pathOptions={{ color: 'red' }} position={feature.geometry.coordinates} />;
            break;
        }

        return ret;
      })
    }

    {
      (lots !== undefined) && lots.type === "FeatureCollection" && 
      lots.features.map((feature, index) => {
        let ret;
        switch (feature.geometry.type.toLowerCase()) {
          case 'polygon':
            ret = <Polygon key={index} pathOptions={{ color: 'blue' }} positions={feature.geometry.coordinates} />;
            break;
          case 'linestring':
            ret = <Polyline key={index} pathOptions={{ color: 'blue' }} positions={feature.geometry.coordinates} />;
            break;
          case 'point':
            ret = <Marker key={index} pathOptions={{ color: 'blue' }} position={feature.geometry.coordinates} />;
            break;
        }

        return ret;
      })
    }

    {
      featureCollection && featureCollection.type === "Feature" && 
      <Polygon pathOptions={{ color: 'red' }} positions={featureCollection.geometry.coordinates} />
    }

    {/*
      <Marker position={[103.94421494374217, 1.3146794975436629].reverse()} />
      <Polyline pathOptions={{ color: 'blue' }} positions={[[1.3157183320677506,103.9458074474071],[1.3136998163616385, 103.94271312046169]]}/>
    */}

  </MapContainer>
} 