import React, { useState } from "react";
import Header from 'app/header';
import Map from 'app/map';
import DisplayMenu from 'app/displaymenu';

import CarParkGenerator from 'generator/cpgenerator';
import { reverseLatLng } from 'generator/common/util';

import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import TextField from '@material-ui/core/TextField';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';

const useStyles = makeStyles((theme) => ({
  menuButton: {
    marginRight: theme.spacing(2),
  },
  map: {
    height: 'calc(100% - 64px)',
    overflow: 'hidden',
  },
  mapOnly: {
    height: '100%',
  },
  info: {
    margin: '15px 15px',
  },
  funcOptions: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
    },
  },
}));

let cp;
let generator = new CarParkGenerator();

export default (props) => {
  const classes = useStyles();
  const [draw, setDraw] = useState(false);
  const [optionStep, setOptionStep] = useState(0);
  const [processes, setProcesses] = useState([
    ...generator.processes
  ]);

  const onDrawCreated = (e) => {
    cp = e.layer.toGeoJSON();
    generator.features = cp;
    setDraw(false);
  };

  const handleGetFunc = (name) => () => {
    generator.appendProcessessByName(name);
    setProcesses([
      ...generator.processes
    ]);
  }

  const handleProcessDeletion = (step) => () => {
    generator.removeProcessByIndex(step);
    const processes = generator.processes;
    setProcesses([
      ...processes
    ]);

    if (processes.length === 0) {
      setOptionStep(0);
    } else if (processes.length === optionStep) {
      setOptionStep(optionStep - 1);
    }
  }

  const original = generator.features !== undefined ? reverseLatLng(generator.features) : null;
  const [featureCollection, lots] = generator.exec();

  console.log('original', `this._features = ${JSON.stringify(original)}`);

  return <>
    <Header />

    <Grid container direction="row" justify="center" spacing={0} className={classes.map}>
      <Grid item xs={6} className={classes.mapOnly}>
        <Map 
          draw={draw}
          onDrawCreated={onDrawCreated}
          original={original}
          featureCollection={featureCollection}
          lots={lots}
        />
      </Grid>
      <Grid item xs={6}>
        <DisplayMenu 
          handleDraw={() => {
            setDraw(true);
          }}
          handleGetFunc={handleGetFunc}
        />
        {
          <Grid item xs={12} className={classes.info}>
            <ListItem>
              <ListItemText primary={generator.getArea() + ' square metre'} secondary="Area" />
            </ListItem>
          </Grid>
        }
        <Grid container direction="row" justify="center" spacing={1} className={classes.funcOptions}>
          <Grid item xs={6}>
            <Stepper activeStep={optionStep} orientation="vertical" nonLinear>
              {
                processes.map((process, stepIndex) => {
                  return <Step key={`s-${stepIndex}`}>
                    <StepLabel onClick={() => {
                      setOptionStep(stepIndex)
                    }}>{process.name}</StepLabel>;
                    <StepContent>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleProcessDeletion(stepIndex)}
                      >
                        Delete
                      </Button>
                    </StepContent>
                  </Step>;
                })
              }
            </Stepper>
          </Grid>
          <Grid item xs={6}>
            {
              processes.length > 0 && processes[optionStep].options.map((option, optionIndex) => {
                return <div>
                  <TextField
                    key={`p-${optionStep}-o-${optionIndex}`}
                    label={option.name}
                    defaultValue={option.value}
                    helperText={option.description}
                    variant="outlined"
                    fullWidth={true}
                    onChange={(event) => {
                      generator.setProcessOptionValue(optionStep, optionIndex, event.target.value);
                      setProcesses([
                        ...generator.processes
                      ]);
                    }}
                  />
                </div>;
              })
            }
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </>
}