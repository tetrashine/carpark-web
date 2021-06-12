import React, { useState } from "react";

import { makeStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  buttons: {
    textAlign: 'center',
  },
  button: {
    marginRight: theme.spacing(1),
  },
}));

const steps = ['Setup Area', 'Procedural Generate', 'Export'];
const stepsLength = steps.length - 1;

export default (props) => {
  const { handleDraw={}, handleGetFunc } = props;
  const classes = useStyles();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    setStep((prevStep) => {
      if (prevStep === stepsLength) return prevStep;
      return prevStep + 1;
    });
  };
  
  const handleBack = () => {
    setStep((prevStep) => {
      if (prevStep == 0) return 0;
      return prevStep - 1;
    });
  };

  return <>
    <Stepper activeStep={step}>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>

    <Grid item xs={12} className={classes.buttons}>
      <Button 
        disabled={step === 0} 
        className={classes.button} 
        onClick={handleBack}
      >
        Back
      </Button>

      <Button
        variant="contained"
        color="primary"
        className={classes.button}
        onClick={handleNext}
        disabled={step === stepsLength} 
      >
        {step === stepsLength - 1 ? 'Export' : 'Next'}
      </Button>
    </Grid>

    {
      step === 0 && <div className={classes.root}>
        <ButtonGroup color="primary" orientation="vertical">
          <Button onClick={handleDraw}>Draw Car Park</Button>
          <Button disabled={true}>Upload GeoJSON</Button>
        </ButtonGroup>
      </div>
    }
    
    {
      step === 1 && <div className={classes.root}>
        <ButtonGroup color="primary" orientation="vertical">
          <Button onClick={handleGetFunc('clean')}>Clean</Button>
          <Button onClick={handleGetFunc('simplify')}>Simplify</Button>
          <Button onClick={handleGetFunc('intrude')}>Intrude</Button>
          <Button onClick={handleGetFunc('rectilinear')}>Rectilinear</Button>
          <Button onClick={handleGetFunc('rectangle')}>Largest Rectangle</Button>
        </ButtonGroup>
        <ButtonGroup color="primary" orientation="vertical">
          <Button onClick={handleGetFunc('borderize')}>Borderize</Button>
          <Button onClick={handleGetFunc('layer')}>Layer</Button>
        </ButtonGroup>
      </div>
    }
    {
      step === 2 && <div className={classes.root}>
        <ButtonGroup color="primary" orientation="vertical">
          <Button>Export Car Park</Button>
          <Button>Export Model Results</Button>
        </ButtonGroup>
      </div>
    }

  </>;
}