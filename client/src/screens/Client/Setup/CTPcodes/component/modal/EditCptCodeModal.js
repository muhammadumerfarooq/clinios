import React from "react";

import { colors, FormControlLabel, FormGroup, Grid } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import { green, grey } from "@material-ui/core/colors";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControl from "@material-ui/core/FormControl";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import Switch from "@material-ui/core/Switch";
import TextField from "@material-ui/core/TextField";
import PropTypes from "prop-types";
import NumberFormat from "react-number-format";

const useStyles = makeStyles((theme) => ({
  gridMargin: {
    margin: "8px 0px"
  },
  noteMargin: {
    margin: "15px 0px"
  },
  title: {
    backgroundColor: theme.palette.primary.light,
    "& h2": {
      color: "#fff"
    }
  },
  content: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    fontSize: "18px"
  },
  formControl: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    color: theme.palette.text.secondary,
    "& .MuiSelect-select": {
      minWidth: 120
    }
  },
  root: {
    paddingLeft: "5px",
    "& .MuiTypography-root": {
      marginLeft: "5px"
    }
  },
  formHelperText: {
    width: "220px",
    fontSize: "12px",
    paddingLeft: "10px"
  },
  modalAction: {
    borderTop: `1px solid ${theme.palette.background.default}`,
    display: "flex",
    justifyContent: "space-between",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3)
  }
}));

const GreenSwitch = withStyles({
  switchBase: {
    color: grey[300],
    "&$checked": {
      color: green[500]
    },
    "&$checked + $track": {
      backgroundColor: green[500]
    }
  },

  checked: {},
  track: {}
})(Switch);

function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value
          }
        });
      }}
      thousandSeparator
      isNumericString
      prefix="$"
    />
  );
}
NumberFormatCustom.propTypes = {
  inputRef: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const EditCptCodeModal = ({
  isOpen,
  hendleOnClose,
  cpt_id,
  cpt_description,
  cpt_fee,
  cpt_favorite,
  cpt_billable,
  cpt_notes,
  handleChangeFee,
  handleChangeFavorite,
  handleChangeBillable,
  handleChangeNotes,
  handleEditCptCode
}) => {
  const classes = useStyles();
  const handleKeyUp = (event) => {
    if (event.keyCode === 13) {
      handleEditCptCode();
    }
  };

  return (
    <div>
      <Dialog
        maxWidth="sm"
        fullWidth={true}
        open={isOpen}
        onClose={hendleOnClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" className={classes.title}>
          Edit CPT Code
        </DialogTitle>
        <DialogContent className={classes.content}>
          <DialogContentText id="alert-dialog-description">
            This page is used to edit cpt code
          </DialogContentText>
          <div className={classes.root}>
            <FormControl component="div" className={classes.formControl}>
              <Grid item md={3} className={classes.gridMargin}>
                <TextField
                  fullWidth={true}
                  label="CPT ID"
                  value={cpt_id}
                  variant="outlined"
                  size="small"
                  InputLabelProps={{
                    shrink: true
                  }}
                  disabled={true}
                />
              </Grid>
              <p className={classes.formHelperText}>The name of the appointm</p>
            </FormControl>
            <FormControl component="div" className={classes.formControl}>
              <Grid item xs={6} md={9} className={classes.gridMargin}>
                <TextField
                  fullWidth={true}
                  label="CPT Description"
                  value={cpt_description}
                  variant="outlined"
                  size="small"
                  InputLabelProps={{
                    shrink: true
                  }}
                  disabled={true}
                />
              </Grid>
              <p className={classes.formHelperText}>
                The name shown in the Appointment
              </p>
            </FormControl>
            <FormControl component="div" className={classes.formControl}>
              <Grid item md={2} className={classes.gridMargin}>
                <TextField
                  fullWidth={true}
                  autoFocus={true}
                  label="Fee"
                  value={cpt_fee ? cpt_fee : ""}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    inputComponent: NumberFormatCustom
                  }}
                  InputLabelProps={{
                    shrink: true
                  }}
                  onChange={handleChangeFee}
                  onKeyUp={handleKeyUp}
                />
              </Grid>
              <p className={classes.formHelperText}>Edit fee here</p>
            </FormControl>
            <FormGroup>
              <FormControlLabel
                control={
                  <GreenSwitch
                    checked={Boolean(cpt_favorite)}
                    size="small"
                    name="switchBox"
                    onChange={handleChangeFavorite}
                    onKeyUp={handleKeyUp}
                  />
                }
                label="Favorite"
                className={classes.root}
              />
              <FormControlLabel
                control={
                  <GreenSwitch
                    checked={Boolean(cpt_billable)}
                    size="small"
                    name="switchBox"
                    onChange={handleChangeBillable}
                    onKeyUp={handleKeyUp}
                  />
                }
                label="Billable"
                className={classes.root}
              />
            </FormGroup>
            <FormControl component="div" className={classes.formControl}>
              <TextField
                className={classes.noteMargin}
                fullWidth={true}
                variant="outlined"
                multiline
                name="note"
                label="Notes"
                InputLabelProps={{
                  shrink: true
                }}
                InputProps={{
                  rows: 8
                }}
                value={cpt_notes}
                onChange={handleChangeNotes}
                onKeyUp={handleKeyUp}
              />
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions className={classes.modalAction}>
          <Button
            size="small"
            variant="outlined"
            onClick={hendleOnClose}
            style={{
              borderColor: colors.orange[600],
              color: colors.orange[600]
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleEditCptCode}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EditCptCodeModal;
